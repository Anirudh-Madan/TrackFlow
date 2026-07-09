const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  purchase_order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,  // null for new/unknown products
  },
  part_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  quantity: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  total: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'purchase_order_item',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = PurchaseOrderItem;
