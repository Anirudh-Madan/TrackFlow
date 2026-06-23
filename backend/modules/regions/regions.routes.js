const express = require('express');
const router = express.Router();
const regionsController = require('./regions.controller');
const authenticate = require('../../middleware/authenticate');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }
  next();
};

router.use(authenticate);

router.get('/',     regionsController.getRegions);
router.post('/',    adminOnly, regionsController.createRegion);
router.put('/:id',  adminOnly, regionsController.updateRegion);
router.delete('/:id', adminOnly, regionsController.deleteRegion);

module.exports = router;
