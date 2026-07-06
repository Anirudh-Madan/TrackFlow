const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * FulfillmentOrder — the "master ledger" copy of an order.
 *
 * Deliberately coarse: it answers exactly one question — did we fulfil this
 * order or not? Two states only:
 *   INCOMPLETE — order is somewhere in the pipeline (or not yet started)
 *   COMPLETE   — the pipeline reached FULFILLED (Sales Manager sold it)
 *
 * There is one FulfillmentOrder per real `order`. It never churns beyond the
 * single INCOMPLETE → COMPLETE flip, which keeps management-level metrics
 * (completion rate, throughput) cheap and stable.
 */
const FulfillmentOrder = sequelize.define('FulfillmentOrder', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
  },
  state: {
    type: DataTypes.ENUM('INCOMPLETE', 'COMPLETE'),
    allowNull: false,
    defaultValue: 'INCOMPLETE',
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'fulfillment_order',
  timestamps: true,
  underscored: true,
});

module.exports = FulfillmentOrder;
