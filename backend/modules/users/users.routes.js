const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const authenticate = require('../../middleware/authenticate');

// Ensure all user routes require authentication and admin role
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }
  next();
});

router.get('/', usersController.getUsers);
router.post('/', usersController.createUser);

module.exports = router;
