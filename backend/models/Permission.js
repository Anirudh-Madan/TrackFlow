const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g. products, orders, users',
  },
  permission_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'e.g. products.delete — used in middleware checks',
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'permission',
  timestamps: true,
});

module.exports = Permission;
