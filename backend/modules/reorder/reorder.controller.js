const { ReorderFlag, Product, User, Customer, InwardEntry, sequelize } = require('../../models');
const { notify, usersByRole } = require('../../services/notification.service');

// Create Reorder Flag
exports.createReorder = async (req, res, next) => {
  try {
    let { product_id, party_id, quantity_wanted, quantity_requested, notes, note } = req.body;

    if (!quantity_wanted && quantity_requested) quantity_wanted = quantity_requested;
    if (!notes && note) notes = note;

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

    // Notify admins and inventory managers
    try {
      const [admins, ims] = await Promise.all([
        usersByRole('admin'),
        usersByRole('inventory_manager'),
      ]);
      const recipients = [...admins, ...ims];
      const flaggerName = result.flagger?.name || req.user.name || 'Sales Manager';

      const notificationPromises = recipients.map(user =>
        notify({
          recipient_id: user.id,
          sender_id: req.user.id,
          type: 'REORDER_REQUEST',
          title: `Reorder requested for ${product.sku}`,
          body: `${flaggerName} requested a reorder of ${quantity_wanted} unit(s) for ${product.name} (SKU: ${product.sku}).${notes ? ` Note: "${notes}"` : ''}`,
          link: `/im/reorder`,
          entity_type: 'ReorderFlag',
          entity_id: reorder.id,
        })
      );
      await Promise.all(notificationPromises);

      const io = req.app.get('io');
      if (io) {
        io.to('admin').to('inventory_manager').emit('new-notification', {
          type: 'REORDER_REQUEST',
          title: `Reorder requested for ${product.sku}`,
          body: `${flaggerName} requested a reorder of ${quantity_wanted} unit(s) for ${product.name} (SKU: ${product.sku}).${notes ? ` Note: "${notes}"` : ''}`,
          link: `/im/reorder`,
          created_at: new Date(),
        });
      }
    } catch (err) {
      console.error('Failed to send reorder notifications:', err);
    }

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
