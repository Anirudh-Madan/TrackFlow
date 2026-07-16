const express = require('express');
const router = express.Router();
const c = require('./analytics.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/overview', requirePermission('dashboard.statistics'), c.overview);
router.get('/flow',     requirePermission('dashboard.statistics'), c.flow);

module.exports = router;
