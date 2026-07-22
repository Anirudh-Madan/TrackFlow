const { v4: uuidv4 } = require('uuid');
const { Order, OrderItem, OrderStatusHistory, Customer, User, Product, Challan, StockOnHand, StockReserved, AuditLog, Role, FulfillmentOrder, PipelineTracking, PipelineStageHistory, sequelize } = require('../../models');
const { notify } = require('../../services/notification.service');

// Helper to generate sequential order number: ORD-YYYYMM-XXXX
function generateOrderNumber() {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(1000 + Math.random() * 9000));
  return `ORD-${year}${month}-${random}`;
}

// Create Order (primarily for seeding / testing)
exports.createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      party_id,
      items,
      supplier,
      challan_number,
      bill_number,
      order_date,
      customer_name,
      company_name,
      customer_company,
      notes,
    } = req.body; // items: [{ product_id, quantity, sm_price }]

    if (!bill_number || !bill_number.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Bill number is mandatory' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Items list is required' });
    }

    let customer = null;
    if (party_id) {
      customer = await Customer.findByPk(party_id, { transaction: t });
      if (!customer) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Customer (Party) not found' });
      }
    }

    const order_number = generateOrderNumber();
    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of items) {
      const { product_id, quantity, sm_price, part_number, description, dl_price } = item;
      const qty = parseInt(quantity);
      const price = parseFloat(sm_price);

      if ((!product_id && !part_number) || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Each item needs a Part Number or product selection, valid quantity, and selling price' });
      }

      let base_price = 0;
      let productName = description || part_number || 'Custom Item';
      let snapshotDlPrice = dl_price != null ? parseFloat(dl_price) : 0;

      if (product_id) {
        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
          await t.rollback();
          return res.status(404).json({ success: false, error: `Product with ID ${product_id} not found` });
        }
        base_price = parseFloat(product.selling_price || 0);
        productName = description || product.name;
        if (dl_price == null) snapshotDlPrice = parseFloat(product.dealer_landing_price || 0);
      }

      // Snapshot base price & GST
      const gst_percent = 18.00; // Default GST 18%
      const line_total = qty * price;
      subtotal += line_total;

      itemsToCreate.push({
        product_id: product_id || null,
        part_number: part_number || null,
        description: productName,
        dl_price: snapshotDlPrice,
        quantity: qty,
        base_price,
        sm_price: price,
        gst_percent,
        line_total,
      });
    }

    const gst_amount = parseFloat((subtotal * 0.18).toFixed(2));
    const grand_total = subtotal + gst_amount;

    // Check credit hold: if grand_total + current party outstanding > credit_limit
    const credit_hold = customer ? (grand_total > parseFloat(customer.credit_limit || 0)) : false;
    const finalOrderDate = order_date ? new Date(order_date) : new Date();

    const order = await Order.create({
      order_number,
      party_id: party_id || null,
      supplier: supplier || null,
      challan_number: challan_number || null,
      customer_name: customer_name || null,
      company_name: company_name || null,
      customer_company: customer_company || null,
      sales_manager_id: req.user.id, // Or logged-in SM
      status: 'PENDING',
      order_date: finalOrderDate,
      subtotal,
      gst_amount,
      grand_total,
      credit_hold,
    }, { transaction: t });

    // Create corresponding Challan entry
    const share_token = uuidv4().replace(/-/g, '');
    const challanNo = challan_number || `CHN-${order_number.replace('ORD-', '')}`;
    await Challan.create({
      challan_number: challanNo,
      order_id: order.id,
      party_id: party_id || null,
      party_name: customer_name || company_name || customer_company || null,
      supplier: supplier || null,
      bill_number: bill_number.trim(),
      grand_total: grand_total,
      created_by: req.user.id,
      share_token,
      status: 'active',
      is_returned: false,
      generated_at: finalOrderDate,
    }, { transaction: t });

    for (const item of itemsToCreate) {
      item.order_id = order.id;
      await OrderItem.create(item, { transaction: t });

      // Hold reservation: Increment StockReserved
      const [sr] = await StockReserved.findOrCreate({
        where: { product_id: item.product_id },
        defaults: { product_id: item.product_id, quantity: 0 },
        transaction: t,
      });
      await sr.increment('quantity', { by: item.quantity, transaction: t });
    }

    // Log status history
    await OrderStatusHistory.create({
      order_id: order.id,
      from_status: null,
      to_status: 'PENDING',
      changed_by: req.user.id,
      reason: 'Order submitted by Sales Manager',
    }, { transaction: t });

    // Enter the fulfilment pipeline immediately at IM approval (no admin gate).
    // The order now awaits the Inventory Manager to approve + assign a worker.
    const fulfillment = await FulfillmentOrder.create({
      order_id: order.id, state: 'INCOMPLETE',
    }, { transaction: t });

    const pipeline = await PipelineTracking.create({
      order_id: order.id,
      fulfillment_order_id: fulfillment.id,
      stage: 'IM_APPROVAL',
      sales_manager_id: req.user.id,
    }, { transaction: t });

    await PipelineStageHistory.create({
      pipeline_id: pipeline.id,
      order_id: order.id,
      from_stage: null,
      to_stage: 'IM_APPROVAL',
      changed_by: req.user.id,
      changed_by_role: req.user.role,
      note: `Order placed by ${req.user.name} — awaiting IM approval`,
    }, { transaction: t });

    // Notify all active Inventory Managers.
    const ims = await User.findAll({
      where: { is_active: true },
      include: [{ model: Role, as: 'role', attributes: [], where: { name: 'inventory_manager' } }],
      attributes: ['id'], transaction: t,
    });
    for (const im of ims) {
      await notify({
        recipient_id: im.id, recipient_role: 'inventory_manager', sender_id: req.user.id,
        type: 'PIPELINE_ADVANCED', title: 'New order awaiting approval',
        body: `Order ${order_number} was placed and needs your approval & a worker.`,
        link: '/im/pipeline', entity_type: 'pipeline_tracking', entity_id: pipeline.id,
      }, t);
    }

    // Create Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'create',
      module: 'orders',
      entity_type: 'order',
      entity_id: order.id,
      after_state: { order_number, grand_total, status: 'PENDING' },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();

    const result = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'party' },
      ],
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// Get Pending Orders
exports.getPendingOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { status: 'PENDING' },
      include: [
        { model: Customer, as: 'party', attributes: ['id', 'company_name', 'credit_limit'] },
        { model: User, as: 'salesManager', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};

// List All Orders (optional helper for lists)
exports.getOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const orders = await Order.findAll({
      where,
      include: [
        { model: Customer, as: 'party', attributes: ['id', 'company_name', 'credit_limit'] },
        { model: User, as: 'salesManager', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};

// Get Single Order Details
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        { model: Customer, as: 'party', attributes: ['id', 'company_name', 'credit_limit'] },
        { model: User, as: 'salesManager', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'selling_price'] }] },
        { model: OrderStatusHistory, as: 'statusHistory', include: [{ model: User, as: 'changer', attributes: ['id', 'name'] }] },
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

// Approve Order
exports.approveOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, { transaction: t, lock: true });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ success: false, error: `Cannot approve order in ${order.status} status` });
    }

    const previousStatus = order.status;

    // Update status
    await order.update({ status: 'APPROVED' }, { transaction: t });

    // Status history
    await OrderStatusHistory.create({
      order_id: order.id,
      from_status: previousStatus,
      to_status: 'APPROVED',
      changed_by: req.user.id,
      reason: 'Approved by Inventory Manager',
    }, { transaction: t });

    // Generate Challan
    const dateObj = new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(1000 + Math.random() * 9000));
    const challan_number = `CHN-${year}${month}-${random}`;

    await Challan.create({
      challan_number,
      order_id: order.id,
      generated_at: new Date(),
    }, { transaction: t });

    // Create Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'update',
      module: 'orders',
      entity_type: 'order',
      entity_id: order.id,
      after_state: { status: 'APPROVED', challan_number },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();
    return res.json({ success: true, message: 'Order approved successfully', data: { status: 'APPROVED', challan_number } });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// Flag Order
