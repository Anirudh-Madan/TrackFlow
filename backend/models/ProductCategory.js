const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCategory = sequelize.define('ProductCategory', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  parent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'product_category',
  timestamps: true,
  paranoid: true,
  underscored: true,
});

module.exports = ProductCategory;
