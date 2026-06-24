const { Op, fn, col, literal } = require('sequelize');
const {
  Product, ProductCategory, UnitOfMeasure,
  StockOnHand, StockReserved, StockDamaged, StockTransaction, InventoryAdjustment,
  User, AuditLog, sequelize,
} = require('../../models');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensure a product has a stock_on_hand and stock_reserved row.
 * If not, create them with quantity = 0.
 */
async function ensureStockRows(product_id) {
  await StockOnHand.findOrCreate({ where: { product_id }, defaults: { product_id, quantity: 0 } });
  await StockReserved.findOrCreate({ where: { product_id }, defaults: { product_id, quantity: 0 } });
}

// ─── Stock Summary ────────────────────────────────────────────────────────────

exports.getStockSummary = async (req, res, next) => {
  try {
    const { search, category_id } = req.query;

    const productWhere = {};
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }
    if (category_id) productWhere.category_id = category_id;

    const products = await Product.findAll({
      where: productWhere,
      include: [
        { model: ProductCategory, as: 'category', attributes: ['id', 'name'] },
        { model: UnitOfMeasure, as: 'uom', attributes: ['id', 'code'] },
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
      ],
      order: [['name', 'ASC']],
    });

    // Compute damaged totals per product in one query
    const damagedTotals = await StockDamaged.findAll({
      attributes: ['product_id', [fn('SUM', col('quantity')), 'total_damaged']],
      group: ['product_id'],
      raw: true,
    });
    const damagedMap = {};
    damagedTotals.forEach(d => { damagedMap[d.product_id] = parseFloat(d.total_damaged) || 0; });

    const summary = products.map(p => {
      const onHand    = parseFloat(p.stockOnHand?.quantity || 0);
      const reserved  = parseFloat(p.stockReserved?.quantity || 0);
      const damaged   = damagedMap[p.id] || 0;
      const available = onHand - reserved - damaged;
      const threshold = p.reorder_threshold || 0;

      return {
        id:           p.id,
        name:         p.name,
        sku:          p.sku,
        category:     p.category,
        uom:          p.uom,
        on_hand:      onHand,
        reserved,
        damaged,
        available,
        reorder_threshold: threshold,
        is_low_stock: threshold > 0 && available <= threshold,
      };
    });

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// ─── Low Stock (for Reorder Modal) ───────────────────────────────────────────

exports.getLowStock = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
        { model: UnitOfMeasure, as: 'uom', attributes: ['code'] },
      ],
      where: { reorder_threshold: { [Op.gt]: 0 } },
      order: [['name', 'ASC']],
    });

    const damagedTotals = await StockDamaged.findAll({
      attributes: ['product_id', [fn('SUM', col('quantity')), 'total_damaged']],
      group: ['product_id'],
      raw: true,
    });
    const damagedMap = {};
    damagedTotals.forEach(d => { damagedMap[d.product_id] = parseFloat(d.total_damaged) || 0; });

    const lowStock = products
      .map(p => {
        const onHand    = parseFloat(p.stockOnHand?.quantity || 0);
        const reserved  = parseFloat(p.stockReserved?.quantity || 0);
        const damaged   = damagedMap[p.id] || 0;
        const available = onHand - reserved - damaged;
        const threshold = p.reorder_threshold || 0;
        return { id: p.id, name: p.name, sku: p.sku, uom: p.uom, available, reorder_threshold: threshold };
      })
      .filter(p => p.available <= p.reorder_threshold);

    res.json({ success: true, data: lowStock, count: lowStock.length });
  } catch (err) {
    next(err);
  }
};

// ─── Transactions ─────────────────────────────────────────────────────────────

exports.getTransactions = async (req, res, next) => {
  try {
    const { product_id, type, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (product_id) where.product_id = product_id;
    if (type)       where.type = type;

    const { count, rows } = await StockTransaction.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'performer', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ success: true, data: rows, total: count });
  } catch (err) {
    next(err);
  }
};

// ─── Damaged Stock ────────────────────────────────────────────────────────────

