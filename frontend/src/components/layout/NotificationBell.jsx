import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { cn } from '../../utils/cn'

export default function NotificationBell({ className }) {
  const { unreadCount } = useNotificationStore()

  return (
    <Link
      to="/admin/notifications"
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
