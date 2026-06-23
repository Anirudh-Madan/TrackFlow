const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VendorContact = sequelize.define('VendorContact', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  vendor_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  designation: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'vendor_contact',
  timestamps: true,
  underscored: true,
});

module.exports = VendorContact;
