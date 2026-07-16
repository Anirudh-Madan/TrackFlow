require('dotenv').config();
const app = require('./app');
const { sequelize, Role, User, Permission, RolePermission } = require('./models');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ── Permission catalogue ───────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  // Authentication
  { module: 'auth', permission_key: 'auth.login',                display_name: 'Login',                      description: 'Authenticate and obtain a session' },
  { module: 'auth', permission_key: 'auth.logout',               display_name: 'Logout',                     description: 'End the current session' },
  { module: 'auth', permission_key: 'auth.change_password',      display_name: 'Change Password',            description: 'Change own password' },
  { module: 'auth', permission_key: 'auth.force_password_change',display_name: 'Force Password Change',      description: 'Force other users to reset password' },

  // Dashboard
  { module: 'dashboard', permission_key: 'dashboard.view',       display_name: 'View Dashboard',             description: 'Access the main dashboard' },
  { module: 'dashboard', permission_key: 'dashboard.statistics', display_name: 'View Statistics',            description: 'View KPIs, analytics and charts' },
  { module: 'dashboard', permission_key: 'dashboard.export',     display_name: 'Export Dashboard Data',      description: 'Export dashboard reports' },

  // User Management
  { module: 'users', permission_key: 'users.view',               display_name: 'View Users',                 description: 'List and view user accounts' },
  { module: 'users', permission_key: 'users.create',             display_name: 'Create Users',               description: 'Create new user accounts' },
  { module: 'users', permission_key: 'users.edit',               display_name: 'Edit Users',                 description: 'Edit user details and settings' },
  { module: 'users', permission_key: 'users.deactivate',         display_name: 'Deactivate Users',           description: 'Deactivate or soft-delete users' },
  { module: 'users', permission_key: 'users.reset_password',     display_name: 'Reset User Password',        description: 'Force-reset another user\'s password' },
  { module: 'users', permission_key: 'users.change_role',        display_name: 'Change User Role',           description: 'Assign a different role to a user' },

  // Region Management
  { module: 'regions', permission_key: 'regions.view',           display_name: 'View Regions',               description: 'List and view regions' },
  { module: 'regions', permission_key: 'regions.create',         display_name: 'Create Regions',             description: 'Create new regions' },
  { module: 'regions', permission_key: 'regions.edit',           display_name: 'Edit Regions',               description: 'Edit region details' },
  { module: 'regions', permission_key: 'regions.delete',         display_name: 'Delete Regions',             description: 'Delete regions' },
  { module: 'regions', permission_key: 'regions.assign_sm',      display_name: 'Assign Sales Manager',       description: 'Assign a sales manager to a region' },

  // Party Management
  { module: 'party', permission_key: 'party.view',               display_name: 'View Parties',               description: 'List and view party/customer records' },
  { module: 'party', permission_key: 'party.create',             display_name: 'Create Parties',             description: 'Create new party records' },
  { module: 'party', permission_key: 'party.edit',               display_name: 'Edit Parties',               description: 'Edit party information' },
  { module: 'party', permission_key: 'party.delete',             display_name: 'Delete Parties',             description: 'Delete party records' },
  { module: 'party', permission_key: 'party.import',             display_name: 'Import Parties',             description: 'Bulk-import party data' },
  { module: 'party', permission_key: 'party.export',             display_name: 'Export Parties',             description: 'Export party data to spreadsheet' },
  { module: 'party', permission_key: 'party.rate_card',          display_name: 'View Rate Card',             description: 'View pricing and rate cards per party' },
  { module: 'party', permission_key: 'party.ledger',             display_name: 'View Party Ledger',          description: 'View payment and balance ledger' },
  { module: 'party', permission_key: 'party.order_history',      display_name: 'View Party Order History',   description: 'View historical orders for a party' },

  // Product Management
  { module: 'products', permission_key: 'products.view',         display_name: 'View Products',              description: 'List and view products' },
  { module: 'products', permission_key: 'products.create',       display_name: 'Create Products',            description: 'Add new products to the catalogue' },
  { module: 'products', permission_key: 'products.edit',         display_name: 'Edit Products',              description: 'Edit product details' },
  { module: 'products', permission_key: 'products.delete',       display_name: 'Delete Products',            description: 'Delete products from the catalogue' },
  { module: 'products', permission_key: 'products.import',       display_name: 'Import Products',            description: 'Bulk-import products via CSV/Excel' },
  { module: 'products', permission_key: 'products.export',       display_name: 'Export Products',            description: 'Export product data' },
  { module: 'products', permission_key: 'products.price_update', display_name: 'Update Pricing',             description: 'Change product base prices' },
  { module: 'products', permission_key: 'products.custom_fields',display_name: 'Manage Custom Fields',      description: 'Add or edit custom product fields' },

  // Inventory
  { module: 'inventory', permission_key: 'inventory.view',            display_name: 'View Inventory',        description: 'View stock levels and summary' },
  { module: 'inventory', permission_key: 'inventory.view_stock_split', display_name: 'View Stock Split',     description: 'View Stock1/Stock2 split details' },
  { module: 'inventory', permission_key: 'inventory.adjust',          display_name: 'Adjust Inventory',      description: 'Perform manual inventory adjustments' },
  { module: 'inventory', permission_key: 'inventory.inward',          display_name: 'Create Inward Entry',   description: 'Record incoming stock' },
  { module: 'inventory', permission_key: 'inventory.export',          display_name: 'Export Inventory',      description: 'Export stock data' },
  { module: 'inventory', permission_key: 'inventory.low_stock',       display_name: 'View Low Stock Alerts', description: 'See products below reorder threshold' },

  // Orders
  { module: 'orders', permission_key: 'orders.view',             display_name: 'View Orders',                description: 'List and view orders' },
  { module: 'orders', permission_key: 'orders.create',           display_name: 'Create Orders',              description: 'Place new orders' },
  { module: 'orders', permission_key: 'orders.edit',             display_name: 'Edit Orders',                description: 'Edit pending orders' },
  { module: 'orders', permission_key: 'orders.cancel',           display_name: 'Cancel Orders',              description: 'Cancel an existing order' },
  { module: 'orders', permission_key: 'orders.clone',            display_name: 'Clone Orders',               description: 'Duplicate an existing order' },
  { module: 'orders', permission_key: 'orders.approve',          display_name: 'Approve Orders',             description: 'Approve orders for fulfilment' },
  { module: 'orders', permission_key: 'orders.flag',             display_name: 'Flag Orders',                description: 'Flag orders with issues' },
  { module: 'orders', permission_key: 'orders.dispatch',         display_name: 'Dispatch Orders',            description: 'Move orders to dispatch/delivery stage' },
  { module: 'orders', permission_key: 'orders.return',           display_name: 'Return Orders',              description: 'Process order returns' },
  { module: 'orders', permission_key: 'orders.lock_override',    display_name: 'Lock Override',              description: 'Override order locks' },

  // Challan
  { module: 'challan', permission_key: 'challan.view',           display_name: 'View Challans',              description: 'View dispatch challans' },
  { module: 'challan', permission_key: 'challan.download',       display_name: 'Download Challans',          description: 'Download challan PDFs' },
  { module: 'challan', permission_key: 'challan.daily_summary',  display_name: 'Daily Dispatch Summary',     description: 'View daily dispatch summary report' },

  // Payments
  { module: 'payments', permission_key: 'payments.view',         display_name: 'View Payments',              description: 'View payment records' },
  { module: 'payments', permission_key: 'payments.create',       display_name: 'Record Payments',            description: 'Record new payments' },
  { module: 'payments', permission_key: 'payments.edit',         display_name: 'Edit Payments',              description: 'Edit payment entries' },
  { module: 'payments', permission_key: 'payments.export',       display_name: 'Export Payments',            description: 'Export payment data' },
  { module: 'payments', permission_key: 'payments.ageing',       display_name: 'View Payment Ageing',        description: 'View overdue/ageing reports' },

  // Reorder
  { module: 'reorder', permission_key: 'reorder.view',           display_name: 'View Reorder List',          description: 'View items flagged for reorder' },
  { module: 'reorder', permission_key: 'reorder.flag',           display_name: 'Flag for Reorder',           description: 'Flag a product for reorder' },
  { module: 'reorder', permission_key: 'reorder.order',          display_name: 'Place Reorder',              description: 'Create a purchase order for restock' },
  { module: 'reorder', permission_key: 'reorder.export',         display_name: 'Export Reorder List',        description: 'Export the reorder list' },

  // Notifications
  { module: 'notifications', permission_key: 'notifications.view',   display_name: 'View Notifications',    description: 'View own notifications' },
  { module: 'notifications', permission_key: 'notifications.send',   display_name: 'Send Notifications',    description: 'Send notifications to users' },
  { module: 'notifications', permission_key: 'notifications.manage', display_name: 'Manage Notifications',  description: 'Manage and dismiss all notifications' },

  // Audit Log
  { module: 'audit', permission_key: 'audit.view',               display_name: 'View Audit Logs',            description: 'View system audit trail' },
  { module: 'audit', permission_key: 'audit.export',             display_name: 'Export Audit Logs',          description: 'Export audit log data' },

  // Reports
  { module: 'reports', permission_key: 'reports.sales',          display_name: 'Sales Reports',              description: 'View sales performance reports' },
  { module: 'reports', permission_key: 'reports.margin',         display_name: 'Margin Reports',             description: 'View margin and profitability reports' },
  { module: 'reports', permission_key: 'reports.stock',          display_name: 'Stock Reports',              description: 'View inventory stock reports' },
  { module: 'reports', permission_key: 'reports.dashboard',      display_name: 'Dashboard Reports',          description: 'View aggregated dashboard reports' },
  { module: 'reports', permission_key: 'reports.suggestions',    display_name: 'Suggestion Reports',         description: 'View suggestion conversion reports' },
  { module: 'reports', permission_key: 'reports.export',         display_name: 'Export Reports',             description: 'Export any report to file' },

  // Settings
  { module: 'settings', permission_key: 'settings.view',         display_name: 'View Settings',              description: 'View system settings' },
  { module: 'settings', permission_key: 'settings.manage',       display_name: 'Manage Settings & Permissions', description: 'Edit settings and manage role permissions (super-admin)' },
];

