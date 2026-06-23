const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  company_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  gst: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  sales_manager_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  region_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  credit_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'customer',
  timestamps: true,
  paranoid: true,
  underscored: true,
});

module.exports = Customer;
