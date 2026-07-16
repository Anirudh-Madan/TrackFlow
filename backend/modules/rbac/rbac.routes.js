const express = require('express');
const router = express.Router();
const c = require('./rbac.controller');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/authorizePermission');

// All RBAC management routes require authentication + settings.manage permission
router.use(authenticate);
router.use(requirePermission('settings.manage'));

// List all roles
router.get('/roles', c.getRoles);

// List all permissions (grouped by module)
router.get('/permissions', c.getPermissions);

// Get permissions for a specific role (with enabled/disabled state)
router.get('/roles/:id/permissions', c.getRolePermissions);

// Update permissions for a specific role
router.put('/roles/:id/permissions', c.updateRolePermissions);

module.exports = router;
