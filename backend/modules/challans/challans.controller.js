const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const {
  Challan, ChallanEditLog, Order, OrderItem, Customer, Product,
  User, Region, Pricing, StockOnHand, StockTransaction, AppSetting,
  Notification, sequelize,
} = require('../../models');

// ── Helpers ───────────────────────────────────────────────────────────────────
function genChallanNumber() {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `CHN-${ym}-${rand}`;
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
    product_id: productId,
    type,
    reference,
    quantity_change: qty,
    quantity_after: after,
    performed_by: performedBy,
    notes,
  }, { transaction: t });
  return after;
}

function buildIncludes() {
  return [
    {
      model: Order, as: 'order', required: false,
      include: [
        { model: Customer, as: 'party', attributes: ['id', 'company_name'], include: [{ model: Region, as: 'region', attributes: ['id', 'name'] }] },
        { model: User, as: 'salesManager', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'dealer_landing_price'] }] },
      ],
    },
    { model: Customer, as: 'party', required: false, attributes: ['id', 'company_name'] },
    { model: User, as: 'creator', attributes: ['id', 'name'] },
    { model: User, as: 'returner', required: false, attributes: ['id', 'name'] },
    { model: ChallanEditLog, as: 'editHistory', required: false, include: [{ model: User, as: 'editor', attributes: ['id', 'name'] }] },
  ];
}

// ── GET /api/v1/challans ─────────────────────────────────────────────────────
exports.getChallans = async (req, res, next) => {
  try {
    const challans = await Challan.findAll({
      include: buildIncludes(),
      order: [['created_at', 'DESC']],
      paranoid: true,
    });
    return res.json({ success: true, data: challans });
  } catch (err) {
    console.error('getChallans error:', err);
    next(err);
  }
};

// ── GET /api/v1/challans/:id ─────────────────────────────────────────────────
exports.getChallanById = async (req, res, next) => {
  try {
    const challan = await Challan.findByPk(req.params.id, {
      include: [
        ...buildIncludes(),
        { model: ChallanEditLog, as: 'editHistory', include: [{ model: User, as: 'editor', attributes: ['id', 'name'] }], order: [['created_at', 'DESC']] },
      ],
    });
    if (!challan) return res.status(404).json({ success: false, error: 'Challan not found' });
    return res.json({ success: true, data: challan });
  } catch (err) { next(err); }
};

// ── GET /api/v1/challans/public/:token — no auth ─────────────────────────────
exports.getPublicChallan = async (req, res, next) => {
  try {
    const challan = await Challan.findOne({
      where: { share_token: req.params.token },
      include: buildIncludes(),
    });
    if (!challan) return res.status(404).json({ success: false, error: 'Challan not found' });
    return res.json({ success: true, data: challan });
  } catch (err) { next(err); }
};

