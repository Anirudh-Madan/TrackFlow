const express = require('express');
const router = express.Router();
const customersController = require('./customers.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/',       requirePermission('party.view'),   customersController.getCustomers);
router.post('/',      requirePermission('party.create'), customersController.createCustomer);
router.put('/:id',    requirePermission('party.edit'),   customersController.updateCustomer);
router.delete('/:id', requirePermission('party.delete'), customersController.deleteCustomer);

module.exports = router;
