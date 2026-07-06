const { Notification, User } = require('../../models');

exports.list = async (req, res, next) => {
  try {
    const { unread } = req.query;
    const where = { recipient_id: req.user.id };
    if (unread === 'true') where.is_read = false;
    const notifications = await Notification.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ where: { recipient_id: req.user.id, is_read: false } });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    const n = await Notification.findOne({ where: { id: req.params.id, recipient_id: req.user.id } });
    if (!n) return res.status(404).json({ success: false, error: 'Notification not found' });
    await n.update({ is_read: true, read_at: new Date() });
    res.json({ success: true, message: 'Marked read', data: n });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { recipient_id: req.user.id, is_read: false } }
    );
    res.json({ success: true, message: 'All notifications marked read' });
  } catch (err) { next(err); }
};
