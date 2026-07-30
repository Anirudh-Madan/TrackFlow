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

    if (sales_manager_id) {
      const sm = await User.findByPk(sales_manager_id);
      if (sm && sm.region_id && String(sm.region_id) !== String(region_id)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: `Assigned Sales Manager (${sm.name}) does not belong to the selected region` });
      }
    }

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
    const targetRegionId = region_id || customer.region_id;
    const targetSmId = sales_manager_id !== undefined ? sales_manager_id : customer.sales_manager_id;
    if (targetSmId) {
      const sm = await User.findByPk(targetSmId);
      if (sm && sm.region_id && targetRegionId && String(sm.region_id) !== String(targetRegionId)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: `Assigned Sales Manager (${sm.name}) does not belong to the selected region` });
      }
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

// POST /api/v1/customers/bulk-import
exports.bulkImportCustomers = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No customer data provided for import' });
    }

    // Fetch existing regions & users for lookup
    const allRegions = await Region.findAll();
    const regionMap = new Map();
    allRegions.forEach(r => {
      regionMap.set(r.id.toString(), r.id);
      regionMap.set(r.name.toLowerCase().trim(), r.id);
      regionMap.set(r.code.toLowerCase().trim(), r.id);
    });

    const defaultRegionId = allRegions.length > 0 ? allRegions[0].id : 1;

    const allUsers = await User.findAll();
    const userMap = new Map();
    allUsers.forEach(u => {
      userMap.set(u.id.toString(), u.id);
      if (u.name) userMap.set(u.name.toLowerCase().trim(), u.id);
      if (u.login_id) userMap.set(u.login_id.toLowerCase().trim(), u.id);
      if (u.email) userMap.set(u.email.toLowerCase().trim(), u.id);
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const company_name = (item.company_name || item.companyName || item['Company Name'] || item['Company'] || item['Customer Name'] || item['Customer'] || '').toString().trim();
      const rawGst = (item.gst || item.GST || item['GST Number'] || item['GSTIN'] || item['GST Code'] || item['GST'] || '').toString().trim().toUpperCase();
      const regionInput = (item.region_id || item.region || item['Region'] || item['Region Name'] || item['Region Code'] || '').toString().trim().toLowerCase();
      const smInput = (item.sales_manager_id || item.sales_manager || item['Sales Manager'] || item['Manager'] || item['Sales Manager Login'] || '').toString().trim().toLowerCase();
      const rawCredit = item.credit_limit || item['Credit Limit'] || item['Credit Line'] || item['Credit'] || 0;
      const remarks = (item.remarks || item['Remarks'] || item['Notes'] || '').toString().trim();

      if (!company_name) {
        errors.push(`Row ${i + 1}: Missing company name`);
        skippedCount++;
        continue;
      }
      if (!rawGst) {
        errors.push(`Row ${i + 1} (${company_name}): Missing GST number`);
        skippedCount++;
        continue;
      }

      // Resolve Region
      let region_id = regionMap.get(regionInput) || defaultRegionId;

      // Resolve Sales Manager
      let sales_manager_id = userMap.get(smInput) || null;

      const credit_limit = parseFloat(rawCredit) || 0;

      // Check existing customer by GST
      const existing = await Customer.findOne({ where: { gst: rawGst }, transaction });

      if (existing) {
        const oldLimit = parseFloat(existing.credit_limit);
        existing.company_name = company_name;
        existing.region_id = region_id;
        if (sales_manager_id) existing.sales_manager_id = sales_manager_id;
        existing.credit_limit = credit_limit;
        if (remarks) existing.remarks = remarks;

        await existing.save({ transaction });

        if (oldLimit !== credit_limit) {
          await CreditLimitHistory.create({
            customer_id: existing.id,
            old_limit: oldLimit,
            new_limit: credit_limit,
            changed_by: req.user.id,
            reason: 'Bulk import credit limit update'
          }, { transaction });
        }
        updatedCount++;
      } else {
        const newCust = await Customer.create({
          company_name,
          gst: rawGst,
          region_id,
          sales_manager_id,
          credit_limit,
          remarks: remarks || null
        }, { transaction });

        await CreditLimitHistory.create({
          customer_id: newCust.id,
          old_limit: 0,
          new_limit: credit_limit,
          changed_by: req.user.id,
          reason: 'Initial credit limit via bulk import'
        }, { transaction });

        createdCount++;
      }
    }

    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'bulk_import',
      module: 'parties',
      entity_type: 'customer',
      after_state: { createdCount, updatedCount, skippedCount, errorsCount: errors.length },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, { transaction });

    await transaction.commit();
    res.json({
      success: true,
      data: {
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors
      }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
