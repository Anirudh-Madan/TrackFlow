const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  party_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  supplier: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  challan_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  customer_company: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  sales_manager_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'DISPATCHED', 'FLAGGED', 'RETURNED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  order_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  gst_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  grand_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  credit_hold: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  flag_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'order',
  timestamps: true,
  underscored: true,
});

module.exports = Order;
