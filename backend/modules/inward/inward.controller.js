const { InwardEntry, InwardItem, Product, StockOnHand, StockTransaction, ReorderFlag, AuditLog, User, sequelize } = require('../../models');

// Helpers
async function ensureStockRows(product_id, transaction) {
  const [soh] = await StockOnHand.findOrCreate({
    where: { product_id },
    defaults: { product_id, quantity: 0 },
    transaction,
  });
  return soh;
}

// Create Inward Entry
exports.createInwardEntry = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { supplier_name, bill_number, bill_date, notes, items } = req.body;

    if (!supplier_name || !supplier_name.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Supplier name is required' });
    }
    if (!bill_number || !bill_number.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Bill number is required' });
    }
    if (!bill_date) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Bill date is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Items list is required' });
    }

    // Generate entry number: INW-YYYYMM-XXXX
    const dateObj = new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(1000 + Math.random() * 9000));
    const entry_number = `INW-${year}${month}-${random}`;

    // Create Entry Header
    const inwardEntry = await InwardEntry.create({
      entry_number,
      supplier_name: supplier_name.trim(),
      bill_number: bill_number.trim(),
      bill_date,
      received_by: req.user.id,
      notes: notes ? notes.trim() : null,
    }, { transaction: t });

    // Loop through items
    for (const item of items) {
      const { product_id, quantity_received } = item;
      const qty = parseInt(quantity_received);

      if (!product_id || isNaN(qty) || qty <= 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Invalid product or quantity received' });
      }

      const product = await Product.findByPk(product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ success: false, error: `Product with ID ${product_id} not found` });
      }

      // Create Inward Item
      await InwardItem.create({
        inward_entry_id: inwardEntry.id,
        product_id,
        quantity_received: qty,
      }, { transaction: t });

      // Update StockOnHand
      const soh = await ensureStockRows(product_id, t);
      // Lock row
      const lockedSoh = await StockOnHand.findOne({
        where: { product_id },
        transaction: t,
        lock: true,
      });

      const oldQty = parseFloat(lockedSoh.quantity || 0);
      const newQty = oldQty + qty;
      await lockedSoh.update({ quantity: newQty }, { transaction: t });

      // Log Stock Transaction
      await StockTransaction.create({
        product_id,
        type: 'stock_in',
        reference: entry_number,
        quantity_change: qty,
        quantity_after: newQty,
        performed_by: req.user.id,
        notes: `Inward goods receipt: ${entry_number}`,
      }, { transaction: t });

      // Auto-resolve Reorder Flags
      await ReorderFlag.update({
        status: 'RECEIVED',
        received_via_inward_id: inwardEntry.id,
        ordered_at: lockedSoh.updated_at || new Date(), // Set ordered_at to now if it was open
      }, {
        where: {
          product_id,
          status: ['OPEN', 'ORDERED'],
        },
        transaction: t,
      });
    }

    // Create Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'create',
      module: 'inward',
      entity_type: 'inward_entry',
      entity_id: inwardEntry.id,
      after_state: { entry_number, supplier_name, items_count: items.length },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, { transaction: t });

    await t.commit();

    // Fetch complete entry to return
    const result = await InwardEntry.findByPk(inwardEntry.id, {
      include: [
        {
          model: InwardItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
        },
        { model: User, as: 'receiver', attributes: ['id', 'name'] },
      ],
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// List Inward Entries
exports.getInwardEntries = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      const q = `%${search}%`;
      where[sequelize.Sequelize.Op.or] = [
        { entry_number: { [sequelize.Sequelize.Op.like]: q } },
        { supplier_name: { [sequelize.Sequelize.Op.like]: q } },
        { bill_number: { [sequelize.Sequelize.Op.like]: q } },
      ];
    }

    const entries = await InwardEntry.findAll({
      where,
      include: [
        {
          model: InwardItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
        },
        { model: User, as: 'receiver', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: entries });
  } catch (error) {
    return next(error);
  }
};

// Get Single Inward Entry
exports.getInwardEntryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const entry = await InwardEntry.findByPk(id, {
      include: [
        {
          model: InwardItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
        },
        { model: User, as: 'receiver', attributes: ['id', 'name'] },
      ],
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Inward entry not found' });
    }

    return res.json({ success: true, data: entry });
  } catch (error) {
    return next(error);
  }
};
