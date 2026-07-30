const { Op, fn, col } = require('sequelize');
const {
  FulfillmentOrder, PipelineTracking, PipelineItem, PipelineStageHistory,
  Order, OrderItem, Customer, Product, User, Role, Region, Challan,
  StockOnHand, StockReserved, StockDamaged, StockTransaction,
  PartRequest, AuditLog, sequelize,
} = require('../../models');
const { notify } = require('../../services/notification.service');

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = ['IM_APPROVAL', 'DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FULFILLED'];
const STAGE_LABEL = {
  ADMIN_APPROVAL: 'Admin Approval',
  IM_APPROVAL: 'IM Approval',
  DW_ASSIGNMENT: 'Worker Assignment',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FULFILLED: 'Fulfilled',
  REJECTED: 'Rejected',
};

// ─── Includes ─────────────────────────────────────────────────────────────────
const PIPELINE_INCLUDE = [
  {
    model: Order, as: 'order',
    attributes: ['id', 'order_number', 'status', 'grand_total', 'sales_manager_id', 'order_date'],
    include: [
      {
        model: Customer, as: 'party', attributes: ['id', 'company_name', 'region_id'],
        include: [{ model: Region, as: 'region', attributes: ['id', 'name', 'code'] }],
      },
      {
        model: Challan, as: 'challan',
      },
    ],
  },
  { model: FulfillmentOrder, as: 'fulfillment', attributes: ['id', 'state', 'completed_at'] },
  { model: PipelineItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] },
  { model: User, as: 'adminApprover',  attributes: ['id', 'name'] },
  { model: User, as: 'imApprover',     attributes: ['id', 'name'] },
  { model: User, as: 'dispatchWorker', attributes: ['id', 'name'] },
  { model: User, as: 'salesManager',   attributes: ['id', 'name'] },
  { model: User, as: 'fulfiller',      attributes: ['id', 'name'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function reload(id, transaction) {
  return PipelineTracking.findByPk(id, { include: PIPELINE_INCLUDE, transaction });
}

async function recordHistory(pipeline, from, to, req, note, isOverride, transaction) {
  await PipelineStageHistory.create({
    pipeline_id: pipeline.id,
    order_id: pipeline.order_id,
    from_stage: from,
    to_stage: to,
    changed_by: req.user.id,
    changed_by_role: req.user.role,
    is_admin_override: !!isOverride,
    note: note || null,
  }, { transaction });
}

async function writeAudit(action, pipeline, req, after, transaction) {
  await AuditLog.create({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    action_type: action,
    module: 'pipeline',
    entity_type: 'pipeline_tracking',
    entity_id: pipeline.id,
    after_state: after,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, { transaction });
}

async function availableFor(product_id, transaction) {
  const soh = await StockOnHand.findOne({ where: { product_id }, transaction });
  const sr = await StockReserved.findOne({ where: { product_id }, transaction });
  const dmg = await StockDamaged.findAll({
    where: { product_id }, attributes: [[fn('SUM', col('quantity')), 'total']], raw: true, transaction,
  });
  const onHand = parseFloat(soh?.quantity || 0);
  const reserved = parseFloat(sr?.quantity || 0);
  const damaged = parseFloat(dmg?.[0]?.total || 0);
  return onHand - reserved - damaged;
}

// Is this action an admin override? True when an admin performs a step that a
// lower role would normally own.
function isOverride(req, normalRoles) {
  return req.user.role === 'admin' && !normalRoles.includes('admin_native');
}

// ─── Available parts for an order (what IM/Admin can pick) ─────────────────────
exports.getAvailablePartsForOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] }],
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const parts = [];
    for (const item of order.items) {
      const available = await availableFor(item.product_id);
      parts.push({
        product_id: item.product_id,
        name: item.product?.name,
        sku: item.product?.sku,
        ordered_quantity: parseFloat(item.quantity),
        available,
        dispatchable: Math.max(0, Math.min(parseFloat(item.quantity), available)),
      });
    }
    res.json({ success: true, data: { order_id: order.id, order_number: order.order_number, parts } });
  } catch (err) { next(err); }
};

