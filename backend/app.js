const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const authRoutes    = require('./modules/auth/auth.routes');
const usersRoutes   = require('./modules/users/users.routes');
const regionsRoutes = require('./modules/regions/regions.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const vendorsRoutes   = require('./modules/vendors/vendors.routes');
const productsRoutes  = require('./modules/products/products.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const inwardRoutes    = require('./modules/inward/inward.routes');
const ordersRoutes    = require('./modules/orders/orders.routes');
const challansRoutes  = require('./modules/challans/challans.routes');
const reorderRoutes   = require('./modules/reorder/reorder.routes');
const pipelineRoutes  = require('./modules/pipeline/pipeline.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const partRequestsRoutes  = require('./modules/partRequests/partRequests.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const purchaseOrdersRoutes = require('./modules/purchaseOrders/purchaseOrders.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const rbacRoutes = require('./modules/rbac/rbac.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth',    authRoutes);
app.use('/api/v1/users',   usersRoutes);
app.use('/api/v1/regions', regionsRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/vendors',   vendorsRoutes);
app.use('/api/v1/products',   productsRoutes);
app.use('/api/v1/inventory',  inventoryRoutes);
app.use('/api/v1/inward',     inwardRoutes);
app.use('/api/v1/orders',     ordersRoutes);
app.use('/api/v1/challans',   challansRoutes);
app.use('/api/v1/reorder',    reorderRoutes);
app.use('/api/v1/pipeline',   pipelineRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/part-requests', partRequestsRoutes);
app.use('/api/v1/analytics',       analyticsRoutes);
app.use('/api/v1/purchase-orders', purchaseOrdersRoutes);
app.use('/api/v1/reports',         reportsRoutes);
app.use('/api/v1/rbac',            rbacRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Central Error Handler
app.use(errorHandler);

module.exports = app;
