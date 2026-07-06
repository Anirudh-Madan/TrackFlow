const { Op } = require('sequelize');
const {
  PartRequest, Product, User, Role, Order, Customer, ReorderFlag,
  ProductCategory, UnitOfMeasure, AuditLog, sequelize,
} = require('../../models');
const { notify } = require('../../services/notification.service');

const INCLUDE = [
  { model: User, as: 'requester', attributes: ['id', 'name'] },
  { model: User, as: 'assignedIM', attributes: ['id', 'name'] },
  { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
  { model: Order, as: 'order', attributes: ['id', 'order_number'] },
  { model: Customer, as: 'customer', attributes: ['id', 'company_name'] },
];

// ─── List (role-scoped): SM sees theirs, IM sees inbox, admin sees all ────────
exports.list = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const role = req.user.role;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (role === 'sales_manager') where.requested_by = req.user.id;
    // IM sees requests assigned to them OR unassigned (open pool).
    if (role === 'inventory_manager') {
      where[Op.or] = [{ assigned_im_id: req.user.id }, { assigned_im_id: null }];
    }
    const requests = await PartRequest.findAll({ where, include: INCLUDE, order: [['created_at', 'DESC']] });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

// ─── SM creates a request (reorder or new part) ───────────────────────────────
// Body: { type, product_id?, proposed_name?, quantity, linked_order_id?, customer_id?, notes?, assigned_im_id? }
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { type, product_id, proposed_name, quantity, linked_order_id, customer_id, notes, assigned_im_id } = req.body;
    if (!['REORDER', 'NEW_PART'].includes(type)) { await t.rollback(); return res.status(400).json({ success: false, error: 'type must be REORDER or NEW_PART' }); }
    if (type === 'REORDER' && !product_id) { await t.rollback(); return res.status(400).json({ success: false, error: 'Reorder needs a product_id' }); }
    if (type === 'NEW_PART' && !proposed_name) { await t.rollback(); return res.status(400).json({ success: false, error: 'New part needs a proposed_name' }); }

    // Pick a target IM: explicit, else any active IM.
    let imId = assigned_im_id;
    if (!imId) {
      const im = await User.findOne({ where: { is_active: true }, include: [{ model: Role, as: 'role', attributes: [], where: { name: 'inventory_manager' } }], attributes: ['id'], transaction: t });
      imId = im?.id || null;
    }

    const request = await PartRequest.create({
      requested_by: req.user.id,
      assigned_im_id: imId,
      type,
      product_id: type === 'REORDER' ? product_id : (product_id || null),
      proposed_name: type === 'NEW_PART' ? proposed_name : null,
      quantity: quantity || 1,
      linked_order_id: linked_order_id || null,
      customer_id: customer_id || null,
      status: 'OPEN',
      notes: notes || null,
    }, { transaction: t });

    if (imId) {
      await notify({
        recipient_id: imId, recipient_role: 'inventory_manager', sender_id: req.user.id,
        type: type === 'REORDER' ? 'REORDER_REQUEST' : 'NEW_PART_REQUEST',
        title: type === 'REORDER' ? 'New reorder request' : 'New part request',
        body: type === 'REORDER'
          ? `${req.user.name} requested a reorder of ${quantity} unit(s).`
          : `${req.user.name} requested a new part: ${proposed_name} (${quantity} unit(s)).`,
        link: '/im/requests', entity_type: 'part_request', entity_id: request.id,
      }, t);
    }

    await t.commit();
    const result = await PartRequest.findByPk(request.id, { include: INCLUDE });
    res.status(201).json({ success: true, message: 'Request submitted', data: result });
  } catch (err) { await t.rollback(); next(err); }
};

// ─── IM acknowledges a request ────────────────────────────────────────────────
exports.acknowledge = async (req, res, next) => {
  try {
    const request = await PartRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
    await request.update({ status: 'ACKNOWLEDGED', assigned_im_id: request.assigned_im_id || req.user.id });
    res.json({ success: true, message: 'Acknowledged', data: request });
  } catch (err) { next(err); }
};

// ─── IM converts a request into an actual reorder (ReorderFlag) ────────────────
exports.convertToReorder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const request = await PartRequest.findByPk(req.params.id, { transaction: t, lock: true });
    if (!request) { await t.rollback(); return res.status(404).json({ success: false, error: 'Request not found' }); }
    if (request.status === 'ORDERED' || request.status === 'CLOSED') { await t.rollback(); return res.status(400).json({ success: false, error: 'Request already processed' }); }

    let productId = request.product_id;

    // For a NEW_PART with no product yet, optionally create one (single SKU).
    if (!productId && request.type === 'NEW_PART') {
      const providedSku = req.body.sku;
      const sku = providedSku || `NP-${Date.now().toString().slice(-6)}`;
      const product = await Product.create({
        name: request.proposed_name,
        sku,
        selling_price: req.body.selling_price || 0,
        purchase_price: req.body.purchase_price || 0,
        reorder_threshold: 0,
        remarks: `Created from new-part request #${request.id}`,
      }, { transaction: t });
      productId = product.id;
      await request.update({ product_id: productId }, { transaction: t });
    }

    if (!productId) { await t.rollback(); return res.status(400).json({ success: false, error: 'No product to reorder; provide product details' }); }

    // Create the reorder flag (uniform product_id).
    await ReorderFlag.create({
      product_id: productId,
      flagged_by: req.user.id,
      party_id: request.customer_id || null,
      quantity_wanted: request.quantity,
      notes: `From part request #${request.id}`,
      status: 'ORDERED',
      ordered_at: new Date(),
    }, { transaction: t });

    await request.update({ status: 'ORDERED', ordered_at: new Date() }, { transaction: t });

    // Notify the requesting SM.
    await notify({
      recipient_id: request.requested_by, recipient_role: 'sales_manager', sender_id: req.user.id,
      type: 'REORDER_PLACED', title: 'Reorder placed',
      body: `Your request for ${request.quantity} unit(s) has been reordered.`,
      link: '/sm/requests', entity_type: 'part_request', entity_id: request.id,
    }, t);

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'update', module: 'part_request', entity_type: 'part_request', entity_id: request.id,
      after_state: { status: 'ORDERED', product_id: productId }, ip_address: req.ip, user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();
    const result = await PartRequest.findByPk(request.id, { include: INCLUDE });
    res.json({ success: true, message: 'Reorder placed for the same parts', data: result });
  } catch (err) { await t.rollback(); next(err); }
};

// ─── Close a request ──────────────────────────────────────────────────────────
exports.close = async (req, res, next) => {
  try {
    const request = await PartRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
    await request.update({ status: 'CLOSED' });
    res.json({ success: true, message: 'Request closed', data: request });
  } catch (err) { next(err); }
};
