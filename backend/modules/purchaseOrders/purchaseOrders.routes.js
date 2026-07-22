const express = require('express');
const router = express.Router();
const c = require('./purchaseOrders.controller');
const authenticate = require('../../middleware/authenticate');

// Public route — no auth needed
router.get('/public/:token', c.getPublicPO);

router.use(authenticate);

router.get('/order-items',         c.getOrderItems);
router.get('/',                    c.list);
router.get('/:id',                 c.getById);
router.get('/:id/edit-history',    c.getEditHistory);
router.post('/',                   c.create);
router.put('/:id',                 c.update);
router.delete('/:id',              c.remove);
router.post('/:id/return',         c.returnPO);

module.exports = router;