exports.getDamaged = async (req, res, next) => {
  try {
    const { product_id } = req.query;
    const where = {};
    if (product_id) where.product_id = product_id;

    const records = await StockDamaged.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'recorder', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

exports.recordDamage = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, quantity, damage_reason, remarks } = req.body;

    if (!product_id)    return res.status(400).json({ success: false, error: 'product_id is required' });
    if (!quantity || parseFloat(quantity) <= 0)
      return res.status(400).json({ success: false, error: 'quantity must be > 0' });
    if (!damage_reason?.trim())
      return res.status(400).json({ success: false, error: 'damage_reason is required' });

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await ensureStockRows(product_id);

    const qty = parseFloat(quantity);

    // Create damage record
    const damage = await StockDamaged.create({
      product_id, quantity: qty, damage_reason: damage_reason.trim(),
      recorded_by: req.user.id, remarks: remarks || null,
    }, { transaction: t });

    // Deduct from on_hand
    const soh = await StockOnHand.findOne({ where: { product_id }, transaction: t, lock: true });
    const newQty = Math.max(0, parseFloat(soh.quantity) - qty);
    await soh.update({ quantity: newQty }, { transaction: t });

    // Log transaction
    await StockTransaction.create({
      product_id, type: 'damage', reference: `DMG-${damage.id}`,
      quantity_change: -qty, quantity_after: newQty,
      performed_by: req.user.id, notes: damage_reason,
    }, { transaction: t });

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'update', module: 'inventory', entity_type: 'stock_damaged', entity_id: damage.id,
      after_state: { product_id, quantity: qty, damage_reason },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();

    const result = await StockDamaged.findByPk(damage.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'recorder', attributes: ['id', 'name'] },
      ],
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─── Adjustments ──────────────────────────────────────────────────────────────

exports.getAdjustments = async (req, res, next) => {
  try {
    const { product_id } = req.query;
    const where = {};
    if (product_id) where.product_id = product_id;

    const records = await InventoryAdjustment.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'performer', attributes: ['id', 'name'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

exports.createAdjustment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, new_quantity, reason, remarks } = req.body;

    if (!product_id)          return res.status(400).json({ success: false, error: 'product_id is required' });
    if (new_quantity == null) return res.status(400).json({ success: false, error: 'new_quantity is required' });
    if (!reason?.trim())      return res.status(400).json({ success: false, error: 'reason is required' });

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await ensureStockRows(product_id);

    const soh = await StockOnHand.findOne({ where: { product_id }, transaction: t, lock: true });
    const qtyBefore = parseFloat(soh.quantity);
    const qtyAfter  = parseFloat(new_quantity);
    const delta     = qtyAfter - qtyBefore;

    await soh.update({ quantity: qtyAfter }, { transaction: t });

    const adjustment = await InventoryAdjustment.create({
      product_id, reason: reason.trim(),
      quantity_before: qtyBefore, quantity_after: qtyAfter,
      approved_by: null, performed_by: req.user.id,
      remarks: remarks || null,
    }, { transaction: t });

    await StockTransaction.create({
      product_id, type: 'adjustment', reference: `ADJ-${adjustment.id}`,
      quantity_change: delta, quantity_after: qtyAfter,
      performed_by: req.user.id, notes: reason,
    }, { transaction: t });

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'update', module: 'inventory', entity_type: 'inventory_adjustment', entity_id: adjustment.id,
      before_state: { quantity: qtyBefore },
      after_state:  { quantity: qtyAfter, reason },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();

    const result = await InventoryAdjustment.findByPk(adjustment.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'performer', attributes: ['id', 'name'] },
      ],
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─── Reorder (Place Order) ────────────────────────────────────────────────────

exports.placeReorder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, quantity } = req.body;

    if (!product_id) return res.status(400).json({ success: false, error: 'product_id is required' });
    if (!quantity || parseFloat(quantity) <= 0)
      return res.status(400).json({ success: false, error: 'quantity must be > 0' });

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await ensureStockRows(product_id);

    const qty = parseFloat(quantity);
    const soh = await StockOnHand.findOne({ where: { product_id }, transaction: t, lock: true });
    const newQty = parseFloat(soh.quantity) + qty;

    await soh.update({ quantity: newQty }, { transaction: t });

    const txn = await StockTransaction.create({
      product_id, type: 'stock_in',
      reference: `REORDER-${Date.now()}`,
      quantity_change: qty, quantity_after: newQty,
      performed_by: req.user.id,
      notes: `Reorder placed by ${req.user.name}`,
    }, { transaction: t });

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'create', module: 'inventory', entity_type: 'reorder', entity_id: txn.id,
      after_state: { product_id, quantity: qty },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();

    res.status(201).json({ success: true, message: `Reorder of ${qty} units placed for ${product.name}`, data: { product_id, quantity: qty, new_on_hand: newQty } });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
