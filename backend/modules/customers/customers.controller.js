const { Customer, Region, User, CreditLimitHistory, AuditLog, sequelize } = require('../../models');

// GET /api/v1/customers
exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.findAll({
      include: [
        { model: Region, as: 'region', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'salesManager', attributes: ['id', 'name', 'login_id'] }
      ],
      order: [['company_name', 'ASC']]
    });
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customers
exports.createCustomer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_name, gst, sales_manager_id, region_id, credit_limit, remarks } = req.body;

    if (!company_name?.trim()) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    if (!gst?.trim()) {
      return res.status(400).json({ success: false, error: 'GST is required' });
    }
    if (!region_id) {
      return res.status(400).json({ success: false, error: 'Region is required' });
    }

    const existing = await Customer.findOne({ where: { gst: gst.trim() } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Customer with this GST already exists' });
    }

    const limitVal = parseFloat(credit_limit) || 0;

    const customer = await Customer.create({
      company_name: company_name.trim(),
      gst: gst.trim().toUpperCase(),
      sales_manager_id: sales_manager_id || null,
      region_id,
      credit_limit: limitVal,
      remarks: remarks || null
    }, { transaction });

    // Track initial credit limit history
    await CreditLimitHistory.create({
      customer_id: customer.id,
      old_limit: 0,
      new_limit: limitVal,
      changed_by: req.user.id,
      reason: 'Initial credit limit assignment'
    }, { transaction });

    // Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'create',
      module: 'parties',
      entity_type: 'customer',
      entity_id: customer.id,
      after_state: { id: customer.id, name: customer.company_name, limit: limitVal },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// PUT /api/v1/customers/:id
exports.updateCustomer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const { company_name, gst, sales_manager_id, region_id, credit_limit, remarks, credit_change_reason } = req.body;
    const previousLimit = parseFloat(customer.credit_limit);
    const newLimitVal = credit_limit !== undefined ? parseFloat(credit_limit) : previousLimit;

    if (company_name) customer.company_name = company_name.trim();
    if (gst) {
      const existing = await Customer.findOne({ where: { gst: gst.trim() } });
      if (existing && existing.id !== customer.id) {
        return res.status(400).json({ success: false, error: 'Another customer with this GST already exists' });
      }
      customer.gst = gst.trim().toUpperCase();
    }
    if (sales_manager_id !== undefined) customer.sales_manager_id = sales_manager_id || null;
    if (region_id) customer.region_id = region_id;
    if (remarks !== undefined) customer.remarks = remarks || null;

    let limitChanged = false;
    if (newLimitVal !== previousLimit) {
      customer.credit_limit = newLimitVal;
      limitChanged = true;
    }

    await customer.save({ transaction });

    if (limitChanged) {
      await CreditLimitHistory.create({
        customer_id: customer.id,
        old_limit: previousLimit,
        new_limit: newLimitVal,
        changed_by: req.user.id,
        reason: credit_change_reason || 'Credit limit adjustment'
      }, { transaction });
    }

    // Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'update',
      module: 'parties',
      entity_type: 'customer',
      entity_id: customer.id,
      after_state: { id: customer.id, name: customer.company_name, limit: newLimitVal },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, data: customer });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// DELETE /api/v1/customers/:id
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    await customer.destroy();

    // Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'delete',
      module: 'parties',
      entity_type: 'customer',
      entity_id: customer.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Customer deleted successfully (soft delete)' });
  } catch (err) {
    next(err);
  }
};
