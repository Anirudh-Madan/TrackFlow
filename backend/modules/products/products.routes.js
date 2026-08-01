const express = require('express');
const router = express.Router();
const c = require('./products.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// Categories (specific paths must come before /:id)
router.get('/categories',        requirePermission('products.view'),   c.getCategories);
router.post('/categories',       requirePermission('products.create'), c.createCategory);
router.put('/categories/:id',    requirePermission('products.edit'),   c.updateCategory);
router.delete('/categories/:id', requirePermission('products.delete'), c.deleteCategory);

// Units of Measure
router.get('/uom',        requirePermission('products.view'),   c.getUOM);
router.post('/uom',       requirePermission('products.create'), c.createUOM);
router.put('/uom/:id',    requirePermission('products.edit'),   c.updateUOM);
router.delete('/uom/:id', requirePermission('products.delete'), c.deleteUOM);

// Pricing
router.get('/pricing',        requirePermission('products.view'),         c.getPricing);
router.post('/pricing',       requirePermission('products.price_update'), c.createPricing);
router.put('/pricing/:id',    requirePermission('products.price_update'), c.updatePricing);
router.delete('/pricing/:id', requirePermission('products.price_update'), c.deletePricing);

// Products
router.get('/check-availability', requirePermission('products.view'),  c.checkPartAvailability);
router.get('/',                   requirePermission('products.view'),   c.getProducts);
router.post('/bulk-import',       requirePermission('products.import'), c.bulkImport);
router.get('/import-history',     requirePermission('products.view'),   c.getImportHistory);
router.post('/',                  requirePermission('products.create'), c.createProduct);
router.post('/:id/add-to-stock',  requirePermission('products.view'),   c.initializeStock);
router.get('/:id/transactions',   requirePermission('products.view'),   c.getProductTransactions);
router.put('/:id',                requirePermission('products.edit'),   c.updateProduct);
router.delete('/:id',             requirePermission('products.delete'), c.deleteProduct);

module.exports = router;
