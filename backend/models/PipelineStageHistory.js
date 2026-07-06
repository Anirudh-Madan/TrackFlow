const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * PipelineStageHistory — append-only trail of every stage transition.
 *
 * Powers the Admin "clean flow with metrics" view (bottleneck detection uses the
 * gaps between these timestamps) and every role's activity feed. Records whether
 * a transition was an Admin override so the audit trail stays honest.
 */
const PipelineStageHistory = sequelize.define('PipelineStageHistory', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  pipeline_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  from_stage: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  to_stage: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  changed_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  changed_by_role: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  is_admin_override: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'pipeline_stage_history',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = PipelineStageHistory;
