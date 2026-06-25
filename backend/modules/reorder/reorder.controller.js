const { ReorderFlag, Product, User, Customer, InwardEntry, sequelize } = require('../../models');

// Create Reorder Flag
exports.createReorder = async (req, res, next) => {
  try {
    const { product_id, party_id, quantity_wanted, notes } = req.body;

    if (!product_id || !quantity_wanted || isNaN(quantity_wanted) || parseInt(quantity_wanted) <= 0) {
      return res.status(400).json({ success: false, error: 'Product ID and a valid quantity wanted are required' });
    }

    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (party_id) {
      const customer = await Customer.findByPk(party_id);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
    }

    const reorder = await ReorderFlag.create({
      product_id,
      flagged_by: req.user.id,
      party_id: party_id || null,
      quantity_wanted: parseInt(quantity_wanted),
      notes: notes ? notes.trim() : null,
      status: 'OPEN',
    });

    const result = await ReorderFlag.findByPk(reorder.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'flagger', attributes: ['id', 'name'] },
        { model: Customer, as: 'party', attributes: ['id', 'company_name'] },
      ],
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

// List Reorders
exports.getReorders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const flags = await ReorderFlag.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'flagger', attributes: ['id', 'name'] },
        { model: Customer, as: 'party', attributes: ['id', 'company_name'] },
        { model: InwardEntry, as: 'receivedViaInward', attributes: ['id', 'entry_number', 'supplier_name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: flags });
  } catch (error) {
    return next(error);
  }
};

// Update Reorder Status (OPEN -> ORDERED -> RECEIVED)
exports.updateReorderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['OPEN', 'ORDERED', 'RECEIVED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing status' });
    }

    const flag = await ReorderFlag.findByPk(id);
    if (!flag) {
      return res.status(404).json({ success: false, error: 'Reorder flag not found' });
    }

    const updates = { status };
    if (status === 'ORDERED' && flag.status === 'OPEN') {
      updates.ordered_at = new Date();
    }

    await flag.update(updates);

    const result = await ReorderFlag.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'flagger', attributes: ['id', 'name'] },
        { model: Customer, as: 'party', attributes: ['id', 'company_name'] },
      ],
    });

    return res.json({ success: true, message: 'Reorder flag updated successfully', data: result });
  } catch (error) {
    return next(error);
  }
};
