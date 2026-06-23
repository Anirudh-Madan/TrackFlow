const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  sku: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  uom_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
  dealer_landing_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  selling_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
  reorder_threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0 },
  remarks: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'product',
  timestamps: true,
  paranoid: true,
  underscored: true,
});

module.exports = Product;
