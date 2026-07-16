const express = require('express');
const router = express.Router();
const c = require('./purchaseOrders.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/order-items', requirePermission('reorder.order'), c.getOrderItems);
router.get('/',            requirePermission('reorder.order'), c.list);
router.post('/',           requirePermission('reorder.order'), c.create);

module.exports = router;
