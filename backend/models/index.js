const sequelize = require('../config/database');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
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

// ── Fulfilment pipeline (replaces the old Dispatch tables) ────────────────────
const FulfillmentOrder = require('./FulfillmentOrder');
const PipelineTracking = require('./PipelineTracking');
const PipelineItem = require('./PipelineItem');
const PipelineStageHistory = require('./PipelineStageHistory');
const Notification = require('./Notification');
const PartRequest = require('./PartRequest');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const AppSetting = require('./AppSetting');
const ChallanEditLog = require('./ChallanEditLog');
const POEditLog = require('./POEditLog');

// ── Auth & Users ─────────────────────────────────────────────────────────────
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// ── RBAC: Role ↔ Permission (many-to-many) ───────────────────────────────────
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });

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
Challan.belongsTo(Customer, { foreignKey: 'party_id', as: 'party' });
Challan.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Challan.belongsTo(User, { foreignKey: 'returned_by', as: 'returner' });
Challan.hasMany(ChallanEditLog, { foreignKey: 'challan_id', as: 'editHistory' });
ChallanEditLog.belongsTo(Challan, { foreignKey: 'challan_id', as: 'challan' });
ChallanEditLog.belongsTo(User, { foreignKey: 'edited_by', as: 'editor' });

// ── Reorders ──────────────────────────────────────────────────────────────────
Product.hasMany(ReorderFlag, { foreignKey: 'product_id', as: 'reorderFlags', onDelete: 'CASCADE' });
ReorderFlag.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(ReorderFlag, { foreignKey: 'flagged_by', as: 'flaggedReorders' });
ReorderFlag.belongsTo(User, { foreignKey: 'flagged_by', as: 'flagger' });
Customer.hasMany(ReorderFlag, { foreignKey: 'party_id', as: 'reorderFlags' });
ReorderFlag.belongsTo(Customer, { foreignKey: 'party_id', as: 'party' });
InwardEntry.hasMany(ReorderFlag, { foreignKey: 'received_via_inward_id', as: 'reordersReceived' });
ReorderFlag.belongsTo(InwardEntry, { foreignKey: 'received_via_inward_id', as: 'receivedViaInward' });

// ── Fulfilment pipeline ───────────────────────────────────────────────────────
// Master ledger (one per order)
Order.hasOne(FulfillmentOrder, { foreignKey: 'order_id', as: 'fulfillment' });
FulfillmentOrder.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Pipeline tracking (one per order that entered the pipeline)
Order.hasOne(PipelineTracking, { foreignKey: 'order_id', as: 'pipeline' });
PipelineTracking.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
FulfillmentOrder.hasOne(PipelineTracking, { foreignKey: 'fulfillment_order_id', as: 'pipeline' });
PipelineTracking.belongsTo(FulfillmentOrder, { foreignKey: 'fulfillment_order_id', as: 'fulfillment' });

// Pipeline items
PipelineTracking.hasMany(PipelineItem, { foreignKey: 'pipeline_id', as: 'items', onDelete: 'CASCADE' });
PipelineItem.belongsTo(PipelineTracking, { foreignKey: 'pipeline_id', as: 'pipeline' });
Product.hasMany(PipelineItem, { foreignKey: 'product_id', as: 'pipelineItems' });
PipelineItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Stage history
PipelineTracking.hasMany(PipelineStageHistory, { foreignKey: 'pipeline_id', as: 'stageHistory', onDelete: 'CASCADE' });
PipelineStageHistory.belongsTo(PipelineTracking, { foreignKey: 'pipeline_id', as: 'pipeline' });
User.hasMany(PipelineStageHistory, { foreignKey: 'changed_by', as: 'pipelineStageChanges' });
PipelineStageHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changer' });

// Pipeline actor associations (distinct aliases for eager-loading names)
PipelineTracking.belongsTo(User, { foreignKey: 'admin_approved_by', as: 'adminApprover' });
PipelineTracking.belongsTo(User, { foreignKey: 'im_approved_by',    as: 'imApprover' });
PipelineTracking.belongsTo(User, { foreignKey: 'dw_id',             as: 'dispatchWorker' });
PipelineTracking.belongsTo(User, { foreignKey: 'sales_manager_id',  as: 'salesManager' });
PipelineTracking.belongsTo(User, { foreignKey: 'fulfilled_by',      as: 'fulfiller' });

// ── Notifications ─────────────────────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'recipient_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'recipient_id', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// ── Part requests (SM → IM) ───────────────────────────────────────────────────
User.hasMany(PartRequest, { foreignKey: 'requested_by', as: 'partRequests' });
PartRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });
PartRequest.belongsTo(User, { foreignKey: 'assigned_im_id', as: 'assignedIM' });
Product.hasMany(PartRequest, { foreignKey: 'product_id', as: 'partRequests' });
PartRequest.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Order.hasMany(PartRequest, { foreignKey: 'linked_order_id', as: 'partRequests' });
PartRequest.belongsTo(Order, { foreignKey: 'linked_order_id', as: 'order' });
Customer.hasMany(PartRequest, { foreignKey: 'customer_id', as: 'partRequests' });
PartRequest.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// ── Purchase Orders (SM → Vendor) ─────────────────────────────────────────────
User.hasMany(PurchaseOrder, { foreignKey: 'created_by', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
PurchaseOrder.belongsTo(User, { foreignKey: 'returned_by', as: 'returner' });
Vendor.hasMany(PurchaseOrder, { foreignKey: 'vendor_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
Product.hasMany(PurchaseOrderItem, { foreignKey: 'product_id', as: 'purchaseOrderItems' });
PurchaseOrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
PurchaseOrder.hasMany(POEditLog, { foreignKey: 'po_id', as: 'editHistory' });
POEditLog.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
POEditLog.belongsTo(User, { foreignKey: 'edited_by', as: 'editor' });


module.exports = {
  sequelize,
  Role,
  Permission,
  RolePermission,
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
  FulfillmentOrder,
  PipelineTracking,
  PipelineItem,
  PipelineStageHistory,
  Notification,
  PartRequest,
  PurchaseOrder,
  PurchaseOrderItem,
  AppSetting,
  ChallanEditLog,
  POEditLog,
};
