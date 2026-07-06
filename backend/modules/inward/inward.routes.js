const express = require('express');
const router  = express.Router();
const c       = require('./inward.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

// Create inward entry
router.post('/', c.createInwardEntry);

// List inward entries
router.get('/',  c.getInwardEntries);

// Inward details
router.get('/:id', c.getInwardEntryById);

module.exports = router;
