const express = require('express');
const router = express.Router();
const customersController = require('./customers.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/',       customersController.getCustomers);
router.post('/',      customersController.createCustomer);
router.put('/:id',    customersController.updateCustomer);
router.delete('/:id', customersController.deleteCustomer);

module.exports = router;
