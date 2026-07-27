const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const {
  PurchaseOrder, PurchaseOrderItem, POEditLog, Vendor, Product, User,
  Order, OrderItem, Customer, StockOnHand, StockTransaction, AppSetting,
  Pricing, sequelize,
} = require('../../models');

// ── Helpers ───────────────────────────────────────────────────────────────────
function genPONumber() {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `#${ym}-${rand}`;   // # prefix as requested
}

function genShareToken() {
  return uuidv4().replace(/-/g, '');
}

async function verifyAdminPin(pin) {
  const setting = await AppSetting.findOne({ where: { key: 'admin_edit_pin' } });
  if (!setting?.value) {
    return { ok: false, code: 'PIN_NOT_SET', message: 'No admin PIN configured. Please set one in Settings first.' };
  }
  const valid = await bcrypt.compare(String(pin), setting.value);
  return valid ? { ok: true } : { ok: false, code: 'INVALID_PIN', message: 'Incorrect PIN' };
}

async function adjustStock(productId, qty, type, reference, performedBy, notes, t) {
  const stock = await StockOnHand.findOne({ where: { product_id: productId }, transaction: t, lock: true });
  if (!stock) throw new Error(`Stock record not found for product ${productId}`);
  const after = parseFloat(stock.quantity) + qty;
  await stock.update({ quantity: after }, { transaction: t });
  await StockTransaction.create({
    product_id: productId, type, reference,
    quantity_change: qty, quantity_after: after,
    performed_by: performedBy, notes,
  }, { transaction: t });
}

function genInvoiceNumber() {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `INV-${ym}-${rand}`;
}

function buildIncludes() {
  return [
    { model: Vendor, as: 'vendor', required: false, attributes: ['id', 'company_name', 'gst'] },
    { model: User,   as: 'creator', required: false, attributes: ['id', 'name'] },
    { model: User,   as: 'returner', required: false, attributes: ['id', 'name'] },
    { model: PurchaseOrderItem, as: 'items', required: false,
      include: [{ model: Product, as: 'product', required: false, attributes: ['id', 'name', 'sku', 'dealer_landing_price'] }] },
  ];
}

// ── GET /api/v1/purchase-orders ───────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'sales_manager') where.created_by = req.user.id;
    const pos = await PurchaseOrder.findAll({ where, include: buildIncludes(), order: [['created_at', 'DESC']], paranoid: true });
    res.json({ success: true, data: pos });
  } catch (err) { next(err); }
};

// ── GET /api/v1/purchase-orders/:id ──────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        ...buildIncludes(),
        { model: POEditLog, as: 'editHistory', include: [{ model: User, as: 'editor', attributes: ['id', 'name'] }], order: [['created_at', 'DESC']] },
      ],
    });
    if (!po) return res.status(404).json({ success: false, error: 'PO not found' });
    res.json({ success: true, data: po });
  } catch (err) { next(err); }
};

// ── GET /api/v1/purchase-orders/public/:token — no auth ───────────────────────
exports.getPublicPO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({
      where: { share_token: req.params.token },
      include: buildIncludes(),
    });
    if (!po) return res.status(404).json({ success: false, error: 'PO not found' });
    res.json({ success: true, data: po });
  } catch (err) { next(err); }
};

