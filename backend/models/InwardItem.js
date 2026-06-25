const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InwardItem = sequelize.define('InwardItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  inward_entry_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  quantity_received: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
}, {
  tableName: 'inward_item',
  timestamps: true,
  updatedAt: false, // Inward items are created-only, no update timestamps needed
  underscored: true,
});

module.exports = InwardItem;
