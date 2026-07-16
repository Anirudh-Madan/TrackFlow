const express = require('express');
const router  = express.Router();
const c       = require('./inward.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// Create inward entry
router.post('/', requirePermission('inventory.inward'), c.createInwardEntry);

// List inward entries
router.get('/',  requirePermission('inventory.view'),   c.getInwardEntries);

// Inward details
router.get('/:id', requirePermission('inventory.view'), c.getInwardEntryById);

module.exports = router;