// ─── List pipeline rows (role-scoped by stage) ────────────────────────────────
exports.getPipelines = async (req, res, next) => {
  try {
    const { stage, search } = req.query;
    const role = req.user.role;
    const where = {};
    if (stage) where.stage = stage;

    // Visibility gating — the core "only after X can Y see it" rule, as a WHERE.
    if (role === 'inventory_manager') {
      // IM sees everything from IM_APPROVAL onward (i.e. admin has approved it).
      where.stage = stage ? stage : { [Op.in]: ['ADMIN_APPROVAL', 'IM_APPROVAL', 'DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FULFILLED', 'REJECTED'] };
    } else if (role === 'dispatch_worker') {
      // DW sees only rows assigned to them, from DW_ASSIGNMENT onward.
      where.dw_id = req.user.id;
      where.stage = stage ? stage : { [Op.in]: ['DW_ASSIGNMENT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FULFILLED'] };
    } else if (role === 'sales_manager') {
      // SM sees pipelines heading to them.
      where.sales_manager_id = req.user.id;
    }
    // admin sees all.

    let pipelines = await PipelineTracking.findAll({
      where, include: PIPELINE_INCLUDE, order: [['updated_at', 'DESC']],
    });

    if (search) {
      const s = search.toLowerCase();
      pipelines = pipelines.filter(p => {
        const hay = `${p.order?.order_number || ''} ${p.order?.party?.company_name || ''} ${p.driver_name || ''} ${p.vehicle_number || ''}`.toLowerCase();
        return hay.includes(s);
      });
    }

    res.json({ success: true, data: pipelines });
  } catch (err) { next(err); }
};

// ─── Orders awaiting admin approval (no pipeline row yet) ──────────────────────
exports.getPendingAdminApproval = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { status: 'PENDING' },
      include: [
        { model: Customer, as: 'party', attributes: ['id', 'company_name'] },
        { model: PipelineTracking, as: 'pipeline', attributes: ['id'], required: false },
      ],
      order: [['created_at', 'DESC']],
    });
    // Only those without a pipeline row.
    const data = orders.filter(o => !o.pipeline);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── Single pipeline (with history) ───────────────────────────────────────────
exports.getPipelineById = async (req, res, next) => {
  try {
    const pipeline = await PipelineTracking.findByPk(req.params.id, {
      include: [
        ...PIPELINE_INCLUDE,
        { model: PipelineStageHistory, as: 'stageHistory', include: [{ model: User, as: 'changer', attributes: ['id', 'name'] }] },
      ],
      order: [[{ model: PipelineStageHistory, as: 'stageHistory' }, 'created_at', 'ASC']],
    });
    if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    res.json({ success: true, data: pipeline });
  } catch (err) { next(err); }
};