// ── Default permission assignments per role ───────────────────────────────────
// Keys: role name → array of permission_keys that role gets by default
const ROLE_DEFAULTS = {
  admin: ALL_PERMISSIONS.map((p) => p.permission_key), // Admin gets everything

  sales_manager: [
    'auth.login', 'auth.logout', 'auth.change_password',
    'dashboard.view', 'dashboard.statistics',
    'party.view', 'party.create', 'party.edit', 'party.ledger', 'party.order_history', 'party.rate_card',
    'products.view',
    'inventory.view',
    'orders.view', 'orders.create', 'orders.edit', 'orders.clone',
    'challan.view', 'challan.download',
    'payments.view', 'payments.create',
    'reorder.view', 'reorder.flag',
    'notifications.view',
    'reports.suggestions',
  ],

  inventory_manager: [
    'auth.login', 'auth.logout', 'auth.change_password',
    'dashboard.view', 'dashboard.statistics',
    'products.view', 'products.edit', 'products.import', 'products.custom_fields',
    'inventory.view', 'inventory.view_stock_split', 'inventory.adjust', 'inventory.inward', 'inventory.export', 'inventory.low_stock',
    'orders.view', 'orders.approve', 'orders.flag', 'orders.return',
    'challan.view', 'challan.download', 'challan.daily_summary',
    'reorder.view', 'reorder.order', 'reorder.export',
    'notifications.view',
    'reports.stock',
  ],

  dispatch_worker: [
    'auth.login', 'auth.logout', 'auth.change_password',
    'dashboard.view',
    'orders.view', 'orders.dispatch',
    'challan.view', 'challan.download', 'challan.daily_summary',
    'notifications.view',
  ],
};

