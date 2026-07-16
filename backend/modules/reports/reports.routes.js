const express = require('express');
const router = express.Router();
const c = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/sales',    requirePermission('reports.sales'), c.salesReport);
router.get('/below-dl', requirePermission('reports.sales'), c.belowDlReport);
router.get('/stock',    requirePermission('reports.stock'), c.stockReport);

module.exports = router;
