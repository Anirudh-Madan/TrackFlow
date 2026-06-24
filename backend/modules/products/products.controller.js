const { fn, col } = require('sequelize');
const { Product, ProductCategory, UnitOfMeasure, Pricing, AuditLog, User, StockOnHand, StockReserved, StockDamaged, sequelize } = require('../../models');

// ── Products ──────────────────────────────────────────────────────────────────

exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: ProductCategory, as: 'category', attributes: ['id', 'name', 'parent_id'] },
        { model: UnitOfMeasure, as: 'uom', attributes: ['id', 'name', 'code'] },
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
      ],
      order: [['name', 'ASC']],
    });

    const damagedTotals = await StockDamaged.findAll({
      attributes: ['product_id', [fn('SUM', col('quantity')), 'total_damaged']],
      group: ['product_id'],
      raw: true,
    });
    const damagedMap = {};
    damagedTotals.forEach(d => { damagedMap[d.product_id] = parseFloat(d.total_damaged) || 0; });

    const data = products.map(p => {
      const onHand    = parseFloat(p.stockOnHand?.quantity || 0);
      const reserved  = parseFloat(p.stockReserved?.quantity || 0);
      const damaged   = damagedMap[p.id] || 0;
      const available = onHand - reserved - damaged;
      const threshold = p.reorder_threshold || 0;

      const productJson = p.toJSON();
      productJson.on_hand = onHand;
      productJson.reserved = reserved;
      productJson.damaged = damaged;
      productJson.available = available;
      productJson.is_low_stock = threshold > 0 && available <= threshold;

      return productJson;
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, sku, category_id, uom_id, purchase_price, dealer_landing_price, selling_price, reorder_threshold, remarks } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Product name is required' });
    if (!sku?.trim()) return res.status(400).json({ success: false, error: 'SKU is required' });

    const existing = await Product.findOne({ where: { sku: sku.trim().toUpperCase() } });
    if (existing) return res.status(400).json({ success: false, error: 'A product with this SKU already exists' });

    const product = await Product.create({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category_id: category_id || null,
      uom_id: uom_id || null,
      purchase_price: parseFloat(purchase_price) || 0,
      dealer_landing_price: dealer_landing_price ? parseFloat(dealer_landing_price) : null,
      selling_price: parseFloat(selling_price) || 0,
      reorder_threshold: parseInt(reorder_threshold) || 0,
      remarks: remarks || null,
    });

    // Create initial stock rows
    await StockOnHand.create({ product_id: product.id, quantity: 0 });
    await StockReserved.create({ product_id: product.id, quantity: 0 });

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'create', module: 'products', entity_type: 'product', entity_id: product.id,
      after_state: { id: product.id, name: product.name, sku: product.sku },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    const result = await Product.findByPk(product.id, {
      include: [
        { model: ProductCategory, as: 'category', attributes: ['id', 'name', 'parent_id'] },
        { model: UnitOfMeasure, as: 'uom', attributes: ['id', 'name', 'code'] },
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
      ],
    });

    const onHand    = parseFloat(result.stockOnHand?.quantity || 0);
    const reserved  = parseFloat(result.stockReserved?.quantity || 0);
    const damaged   = 0;
    const available = onHand - reserved - damaged;
    const threshold = result.reorder_threshold || 0;

    const resultJson = result.toJSON();
    resultJson.on_hand = onHand;
    resultJson.reserved = reserved;
    resultJson.damaged = damaged;
    resultJson.available = available;
    resultJson.is_low_stock = threshold > 0 && available <= threshold;

    res.status(201).json({ success: true, data: resultJson });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const { name, sku, category_id, uom_id, purchase_price, dealer_landing_price, selling_price, reorder_threshold, remarks } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const existing = await Product.findOne({ where: { sku: sku.trim().toUpperCase() } });
      if (existing) return res.status(400).json({ success: false, error: 'A product with this SKU already exists' });
    }

    if (name !== undefined) product.name = name.trim();
    if (sku !== undefined) product.sku = sku.trim().toUpperCase();
    if (category_id !== undefined) product.category_id = category_id || null;
    if (uom_id !== undefined) product.uom_id = uom_id || null;
    if (purchase_price !== undefined) product.purchase_price = parseFloat(purchase_price) || 0;
    if (dealer_landing_price !== undefined) product.dealer_landing_price = dealer_landing_price ? parseFloat(dealer_landing_price) : null;
    if (selling_price !== undefined) product.selling_price = parseFloat(selling_price) || 0;
    if (reorder_threshold !== undefined) product.reorder_threshold = parseInt(reorder_threshold) || 0;
    if (remarks !== undefined) product.remarks = remarks || null;

    await product.save();

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'update', module: 'products', entity_type: 'product', entity_id: product.id,
      after_state: { id: product.id, name: product.name, sku: product.sku },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    const result = await Product.findByPk(product.id, {
      include: [
        { model: ProductCategory, as: 'category', attributes: ['id', 'name', 'parent_id'] },
        { model: UnitOfMeasure, as: 'uom', attributes: ['id', 'name', 'code'] },
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
      ],
    });

    const damagedTotals = await StockDamaged.findAll({
      where: { product_id: product.id },
      attributes: [[fn('SUM', col('quantity')), 'total_damaged']],
      raw: true,
    });
    const damaged = parseFloat(damagedTotals[0]?.total_damaged) || 0;

    const onHand    = parseFloat(result.stockOnHand?.quantity || 0);
    const reserved  = parseFloat(result.stockReserved?.quantity || 0);
    const available = onHand - reserved - damaged;
    const threshold = result.reorder_threshold || 0;

    const resultJson = result.toJSON();
    resultJson.on_hand = onHand;
    resultJson.reserved = reserved;
    resultJson.damaged = damaged;
    resultJson.available = available;
    resultJson.is_low_stock = threshold > 0 && available <= threshold;

    res.json({ success: true, data: resultJson });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await product.destroy();

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'delete', module: 'products', entity_type: 'product', entity_id: product.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Categories ────────────────────────────────────────────────────────────────

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ProductCategory.findAll({
      include: [{ model: ProductCategory, as: 'parent', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, parent_id, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Category name is required' });

    const category = await ProductCategory.create({
      name: name.trim(),
      parent_id: parent_id || null,
      description: description || null,
    });

    const result = await ProductCategory.findByPk(category.id, {
      include: [{ model: ProductCategory, as: 'parent', attributes: ['id', 'name'] }],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });

    const { name, parent_id, description } = req.body;
    if (name) category.name = name.trim();
    if (parent_id !== undefined) category.parent_id = parent_id || null;
    if (description !== undefined) category.description = description || null;

    await category.save();

    const result = await ProductCategory.findByPk(category.id, {
      include: [{ model: ProductCategory, as: 'parent', attributes: ['id', 'name'] }],
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });

    await category.destroy();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Units of Measure ──────────────────────────────────────────────────────────

exports.getUOM = async (req, res, next) => {
  try {
    const uoms = await UnitOfMeasure.findAll({ order: [['code', 'ASC']] });
    res.json({ success: true, data: uoms });
  } catch (err) {
    next(err);
  }
};

exports.createUOM = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    if (!code?.trim()) return res.status(400).json({ success: false, error: 'Code is required' });

    const existing = await UnitOfMeasure.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) return res.status(400).json({ success: false, error: 'A UOM with this code already exists' });

    const uom = await UnitOfMeasure.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
    });

    res.status(201).json({ success: true, data: uom });
  } catch (err) {
    next(err);
  }
};

