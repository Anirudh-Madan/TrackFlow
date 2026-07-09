const express = require('express');
const router = express.Router();
const c = require('./purchaseOrders.controller');
const authenticate = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorizeRoles');

router.use(authenticate);

router.get('/order-items', authorizeRoles('sales_manager', 'admin'), c.getOrderItems);
router.get('/',            authorizeRoles('sales_manager', 'admin'), c.list);
router.post('/',           authorizeRoles('sales_manager', 'admin'), c.create);

module.exports = router;
