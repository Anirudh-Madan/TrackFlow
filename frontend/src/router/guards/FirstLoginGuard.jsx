import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function FirstLoginGuard({ children }) {
  // Bypassed: Do not force password change
  return children
}
