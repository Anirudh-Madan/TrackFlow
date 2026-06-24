const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryAdjustment = sequelize.define('InventoryAdjustment', {
  id:               { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  reason:           { type: DataTypes.STRING(255), allowNull: false },
  quantity_before:  { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  quantity_after:   { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  approved_by:      { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },  // NULL = self-approved
  performed_by:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  remarks:          { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:   'inventory_adjustment',
  timestamps:  true,
  paranoid:    false,
  underscored: true,
});

module.exports = InventoryAdjustment;
