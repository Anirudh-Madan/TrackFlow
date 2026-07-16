const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Role, Permission, RefreshToken, LoginAttempt } = require('../../models');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, login_id: user.login_id, role: user.role.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Fetch the permission keys for a given role_id.
 */
async function getPermissionKeys(roleId) {
  const role = await Role.findByPk(roleId, {
    include: [{ model: Permission, as: 'permissions', attributes: ['permission_key'] }],
  });
  if (!role) return [];
  return role.permissions.map((p) => p.permission_key);
}

exports.login = async (req, res, next) => {
  try {
    const { login_id, password } = req.body;
    const ip = req.ip;

    if (!login_id || !password) {
      return res.status(400).json({ success: false, error: 'Login ID and password are required' });
    }

    // Check Lockout
    let attempt = await LoginAttempt.findOne({ where: { login_id, ip_address: ip } });
    if (attempt && attempt.locked_until && attempt.locked_until > new Date()) {
      const waitMinutes = Math.ceil((attempt.locked_until - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        error: `Account locked due to too many failed attempts. Try again in ${waitMinutes} minute(s).`,
      });
    }

    // Find User
    const user = await User.findOne({
      where: { login_id },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user || !user.is_active) {
      await handleFailedAttempt(login_id, ip);
      return res.status(401).json({ success: false, error: 'Invalid Login ID or password' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await handleFailedAttempt(login_id, ip);
      return res.status(401).json({ success: false, error: 'Invalid Login ID or password' });
    }

    // Reset Login Attempts
    if (attempt) await attempt.destroy();

    // Update timestamps
    user.last_login_at = new Date();
    user.last_active_at = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      user_id: user.id,
      token_hash: bcrypt.hashSync(refreshToken, 10),
      expires_at: expiresAt,
      ip_address: ip,
    });

    // Fetch permissions for this role from DB
    const permissions = await getPermissionKeys(user.role_id);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          login_id: user.login_id,
          role: user.role.name,
          role_id: user.role_id,
          must_change_password: user.must_change_password,
          permissions, // ← array of permission key strings
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const handleFailedAttempt = async (login_id, ip) => {
  let attempt = await LoginAttempt.findOne({ where: { login_id, ip_address: ip } });
  if (!attempt) {
    await LoginAttempt.create({
      login_id,
      ip_address: ip,
      attempt_count: 1,
      last_attempt_at: new Date(),
    });
  } else {
    attempt.attempt_count += 1;
    attempt.last_attempt_at = new Date();
    if (attempt.attempt_count >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      attempt.locked_until = lockUntil;
    }
    await attempt.save();
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token) {
      const tokens = await RefreshToken.findAll({ where: { user_id: req.user.id } });
      for (const t of tokens) {
        const isMatch = await bcrypt.compare(token, t.token_hash).catch(() => false);
        if (isMatch) {
          await t.destroy();
          break;
        }
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, error: 'No refresh token provided' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    const dbTokens = await RefreshToken.findAll({ where: { user_id: payload.id } });
    let matchedToken = null;
    for (const t of dbTokens) {
      const isMatch = await bcrypt.compare(token, t.token_hash).catch(() => false);
      if (isMatch) { matchedToken = t; break; }
    }

    if (!matchedToken || matchedToken.expires_at < new Date()) {
      return res.status(401).json({ success: false, error: 'Refresh token not found or expired' });
    }

    const user = await User.findOne({
      where: { id: payload.id },
      include: [{ model: Role, as: 'role' }],
    });
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    await matchedToken.destroy();

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      user_id: user.id,
      token_hash: bcrypt.hashSync(newRefreshToken, 10),
      expires_at: expiresAt,
      ip_address: req.ip,
    });

    // Also refresh the permissions snapshot
    const permissions = await getPermissionKeys(user.role_id);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        permissions, // ← refreshed permissions on token rotation
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect current password' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.must_change_password = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Returns the current user profile with a fresh copy of their permissions.
 * Useful for refreshing permissions after an admin changes them.
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'role' }],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    const permissions = await getPermissionKeys(user.role_id);

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        login_id: user.login_id,
        role: user.role.name,
        role_id: user.role_id,
        must_change_password: user.must_change_password,
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};
