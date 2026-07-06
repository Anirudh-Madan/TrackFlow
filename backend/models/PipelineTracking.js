const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * PipelineTracking — the "internal pipeline" copy of an order.
 *
 * Mirrors the FulfillmentOrder but tracks the full hand-off chain across all
 * four roles with a single authoritative `stage` column. One row per order that
 * an Admin has approved into the pipeline.
 *
 * Stage order (happy path):
 *   ADMIN_APPROVAL   → Admin approved the order into the pipeline
 *   IM_APPROVAL      → Inventory Manager approved + picked parts from stock
 *   DW_ASSIGNMENT    → a Dispatch Worker was assigned
 *   OUT_FOR_DELIVERY → DW picked up and is delivering
 *   DELIVERED        → DW handed goods to the Sales Manager (stock decremented)
 *   FULFILLED        → SM sold the order (terminal success) → notifies IM
 *   REJECTED         → terminal failure (Admin / IM), before delivery
 *
 * Admin override: at ANY stage an Admin can advance the pipeline on behalf of a
 * stuck role. Overrides are recorded in pipeline_stage_history with
 * is_admin_override = true.
 */
const PipelineTracking = sequelize.define('PipelineTracking', {
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
  fulfillment_order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  stage: {
    type: DataTypes.ENUM(
      'ADMIN_APPROVAL',
      'IM_APPROVAL',
      'DW_ASSIGNMENT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FULFILLED',
      'REJECTED',
    ),
    allowNull: false,
    defaultValue: 'ADMIN_APPROVAL',
  },

  // ── actors at each stage ────────────────────────────────────────────────────
  admin_approved_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  im_approved_by:    { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  dw_id:             { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  dw_assigned_by:    { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  sales_manager_id:  { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  fulfilled_by:      { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

  // ── milestone timestamps (drive bottleneck / throughput analytics) ──────────
  admin_approved_at:   { type: DataTypes.DATE, allowNull: true },
  im_approved_at:      { type: DataTypes.DATE, allowNull: true },
  dw_assigned_at:      { type: DataTypes.DATE, allowNull: true },
  out_for_delivery_at: { type: DataTypes.DATE, allowNull: true },
  delivered_at:        { type: DataTypes.DATE, allowNull: true },
  fulfilled_at:        { type: DataTypes.DATE, allowNull: true },
  expected_delivery_at:{ type: DataTypes.DATE, allowNull: true },

  // ── logistics ───────────────────────────────────────────────────────────────
  vehicle_number: { type: DataTypes.STRING(30), allowNull: true },
  driver_name:    { type: DataTypes.STRING(100), allowNull: true },
  driver_phone:   { type: DataTypes.STRING(20), allowNull: true },

  // ── flags ───────────────────────────────────────────────────────────────────
  sold_notified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  had_override:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  reject_reason: { type: DataTypes.TEXT, allowNull: true },
  remarks:       { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'pipeline_tracking',
  timestamps: true,
  underscored: true,
});

module.exports = PipelineTracking;
