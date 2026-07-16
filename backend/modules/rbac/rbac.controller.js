const { Role, Permission, RolePermission, AuditLog, User } = require('../../models');
const requirePermission = require('../../middleware/authorizePermission');
const { Op } = require('sequelize');

/**
 * GET /api/v1/rbac/roles
 * List all roles with their permission counts.
 */
exports.getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, as: 'permissions', attributes: ['id'] }],
      order: [['id', 'ASC']],
    });

    const data = roles.map((r) => ({
      id: r.id,
      name: r.name,
      display_name: r.display_name,
      description: r.description,
      is_system_role: r.is_system_role,
      permission_count: r.permissions.length,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/rbac/permissions
 * List ALL permissions grouped by module.
 */
exports.getPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({ order: [['module', 'ASC'], ['permission_key', 'ASC']] });

    // Group by module
    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push({
        id: p.id,
        permission_key: p.permission_key,
        display_name: p.display_name,
        description: p.description,
      });
    }

    // Convert to array for easier frontend consumption
    const data = Object.entries(grouped).map(([module, perms]) => ({ module, permissions: perms }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/rbac/roles/:id/permissions
 * Get all permissions with enabled/disabled flag for a specific role.
 */
exports.getRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, {
      include: [{ model: Permission, as: 'permissions', attributes: ['id'] }],
    });
    if (!role) return res.status(404).json({ success: false, error: 'Role not found' });

    const enabledIds = new Set(role.permissions.map((p) => p.id));
    const allPermissions = await Permission.findAll({ order: [['module', 'ASC'], ['permission_key', 'ASC']] });

    // Group by module with enabled flag
    const grouped = {};
    for (const p of allPermissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push({
        id: p.id,
        permission_key: p.permission_key,
        display_name: p.display_name,
        description: p.description,
        enabled: enabledIds.has(p.id),
      });
    }

    const data = Object.entries(grouped).map(([module, perms]) => ({ module, permissions: perms }));

    res.json({
      success: true,
      data: {
        role: {
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          is_system_role: role.is_system_role,
        },
        permission_groups: data,
        total_enabled: enabledIds.size,
        total_permissions: allPermissions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/rbac/roles/:id/permissions
 * Replace the permission set for a role.
 * Body: { permission_ids: number[] }
 *
 * Safety: Prevents removing settings.manage from ALL admin users.
 */
exports.updateRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ success: false, error: 'permission_ids must be an array' });
    }

    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ success: false, error: 'Role not found' });

    // ── Safety: protect settings.manage on admin role ──────────────────────────
    const settingsManagePermission = await Permission.findOne({ where: { permission_key: 'settings.manage' } });
    if (settingsManagePermission && !permission_ids.includes(settingsManagePermission.id)) {
      // Check if any OTHER role still has this permission
      const otherRolesWithSettingsManage = await RolePermission.count({
        where: {
          permission_id: settingsManagePermission.id,
          role_id: { [Op.ne]: id },
        },
      });

      // Also check if there is at least one active admin user in a different role with this permission
      if (otherRolesWithSettingsManage === 0 && role.name === 'admin') {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove settings.manage from the admin role. This would lock out all admins.',
        });
      }
    }

    // Fetch before-state for audit
    const before = await RolePermission.findAll({ where: { role_id: id } });
    const beforeIds = before.map((rp) => rp.permission_id);

    // Replace — delete all then insert new set
    await RolePermission.destroy({ where: { role_id: id } });

    if (permission_ids.length > 0) {
      const rows = permission_ids.map((pid) => ({ role_id: parseInt(id), permission_id: pid }));
      await RolePermission.bulkCreate(rows, { ignoreDuplicates: true });
    }

    // Invalidate permission cache for this role immediately
    requirePermission.invalidateCache(parseInt(id));

    // Write to audit log
    await AuditLog.create({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action_type: 'update',
      module: 'settings',
      entity_type: 'role_permissions',
      entity_id: id,
      before_state: { permission_ids: beforeIds },
      after_state: { permission_ids },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      message: `Permissions updated for role "${role.display_name}". Changes take effect immediately.`,
      data: {
        role_id: parseInt(id),
        permission_count: permission_ids.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
