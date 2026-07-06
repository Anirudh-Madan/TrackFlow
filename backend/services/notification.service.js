const { Notification, User, Role } = require('../models');

/**
 * Small helper used across controllers to create notifications inside a
 * transaction. Keeps notification wording consistent.
 */
async function notify({ recipient_id, recipient_role, sender_id, type, title, body, link, entity_type, entity_id }, transaction) {
  return Notification.create({
    recipient_id,
    recipient_role: recipient_role || null,
    sender_id: sender_id || null,
    type: type || 'GENERAL',
    title,
    body: body || null,
    link: link || null,
    entity_type: entity_type || null,
    entity_id: entity_id || null,
  }, { transaction });
}

/**
 * Resolve users of a given role name. Used to broadcast e.g. to all IMs when a
 * specific one isn't targeted.
 */
async function usersByRole(roleName, transaction) {
  return User.findAll({
    where: { is_active: true },
    include: [{ model: Role, as: 'role', attributes: [], where: { name: roleName } }],
    attributes: ['id', 'name'],
    transaction,
  });
}

module.exports = { notify, usersByRole };
