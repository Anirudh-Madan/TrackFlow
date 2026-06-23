const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UnitOfMeasure = sequelize.define('UnitOfMeasure', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'unit_of_measure',
  timestamps: true,
  underscored: true,
});

module.exports = UnitOfMeasure;
