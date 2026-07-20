const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChallanEditLog = sequelize.define('ChallanEditLog', {
  id:             { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  challan_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  edited_by:      { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  edit_reason:    { type: DataTypes.TEXT, allowNull: false },
  changed_fields: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'challan_edit_log',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = ChallanEditLog;
