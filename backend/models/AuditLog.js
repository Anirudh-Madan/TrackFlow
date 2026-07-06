const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  actor_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  actor_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  actor_role: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  action_type: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'approve', 'flag', 'dispatch', 'login', 'logout', 'export', 'import', 'price_update', 'password_reset'),
    allowNull: false,
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  entity_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  before_state: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  after_state: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'audit_log',
  timestamps: true,
  updatedAt: false, // Audit log is append-only
});

module.exports = AuditLog;