// ─── STAGE 1: Admin approves an order into the pipeline ────────────────────────
// Body: { order_id }
exports.adminApprove = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { order_id } = req.body;
    if (!order_id) { await t.rollback(); return res.status(400).json({ success: false, error: 'order_id is required' }); }

    const order = await Order.findByPk(order_id, { transaction: t, lock: true });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Order not found' }); }

    const existing = await PipelineTracking.findOne({ where: { order_id }, transaction: t });
    if (existing) { await t.rollback(); return res.status(400).json({ success: false, error: 'This order is already in the pipeline' }); }

    // Master ledger row (INCOMPLETE).
    const [fulfillment] = await FulfillmentOrder.findOrCreate({
      where: { order_id }, defaults: { order_id, state: 'INCOMPLETE' }, transaction: t,
    });

    const pipeline = await PipelineTracking.create({
      order_id,
      fulfillment_order_id: fulfillment.id,
      stage: 'ADMIN_APPROVAL',
      admin_approved_by: req.user.id,
      admin_approved_at: new Date(),
      sales_manager_id: order.sales_manager_id,
    }, { transaction: t });

    await order.update({ status: 'APPROVED' }, { transaction: t });
    await recordHistory(pipeline, null, 'ADMIN_APPROVAL', req, `Admin ${req.user.name} approved order into pipeline`, false, t);
    await writeAudit('create', pipeline, req, { order_id, stage: 'ADMIN_APPROVAL' }, t);

    // Notify all IMs that a new order needs their approval.
    const ims = await User.findAll({
      where: { is_active: true },
      include: [{ model: Role, as: 'role', attributes: [], where: { name: 'inventory_manager' } }],
      attributes: ['id'], transaction: t,
    });
    for (const im of ims) {
      await notify({
        recipient_id: im.id, recipient_role: 'inventory_manager', sender_id: req.user.id,
        type: 'PIPELINE_ADVANCED', title: `New order awaiting IM approval`,
        body: `Order ${order.order_number} was approved by Admin and needs your review.`,
        link: '/im/pipeline', entity_type: 'pipeline_tracking', entity_id: pipeline.id,
      }, t);
    }

    await t.commit();
    res.status(201).json({ success: true, message: 'Order approved into pipeline', data: await reload(pipeline.id) });
  } catch (err) { await t.rollback(); next(err); }
};

// ─── Generic transition helper ────────────────────────────────────────────────
async function transition(req, res, next, { allowedFrom, toStage, normalRoles, apply, successMessage }) {
  const t = await sequelize.transaction();
  try {
    const pipeline = await PipelineTracking.findByPk(req.params.id, { transaction: t, lock: true });
    if (!pipeline) { await t.rollback(); return res.status(404).json({ success: false, error: 'Pipeline not found' }); }
    if (!allowedFrom.includes(pipeline.stage)) {
      await t.rollback();
      return res.status(400).json({ success: false, error: `Cannot perform this action while pipeline is at ${STAGE_LABEL[pipeline.stage] || pipeline.stage}` });
    }

    const override = isOverride(req, normalRoles);
    const from = pipeline.stage;
    const patch = { stage: toStage };
    if (override) patch.had_override = true;

    const note = await apply(pipeline, patch, t, override);

    await pipeline.update(patch, { transaction: t });
    await recordHistory(pipeline, from, toStage, req, note, override, t);
    await writeAudit(override ? 'approve' : 'update', pipeline, req, { from, to: toStage, override }, t);

    await t.commit();


    res.json({ success: true, message: successMessage, data: await reload(pipeline.id) });
  } catch (err) { await t.rollback(); next(err); }
}

