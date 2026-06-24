const express = require('express');
const router  = express.Router();
const c       = require('./inventory.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

// Stock Summary & Low Stock
router.get('/stock',       c.getStockSummary);
router.get('/stock/low',   c.getLowStock);

// Transaction Ledger (read-only, immutable)
router.get('/transactions', c.getTransactions);

// Damaged Stock
router.get('/damaged',     c.getDamaged);
router.post('/damaged',    c.recordDamage);

// Manual Adjustments
router.get('/adjustments', c.getAdjustments);
router.post('/adjustments', c.createAdjustment);

// Reorder
router.post('/reorder',    c.placeReorder);

module.exports = router;
