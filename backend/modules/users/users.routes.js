const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const authenticate = require('../../middleware/authenticate');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }
  next();
};

router.use(authenticate);

router.get('/',        usersController.getUsers);
router.post('/',       adminOnly, usersController.createUser);
router.put('/:id',     adminOnly, usersController.updateUser);
router.delete('/:id',  adminOnly, usersController.deleteUser);

module.exports = router;
