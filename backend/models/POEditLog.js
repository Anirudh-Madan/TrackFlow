const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const POEditLog = sequelize.define('POEditLog', {
  id:             { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  po_id:          { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  edited_by:      { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  edit_reason:    { type: DataTypes.TEXT, allowNull: false },
  changed_fields: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'po_edit_log',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = POEditLog;
