const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Region = require('./Region');
const RefreshToken = require('./RefreshToken');
const LoginAttempt = require('./LoginAttempt');
const AuditLog = require('./AuditLog');

// New Models
const Product = require('./Product');
const Customer = require('./Customer');
const CreditLimitHistory = require('./CreditLimitHistory');
const Vendor = require('./Vendor');
const VendorContact = require('./VendorContact');
const VendorProductMapping = require('./VendorProductMapping');

// ── Existing Associations ────────────────────────────────────────────────────────
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

Region.hasMany(User, { foreignKey: 'region_id', as: 'users' });
User.belongsTo(Region, { foreignKey: 'region_id', as: 'region' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ── New Associations ─────────────────────────────────────────────────────────────

// Customers & Regions
Region.hasMany(Customer, { foreignKey: 'region_id', as: 'customers' });
Customer.belongsTo(Region, { foreignKey: 'region_id', as: 'region' });

// Customers & Users (Sales Manager)
User.hasMany(Customer, { foreignKey: 'sales_manager_id', as: 'managedCustomers' });
Customer.belongsTo(User, { foreignKey: 'sales_manager_id', as: 'salesManager' });

// Customers & Credit Limit History
Customer.hasMany(CreditLimitHistory, { foreignKey: 'customer_id', as: 'creditHistory' });
CreditLimitHistory.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Credit Limit History & User (who changed it)
User.hasMany(CreditLimitHistory, { foreignKey: 'changed_by', as: 'creditChanges' });
CreditLimitHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedByUser' });

// Vendors & Vendor Contacts
Vendor.hasMany(VendorContact, { foreignKey: 'vendor_id', as: 'contacts', onDelete: 'CASCADE' });
VendorContact.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

// Vendors & Vendor Product Mappings
Vendor.hasMany(VendorProductMapping, { foreignKey: 'vendor_id', as: 'productMappings', onDelete: 'CASCADE' });
VendorProductMapping.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

// Products & Vendor Product Mappings
Product.hasMany(VendorProductMapping, { foreignKey: 'product_id', as: 'vendorMappings', onDelete: 'CASCADE' });
VendorProductMapping.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

module.exports = {
  sequelize,
  Role,
  User,
  Region,
  RefreshToken,
  LoginAttempt,
  AuditLog,
  Product,
  Customer,
  CreditLimitHistory,
  Vendor,
  VendorContact,
  VendorProductMapping,
};
