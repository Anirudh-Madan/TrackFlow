const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * PartRequest — a Sales Manager's ask to the Inventory Manager.
 *
 * Two kinds:
 *   REORDER  — restock the same parts just sold (product_id set)
 *   NEW_PART — demand for a part not yet stocked (product_id null, proposed_name set)
 *
 * Uniform part number rule: a REORDER always references an existing product_id.
 * A NEW_PART is a proposal; when the IM converts it, a single new product (one
 * SKU) is created — never a per-role code.
 */
const PartRequest = sequelize.define('PartRequest', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  requested_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  assigned_im_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('REORDER', 'NEW_PART'),
    allowNull: false,
    defaultValue: 'REORDER',
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  proposed_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  linked_order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'ACKNOWLEDGED', 'ORDERED', 'CLOSED'),
    allowNull: false,
    defaultValue: 'OPEN',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ordered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'part_request',
  timestamps: true,
  underscored: true,
});

module.exports = PartRequest;
