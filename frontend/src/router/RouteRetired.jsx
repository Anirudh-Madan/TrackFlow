import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

/**
 * RouteRetired — a landing element for features removed in the pipeline rebuild
 * (payments, price history, import history, suggestion reports). Per the
 * implementation plan these routes are retired; hitting one signs the user out
 * so stale bookmarks can't reach dead endpoints.
 */
export default function RouteRetired() {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    const t = setTimeout(() => { logout(); navigate('/login', { replace: true }) }, 1500)
    return () => clearTimeout(t)
  }, [logout, navigate])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <LogOut className="h-8 w-8 text-surface-300" />
      <h2 className="mt-3 text-lg font-semibold text-surface-900 dark:text-surface-50">This section has been retired</h2>
      <p className="mt-1 text-sm text-surface-500">Signing you out…</p>
    </div>
  )
}
