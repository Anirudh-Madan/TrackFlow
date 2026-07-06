import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { getUnreadCount } from '../../api/endpoints/notifications.api'
import { cn } from '../../utils/cn'

// Map role → its notifications route (each role has its own routed page).
const ROLE_PATH = {
  admin: '/admin/notifications',
  inventory_manager: '/im/notifications',
  dispatch_worker: '/dw/notifications',
  sales_manager: '/sm/notifications',
}

export default function NotificationBell({ className }) {
  const { unreadCount, setUnreadCount } = useNotificationStore()
  const { user, isAuthenticated } = useAuthStore()
  const role = typeof user?.role === 'object' ? user?.role?.name : user?.role
  const to = ROLE_PATH[role] || '/admin/notifications'

  const poll = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      if (res.success) setUnreadCount(res.data.count)
    } catch { /* ignore */ }
  }, [setUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) return
    poll()
    const id = setInterval(poll, 30000) // refresh every 30s
    return () => clearInterval(id)
  }, [isAuthenticated, poll])

  return (
    <Link
      to={to}
      id="notification-bell-btn"
      className={cn(
        'relative p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100',
        'dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-700',
        'transition-colors duration-150',
        className
      )}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-4.5 w-4.5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