exports.updateUOM = async (req, res, next) => {
  try {
    const uom = await UnitOfMeasure.findByPk(req.params.id);
    if (!uom) return res.status(404).json({ success: false, error: 'UOM not found' });

    const { name, code, description } = req.body;
    if (name) uom.name = name.trim();
    if (code) {
      const existing = await UnitOfMeasure.findOne({ where: { code: code.trim().toUpperCase() } });
      if (existing && existing.id !== uom.id) return res.status(400).json({ success: false, error: 'Code already in use' });
      uom.code = code.trim().toUpperCase();
    }
    if (description !== undefined) uom.description = description || null;

    await uom.save();
    res.json({ success: true, data: uom });
  } catch (err) {
    next(err);
  }
};

exports.deleteUOM = async (req, res, next) => {
  try {
    const uom = await UnitOfMeasure.findByPk(req.params.id);
    if (!uom) return res.status(404).json({ success: false, error: 'UOM not found' });

    await uom.destroy();
    res.json({ success: true, message: 'UOM deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Pricing ───────────────────────────────────────────────────────────────────

exports.getPricing = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.product_id) where.product_id = req.query.product_id;

    const records = await Pricing.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
      order: [['effective_from', 'DESC']],
    });

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

exports.createPricing = async (req, res, next) => {
  try {
    const { product_id, purchase_price, dealer_landing_price, selling_price, effective_from, effective_to, notes } = req.body;

    if (!product_id) return res.status(400).json({ success: false, error: 'Product is required' });
    if (!purchase_price && purchase_price !== 0) return res.status(400).json({ success: false, error: 'Purchase price is required' });
    if (!selling_price && selling_price !== 0) return res.status(400).json({ success: false, error: 'Selling price is required' });
    if (!effective_from) return res.status(400).json({ success: false, error: 'Effective from date is required' });

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const record = await Pricing.create({
      product_id,
      purchase_price: parseFloat(purchase_price),
      dealer_landing_price: dealer_landing_price ? parseFloat(dealer_landing_price) : null,
      selling_price: parseFloat(selling_price),
      effective_from,
      effective_to: effective_to || null,
      created_by: req.user.id,
      notes: notes || null,
    });

    // Also update the denormalized prices on the product
    product.purchase_price = parseFloat(purchase_price);
    product.dealer_landing_price = dealer_landing_price ? parseFloat(dealer_landing_price) : null;
    product.selling_price = parseFloat(selling_price);
    await product.save();

    await AuditLog.create({
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      action_type: 'price_update', module: 'products', entity_type: 'pricing', entity_id: record.id,
      after_state: { product_id, selling_price, effective_from },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    const result = await Pricing.findByPk(record.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updatePricing = async (req, res, next) => {
  try {
    const record = await Pricing.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Pricing record not found' });

    const { purchase_price, dealer_landing_price, selling_price, effective_from, effective_to, notes } = req.body;

    if (purchase_price !== undefined) record.purchase_price = parseFloat(purchase_price);
    if (dealer_landing_price !== undefined) record.dealer_landing_price = dealer_landing_price ? parseFloat(dealer_landing_price) : null;
    if (selling_price !== undefined) record.selling_price = parseFloat(selling_price);
    if (effective_from !== undefined) record.effective_from = effective_from;
    if (effective_to !== undefined) record.effective_to = effective_to || null;
    if (notes !== undefined) record.notes = notes || null;

    await record.save();

    const result = await Pricing.findByPk(record.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deletePricing = async (req, res, next) => {
  try {
    const record = await Pricing.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Pricing record not found' });

    await record.destroy();
    res.json({ success: true, message: 'Pricing record deleted' });
  } catch (err) {
    next(err);
  }
};