// ── GET /api/v1/challans/:id/edit-history ────────────────────────────────────
exports.getEditHistory = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const logs = await ChallanEditLog.findAll({
      where: { challan_id: req.params.id },
      include: [{ model: User, as: 'editor', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

// ── POST /api/v1/challans — Admin creates standalone challan ─────────────────
// Body: { pin, party_id?, party_name?, supplier?, bill_number, notes?, items: [{product_id, sku, qty, price}] }
exports.createChallan = async (req, res, next) => {
  const { pin, party_id, party_name, supplier, bill_number, notes, items } = req.body;

  if (!bill_number?.trim()) return res.status(400).json({ success: false, error: 'Bill number is mandatory' });
  if (!items?.length) return res.status(400).json({ success: false, error: 'At least one item is required' });

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }

  if (!pin) return res.status(400).json({ success: false, error: 'Admin PIN is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  const t = await sequelize.transaction();
  try {
    // Validate each item: check price list & stock
    const itemWarnings = [];
    const itemsResolved = [];

    for (const item of items) {
      const sku = item.sku?.trim().toUpperCase();
      if (!sku) { await t.rollback(); return res.status(400).json({ success: false, error: 'Each item must have a part no (SKU)' }); }

      const product = await Product.findOne({ where: { sku }, transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Part no "${sku}" is not in the product/price list. Ask admin to add it first.` });
      }

      // Check pricing (price list)
      const pricing = await Pricing.findOne({
        where: { product_id: product.id, effective_to: { [Op.or]: [null, { [Op.gte]: new Date() }] } },
        order: [['effective_from', 'DESC']],
        transaction: t,
      });

      // Check stock
      const stock = await StockOnHand.findOne({ where: { product_id: product.id }, transaction: t });
      const stockQty = parseFloat(stock?.quantity || 0);
      const reqQty   = parseInt(item.qty) || 1;

      if (stockQty < reqQty) {
        itemWarnings.push({ sku, stock: stockQty, requested: reqQty });
        // Notify admin via system notification
        await Notification.create({
          recipient_id: req.user.id,
          sender_id:    req.user.id,
          type:         'stock_alert',
          title:        `Low stock: ${sku}`,
          message:      `Stock for ${sku} is ${stockQty}, but challan requests ${reqQty}. Consider adding to stock.`,
          link:         `/admin/products`,
        }, { transaction: t });
      }

      const unitPrice = item.price ? parseFloat(item.price) : parseFloat(pricing?.dealer_landing_price || product.dealer_landing_price || 0);
      itemsResolved.push({ product, sku, qty: reqQty, price: unitPrice, stock, stockQty });
    }

    // Generate challan number & token
    const challan_number = genChallanNumber();
    const share_token    = genShareToken();

    let grand_total = 0;
    const challan = await Challan.create({
      challan_number,
      share_token,
      party_id:   party_id || null,
      party_name: party_name?.trim() || null,
      supplier:   supplier?.trim() || null,
      bill_number: bill_number.trim(),
      notes:       notes?.trim() || null,
      status:      'active',
      is_returned: false,
      created_by:  req.user.id,
      generated_at: new Date(),
    }, { transaction: t });

    // Deduct stock for each item
    for (const resolved of itemsResolved) {
      const lineTotal = resolved.qty * resolved.price;
      grand_total += lineTotal;
      await adjustStock(
        resolved.product.id,
        -resolved.qty,
        'dispatch',
        challan_number,
        req.user.id,
        `Challan ${challan_number}`,
        t
      );
    }

    await challan.update({ grand_total: +grand_total.toFixed(2) }, { transaction: t });

    await t.commit();

    const result = await Challan.findByPk(challan.id, { include: buildIncludes() });

    return res.status(201).json({
      success: true,
      data: result,
      warnings: itemWarnings.length ? itemWarnings : undefined,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── PUT /api/v1/challans/:id — Admin edits challan ───────────────────────────
// Body: { pin, reason, notes?, supplier?, party_name?, bill_number?, status? }
exports.updateChallan = async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const { pin, reason, notes, supplier, party_name, bill_number, status } = req.body;

  if (!pin)    return res.status(400).json({ success: false, error: 'Admin PIN is required' });
  if (!reason?.trim()) return res.status(400).json({ success: false, error: 'Edit reason is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  try {
    const challan = await Challan.findByPk(req.params.id);
    if (!challan) return res.status(404).json({ success: false, error: 'Challan not found' });

    if (challan.is_returned) return res.status(400).json({ success: false, error: 'Returned challans cannot be edited' });
    if (challan.bill_number) return res.status(400).json({ success: false, error: 'Challans with a bill number are locked for editing' });

    const changedFields = {};
    if (notes      !== undefined && notes      !== challan.notes)       changedFields.notes       = { from: challan.notes,       to: notes };
    if (supplier   !== undefined && supplier   !== challan.supplier)    changedFields.supplier    = { from: challan.supplier,    to: supplier };
    if (party_name !== undefined && party_name !== challan.party_name)  changedFields.party_name  = { from: challan.party_name,  to: party_name };
    if (bill_number !== undefined && bill_number !== challan.bill_number) changedFields.bill_number = { from: challan.bill_number, to: bill_number };
    if (status     !== undefined && status     !== challan.status)      changedFields.status      = { from: challan.status,      to: status };

    await challan.update({
      notes:        notes       !== undefined ? notes       : challan.notes,
      supplier:     supplier    !== undefined ? supplier    : challan.supplier,
      party_name:   party_name  !== undefined ? party_name  : challan.party_name,
      bill_number:  bill_number !== undefined ? bill_number : challan.bill_number,
      status:       status      !== undefined ? status      : challan.status,
    });

    await ChallanEditLog.create({
      challan_id: challan.id,
      edited_by:  req.user.id,
      edit_reason: reason.trim(),
      changed_fields: changedFields,
    });

    const result = await Challan.findByPk(challan.id, { include: buildIncludes() });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── DELETE /api/v1/challans/:id — Admin deletes (restores stock) ──────────────
// Body: { pin }
exports.deleteChallan = async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const { pin } = req.body;
  if (!pin) return res.status(400).json({ success: false, error: 'Admin PIN is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  const t = await sequelize.transaction();
  try {
    const challan = await Challan.findByPk(req.params.id, { transaction: t });
    if (!challan) { await t.rollback(); return res.status(404).json({ success: false, error: 'Challan not found' }); }

    if (challan.bill_number) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Challans with a bill number cannot be deleted' });
    }
    if (challan.is_returned) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Returned challans cannot be deleted' });
    }

    // Restore stock — pull from StockTransaction logs for this challan
    const txns = await StockTransaction.findAll({
      where: { reference: challan.challan_number, type: 'dispatch' },
      transaction: t,
    });

    for (const txn of txns) {
      await adjustStock(
        txn.product_id,
        Math.abs(parseFloat(txn.quantity_change)),
        'released',
        `VOID:${challan.challan_number}`,
        req.user.id,
        `Deleted challan ${challan.challan_number}`,
        t
      );
    }

    await challan.destroy({ transaction: t }); // soft-delete
    await t.commit();
    return res.json({ success: true, message: 'Challan deleted and stock restored' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── POST /api/v1/challans/:id/return ─────────────────────────────────────────
// Body: { pin, reason }
exports.returnChallan = async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  const { pin, reason } = req.body;
  if (!pin)    return res.status(400).json({ success: false, error: 'Admin PIN is required' });
  if (!reason?.trim()) return res.status(400).json({ success: false, error: 'Return reason is required' });

  const pinCheck = await verifyAdminPin(pin);
  if (!pinCheck.ok) return res.status(401).json({ success: false, error: pinCheck.message, code: pinCheck.code });

  const t = await sequelize.transaction();
  try {
    const challan = await Challan.findByPk(req.params.id, { transaction: t });
    if (!challan) { await t.rollback(); return res.status(404).json({ success: false, error: 'Challan not found' }); }
    if (challan.is_returned) { await t.rollback(); return res.status(400).json({ success: false, error: 'Challan is already returned' }); }

    // Restore stock
    const txns = await StockTransaction.findAll({
      where: { reference: challan.challan_number, type: 'dispatch' },
      transaction: t,
    });
    for (const txn of txns) {
      await adjustStock(
        txn.product_id,
        Math.abs(parseFloat(txn.quantity_change)),
        'released',
        `RETURN:${challan.challan_number}`,
        req.user.id,
        `Return of challan ${challan.challan_number}: ${reason}`,
        t
      );
    }

    const returnNote = challan.bill_number 
      ? `RETURN (Bill #${challan.bill_number} returned): ${reason.trim()}`
      : `RETURN: ${reason.trim()}`;

    await challan.update({
      is_returned:   true,
      return_reason: reason.trim(),
      returned_at:   new Date(),
      returned_by:   req.user.id,
      status:        'returned',
    }, { transaction: t });

    // Log the return in edit history
    await ChallanEditLog.create({
      challan_id:  challan.id,
      edited_by:   req.user.id,
      edit_reason: returnNote,
      changed_fields: { 
        status: { from: challan.status || 'active', to: 'returned' },
        ...(challan.bill_number ? { bill_status: { from: 'billed', to: 'returned' } } : {})
      },
    }, { transaction: t });

    // If linked to an Order, update order status to returned
    if (challan.order_id) {
      const order = await Order.findByPk(challan.order_id, { transaction: t });
      if (order) {
        await order.update({ status: 'returned' }, { transaction: t });
      }
    }

    await t.commit();
    const result = await Challan.findByPk(challan.id, { include: buildIncludes() });
    return res.json({ 
      success: true, 
      data: result, 
      message: challan.bill_number 
        ? `Challan and Bill #${challan.bill_number} returned, stock restored.` 
        : 'Challan returned and stock restored.' 
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── GET /api/v1/challans/check-part?sku=XXX ──────────────────────────────────
exports.checkPartAvailability = async (req, res, next) => {
  try {
    const sku = (req.query.sku || '').trim().toUpperCase();
    if (!sku) return res.status(400).json({ success: false, error: 'sku query param required' });

    const product = await Product.findOne({
      where: { sku },
      include: [
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: Pricing, as: 'pricingHistory', where: { effective_to: { [Op.or]: [null, { [Op.gte]: new Date() }] } }, required: false, order: [['effective_from', 'DESC']], limit: 1 },
      ],
    });

    if (!product) {
      return res.json({ success: true, status: 'not_found', sku });
    }

    const inPriceList = product.pricingHistory?.length > 0 || product.dealer_landing_price != null;
    const stockQty    = parseFloat(product.stockOnHand?.quantity || 0);
    const inStock     = stockQty > 0;

    return res.json({
      success: true,
      status: inStock ? 'in_stock' : (inPriceList ? 'price_list_only' : 'not_found'),
      sku,
      product: {
        id:                   product.id,
        name:                 product.name,
        sku:                  product.sku,
        stock_qty:            stockQty,
        dealer_landing_price: product.pricingHistory?.[0]?.dealer_landing_price ?? product.dealer_landing_price,
      },
    });
  } catch (err) { next(err); }
};
