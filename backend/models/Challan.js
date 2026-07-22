const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Challan = sequelize.define('Challan', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  challan_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,   // nullable for standalone (admin-created) challans
  },
  // ── Standalone challan fields (admin-created) ──────────────────────────
  party_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  party_name:  { type: DataTypes.STRING(200),     allowNull: true },
  supplier:    { type: DataTypes.STRING(150),      allowNull: true },
  grand_total: { type: DataTypes.DECIMAL(14, 2),  allowNull: true },
  created_by:  { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  notes:       { type: DataTypes.TEXT,             allowNull: true },
  // ── Bill number (mandatory on create; locks challan once set) ──────────
  bill_number: { type: DataTypes.STRING(60), allowNull: true },
  // ── Status & return ────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('active', 'returned', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
  },
  is_returned:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  return_reason: { type: DataTypes.TEXT,    allowNull: true },
  returned_at:   { type: DataTypes.DATE,    allowNull: true },
  returned_by:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  // ── Public share token ─────────────────────────────────────────────────
  share_token: { type: DataTypes.STRING(64), allowNull: true, unique: true },
  // ── Legacy field ───────────────────────────────────────────────────────
  generated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  pdf_path: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'challan',
  timestamps: true,
  paranoid: true,       // soft-delete via deleted_at
  underscored: true,
});

module.exports = Challan;
