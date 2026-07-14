require('dotenv').config();
const app = require('./app');
const { sequelize, Role, User, Region } = require('./models');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;

async function seedDatabase() {
  try {
    // 1. Seed Roles
    const rolesData = [
      { id: 1, name: 'admin', display_name: 'Administrator', description: 'Full access to settings, logs, and users management.' },
      { id: 2, name: 'sales_manager', display_name: 'Sales Manager', description: 'Handles parties, orders, and payments.' },
      { id: 3, name: 'inventory_manager', display_name: 'Inventory Manager', description: 'Manages products, stocks, and inward items.' },
      { id: 4, name: 'dispatch_worker', display_name: 'Dispatch Worker', description: 'Handles item picking and dispatch queues.' },
    ];

    for (const r of rolesData) {
      await Role.findOrCreate({
        where: { id: r.id },
        defaults: r,
      });
    }
    console.log('Roles checked/seeded successfully.');

    // 2. Seed Default Admin User if none exists
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      throw new Error('Admin role not found during seeding');
    }

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
        must_change_password: false, // Do not force change on login
      });
      console.log(`Default admin user seeded: ${defaultAdminLogin} / ${defaultPassword}`);
    } else {
      console.log('Admin user exists.');
    }
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
      const [soh, sohCreated] = await StockOnHand.findOrCreate({
        where: { product_id: p.id },
        defaults: { product_id: p.id, quantity: 0 },
      });
      const [sr, srCreated] = await StockReserved.findOrCreate({
        where: { product_id: p.id },
        defaults: { product_id: p.id, quantity: 0 },
      });
      if (sohCreated || srCreated) {
        count++;
      }
    }
    if (count > 0) {
      console.log(`Ensured stock rows for ${count} product(s) with missing records.`);
    }
  } catch (error) {
    console.error('Error during ensuring all stock rows:', error);
  }
}

async function startServer() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models with database
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized.');

    // Seed data
    await seedDatabase();

    // Ensure all products have stock rows
    await ensureAllStockRows();

    // Start server
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