// ─── STAGE 2: IM approves + picks parts + assigns a Dispatch Worker ────────────
// Body: { dw_id, items: [{ product_id, quantity }], vehicle_number?, driver_name?, driver_phone? }
exports.imApprove = (req, res, next) =>
  transition(req, res, next, {
    allowedFrom: ['IM_APPROVAL'],
    toStage: 'DW_ASSIGNMENT',
    normalRoles: ['inventory_manager'],
    successMessage: 'IM approved, parts picked, and Dispatch Worker assigned.',
    apply: async (pipeline, patch, t, override) => {
      const { dw_id, items, vehicle_number, driver_name, driver_phone } = req.body;
      if (!dw_id) throw Object.assign(new Error('dw_id is required to assign a worker'), { statusCode: 400 });
      if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Select at least one part to dispatch'), { statusCode: 400 });

      const dw = await User.findByPk(dw_id, { include: [{ model: Role, as: 'role' }], transaction: t });
      if (!dw || dw.role?.name !== 'dispatch_worker') throw Object.assign(new Error('Assigned user must be a Dispatch Worker'), { statusCode: 400 });

      // IM approval moves the order out of PENDING.
      const ord = await Order.findByPk(pipeline.order_id, {
        include: [{ model: Customer, as: 'party', attributes: ['region_id'] }],
        transaction: t,
        lock: true
      });

      if (dw.region_id && ord?.party?.region_id && String(dw.region_id) !== String(ord.party.region_id)) {
        throw Object.assign(new Error(`Dispatch Worker (${dw.name}) does not belong to the customer's region`), { statusCode: 400 });
      }

      if (ord && ord.status === 'PENDING') await ord.update({ status: 'APPROVED' }, { transaction: t });

      // Write picked parts (uniform product_id / SKU).
      for (const it of items) {
        const qty = parseFloat(it.quantity);
        if (!it.product_id || isNaN(qty) || qty <= 0) throw Object.assign(new Error('Each part needs a product and positive quantity'), { statusCode: 400 });
        const available = await availableFor(it.product_id, t);
        await PipelineItem.create({
          pipeline_id: pipeline.id, product_id: it.product_id, quantity: qty, available_at_pick: available,
        }, { transaction: t });
      }

      patch.im_approved_by = req.user.id;
      patch.im_approved_at = new Date();
      patch.dw_id = dw_id;
      patch.dw_assigned_by = req.user.id;
      patch.dw_assigned_at = new Date();
      patch.expected_delivery_at = req.body.expected_delivery_at
        ? new Date(req.body.expected_delivery_at)
        : new Date(Date.now() + 24 * 3600 * 1000);
      if (vehicle_number !== undefined) patch.vehicle_number = vehicle_number;
      if (driver_name !== undefined) patch.driver_name = driver_name;
      if (driver_phone !== undefined) patch.driver_phone = driver_phone;

      // Notify the assigned DW.
      await notify({
        recipient_id: dw_id, recipient_role: 'dispatch_worker', sender_id: req.user.id,
        type: 'PIPELINE_ADVANCED', title: 'New delivery assigned to you',
        body: `You've been assigned a delivery for order ${pipeline.order_id}.`,
        link: '/dw/pipeline', entity_type: 'pipeline_tracking', entity_id: pipeline.id,
      }, t);

      if (override) {
        // Tell the IMs an admin stepped in.
        const ims = await User.findAll({ where: { is_active: true }, include: [{ model: Role, as: 'role', attributes: [], where: { name: 'inventory_manager' } }], attributes: ['id'], transaction: t });
        for (const im of ims) {
          await notify({ recipient_id: im.id, recipient_role: 'inventory_manager', sender_id: req.user.id, type: 'ADMIN_OVERRIDE', title: 'Admin override: IM approval', body: `Admin approved and assigned a worker for a pipeline order.`, link: '/im/pipeline', entity_type: 'pipeline_tracking', entity_id: pipeline.id }, t);
        }
      }

      return override
        ? `Admin override: approved & assigned to ${dw.name}`
        : `IM ${req.user.name} approved & assigned to ${dw.name}`;
    },
  });

