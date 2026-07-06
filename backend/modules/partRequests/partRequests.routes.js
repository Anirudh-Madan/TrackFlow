const express = require('express');
const router = express.Router();
const c = require('./partRequests.controller');
const authenticate = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorizeRoles');

router.use(authenticate);

router.get('/', c.list);
router.post('/', authorizeRoles('sales_manager', 'admin'), c.create);
router.post('/:id/acknowledge', authorizeRoles('inventory_manager', 'admin'), c.acknowledge);
router.post('/:id/reorder', authorizeRoles('inventory_manager', 'admin'), c.convertToReorder);
router.post('/:id/close', authorizeRoles('inventory_manager', 'admin', 'sales_manager'), c.close);

module.exports = router;
