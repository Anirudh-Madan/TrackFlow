import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { getUnreadCount } from '../../api/endpoints/notifications.api'
import { cn } from '../../utils/cn'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

// Map role → its notifications route (each role has its own routed page).
const ROLE_PATH = {
  admin: '/admin/notifications',
  inventory_manager: '/im/notifications',
  dispatch_worker: '/dw/notifications',
  sales_manager: '/sm/notifications',
}

export default function NotificationBell({ className }) {
  const { unreadCount, setUnreadCount, incrementUnread } = useNotificationStore()
  const { user, isAuthenticated } = useAuthStore()
  const role = typeof user?.role === 'object' ? user?.role?.name : user?.role
  const to = ROLE_PATH[role] || '/admin/notifications'

  const poll = useCallback(async () => {
    const token = useAuthStore.getState().accessToken
    if (!token) return
    try {
      const res = await getUnreadCount()
      if (res?.success) setUnreadCount(res.data.count)
    } catch { /* ignore */ }
  }, [setUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) return
    poll()
    const id = setInterval(poll, 30000) // refresh every 30s
    return () => clearInterval(id)
  }, [isAuthenticated, poll])

  useEffect(() => {
    if (!isAuthenticated || !user || !role) return

    const socket = io('http://localhost:3000', {
      withCredentials: true,
    })

    socket.on('connect', () => {
      console.log('Socket connected, joining room:', role)
      socket.emit('join', role)
    })

    socket.on('new-notification', (notif) => {
      console.log('New notification received via socket:', notif)
      incrementUnread()

      toast((t) => (
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-xs text-surface-900">{notif.title}</p>
          <p className="text-[11px] text-surface-500 line-clamp-2">{notif.body}</p>
        </div>
      ), {
        icon: '🔔',
        duration: 5000,
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, user, role, incrementUnread])

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
