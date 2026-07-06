const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InwardEntry = sequelize.define('InwardEntry', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  entry_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  supplier_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  bill_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  bill_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  received_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'inward_entry',
  timestamps: true,
  underscored: true,
});

module.exports = InwardEntry;
