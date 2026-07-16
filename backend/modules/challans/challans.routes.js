const express = require('express');
const router  = express.Router();
const c       = require('./challans.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// List all challans
router.get('/',    requirePermission('challan.view'), c.getChallans);

// Get single challan
router.get('/:id', requirePermission('challan.view'), c.getChallanById);

module.exports = router;
