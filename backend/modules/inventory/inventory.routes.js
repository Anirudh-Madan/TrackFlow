const express = require('express');
const router  = express.Router();
const c       = require('./inventory.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// Stock Summary & Low Stock
router.get('/stock',        requirePermission('inventory.view'),      c.getStockSummary);
router.get('/stock/low',    requirePermission('inventory.low_stock'), c.getLowStock);

// Transaction Ledger (read-only, immutable)
router.get('/transactions', requirePermission('inventory.view'),      c.getTransactions);

// Damaged Stock
router.get('/damaged',      requirePermission('inventory.view'),      c.getDamaged);
router.post('/damaged',     requirePermission('inventory.adjust'),    c.recordDamage);

// Manual Adjustments
router.get('/adjustments',  requirePermission('inventory.view'),      c.getAdjustments);
router.post('/adjustments', requirePermission('inventory.adjust'),    c.createAdjustment);

// Reorder
router.post('/reorder',     requirePermission('reorder.order'),       c.placeReorder);

module.exports = router;
