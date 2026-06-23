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