async function seedDatabase() {
  try {
    // 1. Seed Roles
    const rolesData = [
      { id: 1, name: 'admin',             display_name: 'Administrator',       description: 'Full access to settings, logs, and user management.',   is_system_role: true },
      { id: 2, name: 'sales_manager',     display_name: 'Sales Manager',       description: 'Handles parties, orders, and payments.',                is_system_role: true },
      { id: 3, name: 'inventory_manager', display_name: 'Inventory Manager',   description: 'Manages products, stocks, and inward items.',           is_system_role: true },
      { id: 4, name: 'dispatch_worker',   display_name: 'Dispatch Worker',     description: 'Handles item picking and dispatch queues.',             is_system_role: true },
    ];

    for (const r of rolesData) {
      await Role.findOrCreate({ where: { id: r.id }, defaults: r });
    }
    console.log('Roles checked/seeded successfully.');

    // 2. Seed Default Admin User
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) throw new Error('Admin role not found during seeding');

    const defaultAdminLogin = 'admin';
    const adminUser = await User.findOne({ where: { login_id: defaultAdminLogin } });

    if (!adminUser) {
      const defaultPassword = 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await User.create({
        name: 'System Admin',
        login_id: defaultAdminLogin,
        role_id: adminRole.id,
        password_hash: passwordHash,
        is_active: true,
        must_change_password: false,
      });
      console.log(`Default admin user seeded: ${defaultAdminLogin} / ${defaultPassword}`);
    } else {
      console.log('Admin user exists.');
    }

    // 3. Seed Permissions
    console.log('Seeding permissions...');
    const permissionMap = {}; // key → Permission instance
    for (const p of ALL_PERMISSIONS) {
      const [instance] = await Permission.findOrCreate({
        where: { permission_key: p.permission_key },
        defaults: p,
      });
      permissionMap[p.permission_key] = instance;
    }
    console.log(`${ALL_PERMISSIONS.length} permissions checked/seeded.`);

    // 4. Assign default permissions to roles (only if role has NO permissions yet)
    for (const [roleName, keys] of Object.entries(ROLE_DEFAULTS)) {
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role) continue;

      const existingCount = await RolePermission.count({ where: { role_id: role.id } });
      if (existingCount > 0) {
        console.log(`Role '${roleName}' already has permissions. Skipping default assignment.`);
        continue;
      }

      const rows = keys
        .filter((k) => permissionMap[k])
        .map((k) => ({ role_id: role.id, permission_id: permissionMap[k].id }));

      if (rows.length > 0) {
        await RolePermission.bulkCreate(rows, { ignoreDuplicates: true });
      }
      console.log(`Assigned ${rows.length} default permissions to role '${roleName}'.`);
    }
    console.log('Permission seeding complete.');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

async function ensureAllStockRows() {
  try {
    const { Product, StockOnHand, StockReserved } = require('./models');
    const products = await Product.findAll();
    let count = 0;
    for (const p of products) {
      const [, sohCreated] = await StockOnHand.findOrCreate({
        where: { product_id: p.id },
        defaults: { product_id: p.id, quantity: 0 },
      });
      const [, srCreated] = await StockReserved.findOrCreate({
        where: { product_id: p.id },
        defaults: { product_id: p.id, quantity: 0 },
      });
      if (sohCreated || srCreated) count++;
    }
    if (count > 0) console.log(`Ensured stock rows for ${count} product(s) with missing records.`);
  } catch (error) {
    console.error('Error during ensuring all stock rows:', error);
  }
}

async function startServer() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('Syncing database schema...');
    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized.');

    await seedDatabase();
    await ensureAllStockRows();

    server.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
