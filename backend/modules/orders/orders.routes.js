const express = require('express');
const router  = express.Router();
const c       = require('./orders.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// Create order
router.post('/',          requirePermission('orders.create'),  c.createOrder);

// List pending orders
router.get('/pending',    requirePermission('orders.view'),    c.getPendingOrders);

// List all orders
router.get('/',           requirePermission('orders.view'),    c.getOrders);

// Get order details
router.get('/:id',        requirePermission('orders.view'),    c.getOrderById);

// Approve order (IM/admin action)
router.post('/:id/approve', requirePermission('orders.approve'), c.approveOrder);

// Flag order
router.post('/:id/flag',    requirePermission('orders.flag'),    c.flagOrder);

// Return order
router.post('/:id/return',  requirePermission('orders.return'),  c.returnOrder);

module.exports = router;