// ─── IM approval + worker assignment by ORDER id ──────────────────────────────
// This is now the primary way an order enters the pipeline: the IM approves a
// PENDING order and assigns a Dispatch Worker in one action — no separate Admin
// approval is required. Admin retains full override access elsewhere.
// Body: { dw_id, expected_delivery_at? }
//  • No pipeline yet (PENDING order) → create pipeline, auto-pick the order's
//    parts from available stock, assign the worker, advance to DW_ASSIGNMENT.
//  • Legacy ADMIN_APPROVAL row (admin pre-approved) → same one-click approval.
//  • Already at DW_ASSIGNMENT → simply re-assign the worker.
exports.quickAssignWorker = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const { dw_id, expected_delivery_at } = req.body;
    if (!dw_id) { await t.rollback(); return res.status(400).json({ success: false, error: 'Select a dispatch worker' }); }

    // Default ETA: 24h after assignment (IM may override by passing a value).
    const eta = expected_delivery_at ? new Date(expected_delivery_at) : new Date(Date.now() + 24 * 3600 * 1000);

    const dw = await User.findByPk(dw_id, { include: [{ model: Role, as: 'role' }], transaction: t });
    if (!dw || dw.role?.name !== 'dispatch_worker') { await t.rollback(); return res.status(400).json({ success: false, error: 'Assigned user must be a Dispatch Worker' }); }

    const order = await Order.findByPk(orderId, {
      include: [{ model: Customer, as: 'party', attributes: ['region_id'] }],
      transaction: t,
      lock: true
    });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Order not found' }); }

    if (dw.region_id && order.party?.region_id && String(dw.region_id) !== String(order.party.region_id)) {
      await t.rollback();
      return res.status(400).json({ success: false, error: `Dispatch Worker (${dw.name}) does not belong to the customer's region` });
    }

    let pipeline = await PipelineTracking.findOne({ where: { order_id: orderId }, transaction: t, lock: true });

    // Shared helper: auto-pick the order's parts into pipeline_item rows.
    const autoPickItems = async (pipelineId) => {
      const orderItems = await OrderItem.findAll({ where: { order_id: orderId }, transaction: t });
      let picked = 0;
      for (const oi of orderItems) {
        const ordered = parseFloat(oi.quantity);
        const available = await availableFor(oi.product_id, t);
        const qty = Math.min(ordered, Math.max(0, available));
        if (qty <= 0) continue; // skip out-of-stock lines
        await PipelineItem.create({
          pipeline_id: pipelineId, product_id: oi.product_id, quantity: qty, available_at_pick: available,
        }, { transaction: t });
        picked += 1;
      }
      return picked;
    };

    const notifyWorker = async (pipelineId, reassign) => {
      await notify({
        recipient_id: dw_id, recipient_role: 'dispatch_worker', sender_id: req.user.id,
        type: 'PIPELINE_ADVANCED',
        title: reassign ? 'Delivery reassigned to you' : 'New delivery assigned to you',
        body: `You've been assigned a delivery for order ${order.order_number || `#${orderId}`}.`,
        link: '/dw/pipeline', entity_type: 'pipeline_tracking', entity_id: pipelineId,
      }, t);
    };

    // ── Case 1: order not in the pipeline yet → IM approves it in directly ──────
    if (!pipeline) {
      if (!['PENDING', 'APPROVED'].includes(order.status)) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Cannot start fulfilment for an order that is ${order.status}.` });
      }

      const [fulfillment] = await FulfillmentOrder.findOrCreate({
        where: { order_id: orderId }, defaults: { order_id: orderId, state: 'INCOMPLETE' }, transaction: t,
      });

      pipeline = await PipelineTracking.create({
        order_id: orderId,
        fulfillment_order_id: fulfillment.id,
        stage: 'DW_ASSIGNMENT',
        im_approved_by: req.user.id,
        im_approved_at: new Date(),
        dw_id,
        dw_assigned_by: req.user.id,
        dw_assigned_at: new Date(),
        sales_manager_id: order.sales_manager_id,
        expected_delivery_at: eta,
      }, { transaction: t });

      const picked = await autoPickItems(pipeline.id);
      if (picked === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'No stock is available for this order\u2019s parts right now.' });
      }

      if (order.status === 'PENDING') await order.update({ status: 'APPROVED' }, { transaction: t });

      await recordHistory(pipeline, null, 'DW_ASSIGNMENT', req, `${req.user.name} approved order & assigned ${dw.name}`, false, t);
      await writeAudit('approve', pipeline, req, { created: true, to: 'DW_ASSIGNMENT', dw_id }, t);
      await notifyWorker(pipeline.id, false);

      await t.commit();


      return res.json({ success: true, message: `Approved & assigned to ${dw.name}`, data: await reload(pipeline.id) });
    }

    const from = pipeline.stage;

    // ── Case 2: legacy admin-approved row awaiting IM ──────────────────────────
    if (pipeline.stage === 'ADMIN_APPROVAL' || pipeline.stage === 'IM_APPROVAL') {
      const picked = await autoPickItems(pipeline.id);
      if (picked === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'No stock is available for this order\u2019s parts right now.' });
      }
      await pipeline.update({
        stage: 'DW_ASSIGNMENT',
        im_approved_by: req.user.id,
        im_approved_at: new Date(),
        dw_id,
        dw_assigned_by: req.user.id,
        dw_assigned_at: new Date(),
        expected_delivery_at: eta,
      }, { transaction: t });
      if (order.status === 'PENDING') await order.update({ status: 'APPROVED' }, { transaction: t });
      await recordHistory(pipeline, from, 'DW_ASSIGNMENT', req, `${req.user.name} approved & assigned to ${dw.name}`, false, t);
      await writeAudit('approve', pipeline, req, { from, to: 'DW_ASSIGNMENT', dw_id }, t);
      await notifyWorker(pipeline.id, false);
      await t.commit();
      return res.json({ success: true, message: `Approved & assigned to ${dw.name}`, data: await reload(pipeline.id) });
    }

    // ── Case 3: already assigned → reassign the worker ─────────────────────────
    if (pipeline.stage === 'DW_ASSIGNMENT') {
      await pipeline.update({ dw_id, dw_assigned_by: req.user.id, dw_assigned_at: new Date(), expected_delivery_at: pipeline.expected_delivery_at || eta }, { transaction: t });
      await recordHistory(pipeline, from, from, req, `Reassigned to ${dw.name}`, false, t);
      await writeAudit('update', pipeline, req, { reassigned_to: dw_id }, t);
      await notifyWorker(pipeline.id, true);
      await t.commit();
      return res.json({ success: true, message: `Reassigned to ${dw.name}`, data: await reload(pipeline.id) });
    }

    await t.rollback();
    return res.status(400).json({ success: false, error: `A worker can't be assigned while the order is at ${STAGE_LABEL[pipeline.stage] || pipeline.stage}.` });
  } catch (err) { await t.rollback(); next(err); }
};


