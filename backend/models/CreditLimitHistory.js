const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditLimitHistory = sequelize.define('CreditLimitHistory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  old_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  new_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  changed_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'credit_limit_history',
  timestamps: true,
  updatedAt: false, // Append-only ledger, so updatedAt is disabled
  underscored: true,
});

module.exports = CreditLimitHistory;
