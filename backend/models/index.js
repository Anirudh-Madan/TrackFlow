const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Region = require('./Region');
const RefreshToken = require('./RefreshToken');
const LoginAttempt = require('./LoginAttempt');
const AuditLog = require('./AuditLog');

const ProductCategory = require('./ProductCategory');
const UnitOfMeasure = require('./UnitOfMeasure');
const Product = require('./Product');
const Pricing = require('./Pricing');
const Customer = require('./Customer');
const CreditLimitHistory = require('./CreditLimitHistory');
const Vendor = require('./Vendor');
const VendorContact = require('./VendorContact');
const VendorProductMapping = require('./VendorProductMapping');

const StockOnHand = require('./StockOnHand');
const StockReserved = require('./StockReserved');
const StockDamaged = require('./StockDamaged');
const StockTransaction = require('./StockTransaction');
const InventoryAdjustment = require('./InventoryAdjustment');

const InwardEntry = require('./InwardEntry');
const InwardItem = require('./InwardItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const Challan = require('./Challan');
const ReorderFlag = require('./ReorderFlag');

// ── Auth & Users ─────────────────────────────────────────────────────────────
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

Region.hasMany(User, { foreignKey: 'region_id', as: 'users' });
User.belongsTo(Region, { foreignKey: 'region_id', as: 'region' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ── Product Catalogue ─────────────────────────────────────────────────────────
ProductCategory.belongsTo(ProductCategory, { foreignKey: 'parent_id', as: 'parent' });
ProductCategory.hasMany(ProductCategory, { foreignKey: 'parent_id', as: 'children' });

ProductCategory.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(ProductCategory, { foreignKey: 'category_id', as: 'category' });

UnitOfMeasure.hasMany(Product, { foreignKey: 'uom_id', as: 'products' });
Product.belongsTo(UnitOfMeasure, { foreignKey: 'uom_id', as: 'uom' });

// ── Pricing ───────────────────────────────────────────────────────────────────
Product.hasMany(Pricing, { foreignKey: 'product_id', as: 'pricingHistory' });
Pricing.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(Pricing, { foreignKey: 'created_by', as: 'pricingCreated' });
Pricing.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ── Customers ─────────────────────────────────────────────────────────────────
Region.hasMany(Customer, { foreignKey: 'region_id', as: 'customers' });
Customer.belongsTo(Region, { foreignKey: 'region_id', as: 'region' });

User.hasMany(Customer, { foreignKey: 'sales_manager_id', as: 'managedCustomers' });
Customer.belongsTo(User, { foreignKey: 'sales_manager_id', as: 'salesManager' });

Customer.hasMany(CreditLimitHistory, { foreignKey: 'customer_id', as: 'creditHistory' });
CreditLimitHistory.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(CreditLimitHistory, { foreignKey: 'changed_by', as: 'creditChanges' });
CreditLimitHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedByUser' });

// ── Vendors ───────────────────────────────────────────────────────────────────
Vendor.hasMany(VendorContact, { foreignKey: 'vendor_id', as: 'contacts', onDelete: 'CASCADE' });
VendorContact.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

Vendor.hasMany(VendorProductMapping, { foreignKey: 'vendor_id', as: 'productMappings', onDelete: 'CASCADE' });
VendorProductMapping.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

Product.hasMany(VendorProductMapping, { foreignKey: 'product_id', as: 'vendorMappings', onDelete: 'CASCADE' });
VendorProductMapping.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// ── Inventory ─────────────────────────────────────────────────────────────────
Product.hasOne(StockOnHand, { foreignKey: 'product_id', as: 'stockOnHand' });
StockOnHand.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasOne(StockReserved, { foreignKey: 'product_id', as: 'stockReserved' });
StockReserved.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(StockDamaged, { foreignKey: 'product_id', as: 'damagedStock' });
StockDamaged.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(StockDamaged, { foreignKey: 'recorded_by', as: 'recordedDamages' });
StockDamaged.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });

Product.hasMany(StockTransaction, { foreignKey: 'product_id', as: 'stockTransactions' });
StockTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(StockTransaction, { foreignKey: 'performed_by', as: 'stockTransactions' });
StockTransaction.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

Product.hasMany(InventoryAdjustment, { foreignKey: 'product_id', as: 'adjustments' });
InventoryAdjustment.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(InventoryAdjustment, { foreignKey: 'performed_by', as: 'performedAdjustments' });
InventoryAdjustment.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });
User.hasMany(InventoryAdjustment, { foreignKey: 'approved_by', as: 'approvedAdjustments' });
InventoryAdjustment.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// ── Inward Entries ────────────────────────────────────────────────────────────
InwardEntry.hasMany(InwardItem, { foreignKey: 'inward_entry_id', as: 'items', onDelete: 'CASCADE' });
InwardItem.belongsTo(InwardEntry, { foreignKey: 'inward_entry_id', as: 'inwardEntry' });
Product.hasMany(InwardItem, { foreignKey: 'product_id', as: 'inwardItems' });
InwardItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(InwardEntry, { foreignKey: 'received_by', as: 'receivedInwards' });
InwardEntry.belongsTo(User, { foreignKey: 'received_by', as: 'receiver' });

// ── Orders & Items ────────────────────────────────────────────────────────────
Customer.hasMany(Order, { foreignKey: 'party_id', as: 'orders' });
Order.belongsTo(Customer, { foreignKey: 'party_id', as: 'party' });
User.hasMany(Order, { foreignKey: 'sales_manager_id', as: 'managedOrders' });
Order.belongsTo(User, { foreignKey: 'sales_manager_id', as: 'salesManager' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory', onDelete: 'CASCADE' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
User.hasMany(OrderStatusHistory, { foreignKey: 'changed_by', as: 'statusHistoryChanges' });
OrderStatusHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changer' });

// ── Challans ──────────────────────────────────────────────────────────────────
Order.hasOne(Challan, { foreignKey: 'order_id', as: 'challan', onDelete: 'CASCADE' });
Challan.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// ── Reorders ──────────────────────────────────────────────────────────────────
Product.hasMany(ReorderFlag, { foreignKey: 'product_id', as: 'reorderFlags', onDelete: 'CASCADE' });
ReorderFlag.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(ReorderFlag, { foreignKey: 'flagged_by', as: 'flaggedReorders' });
ReorderFlag.belongsTo(User, { foreignKey: 'flagged_by', as: 'flagger' });
Customer.hasMany(ReorderFlag, { foreignKey: 'party_id', as: 'reorderFlags' });
ReorderFlag.belongsTo(Customer, { foreignKey: 'party_id', as: 'party' });
InwardEntry.hasMany(ReorderFlag, { foreignKey: 'received_via_inward_id', as: 'reordersReceived' });
ReorderFlag.belongsTo(InwardEntry, { foreignKey: 'received_via_inward_id', as: 'receivedViaInward' });

module.exports = {
  sequelize,
  Role,
  User,
  Region,
  RefreshToken,
  LoginAttempt,
  AuditLog,
  ProductCategory,
  UnitOfMeasure,
  Product,
  Pricing,
  Customer,
  CreditLimitHistory,
  Vendor,
  VendorContact,
  VendorProductMapping,
  StockOnHand,
  StockReserved,
  StockDamaged,
  StockTransaction,
  InventoryAdjustment,
  InwardEntry,
  InwardItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  Challan,
  ReorderFlag,
};