// ─── STAGE 3: DW picks up ──────────────────────────────────────────────────────
exports.startDelivery = (req, res, next) =>
  transition(req, res, next, {
    allowedFrom: ['DW_ASSIGNMENT'],
    toStage: 'OUT_FOR_DELIVERY',
    normalRoles: ['dispatch_worker'],
    successMessage: 'Marked out for delivery.',
    apply: async (pipeline, patch, t) => {
      if (req.user.role === 'dispatch_worker' && pipeline.dw_id && String(pipeline.dw_id) !== String(req.user.id)) {
        throw Object.assign(new Error('This delivery is assigned to a different worker'), { statusCode: 403 });
      }
      patch.out_for_delivery_at = new Date();
      const { vehicle_number, driver_name, driver_phone } = req.body;
      if (vehicle_number !== undefined) patch.vehicle_number = vehicle_number;
      if (driver_name !== undefined) patch.driver_name = driver_name;
      if (driver_phone !== undefined) patch.driver_phone = driver_phone;

      // Update Order status
      const order = await Order.findByPk(pipeline.order_id, { transaction: t });
      if (order && order.status !== 'DISPATCHED') await order.update({ status: 'DISPATCHED' }, { transaction: t });

      return `Picked up by ${req.user.name}`;
    },
  });