// ── GET /api/v1/purchase-orders/:id/edit-history ─────────────────────────────
exports.getEditHistory = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const logs = await POEditLog.findAll({
      where: { po_id: req.params.id },
      include: [{ model: User, as: 'editor', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

// ── GET /api/v1/purchase-orders/order-items ───────────────────────────────────
exports.getOrderItems = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'sales_manager') where['$order.sales_manager_id$'] = req.user.id;
    const items = await OrderItem.findAll({
      include: [
        { model: Order, as: 'order', required: true,
          where: req.user.role === 'sales_manager' ? { sales_manager_id: req.user.id } : {},
          attributes: ['id', 'order_number', 'order_date', 'status', 'supplier', 'customer_company', 'challan_number'],
          include: [{ model: Customer, as: 'party', attributes: ['id', 'company_name'], required: false }] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'dealer_landing_price'], required: false },
      ],
      order: [[{ model: Order, as: 'order' }, 'created_at', 'DESC']],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

// ── POST /api/v1/purchase-orders — Admin creates PO ──────────────────────────
// Body: { pin, vendor_id?, vendor_name?, po_date, notes?, bill_number, invoice_number?, items: [{part_number, description, quantity, unit_price, product_id?}] }
exports.create = async (req, res, next) => {
  const roleName = typeof req.user?.role === 'object' ? req.user.role.name : req.user?.role;

  const t = await sequelize.transaction();
  try {
    const { vendor_id, vendor_name, po_date, notes, items = [], bill_number } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'At least one line item is required' });
    }
    if (!vendor_name?.trim() && !vendor_id) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Supplier / Vendor Name is compulsory for Purchase Orders' });
    }
    if (!bill_number?.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Bill number is required' });
    }

    let resolvedVendorName = (vendor_name || '').trim();
    if (vendor_id && !resolvedVendorName) {
      const v = await Vendor.findByPk(vendor_id, { transaction: t });
      if (v) resolvedVendorName = v.company_name;
    }

    const po_number  = genPONumber();
    const share_token = genShareToken();
    const inv_number  = genInvoiceNumber();

    let subtotal = 0;
    const itemsToCreate = [];

    for (const rawItem of items) {
      let { product_id, part_number, description, unit_price, quantity } = rawItem;
      const qty   = parseInt(quantity) || 1;
      const price = parseFloat(unit_price) || 0;
      const total = +(qty * price).toFixed(2);
      subtotal += total;

      let foundProd = null;
      if (product_id) {
        foundProd = await Product.findByPk(product_id, { transaction: t });
      } else if (part_number) {
        foundProd = await Product.findOne({ where: { sku: part_number.trim().toUpperCase() }, transaction: t });
      }

      if (!foundProd && part_number) {
        foundProd = await Product.create({
          sku: part_number.trim().toUpperCase(),
          name: description || part_number,
          dealer_landing_price: price,
        }, { transaction: t });
      }

      if (foundProd) {
        product_id = foundProd.id;
        if (!part_number) part_number = foundProd.sku;
        if (!description) description = foundProd.name || null;
      }

      itemsToCreate.push({
        product_id: product_id || null,
        part_number,
        description,
        unit_price: price,
        quantity: qty,
        total,
      });
    }

    const po = await PurchaseOrder.create({
      po_number,
      invoice_number: inv_number,
      share_token,
      vendor_id:   vendor_id || null,
      vendor_name: resolvedVendorName,
      po_date:     po_date || new Date(),
      notes:       notes || null,
      bill_number: bill_number.trim(),
      status:      'SUBMITTED',
      subtotal:    +subtotal.toFixed(2),
      total:       +subtotal.toFixed(2),
      created_by:  req.user.id,
    }, { transaction: t });

    for (const item of itemsToCreate) {
      await PurchaseOrderItem.create({ purchase_order_id: po.id, ...item }, { transaction: t });
    }

    const result = await PurchaseOrder.findByPk(po.id, { include: buildIncludes(), transaction: t });
    await t.commit();
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── PUT /api/v1/purchase-orders/:id — Admin edits PO ─────────────────────────
// Body: { pin, reason, notes?, vendor_name?, bill_number?, status?, items? }
exports.update = async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const { pin, reason, notes, vendor_name, bill_number, status, items } = req.body;
  if (!pin)            return res.status(400).json({ success: false, error: 'Admin PIN is required' });
  if (!reason?.trim()) return res.status(400).json({ success: false, error: 'Edit reason is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  const t = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, { transaction: t });
    if (!po) { await t.rollback(); return res.status(404).json({ success: false, error: 'PO not found' }); }
    if (po.is_returned) { await t.rollback(); return res.status(400).json({ success: false, error: 'Returned POs cannot be edited' }); }

    const changedFields = {};
    if (notes       !== undefined && notes       !== po.notes)        changedFields.notes       = { from: po.notes,       to: notes };
    if (vendor_name !== undefined && vendor_name !== po.vendor_name)  changedFields.vendor_name = { from: po.vendor_name, to: vendor_name };
    if (bill_number !== undefined && bill_number !== po.bill_number)  changedFields.bill_number = { from: po.bill_number, to: bill_number };
    if (status      !== undefined && status      !== po.status)       changedFields.status      = { from: po.status,      to: status };

    let newTotal = parseFloat(po.total || 0);

    if (Array.isArray(items)) {
      const currentItemsCount = await PurchaseOrderItem.count({ where: { purchase_order_id: po.id }, transaction: t });
      await PurchaseOrderItem.destroy({ where: { purchase_order_id: po.id }, transaction: t });

      let calculatedSubtotal = 0;
      for (const rawItem of items) {
        let { product_id, part_number, description, unit_price, quantity } = rawItem;
        const qty   = parseInt(quantity) || 1;
        const price = parseFloat(unit_price) || 0;
        const total = +(qty * price).toFixed(2);
        calculatedSubtotal += total;

        let foundProd = null;
        if (product_id) {
          foundProd = await Product.findByPk(product_id, { transaction: t });
        } else if (part_number) {
          foundProd = await Product.findOne({ where: { sku: String(part_number).trim().toUpperCase() }, transaction: t });
        }

        if (foundProd) {
          product_id = foundProd.id;
          if (!part_number) part_number = foundProd.sku;
          if (!description) description = foundProd.name || null;
        }

        await PurchaseOrderItem.create({
          purchase_order_id: po.id,
          product_id: product_id || null,
          part_number: part_number || 'ITEM',
          description: description || 'Item',
          unit_price: price,
          quantity: qty,
          total,
        }, { transaction: t });
      }

      newTotal = +calculatedSubtotal.toFixed(2);
      changedFields.items = { from: `${currentItemsCount} item(s)`, to: `${items.length} item(s)` };
      changedFields.total = { from: po.total, to: newTotal };
    }

    await po.update({
      notes:       notes       !== undefined ? notes       : po.notes,
      vendor_name: vendor_name !== undefined ? vendor_name : po.vendor_name,
      bill_number: bill_number !== undefined ? bill_number : po.bill_number,
      status:      status      !== undefined ? status      : po.status,
      subtotal:    newTotal,
      total:       newTotal,
    }, { transaction: t });

    await POEditLog.create({ po_id: po.id, edited_by: req.user.id, edit_reason: reason.trim(), changed_fields: changedFields }, { transaction: t });

    await t.commit();
    const result = await PurchaseOrder.findByPk(po.id, { include: buildIncludes() });
    res.json({ success: true, data: result });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── DELETE /api/v1/purchase-orders/:id — Admin deletes (restores stock) ───────
// Body: { pin }
exports.remove = async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const { pin } = req.body;
  if (!pin) return res.status(400).json({ success: false, error: 'Admin PIN is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  const t = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, { transaction: t });
    if (!po) { await t.rollback(); return res.status(404).json({ success: false, error: 'PO not found' }); }
    if (po.is_returned) { await t.rollback(); return res.status(400).json({ success: false, error: 'Returned POs cannot be deleted' }); }

    // Restore stock from PO items (if stock was added via this PO via inward)
    const txns = await StockTransaction.findAll({ where: { reference: po.po_number, type: 'stock_in' }, transaction: t });
    for (const txn of txns) {
      await adjustStock(txn.product_id, -Math.abs(parseFloat(txn.quantity_change)), 'adjustment', `VOID:${po.po_number}`, req.user.id, `Deleted PO ${po.po_number}`, t);
    }

    await po.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'PO deleted and stock restored' });
  } catch (err) { await t.rollback(); next(err); }
};

// ── POST /api/v1/purchase-orders/:id/return ──────────────────────────────────
// Body: { pin, reason, items: [ { product_id, sku, return_qty }, ... ] }
exports.returnPO = async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const { pin, reason, items } = req.body;
  if (!pin)    return res.status(400).json({ success: false, error: 'Admin PIN is required' });
  if (!reason?.trim()) return res.status(400).json({ success: false, error: 'Return reason is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  const t = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, { include: buildIncludes(), transaction: t });
    if (!po)              { await t.rollback(); return res.status(404).json({ success: false, error: 'PO not found' }); }

    const returnSummary = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const retQty = parseFloat(item.return_qty || 0);
        if (retQty <= 0) continue;

        let prodId = item.product_id;
        let skuName = item.sku || item.part_number;

        if (!prodId && skuName) {
          const prod = await Product.findOne({ where: { sku: skuName.trim().toUpperCase() }, transaction: t });
          if (prod) prodId = prod.id;
        }

        if (prodId) {
          // Returning a PO item reduces stock that was inwarded
          await adjustStock(
            prodId,
            -retQty,
            'released',
            `RETURN:${po.po_number}`,
            req.user.id,
            `Return of ${retQty} qty for ${skuName || prodId} on PO ${po.po_number}: ${reason.trim()}`,
            t
          );
          returnSummary.push(`${skuName || prodId}: returned ${retQty}`);
        }
      }
    } else {
      const txns = await StockTransaction.findAll({ where: { reference: po.po_number, type: 'stock_in' }, transaction: t });
      for (const txn of txns) {
        await adjustStock(txn.product_id, -Math.abs(parseFloat(txn.quantity_change)), 'released', `RETURN:${po.po_number}`, req.user.id, `Return of PO ${po.po_number}: ${reason.trim()}`, t);
      }
      returnSummary.push('All items returned');
    }

    const summaryText = returnSummary.length > 0 ? ` [${returnSummary.join(', ')}]` : '';

    await po.update({ is_returned: true, return_reason: `${reason.trim()}${summaryText}`, returned_at: new Date(), returned_by: req.user.id, status: 'RETURNED' }, { transaction: t });
    await POEditLog.create({ po_id: po.id, edited_by: req.user.id, edit_reason: `RETURN: ${reason.trim()}${summaryText}`, changed_fields: { status: { from: po.status, to: 'RETURNED' }, items_returned: returnSummary.join('; ') } }, { transaction: t });

    const result = await PurchaseOrder.findByPk(po.id, { include: buildIncludes(), transaction: t });
    await t.commit();
    res.json({ success: true, data: result, message: 'PO return recorded and stock adjusted' });
  } catch (err) { await t.rollback(); next(err); }
};
