const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoginAttempt = sequelize.define('LoginAttempt', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  login_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: false,
  },
  attempt_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  last_attempt_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'login_attempt',
  timestamps: true,
});

module.exports = LoginAttempt;
