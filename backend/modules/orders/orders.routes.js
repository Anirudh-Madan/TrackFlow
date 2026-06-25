const express = require('express');
const router  = express.Router();
const c       = require('./orders.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

// Create order (SM scope or helper)
router.post('/', c.createOrder);

// List pending orders
router.get('/pending', c.getPendingOrders);

// List all orders (with optional filters)
router.get('/', c.getOrders);

// Get order details
router.get('/:id', c.getOrderById);

// Approve order (IM action)
router.post('/:id/approve', c.approveOrder);

// Flag order (IM action)
router.post('/:id/flag', c.flagOrder);

// Return order (IM action)
router.post('/:id/return', c.returnOrder);

module.exports = router;
