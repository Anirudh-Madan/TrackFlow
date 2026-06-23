const express = require('express');
const router = express.Router();
const vendorsController = require('./vendors.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/',       vendorsController.getVendors);
router.post('/',      vendorsController.createVendor);
router.put('/:id',    vendorsController.updateVendor);
router.delete('/:id', vendorsController.deleteVendor);

module.exports = router;
