const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vendor = sequelize.define('Vendor', {
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
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'vendor',
  timestamps: true,
  paranoid: true,
  underscored: true,
});

module.exports = Vendor;
