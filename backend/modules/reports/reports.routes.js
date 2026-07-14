const express = require('express');
const router = express.Router();
const c = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorizeRoles');

router.use(authenticate);

router.get('/sales',    authorizeRoles('admin'), c.salesReport);
router.get('/below-dl', authorizeRoles('admin'), c.belowDlReport);
router.get('/stock',    authorizeRoles('admin'), c.stockReport);

module.exports = router;
