const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockDamaged = sequelize.define('StockDamaged', {
  id:            { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  quantity:      { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  damage_reason: { type: DataTypes.STRING(255), allowNull: false },
  recorded_by:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  remarks:       { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:   'stock_damaged',
  timestamps:  true,
  paranoid:    false,
  underscored: true,
});

module.exports = StockDamaged;
