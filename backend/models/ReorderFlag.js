const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReorderFlag = sequelize.define('ReorderFlag', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  flagged_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  party_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  quantity_wanted: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'ORDERED', 'RECEIVED'),
    allowNull: false,
    defaultValue: 'OPEN',
  },
  ordered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  received_via_inward_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'reorder_flag',
  timestamps: true,
  underscored: true,
});

module.exports = ReorderFlag;
