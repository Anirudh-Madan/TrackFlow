import { usePermission, useAllPermissions, useAnyPermission } from '../../hooks/usePermission'

/**
 * PermissionGate
 *
 * Renders children only if the user has the required permission(s).
 * Renders `fallback` if provided, otherwise renders nothing.
 *
 * Props:
 *   permission   {string}   — require this single permission key
 *   all          {string[]} — require ALL of these keys (AND logic)
 *   any          {string[]} — require ANY of these keys (OR logic)
 *   fallback     {ReactNode} — what to render if access denied (default: null)
 *   invert       {boolean}  — render children when user LACKS the permission
 *
 * Usage examples:
 *   <PermissionGate permission="products.delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate all={['users.create', 'users.change_role']}>
 *     <AssignRoleModal />
 *   </PermissionGate>
 *
 *   <PermissionGate any={['reports.sales', 'reports.stock']}>
 *     <ReportsLink />
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, all, any, fallback = null, invert = false, children }) {
  // Determine the access result
  const singleOk = usePermission(permission || '__none__')
  const allOk = useAllPermissions(...(all || ['__none__']))
  const anyOk = useAnyPermission(...(any || ['__none__']))

  let hasAccess = false
  if (permission) hasAccess = singleOk
  else if (all && all.length > 0) hasAccess = allOk
  else if (any && any.length > 0) hasAccess = anyOk
  else hasAccess = true // no restriction specified

  const shouldRender = invert ? !hasAccess : hasAccess
  return shouldRender ? children : fallback
}
