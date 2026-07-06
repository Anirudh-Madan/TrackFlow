const express = require('express');
const router = express.Router();
const c = require('./analytics.controller');
const authenticate = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorizeRoles');

router.use(authenticate);

router.get('/overview', authorizeRoles('admin'), c.overview);
router.get('/flow', authorizeRoles('admin'), c.flow);

module.exports = router;
