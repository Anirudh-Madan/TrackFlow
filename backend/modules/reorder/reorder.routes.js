const express = require('express');
const router  = express.Router();
const c       = require('./reorder.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// Create reorder request / flag
router.post('/',          requirePermission('reorder.flag'),   c.createReorder);

// List reorder requests
router.get('/',           requirePermission('reorder.view'),   c.getReorders);

// Update status (mark ordered)
router.put('/:id/status', requirePermission('reorder.order'),  c.updateReorderStatus);

module.exports = router;
