const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

router.use(authenticate);

router.get('/',       requirePermission('users.view'),       usersController.getUsers);
router.post('/',      requirePermission('users.create'),     usersController.createUser);
router.put('/:id',    requirePermission('users.edit'),       usersController.updateUser);
router.delete('/:id', requirePermission('users.deactivate'), usersController.deleteUser);

module.exports = router;
