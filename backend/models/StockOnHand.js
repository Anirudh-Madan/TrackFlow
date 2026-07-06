const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockOnHand = sequelize.define('StockOnHand', {
  id:          { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  quantity:    { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
}, {
  tableName:  'stock_on_hand',
  timestamps: true,
  paranoid:   false,
  underscored: true,
});

module.exports = StockOnHand;
