import client from '../client'

/**
 * GET /rbac/roles
 * List all roles with permission counts.
 */
export const getRoles = () => client.get('/rbac/roles')

/**
 * GET /rbac/permissions
 * List all permissions grouped by module.
 */
export const getAllPermissions = () => client.get('/rbac/permissions')

/**
 * GET /rbac/roles/:id/permissions
 * Get all permissions for a role, with enabled/disabled flag.
 */
export const getRolePermissions = (roleId) => client.get(`/rbac/roles/${roleId}/permissions`)

/**
 * PUT /rbac/roles/:id/permissions
 * Save updated permission set for a role.
 * @param {number} roleId
 * @param {number[]} permissionIds — array of permission IDs to enable
 */
export const updateRolePermissions = (roleId, permissionIds) =>
  client.put(`/rbac/roles/${roleId}/permissions`, { permission_ids: permissionIds })
