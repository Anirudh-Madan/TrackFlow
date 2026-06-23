const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VendorProductMapping = sequelize.define('VendorProductMapping', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  vendor_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  purchase_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  vendor_sku: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'vendor_product_mapping',
  timestamps: true,
  underscored: true,
});

module.exports = VendorProductMapping;
