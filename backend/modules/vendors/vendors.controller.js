const { Vendor, VendorContact, VendorProductMapping, Product, AuditLog, sequelize } = require('../../models');

// GET /api/v1/vendors
exports.getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.findAll({
      include: [
        { model: VendorContact, as: 'contacts' },
        {
          model: VendorProductMapping,
          as: 'productMappings',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'selling_price'] }]
        }
      ],
      order: [['company_name', 'ASC']]
    });
    res.json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/vendors
exports.createVendor = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_name, gst, remarks, contacts, product_mappings } = req.body;

    if (!company_name?.trim()) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    if (!gst?.trim()) {
      return res.status(400).json({ success: false, error: 'GST is required' });
    }

    const existing = await Vendor.findOne({ where: { gst: gst.trim() } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Vendor with this GST already exists' });
    }

    const vendor = await Vendor.create({
      company_name: company_name.trim(),
      gst: gst.trim().toUpperCase(),
      remarks: remarks || null
    }, { transaction });

    // Create contacts if provided
    if (contacts && Array.isArray(contacts)) {
      for (const c of contacts) {
        if (c.name?.trim()) {
          await VendorContact.create({
            vendor_id: vendor.id,
            name: c.name.trim(),
            phone: c.phone || null,
            email: c.email || null,
            designation: c.designation || null
          }, { transaction });
        }
      }
    }

    // Create product mappings if provided
    if (product_mappings && Array.isArray(product_mappings)) {
      for (const p of product_mappings) {
        let product_id = p.product_id;
        
        // If a new product name and SKU are supplied, find or create the product first
        if (!product_id && p.product_name?.trim() && p.product_sku?.trim()) {
          const [prod] = await Product.findOrCreate({
            where: { sku: p.product_sku.trim() },
            defaults: {
              name: p.product_name.trim(),
              sku: p.product_sku.trim(),
              price: parseFloat(p.purchase_price) || 0.00
            },
            transaction
          });
          product_id = prod.id;
        }

        if (product_id && p.purchase_price) {
          await VendorProductMapping.create({
            vendor_id: vendor.id,
            product_id,
            purchase_price: parseFloat(p.purchase_price),
            vendor_sku: p.vendor_sku || null
          }, { transaction });
        }
      }
    }

    // Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'create',
      module: 'parties',
      entity_type: 'vendor',
      entity_id: vendor.id,
      after_state: { id: vendor.id, name: vendor.company_name },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// PUT /api/v1/vendors/:id
exports.updateVendor = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const { company_name, gst, remarks, contacts, product_mappings } = req.body;

    if (company_name) vendor.company_name = company_name.trim();
    if (gst) {
      const existing = await Vendor.findOne({ where: { gst: gst.trim() } });
      if (existing && existing.id !== vendor.id) {
        return res.status(400).json({ success: false, error: 'Another vendor with this GST already exists' });
      }
      vendor.gst = gst.trim().toUpperCase();
    }
    if (remarks !== undefined) vendor.remarks = remarks || null;

    await vendor.save({ transaction });

    // Update contacts: remove existing and create new ones
    if (contacts && Array.isArray(contacts)) {
      await VendorContact.destroy({ where: { vendor_id: vendor.id }, transaction });
      for (const c of contacts) {
        if (c.name?.trim()) {
          await VendorContact.create({
            vendor_id: vendor.id,
            name: c.name.trim(),
            phone: c.phone || null,
            email: c.email || null,
            designation: c.designation || null
          }, { transaction });
        }
      }
    }

    // Update product mappings: remove existing and create new ones
    if (product_mappings && Array.isArray(product_mappings)) {
      await VendorProductMapping.destroy({ where: { vendor_id: vendor.id }, transaction });
      for (const p of product_mappings) {
        let product_id = p.product_id;
        
        if (!product_id && p.product_name?.trim() && p.product_sku?.trim()) {
          const [prod] = await Product.findOrCreate({
            where: { sku: p.product_sku.trim() },
            defaults: {
              name: p.product_name.trim(),
              sku: p.product_sku.trim(),
              price: parseFloat(p.purchase_price) || 0.00
            },
            transaction
          });
          product_id = prod.id;
        }

        if (product_id && p.purchase_price) {
          await VendorProductMapping.create({
            vendor_id: vendor.id,
            product_id,
            purchase_price: parseFloat(p.purchase_price),
            vendor_sku: p.vendor_sku || null
          }, { transaction });
        }
      }
    }

    // Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'update',
      module: 'parties',
      entity_type: 'vendor',
      entity_id: vendor.id,
      after_state: { id: vendor.id, name: vendor.company_name },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, data: vendor });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// DELETE /api/v1/vendors/:id
exports.deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    await vendor.destroy();

    // Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'delete',
      module: 'parties',
      entity_type: 'vendor',
      entity_id: vendor.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Vendor deleted successfully (soft delete)' });
  } catch (err) {
    next(err);
  }
};
