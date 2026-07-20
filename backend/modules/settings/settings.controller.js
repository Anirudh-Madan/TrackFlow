const bcrypt = require('bcrypt');
const { AppSetting, User } = require('../../models');

const SALT_ROUNDS = 12;

// ── GET /api/v1/settings ─────────────────────────────────────────────────────
exports.getSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    // Return all settings except the PIN hash itself
    const settings = await AppSetting.findAll({
      where: { key: ['whatsapp_enabled', 'company_name', 'pin_set'] },
    });
    const pinRow = await AppSetting.findOne({ where: { key: 'admin_edit_pin' } });
    res.json({
      success: true,
      data: {
        pin_set: !!pinRow?.value,
        settings: settings.map(s => ({ key: s.key, value: s.value })),
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/v1/settings/set-pin ────────────────────────────────────────────
// Body: { current_pin?, new_pin }
exports.setPin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { current_pin, new_pin } = req.body;

    if (!new_pin || String(new_pin).length < 4) {
      return res.status(400).json({ success: false, error: 'PIN must be at least 4 characters' });
    }

    const existing = await AppSetting.findOne({ where: { key: 'admin_edit_pin' } });

    // If PIN already set, require current PIN to change
    if (existing?.value) {
      if (!current_pin) {
        return res.status(400).json({ success: false, error: 'Current PIN required to change PIN' });
      }
      const valid = await bcrypt.compare(String(current_pin), existing.value);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Current PIN is incorrect' });
      }
    }

    const hash = await bcrypt.hash(String(new_pin), SALT_ROUNDS);

    if (existing) {
      await existing.update({ value: hash, updated_by: req.user.id });
    } else {
      await AppSetting.create({ key: 'admin_edit_pin', value: hash, updated_by: req.user.id });
    }

    res.json({ success: true, message: 'Admin PIN updated successfully' });
  } catch (err) { next(err); }
};

// ── POST /api/v1/settings/verify-pin ────────────────────────────────────────
// Body: { pin }
exports.verifyPin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN is required' });
    }

    const existing = await AppSetting.findOne({ where: { key: 'admin_edit_pin' } });
    if (!existing?.value) {
      return res.status(400).json({
        success: false,
        error: 'No admin PIN has been set. Please configure one in Settings first.',
        code: 'PIN_NOT_SET',
      });
    }

    const valid = await bcrypt.compare(String(pin), existing.value);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Incorrect PIN', code: 'INVALID_PIN' });
    }

    res.json({ success: true, message: 'PIN verified' });
  } catch (err) { next(err); }
};
