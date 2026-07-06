const express = require('express');
const router  = express.Router();
const c       = require('./challans.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

// List all challans
router.get('/', c.getChallans);

// Get single challan
router.get('/:id', c.getChallanById);

module.exports = router;
