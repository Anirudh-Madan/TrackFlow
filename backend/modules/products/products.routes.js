const express = require('express');
const router = express.Router();
const c = require('./products.controller');
const authenticate = require('../../middleware/authenticate');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

router.use(authenticate);

// Categories (specific paths must come before /:id)
router.get('/categories',       c.getCategories);
router.post('/categories',      adminOnly, c.createCategory);
router.put('/categories/:id',   adminOnly, c.updateCategory);
router.delete('/categories/:id', adminOnly, c.deleteCategory);

// Units of Measure
router.get('/uom',       c.getUOM);
router.post('/uom',      adminOnly, c.createUOM);
router.put('/uom/:id',   adminOnly, c.updateUOM);
router.delete('/uom/:id', adminOnly, c.deleteUOM);

// Pricing
router.get('/pricing',       c.getPricing);
router.post('/pricing',      c.createPricing);
router.put('/pricing/:id',   c.updatePricing);
router.delete('/pricing/:id', c.deletePricing);

// Products
router.get('/',       c.getProducts);
router.post('/bulk-import', c.bulkImport);
router.get('/import-history', c.getImportHistory);
router.post('/',      c.createProduct);
router.put('/:id',    c.updateProduct);
router.delete('/:id', c.deleteProduct);

module.exports = router;
