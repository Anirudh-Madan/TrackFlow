const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  po_number: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true,
  },
  invoice_number: {
    type: DataTypes.STRING(60),
    allowNull: true,   // made optional
    unique: true,
  },
  vendor_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  vendor_name: { type: DataTypes.STRING(200),      allowNull: true },
  po_date:     { type: DataTypes.DATEONLY,          allowNull: false },
  notes:       { type: DataTypes.TEXT,              allowNull: true },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'RETURNED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'SUBMITTED',
  },
  subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  total:    { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  // ── Bill number (mandatory on create; locks PO once set) ───────────────
  bill_number:   { type: DataTypes.STRING(60), allowNull: true },
  // ── Return ─────────────────────────────────────────────────────────────
  is_returned:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  return_reason: { type: DataTypes.TEXT,    allowNull: true },
  returned_at:   { type: DataTypes.DATE,    allowNull: true },
  returned_by:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  // ── Public share token ─────────────────────────────────────────────────
  share_token: { type: DataTypes.STRING(64), allowNull: true, unique: true },
  created_by:  { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
  tableName: 'purchase_order',
  timestamps: true,
  paranoid: true,     // soft-delete
  underscored: true,
});

module.exports = PurchaseOrder;
