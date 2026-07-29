const express = require('express');
const router = express.Router();
const c = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/sales',          requirePermission('reports.sales'), c.salesReport);
router.get('/below-dl',       requirePermission('reports.sales'), c.belowDlReport);
router.get('/stock',          requirePermission('reports.stock'), c.stockReport);
router.get('/salesman-wise',  requirePermission('reports.sales'), c.salesmanWise);
router.get('/salesman-detail', requirePermission('reports.sales'), c.salespersonDetail);
router.get('/party-wise',     requirePermission('reports.sales'), c.partyWise);
router.get('/supplier-wise',  requirePermission('reports.sales'), c.supplierWise);
router.get('/supplier-detail', requirePermission('reports.sales'), c.supplierDetail);
router.get('/activity-log',   requirePermission('reports.sales'), c.activityLog);
router.get('/part-history',   c.partHistory);
router.get('/part-suggestions', c.partSearchSuggestions);
router.get('/stock-movement', c.stockMovement);
router.get('/velocity-min-stock', c.velocityMinStock);
router.post('/update-min-stock', c.updateMinStock);
router.post('/ai-insight',    c.aiInsight);

module.exports = router;
