const express = require('express');
const router  = express.Router();
const c       = require('./reorder.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

// Create reorder request
router.post('/', c.createReorder);

// List reorder requests
router.get('/', c.getReorders);

// Update status
router.put('/:id/status', c.updateReorderStatus);

module.exports = router;
