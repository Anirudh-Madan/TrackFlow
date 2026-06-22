const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Role, RefreshToken, LoginAttempt } = require('../../models');

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
    if (attempt) {
      await attempt.destroy();
    }

    // Update timestamps
    user.last_login_at = new Date();
    user.last_active_at = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
      user_id: user.id,
      token_hash: bcrypt.hashSync(refreshToken, 10), // secure hash
      expires_at: expiresAt,
      ip_address: ip,
    });

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
          must_change_password: user.must_change_password,
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
      lockUntil.setMinutes(lockUntil.getMinutes() + 15); // 15 mins lock
      attempt.locked_until = lockUntil;
    }
    await attempt.save();
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { token } = req.body; // client passes the refresh token to revoke
    if (token) {
      // Find and delete/revoke all active refresh tokens for the user or specific token
      // For simplicity, let's delete it so it can't be used again
      // We hash the incoming token or compare
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

    // Hash and update
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.must_change_password = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
