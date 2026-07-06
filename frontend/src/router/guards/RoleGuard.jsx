import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const ROLE_HOME = {
  admin: '/admin',
  sales_manager: '/sm',
  inventory_manager: '/im',
  dispatch_worker: '/dw',
}

export default function RoleGuard({ role, children }) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== role) {
    const home = ROLE_HOME[user.role] || '/login'
    return <Navigate to={home} replace />
  }

  return children
}
