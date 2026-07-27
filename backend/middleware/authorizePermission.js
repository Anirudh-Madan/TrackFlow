/**
 * authorizePermission(...keys)
 *
 * Dynamic RBAC middleware that checks whether the authenticated user's role
 * has ALL of the specified permission keys.
 *
 * Permissions are fetched from the database and cached per role_id for 60
 * seconds. Admin saves trigger cache invalidation so changes take effect on
 * the very next request without a server restart.
 *
 * Usage:
 *   router.delete('/:id', authenticate, requirePermission('products.delete'), c.deleteProduct)
 */
const { Role, Permission } = require('../models');

// In-process permission cache: Map<role_id, { permissions: Set<string>, cachedAt: number }>
const permissionCache = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds

async function loadPermissionsForRole(roleId) {
  const role = await Role.findByPk(roleId, {
    include: [{ model: Permission, as: 'permissions', attributes: ['permission_key'] }],
  });

  if (!role) return new Set();

  return new Set(role.permissions.map((p) => p.permission_key));
}

function requirePermission(...keys) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const roleName = typeof req.user.role === 'object' ? req.user.role?.name : req.user.role;
      if (roleName === 'admin') {
        return next(); // Admin role has full access to all permissions
      }

      if (!req.user.role_id) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { role_id } = req.user;
      const now = Date.now();
      let cached = permissionCache.get(role_id);

      // Cache miss or expired — reload from DB
      if (!cached || now - cached.cachedAt > CACHE_TTL_MS) {
        const permissions = await loadPermissionsForRole(role_id);
        cached = { permissions, cachedAt: now };
        permissionCache.set(role_id, cached);
      }

      // Check that user holds EVERY required key
      const missingKey = keys.find((k) => !cached.permissions.has(k));
      if (missingKey) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Missing permission: ${missingKey}`,
          missing_permission: missingKey,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Invalidate the cached permissions for a specific role.
 * Call this after admin updates a role's permissions.
 */
requirePermission.invalidateCache = (roleId) => {
  permissionCache.delete(roleId);
};

/**
 * Invalidate all cached permissions (e.g. on server startup after seeding).
 */
requirePermission.invalidateAll = () => {
  permissionCache.clear();
};

module.exports = requirePermission;