// ─── STAGE 4: DW delivers → decrement stock ────────────────────────────────────
exports.markDelivered = (req, res, next) =>
  transition(req, res, next, {
    allowedFrom: ['OUT_FOR_DELIVERY'],
    toStage: 'DELIVERED',
    normalRoles: ['dispatch_worker'],
    successMessage: 'Delivered to the Sales Manager.',
    apply: async (pipeline, patch, t) => {
      if (req.user.role === 'dispatch_worker' && pipeline.dw_id && String(pipeline.dw_id) !== String(req.user.id)) {
        throw Object.assign(new Error('This delivery is assigned to a different worker'), { statusCode: 403 });
      }
      patch.delivered_at = new Date();

      // Update Order status
      const order = await Order.findByPk(pipeline.order_id, { transaction: t });
      if (order && order.status !== 'DISPATCHED') await order.update({ status: 'DISPATCHED' }, { transaction: t });

      const items = await PipelineItem.findAll({ where: { pipeline_id: pipeline.id }, transaction: t });
      for (const item of items) {
        const qty = parseFloat(item.quantity);
        const soh = await StockOnHand.findOne({ where: { product_id: item.product_id }, transaction: t, lock: true });
        if (soh) {
          const after = Math.max(0, parseFloat(soh.quantity) - qty);
          await soh.update({ quantity: after }, { transaction: t });
          await StockTransaction.create({
            product_id: item.product_id, type: 'dispatch',
            reference: `PIPE-${pipeline.id}`, quantity_change: -qty, quantity_after: after,
            performed_by: req.user.id, notes: `Delivered via pipeline #${pipeline.id}`,
          }, { transaction: t });
        }
        const sr = await StockReserved.findOne({ where: { product_id: item.product_id }, transaction: t, lock: true });
        if (sr) {
          const released = Math.max(0, parseFloat(sr.quantity) - qty);
          await sr.update({ quantity: released }, { transaction: t });
        }
      }

      // Notify the SM that goods arrived.
      if (pipeline.sales_manager_id) {
        await notify({
          recipient_id: pipeline.sales_manager_id, recipient_role: 'sales_manager', sender_id: req.user.id,
          type: 'PIPELINE_ADVANCED', title: 'Delivery received — confirm the sale',
          body: `Your order's parts were delivered. Mark it sold once handed to the customer.`,
          link: '/sm/pipeline', entity_type: 'pipeline_tracking', entity_id: pipeline.id,
        }, t);
      }
      return `Delivered by ${req.user.name}`;
    },
  });

// ─── STAGE 5: SM sells → FULFILLED (+ mandatory notify IM + reorder) ───────────
// Body: { reorder: bool, reorder_items?: [{product_id, quantity}], note? }
exports.fulfill = (req, res, next) =>
  transition(req, res, next, {
    allowedFrom: ['DELIVERED'],
    toStage: 'FULFILLED',
    normalRoles: ['sales_manager'],
    successMessage: 'Order marked sold. Inventory Manager notified.',
    apply: async (pipeline, patch, t, override) => {
      if (req.user.role === 'sales_manager' && pipeline.sales_manager_id && String(pipeline.sales_manager_id) !== String(req.user.id)) {
        throw Object.assign(new Error('This order belongs to a different Sales Manager'), { statusCode: 403 });
      }
      patch.fulfilled_by = req.user.id;
      patch.fulfilled_at = new Date();
      patch.sold_notified = true;

      // Flip master ledger to COMPLETE + order to DISPATCHED.
      const fulfillment = await FulfillmentOrder.findByPk(pipeline.fulfillment_order_id, { transaction: t, lock: true });
      if (fulfillment) await fulfillment.update({ state: 'COMPLETE', completed_at: new Date() }, { transaction: t });
      const order = await Order.findByPk(pipeline.order_id, { transaction: t, lock: true });
      if (order && ['APPROVED'].includes(order.status)) await order.update({ status: 'DISPATCHED' }, { transaction: t });

      // The IM to notify: whoever approved this pipeline, else broadcast to IMs.
      const targetImId = pipeline.im_approved_by;
      const orderNumber = order?.order_number || `#${pipeline.order_id}`;

      // MANDATORY: "Order sold" notification to IM.
      if (targetImId) {
        await notify({
          recipient_id: targetImId, recipient_role: 'inventory_manager', sender_id: req.user.id,
          type: 'ORDER_SOLD', title: `Order sold: ${orderNumber}`,
          body: `${req.user.name} sold order ${orderNumber}. Reorder may be required based on customer demand.`,
          link: '/im/requests', entity_type: 'pipeline_tracking', entity_id: pipeline.id,
        }, t);
      }

      // Reorder request for the same parts (customer demand).
      const wantReorder = req.body.reorder !== false; // default true
      if (wantReorder) {
        const orderItems = await OrderItem.findAll({ where: { order_id: pipeline.order_id }, transaction: t });
        const reorderItems = Array.isArray(req.body.reorder_items) && req.body.reorder_items.length
          ? req.body.reorder_items
          : orderItems.map(oi => ({ product_id: oi.product_id, quantity: Math.ceil(parseFloat(oi.quantity)) }));

        for (const ri of reorderItems) {
          await PartRequest.create({
            requested_by: req.user.id,
            assigned_im_id: targetImId || null,
            type: 'REORDER',
            product_id: ri.product_id,
            quantity: ri.quantity,
            linked_order_id: pipeline.order_id,
            customer_id: order?.party_id || null,
            status: 'OPEN',
            notes: req.body.note || 'Auto-raised on sale',
          }, { transaction: t });
        }
        if (targetImId) {
          await notify({
            recipient_id: targetImId, recipient_role: 'inventory_manager', sender_id: req.user.id,
            type: 'REORDER_REQUEST', title: `Reorder requested for ${orderNumber}`,
            body: `${reorderItems.length} part(s) requested for reorder based on customer demand.`,
            link: '/im/requests', entity_type: 'pipeline_tracking', entity_id: pipeline.id,
          }, t);
        }
      }

      return override ? `Admin override: marked sold` : `Sold by ${req.user.name}`;
    },
  });

