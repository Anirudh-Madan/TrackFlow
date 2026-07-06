const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  from_status: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  to_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  changed_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'order_status_history',
  timestamps: true,
  updatedAt: false, // Immutable log, only created_at needed
  underscored: true,
});

module.exports = OrderStatusHistory;
