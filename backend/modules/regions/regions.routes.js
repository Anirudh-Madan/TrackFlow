const express = require('express');
const router = express.Router();
const regionsController = require('./regions.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/',       requirePermission('regions.view'),   regionsController.getRegions);
router.post('/',      requirePermission('regions.create'), regionsController.createRegion);
router.put('/:id',    requirePermission('regions.edit'),   regionsController.updateRegion);
router.delete('/:id', requirePermission('regions.delete'), regionsController.deleteRegion);

module.exports = router;
