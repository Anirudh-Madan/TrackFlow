const { Region, AuditLog } = require('../../models');

// GET /api/v1/regions
exports.getRegions = async (req, res, next) => {
  try {
    const regions = await Region.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: regions });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/regions
exports.createRegion = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Region name is required' });
    }

    const existing = await Region.findOne({ where: { name: name.trim() } });
    if (existing) {
      // Return existing region so frontend can reuse it
      return res.status(200).json({ success: true, data: existing, message: 'Region already exists' });
    }

    const region = await Region.create({ name: name.trim(), description: description || null });

    await AuditLog.create({
      actor_id:    req.user.id,
      actor_name:  req.user.name,
      actor_role:  req.user.role,
      action_type: 'create',
      module:      'regions',
      entity_type: 'region',
      entity_id:   region.id,
      after_state: { id: region.id, name: region.name },
      ip_address:  req.ip,
      user_agent:  req.headers['user-agent'],
    });

    res.status(201).json({ success: true, data: region });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/regions/:id
exports.updateRegion = async (req, res, next) => {
  try {
    const region = await Region.findByPk(req.params.id);
    if (!region) return res.status(404).json({ success: false, error: 'Region not found' });

    const { name, description } = req.body;
    if (name) region.name = name.trim();
    if (description !== undefined) region.description = description;
    await region.save();

    res.json({ success: true, data: region });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/regions/:id
exports.deleteRegion = async (req, res, next) => {
  try {
    const region = await Region.findByPk(req.params.id);
    if (!region) return res.status(404).json({ success: false, error: 'Region not found' });

    await region.destroy();
    res.json({ success: true, message: 'Region deleted' });
  } catch (err) {
    next(err);
  }
};