// ─── Reject (Admin / IM, before delivery) ─────────────────────────────────────
exports.reject = (req, res, next) => {
  const { reason } = req.body;
  return transition(req, res, next, {
    allowedFrom: ['IM_APPROVAL', 'DW_ASSIGNMENT'],
    toStage: 'REJECTED',
    normalRoles: ['admin_native', 'inventory_manager'], // admin reject is native, not an override
    successMessage: 'Pipeline rejected.',
    apply: async (pipeline, patch) => {
      if (!reason || !reason.trim()) throw Object.assign(new Error('A reject reason is required'), { statusCode: 400 });
      patch.reject_reason = reason.trim();
      return `Rejected by ${req.user.name}: ${reason.trim()}`;
    },
  });
};

// ─── Dispatch worker list (for IM assignment) ─────────────────────────────────
exports.getDispatchWorkers = async (req, res, next) => {
  try {
    const { region_id, order_id } = req.query;

    let targetRegionId = region_id;
    if (order_id && !targetRegionId) {
      const ord = await Order.findByPk(order_id, {
        include: [{ model: Customer, as: 'party', attributes: ['region_id'] }]
      });
      if (ord?.party?.region_id) {
        targetRegionId = ord.party.region_id;
      }
    }

    const where = { is_active: true };
    if (targetRegionId) {
      where[Op.or] = [{ region_id: targetRegionId }, { region_id: null }];
    }

    const workers = await User.findAll({
      attributes: ['id', 'name', 'login_id', 'region_id'],
      include: [
        { model: Role, as: 'role', attributes: [], where: { name: 'dispatch_worker' } },
        { model: Region, as: 'region', attributes: ['id', 'name', 'code'] }
      ],
      where,
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: workers });
  } catch (err) { next(err); }
};

// ─── Pipeline stats (role-scoped, for dashboards) ─────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const where = {};
    if (role === 'dispatch_worker') where.dw_id = req.user.id;
    if (role === 'sales_manager') where.sales_manager_id = req.user.id;

    const rows = await PipelineTracking.findAll({
      where, attributes: ['stage', [fn('COUNT', col('id')), 'count']], group: ['stage'], raw: true,
    });
    const byStage = {};
    rows.forEach(r => { byStage[r.stage] = parseInt(r.count, 10); });
    res.json({ success: true, data: byStage });
  } catch (err) { next(err); }
};

exports.STAGES = STAGES;
exports.STAGE_LABEL = STAGE_LABEL;
