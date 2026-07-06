const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Notification — in-app messages between roles.
 *
 * Central to the pipeline's mandatory hand-offs, e.g. the Sales Manager sending
 * "Order sold" to the Inventory Manager, reorder requests, and admin-override
 * alerts to the bypassed role.
 */
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  recipient_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  recipient_role: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  sender_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM(
      'ORDER_SOLD',
      'REORDER_REQUEST',
      'NEW_PART_REQUEST',
      'PIPELINE_ADVANCED',
      'ADMIN_OVERRIDE',
      'REORDER_PLACED',
      'GENERAL',
    ),
    allowNull: false,
    defaultValue: 'GENERAL',
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  link: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  entity_type: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  entity_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'notification',
  timestamps: true,
  underscored: true,
});

module.exports = Notification;
