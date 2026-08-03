const { fn, col } = require('sequelize');
const { Product, ProductCategory, UnitOfMeasure, Pricing, AuditLog, User, StockOnHand, StockReserved, StockDamaged, StockTransaction, InventoryAdjustment, Vendor, sequelize } = require('../../models');

// ── Products ──────────────────────────────────────────────────────────────────

exports.getProducts = async (req, res, next) => {
  try {
    const { InwardItem } = require('../../models');
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

    const withTx = await StockTransaction.findAll({
      attributes: ['product_id'],
      group: ['product_id'],
      raw: true,
    });
    const txSet = new Set(withTx.map(t => t.product_id));

    const withInward = await InwardItem.findAll({
      attributes: ['product_id'],
      group: ['product_id'],
      raw: true,
    });
    const inwardSet = new Set(withInward.map(i => i.product_id));

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
      productJson.is_in_stock = onHand > 0 || reserved > 0 || threshold > 0 || txSet.has(p.id) || inwardSet.has(p.id);

      return productJson;
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.initializeStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let stockRow = await StockOnHand.findOne({ where: { product_id: id } });
    if (!stockRow) {
      stockRow = await StockOnHand.create({ product_id: id, quantity: 0 });
    }
    let reservedRow = await StockReserved.findOne({ where: { product_id: id } });
    if (!reservedRow) {
      await StockReserved.create({ product_id: id, quantity: 0 });
    }

    await StockTransaction.create({
      product_id: id,
      type: 'adjustment',
      reference: `INIT-STOCK-${id}`,
      quantity_change: 0,
      quantity_after: parseFloat(stockRow.quantity || 0),
      performed_by: req.user?.id || 1,
      notes: 'Added item to stock inventory for PO/Challan'
    });

    const updated = await Product.findByPk(id, {
      include: [
        { model: ProductCategory, as: 'category', attributes: ['id', 'name', 'parent_id'] },
        { model: UnitOfMeasure, as: 'uom', attributes: ['id', 'name', 'code'] },
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
      ],
    });

    const productJson = updated.toJSON();
    const onHand = parseFloat(updated.stockOnHand?.quantity || 0);
    const reserved = parseFloat(updated.stockReserved?.quantity || 0);
    productJson.on_hand = onHand;
    productJson.reserved = reserved;
    productJson.available = onHand - reserved;
    productJson.is_in_stock = true;

    res.json({
      success: true,
      message: `Item "${updated.sku}" added to stock inventory (0 Qty)`,
      data: productJson
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, sku, category_id, uom_id, purchase_price, dealer_landing_price, selling_price, reorder_threshold, remarks, planner, location, supplier, gst_rate } = req.body;

    if (!sku?.trim()) return res.status(400).json({ success: false, error: 'Part No is required' });

    const cleanSku = sku.trim().toUpperCase();
    const existing = await Product.findOne({ where: { sku: cleanSku } });

    let plannerVal = planner?.trim() || null;
    if (!plannerVal && category_id) {
      const cat = await ProductCategory.findByPk(category_id);
      if (cat) plannerVal = cat.name;
    }

    if (existing) {
      // Product already exists in catalog/database. Update details and add initial stock if provided.
      await existing.update({
        name: name?.trim() || existing.name,
        category_id: category_id || existing.category_id,
        uom_id: uom_id || existing.uom_id,
        purchase_price: purchase_price !== undefined && purchase_price !== '' && purchase_price !== null ? parseFloat(purchase_price) : existing.purchase_price,
        dealer_landing_price: dealer_landing_price !== undefined && dealer_landing_price !== '' && dealer_landing_price !== null ? parseFloat(dealer_landing_price) : existing.dealer_landing_price,
        selling_price: selling_price !== undefined && selling_price !== '' && selling_price !== null ? parseFloat(selling_price) : existing.selling_price,
        planner: plannerVal || existing.planner,
        location: location || existing.location,
        supplier: supplier || existing.supplier,
        gst_rate: gst_rate !== undefined && gst_rate !== '' && gst_rate !== null ? parseFloat(gst_rate) : existing.gst_rate,
        remarks: remarks || existing.remarks,
      });

      const initStock = parseFloat(req.body.initial_stock || req.body.quantity || req.body.stock_quantity || 0);
      let stockRow = await StockOnHand.findOne({ where: { product_id: existing.id } });
      if (stockRow) {
        if (initStock > 0) {
          stockRow.quantity = parseFloat(stockRow.quantity || 0) + initStock;
          await stockRow.save();
        }
      } else {
        stockRow = await StockOnHand.create({ product_id: existing.id, quantity: initStock });
      }

      let reservedRow = await StockReserved.findOne({ where: { product_id: existing.id } });
      if (!reservedRow) {
        await StockReserved.create({ product_id: existing.id, quantity: 0 });
      }

      if (initStock > 0) {
        const currentQty = stockRow ? parseFloat(stockRow.quantity || 0) : initStock;
        await StockTransaction.create({
          product_id: existing.id,
          type: 'stock_in',
          reference: `PRODUCT-${existing.id}`,
          quantity_change: initStock,
          quantity_after: currentQty,
          performed_by: req.user?.id || 1,
          notes: 'Stock added via Product form'
        });
      }

      const result = await Product.findByPk(existing.id, {
        include: [
          { model: ProductCategory, as: 'category', attributes: ['id', 'name', 'parent_id'] },
          { model: UnitOfMeasure, as: 'uom', attributes: ['id', 'name', 'code'] },
          { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
          { model: StockReserved, as: 'stockReserved', attributes: ['quantity'] },
        ],
      });

      const onHand = parseFloat(result.stockOnHand?.quantity || 0);
      const reserved = parseFloat(result.stockReserved?.quantity || 0);
      const productJson = result.toJSON();
      productJson.on_hand = onHand;
      productJson.reserved = reserved;
      productJson.available = onHand - reserved;

      return res.json({ success: true, data: productJson, message: 'Existing product updated with stock' });
    }

    const product = await Product.create({
      name: name?.trim() || null,
      sku: cleanSku,
      category_id: category_id || null,
      uom_id: uom_id || null,
      purchase_price: purchase_price !== undefined && purchase_price !== '' && purchase_price !== null ? parseFloat(purchase_price) : null,
      dealer_landing_price: dealer_landing_price !== undefined && dealer_landing_price !== '' && dealer_landing_price !== null ? parseFloat(dealer_landing_price) : null,
      selling_price: selling_price !== undefined && selling_price !== '' && selling_price !== null ? parseFloat(selling_price) : null,
      reorder_threshold: reorder_threshold ? parseInt(reorder_threshold) : 0,
      remarks: remarks || null,
      planner: plannerVal,
      location: location || null,
      supplier: supplier || null,
      gst_rate: gst_rate !== undefined && gst_rate !== '' && gst_rate !== null ? parseFloat(gst_rate) : 18.00,
    });

    // Create initial stock rows & Pricing history row
    const initStock = parseFloat(req.body.initial_stock || req.body.quantity || req.body.stock_quantity || 0);
    await StockOnHand.create({ product_id: product.id, quantity: initStock });
    await StockReserved.create({ product_id: product.id, quantity: 0 });

    if (initStock > 0) {
      await StockTransaction.create({
        product_id: product.id,
        type: 'stock_in',
        reference: `PRODUCT-${product.id}`,
        quantity_change: initStock,
        quantity_after: initStock,
        performed_by: req.user?.id || 1,
        notes: 'Initial stock on product creation'
      });
    }

    if (hasBodyPrices) {
      await Pricing.create({
        product_id: product.id,
        purchase_price: product.purchase_price,
        dealer_landing_price: product.dealer_landing_price,
        selling_price: product.selling_price,
        effective_from: new Date().toISOString().split('T')[0],
        created_by: req.user?.id || null,
        notes: 'Created via Products Catalog'
      });
    }

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

    const { name, sku, category_id, uom_id, purchase_price, dealer_landing_price, selling_price, reorder_threshold, remarks, planner, location, supplier, gst_rate } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const existing = await Product.findOne({ where: { sku: sku.trim().toUpperCase() } });
      if (existing) return res.status(400).json({ success: false, error: 'A product with this Part No already exists' });
    }

    if (name !== undefined) product.name = name ? name.trim() : null;
    if (sku !== undefined) product.sku = sku.trim().toUpperCase();
    if (category_id !== undefined) {
      product.category_id = category_id || null;
      if (!planner && category_id) {
        const cat = await ProductCategory.findByPk(category_id);
        if (cat) product.planner = cat.name;
      }
    }
    if (uom_id !== undefined) product.uom_id = uom_id || null;
    if (purchase_price !== undefined) product.purchase_price = purchase_price !== '' && purchase_price !== null ? parseFloat(purchase_price) : null;
    if (dealer_landing_price !== undefined) product.dealer_landing_price = dealer_landing_price !== '' && dealer_landing_price !== null ? parseFloat(dealer_landing_price) : null;
    if (selling_price !== undefined) product.selling_price = selling_price !== '' && selling_price !== null ? parseFloat(selling_price) : null;
    if (reorder_threshold !== undefined) product.reorder_threshold = reorder_threshold ? parseInt(reorder_threshold) : 0;
    if (remarks !== undefined) product.remarks = remarks || null;
    if (planner !== undefined) product.planner = planner ? planner.trim() : null;
    if (location !== undefined) product.location = location || null;
    if (supplier !== undefined) product.supplier = supplier || null;
    if (gst_rate !== undefined) product.gst_rate = gst_rate !== '' && gst_rate !== null ? parseFloat(gst_rate) : 18.00;

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

exports.bulkImport = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { items, stock_mode = 'absolute', price_mode = 'merge', target_supplier, effective_from, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'No items provided for import' });
    }

    // Require vendor selection and verify vendor exists in database
    const supplierName = target_supplier?.trim() || items.find(i => i.supplier?.trim())?.supplier?.trim();
    if (!supplierName) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Please select a vendor from the dropdown before uploading a price list.'
      });
    }

    const { Op } = require('sequelize');
    const vendorRecord = await Vendor.findOne({
      where: { company_name: { [Op.like]: supplierName } },
      transaction: t
    });

    if (!vendorRecord) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: `Vendor "${supplierName}" does not exist in the database. Please add the vendor in the Vendors directory (Parties page) before importing a price list.`
      });
    }

    const skus = items.map(item => item.sku?.trim().toUpperCase()).filter(Boolean);
    const uniqueSkus = [...new Set(skus)];

    // If price_mode === 'overwrite' and target_supplier is provided, remove old products for this supplier not in the new file
    if (price_mode === 'overwrite' && target_supplier) {
      const { Op } = require('sequelize');
      await Product.destroy({
        where: {
          supplier: target_supplier,
          sku: { [Op.notIn]: uniqueSkus }
        },
        force: true,
        transaction: t
      });
    }

    const existingProducts = await Product.findAll({
      where: { sku: uniqueSkus },
      transaction: t
    });

    const productMap = {};
    existingProducts.forEach(p => {
      productMap[p.sku] = p;
    });

    const importDetails = [];
    const effFrom = effective_from || new Date().toISOString().split('T')[0];

    const toNum = (val, fallback = null) => {
      if (val === undefined || val === null || val === '') return fallback;
      const num = parseFloat(String(val).replace(/,/g, '').trim());
      return isNaN(num) ? fallback : num;
    };

    // Step 2: Perform the updates or insertions
    for (const item of items) {
      if (!item.sku?.trim()) continue;
      const sku = item.sku.trim().toUpperCase();
      let product = productMap[sku];
      let isNewCreated = false;

      // If product doesn't exist, create it on-the-fly!
      if (!product) {
        product = await Product.create({
          name: item.name?.trim() || null,
          sku: sku,
          planner: item.planner?.trim() || null,
          location: item.location?.trim() || null,
          supplier: item.supplier?.trim() || null,
          purchase_price: toNum(item.purchase_price, null),
          dealer_landing_price: toNum(item.dealer_landing_price, null),
          selling_price: toNum(item.selling_price, null),
          category_id: null,
          uom_id: null,
          gst_rate: toNum(item.gst_rate, 18.00),
        }, { transaction: t });

        // Create initial stock rows if missing
        await StockOnHand.findOrCreate({ where: { product_id: product.id }, defaults: { product_id: product.id, quantity: 0 }, transaction: t });
        await StockReserved.findOrCreate({ where: { product_id: product.id }, defaults: { product_id: product.id, quantity: 0 }, transaction: t });

        productMap[sku] = product;
        isNewCreated = true;
      } else {
        // Overwrite name, planner, location, supplier, gst_rate on re-upload
        if (item.name?.trim()) product.name = item.name.trim();
        if (item.planner !== undefined && item.planner !== null) product.planner = item.planner.trim();
        if (item.location !== undefined && item.location !== null) product.location = item.location.trim();
        if (item.supplier !== undefined && item.supplier !== null) product.supplier = item.supplier.trim();
        if (item.gst_rate !== undefined && item.gst_rate !== null && item.gst_rate !== '') product.gst_rate = toNum(item.gst_rate, 18.00);

        await StockOnHand.findOrCreate({ where: { product_id: product.id }, defaults: { product_id: product.id, quantity: 0 }, transaction: t });
        await StockReserved.findOrCreate({ where: { product_id: product.id }, defaults: { product_id: product.id, quantity: 0 }, transaction: t });

        await product.save({ transaction: t });
      }

      let priceUpdated = false;
      let stockUpdated = false;
      let oldQty = 0;
      let newQty = 0;
      let oldPrices = {
        purchase_price: isNewCreated ? 0 : product.purchase_price,
        dealer_landing_price: isNewCreated ? null : product.dealer_landing_price,
        selling_price: isNewCreated ? 0 : product.selling_price
      };

      // Check if price updates are provided
      const hasPurchase = item.purchase_price !== undefined && item.purchase_price !== null && item.purchase_price !== '';
      const hasSelling = item.selling_price !== undefined && item.selling_price !== null && item.selling_price !== '';
      const hasDealer = item.dealer_landing_price !== undefined && item.dealer_landing_price !== null && item.dealer_landing_price !== '';
      
      if (hasPurchase || hasSelling || hasDealer) {
        const parsedPurchase = hasPurchase ? toNum(item.purchase_price, product.purchase_price) : product.purchase_price;
        const parsedSelling = hasSelling ? toNum(item.selling_price, product.selling_price) : product.selling_price;
        const parsedDealer = hasDealer ? toNum(item.dealer_landing_price, product.dealer_landing_price) : product.dealer_landing_price;

        product.purchase_price = parsedPurchase;
        product.selling_price = parsedSelling;
        product.dealer_landing_price = parsedDealer;
        await product.save({ transaction: t });

        // Add to pricing history
        await Pricing.create({
          product_id: product.id,
          purchase_price: parsedPurchase,
          dealer_landing_price: parsedDealer,
          selling_price: parsedSelling,
          effective_from: effFrom,
          created_by: req.user?.id || null,
          notes: notes || 'Bulk price import'
        }, { transaction: t });

        // Audit Log for pricing update
        await AuditLog.create({
          actor_id: req.user?.id || 1,
          actor_name: req.user?.name || 'System',
          actor_role: req.user?.role || 'admin',
          action_type: 'price_update',
          module: 'products',
          entity_type: 'pricing',
          entity_id: product.id,
          before_state: oldPrices,
          after_state: { purchase_price: parsedPurchase, dealer_landing_price: parsedDealer, selling_price: parsedSelling },
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }, { transaction: t });

        priceUpdated = true;
      }

      // Check if stock update is provided
      if (item.quantity !== undefined && item.quantity !== null && item.quantity !== '') {
        const qtyToImport = parseFloat(item.quantity);
        if (!isNaN(qtyToImport) && qtyToImport > 0) {
          // Check if product is in price list
          const hasDbPricing = product.dealer_landing_price != null || product.purchase_price != null || product.selling_price != null ||
            (await Pricing.count({ where: { product_id: product.id }, transaction: t })) > 0;
          const inPriceList = priceUpdated || hasDbPricing;

          if (!inPriceList) {
            throw new Error(`Stock cannot be added for product '${product.sku}' because it is not in the price list.`);
          }

          // Ensure stock rows exist
          await StockOnHand.findOrCreate({ where: { product_id: product.id }, defaults: { product_id: product.id, quantity: 0 }, transaction: t });
          await StockReserved.findOrCreate({ where: { product_id: product.id }, defaults: { product_id: product.id, quantity: 0 }, transaction: t });

          const soh = await StockOnHand.findOne({ where: { product_id: product.id }, transaction: t, lock: true });
          oldQty = parseFloat(soh.quantity);

          if (stock_mode === 'relative') {
            newQty = oldQty + qtyToImport;
          } else {
            newQty = qtyToImport;
          }

          const delta = newQty - oldQty;
          await soh.update({ quantity: newQty }, { transaction: t });

          // Record adjustment
          const adjustment = await InventoryAdjustment.create({
            product_id: product.id,
            reason: notes || 'Bulk stock import',
            quantity_before: oldQty,
            quantity_after: newQty,
            approved_by: req.user?.id || 1,
            performed_by: req.user?.id || 1
          }, { transaction: t });

          // Record stock transaction ledger entry
          await StockTransaction.create({
            product_id: product.id,
            type: delta >= 0 ? 'stock_in' : 'dispatch',
            reference: `IMPORT-${adjustment.id}`,
            quantity_change: delta,
            quantity_after: newQty,
            performed_by: req.user?.id || 1,
            notes: notes || 'Bulk stock import'
          }, { transaction: t });

          stockUpdated = true;
        }
      }

      if (priceUpdated || stockUpdated || isNewCreated) {
        importDetails.push({
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          is_new_created: isNewCreated,
          price_updated: priceUpdated,
          stock_updated: stockUpdated,
          old_prices: priceUpdated ? oldPrices : null,
          new_prices: priceUpdated ? { purchase_price: product.purchase_price, dealer_landing_price: product.dealer_landing_price, selling_price: product.selling_price } : null,
          old_stock: stockUpdated ? oldQty : null,
          new_stock: stockUpdated ? newQty : null
        });
      }
    }

    // Write a parent AuditLog entry for the bulk import
    const mainLog = await AuditLog.create({
      actor_id: req.user?.id || 1,
      actor_name: req.user?.name || 'System',
      actor_role: req.user?.role || 'admin',
      action_type: 'import',
      module: 'products',
      entity_type: 'bulk_import',
      entity_id: null,
      before_state: { total_items: items.length },
      after_state: {
        success_count: importDetails.length,
        stock_mode,
        notes,
        items: importDetails
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${importDetails.length} items.`,
      data: {
        import_id: mainLog.id,
        items_imported: importDetails.length
      }
    });

  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getImportHistory = async (req, res, next) => {
  try {
    const records = await AuditLog.findAll({
      where: {
        action_type: 'import',
        entity_type: 'bulk_import'
      },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/products/:id/transactions ─────────────────────────────────────
// Part-wise transaction history
exports.getProductTransactions = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, { attributes: ['id', 'name', 'sku'] });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const transactions = await StockTransaction.findAll({
      where: { product_id: req.params.id },
      include: [{ model: User, as: 'performer', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    res.json({ success: true, data: transactions, product });
  } catch (err) { next(err); }
};

// ── GET /api/v1/products/check-availability?sku=XXX ──────────────────────────
// Check if a part no is in price list and/or stock
exports.checkPartAvailability = async (req, res, next) => {
  try {
    const sku = (req.query.sku || '').trim().toUpperCase();
    if (!sku) return res.status(400).json({ success: false, error: 'sku query param required' });

    const product = await Product.findOne({
      where: { sku },
      include: [
        { model: StockOnHand, as: 'stockOnHand', attributes: ['quantity'] },
        {
          model: Pricing, as: 'pricingHistory',
          where: { [require('sequelize').Op.or]: [{ effective_to: null }, { effective_to: { [require('sequelize').Op.gte]: new Date() } }] },
          required: false,
          order: [['effective_from', 'DESC']],
          limit: 1,
        },
      ],
    });

    if (!product) return res.json({ success: true, status: 'not_found', sku });

    const inPriceList = (product.pricingHistory?.length > 0) || product.dealer_landing_price != null;
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
