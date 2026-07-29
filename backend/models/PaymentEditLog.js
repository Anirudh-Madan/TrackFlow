const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentEditLog = sequelize.define('PaymentEditLog', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  payment_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  edited_by: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  edit_reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  previous_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  new_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  changed_fields: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'payment_edit_log',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = PaymentEditLog;
