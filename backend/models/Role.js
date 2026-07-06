const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED, // mysql doesn't support TINYINT directly in default types easily but we can use TINYINT by specifying or just INTEGER. Let's use SMALLINT/INTEGER to avoid driver issues, or custom. Let's use INTEGER.
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.ENUM('admin', 'sales_manager', 'inventory_manager', 'dispatch_worker'),
    allowNull: false,
    unique: true,
  },
  display_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'role',
  timestamps: true,
});

module.exports = Role;
