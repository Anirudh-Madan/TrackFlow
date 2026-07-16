const express = require('express');
const router = express.Router();
const vendorsController = require('./vendors.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/',       requirePermission('products.view'),   vendorsController.getVendors);
router.post('/',      requirePermission('products.create'), vendorsController.createVendor);
router.put('/:id',    requirePermission('products.edit'),   vendorsController.updateVendor);
router.delete('/:id', requirePermission('products.delete'), vendorsController.deleteVendor);

module.exports = router;
