const bcrypt = require('bcrypt');
const { User, Role, AuditLog } = require('../../models');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'display_name'] }],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, login_id, password, role_name, phone } = req.body;

    if (!name || !login_id || !password || !role_name) {
      return res.status(400).json({ success: false, error: 'Name, login ID, password, and role are required' });
    }

    // Check unique login_id
    const existingUser = await User.findOne({ where: { login_id } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Login ID already exists' });
    }

    // Find the role
    const role = await Role.findOne({ where: { name: role_name } });
    if (!role) {
      return res.status(400).json({ success: false, error: `Invalid role name: ${role_name}` });
    }

    // Hash Password
    const password_hash = await bcrypt.hash(password, 10);

    // Create User
    const newUser = await User.create({
      name,
      login_id,
      password_hash,
      role_id: role.id,
      phone,
      is_active: true,
      must_change_password: false, // Do not force change on login
      created_by: req.user.id,
    });

    // Create Audit Log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'create',
      module: 'users',
      entity_type: 'user',
      entity_id: newUser.id,
      after_state: {
        id: newUser.id,
        name: newUser.name,
        login_id: newUser.login_id,
        role: role.name,
        phone: newUser.phone,
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        name: newUser.name,
        login_id: newUser.login_id,
        role: role.name,
        phone: newUser.phone,
        must_change_password: newUser.must_change_password,
      },
    });
  } catch (error) {
    next(error);
  }
};
