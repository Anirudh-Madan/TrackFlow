const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  payment_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  mode: {
    type: DataTypes.STRING(30), // CASH, UPI, RTGS, CHEQUE, CARD, WALLET
    allowNull: false,
    defaultValue: 'UPI',
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20), // received, pending, failed
    allowNull: false,
    defaultValue: 'received',
  },
  received_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'payment',
  timestamps: true,
  underscored: true,
});

module.exports = Payment;
