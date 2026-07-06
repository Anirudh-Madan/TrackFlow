const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * PipelineItem — the specific parts (and quantities) the IM picked from
 * available stock for this order's pipeline run.
 *
 * Always references product_id (uniform SKU) — there is never a per-role part
 * code. `available_at_pick` is a snapshot of stock when the line was chosen, for
 * audit only.
 */
const PipelineItem = sequelize.define('PipelineItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  pipeline_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0,
  },
  available_at_pick: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true,
  },
  remarks: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'pipeline_item',
  timestamps: true,
  underscored: true,
});

module.exports = PipelineItem;
