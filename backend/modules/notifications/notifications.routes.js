const express = require('express');
const router = express.Router();
const c = require('./notifications.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.post('/read-all', c.markAllRead);
router.post('/:id/read', c.markRead);

module.exports = router;
