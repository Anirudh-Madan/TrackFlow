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
    allowNull: false,
    unique: true,
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  pdf_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'challan',
  timestamps: true,
  underscored: true,
});

module.exports = Challan;
