const express = require('express');
const router = express.Router();
const c = require('./notifications.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/',             requirePermission('notifications.view'), c.list);
router.get('/unread-count', requirePermission('notifications.view'), c.unreadCount);
router.post('/read-all',    requirePermission('notifications.view'), c.markAllRead);
router.post('/:id/read',    requirePermission('notifications.view'), c.markRead);

module.exports = router;
