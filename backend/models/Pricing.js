const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pricing = sequelize.define('Pricing', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  dealer_landing_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  selling_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  effective_to: { type: DataTypes.DATEONLY, allowNull: true },
  created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'pricing',
  timestamps: true,
  underscored: true,
});

module.exports = Pricing;
