const express = require('express');
const router = express.Router();
const c = require('./pipeline.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

// Reads (role-scoped filtering handled inside controller)
router.get('/',                                requirePermission('orders.view'),     c.getPipelines);
router.get('/stats',                           requirePermission('orders.view'),     c.getStats);
router.get('/workers',                         requirePermission('orders.approve'),  c.getDispatchWorkers);
router.get('/order/:orderId/available-parts',  requirePermission('orders.approve'),  c.getAvailablePartsForOrder);
router.get('/:id',                             requirePermission('orders.view'),     c.getPipelineById);

// Stage 1 — IM approves + picks parts + assigns worker
router.post('/:id/im-approve',                        requirePermission('orders.approve'),  c.imApprove);
router.post('/order/:orderId/assign-worker',           requirePermission('orders.approve'),  c.quickAssignWorker);

// Stage 2 — DW out for delivery
router.post('/:id/start-delivery',                    requirePermission('orders.dispatch'), c.startDelivery);

// Stage 3 — DW delivered
router.post('/:id/deliver',                           requirePermission('orders.dispatch'), c.markDelivered);

// Stage 4 — SM confirms received / sold
router.post('/:id/fulfill',                           requirePermission('orders.view'),     c.fulfill);

// Reject
router.post('/:id/reject',                            requirePermission('orders.approve'),  c.reject);

module.exports = router;
