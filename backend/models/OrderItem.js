const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  part_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dl_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  base_price: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true,
    defaultValue: 0,
  },
  sm_price: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true,
    defaultValue: 0,
  },
  gst_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 18.00,
  },
  line_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  suggestion_added: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'order_item',
  timestamps: true,
  updatedAt: false, // Order items are created-only
  underscored: true,
});

module.exports = OrderItem;
