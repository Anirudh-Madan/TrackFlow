const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const LoginAttempt = require('./LoginAttempt');
const AuditLog = require('./AuditLog');

// Define associations
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = {
  sequelize,
  Role,
  User,
  RefreshToken,
  LoginAttempt,
  AuditLog,
};
