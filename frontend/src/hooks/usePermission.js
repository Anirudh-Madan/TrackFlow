import { useAuthStore } from '../store/authStore'

/**
 * Returns true if the current user has the given permission key.
 *
 * Usage:
 *   const canDelete = usePermission('products.delete')
 */
export function usePermission(key) {
  return useAuthStore((s) => s.hasPermission(key))
}

/**
 * Returns true if the user has ALL of the given permission keys.
 *
 * Usage:
 *   const canManage = useAllPermissions('products.edit', 'products.delete')
 */
export function useAllPermissions(...keys) {
  return useAuthStore((s) => s.hasAllPermissions(...keys))
}

/**
 * Returns true if the user has ANY of the given permission keys.
 *
 * Usage:
 *   const canViewAny = useAnyPermission('products.view', 'inventory.view')
 */
export function useAnyPermission(...keys) {
  return useAuthStore((s) => s.hasAnyPermission(...keys))
}

/**
 * Returns a checker function for inline use.
 *
 * Usage:
 *   const can = usePermissionChecker()
 *   can('products.delete') // boolean
 */
export function usePermissionChecker() {
  return useAuthStore((s) => s.hasPermission)
}
