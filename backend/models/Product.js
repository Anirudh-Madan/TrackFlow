const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'product',
  timestamps: true,
  underscored: true,
});

module.exports = Product;
