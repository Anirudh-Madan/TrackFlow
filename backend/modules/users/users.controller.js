const bcrypt = require('bcrypt');
const { User, Role, Region, AuditLog } = require('../../models');

// ── GET /api/v1/users ─────────────────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role,   as: 'role',   attributes: ['id', 'name', 'display_name'] },
        { model: Region, as: 'region', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/users ────────────────────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const { name, login_id, password, role_name, phone, region_id } = req.body;

    if (!name || !login_id || !password || !role_name) {
      return res.status(400).json({ success: false, error: 'Name, login ID, password, and role are required' });
    }

    const existingUser = await User.findOne({ where: { login_id } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Login ID already exists' });
    }

    const role = await Role.findOne({ where: { name: role_name } });
    if (!role) {
      return res.status(400).json({ success: false, error: `Invalid role name: ${role_name}` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      login_id,
      password_hash,
      role_id: role.id,
      phone,
      region_id: region_id || null,
      is_active: true,
      must_change_password: false,
      created_by: req.user.id,
    });

    await AuditLog.create({
      actor_id:    req.user.id,
      actor_name:  req.user.name,
      actor_role:  req.user.role,
      action_type: 'create',
      module:      'users',
      entity_type: 'user',
      entity_id:   newUser.id,
      after_state: { id: newUser.id, name: newUser.name, login_id: newUser.login_id, role: role.name, phone: newUser.phone, region_id },
      ip_address:  req.ip,
      user_agent:  req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id:                   newUser.id,
        name:                 newUser.name,
        login_id:             newUser.login_id,
        role:                 role.name,
        phone:                newUser.phone,
        region_id:            newUser.region_id,
        must_change_password: newUser.must_change_password,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/users/:id ─────────────────────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { name, phone, region_id, is_active } = req.body;

    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Capture before state for audit
    const beforeState = {
      name:      user.name,
      phone:     user.phone,
      region_id: user.region_id,
      is_active: user.is_active,
    };

    if (name      !== undefined) user.name      = name;
    if (phone     !== undefined) user.phone     = phone || null;
    if (region_id !== undefined) user.region_id = region_id || null;
    if (is_active !== undefined) user.is_active = is_active;

    await user.save();

    await AuditLog.create({
      actor_id:     req.user.id,
      actor_name:   req.user.name,
      actor_role:   req.user.role,
      action_type:  'update',
      module:       'users',
      entity_type:  'user',
      entity_id:    user.id,
      before_state: beforeState,
      after_state:  { name: user.name, phone: user.phone, region_id: user.region_id, is_active: user.is_active },
      ip_address:   req.ip,
      user_agent:   req.headers['user-agent'],
    });

    res.json({ success: true, message: 'User updated successfully', data: { id: user.id, name: user.name } });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/users/:id ──────────────────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await AuditLog.create({
      actor_id:     req.user.id,
      actor_name:   req.user.name,
      actor_role:   req.user.role,
      action_type:  'delete',
      module:       'users',
      entity_type:  'user',
      entity_id:    user.id,
      before_state: { id: user.id, name: user.name, login_id: user.login_id },
      ip_address:   req.ip,
      user_agent:   req.headers['user-agent'],
    });

    await user.destroy(); // soft-delete (paranoid)

    res.json({ success: true, message: `User "${user.name}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
};
