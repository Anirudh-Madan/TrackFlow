const express = require('express');
const router = express.Router();
const c = require('./payments.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/',                        c.listPayments);
router.post('/',                       c.createPayment);
router.put('/:id',                     c.updatePayment);
router.get('/:id/edit-history',        c.getPaymentEditHistory);
router.get('/daywise-outstandings',    c.getDaywiseOutstandings);
router.get('/ledger/:partyId',         c.getPartyLedger);

module.exports = router;
