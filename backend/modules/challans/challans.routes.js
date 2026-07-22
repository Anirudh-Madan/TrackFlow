const express = require('express');
const router  = express.Router();
const c       = require('./challans.controller');
const authenticate = require('../../middleware/authenticate');

// Public route — no auth needed
router.get('/public/:token', c.getPublicChallan);

// All other routes require auth
router.use(authenticate);

router.get('/check-part',      c.checkPartAvailability);
router.get('/',                c.getChallans);
router.get('/:id',             c.getChallanById);
router.get('/:id/edit-history',c.getEditHistory);
router.post('/',               c.createChallan);
router.put('/:id',             c.updateChallan);
router.delete('/:id',          c.deleteChallan);
router.post('/:id/return',     c.returnChallan);

module.exports = router;
