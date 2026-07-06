const express = require('express');
const router = express.Router();
const c = require('./pipeline.controller');
const authenticate = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorizeRoles');

router.use(authenticate);

// Reads (role-scoped in controller)
router.get('/', c.getPipelines);
router.get('/stats', c.getStats);
router.get('/workers', c.getDispatchWorkers);
router.get('/order/:orderId/available-parts', c.getAvailablePartsForOrder);
router.get('/:id', c.getPipelineById);

// Stage 1 — IM approves + picks parts + assigns worker (admin may override)
router.post('/:id/im-approve', authorizeRoles('admin', 'inventory_manager'), c.imApprove);

// Quick assign / reassign a worker straight from the Orders & Challans lists
router.post('/order/:orderId/assign-worker', authorizeRoles('admin', 'inventory_manager'), c.quickAssignWorker);

// Stage 2 — DW out for delivery (admin may override)
router.post('/:id/start-delivery', authorizeRoles('admin', 'dispatch_worker'), c.startDelivery);

// Stage 3 — DW delivered (admin may override)
router.post('/:id/deliver', authorizeRoles('admin', 'dispatch_worker'), c.markDelivered);

// Stage 4 — SM confirms received / sold (admin may override)
router.post('/:id/fulfill', authorizeRoles('admin', 'sales_manager'), c.fulfill);

// Reject — Admin or IM before delivery
router.post('/:id/reject', authorizeRoles('admin', 'inventory_manager'), c.reject);

module.exports = router;
