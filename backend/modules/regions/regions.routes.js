const express = require('express');
const router = express.Router();
const regionsController = require('./regions.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }
  next();
});

router.get('/',     regionsController.getRegions);
router.post('/',    regionsController.createRegion);
router.put('/:id',  regionsController.updateRegion);
router.delete('/:id', regionsController.deleteRegion);

module.exports = router;
