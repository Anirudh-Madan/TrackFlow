const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Immutable ledger — no updatedAt
const StockTransaction = sequelize.define('StockTransaction', {
  id:              { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  type:            {
    type: DataTypes.ENUM(
      'stock_in',        // inward goods receipt
      'dispatch',        // outbound dispatch
      'damage',          // damaged write-off
      'adjustment',      // manual correction
      'reserved',        // quantity committed to order
      'released',        // reservation released (cancel/return)
    ),
    allowNull: false,
  },
  reference:       { type: DataTypes.STRING(100), allowNull: true },  // order no., inward no., etc.
  quantity_change: { type: DataTypes.DECIMAL(12, 4), allowNull: false }, // +ve = in, -ve = out
  quantity_after:  { type: DataTypes.DECIMAL(12, 4), allowNull: false }, // snapshot of on_hand after
  unit_cost:       { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  performed_by:    { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  notes:           { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:   'stock_transaction',
  timestamps:  true,
  updatedAt:   false,   // immutable — no updates ever
  paranoid:    false,
  underscored: true,
});

module.exports = StockTransaction;
