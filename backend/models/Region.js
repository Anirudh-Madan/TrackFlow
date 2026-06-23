const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Region = sequelize.define('Region', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'region',
  timestamps: true,
  paranoid: false,
  underscored: true,
});

module.exports = Region;