exports.flagOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Reason for flagging is required' });
    }

    const order = await Order.findByPk(id, { transaction: t, lock: true });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ success: false, error: `Cannot flag order in ${order.status} status` });
    }

    const previousStatus = order.status;

    // Update status & reason
    await order.update({
      status: 'FLAGGED',
      flag_reason: reason.trim(),
    }, { transaction: t });

    // Release reservation (or keep it? In system specs, flagged keeps reservation or releases it?
    // Let's release it since it's flagged and needs action.
    const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t });
    for (const item of items) {
      const sr = await StockReserved.findOne({ where: { product_id: item.product_id }, transaction: t, lock: true });
      if (sr) {
        const newResQty = Math.max(0, parseFloat(sr.quantity || 0) - item.quantity);
        await sr.update({ quantity: newResQty }, { transaction: t });
      }
    }

    // Status history
    await OrderStatusHistory.create({
      order_id: order.id,
      from_status: previousStatus,
      to_status: 'FLAGGED',
      changed_by: req.user.id,
      reason: reason.trim(),
    }, { transaction: t });

    // Create Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'update',
      module: 'orders',
      entity_type: 'order',
      entity_id: order.id,
      after_state: { status: 'FLAGGED', flag_reason: reason.trim() },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();
    return res.json({ success: true, message: 'Order flagged successfully', data: { status: 'FLAGGED', flag_reason: reason.trim() } });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// Return Order
exports.returnOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findByPk(id, { transaction: t, lock: true });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const previousStatus = order.status;

    // Update status
    await order.update({ status: 'RETURNED' }, { transaction: t });

    // Release reservations if it was PENDING or APPROVED but not dispatched yet
    if (previousStatus === 'PENDING' || previousStatus === 'APPROVED') {
      const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t });
      for (const item of items) {
        const sr = await StockReserved.findOne({ where: { product_id: item.product_id }, transaction: t, lock: true });
        if (sr) {
          const newResQty = Math.max(0, parseFloat(sr.quantity || 0) - item.quantity);
          await sr.update({ quantity: newResQty }, { transaction: t });
        }
      }
    }

    // Status history
    await OrderStatusHistory.create({
      order_id: order.id,
      from_status: previousStatus,
      to_status: 'RETURNED',
      changed_by: req.user.id,
      reason: reason ? reason.trim() : 'Returned by Inventory Manager',
    }, { transaction: t });

    await t.commit();
    return res.json({ success: true, message: 'Order status changed to returned', data: { status: 'RETURNED' } });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};
