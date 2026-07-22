import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, Loader2, ShoppingCart, RefreshCw, PackagePlus,
  ArrowRightCircle, ShieldAlert, PackageCheck, Inbox,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import TablePagination from '../../../components/data/TablePagination'
import { useNotificationStore } from '../../../store/notificationStore'
import {
  getNotifications, markNotificationRead, markAllRead, getUnreadCount,
} from '../../../api/endpoints/notifications.api'

const TYPE_META = {
  ORDER_SOLD:        { icon: ShoppingCart,     color: 'text-success-600 bg-success-50 dark:bg-success-900/20' },
  REORDER_REQUEST:   { icon: RefreshCw,        color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' },
  NEW_PART_REQUEST:  { icon: PackagePlus,      color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  PIPELINE_ADVANCED: { icon: ArrowRightCircle, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  ADMIN_OVERRIDE:    { icon: ShieldAlert,      color: 'text-warning-600 bg-warning-50 dark:bg-warning-900/20' },
  REORDER_PLACED:    { icon: PackageCheck,     color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
  GENERAL:           { icon: Bell,             color: 'text-surface-500 bg-surface-100 dark:bg-surface-700' },
}

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { setUnreadCount } = useNotificationStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage]     = useState(1)

  useEffect(() => { setPage(1) }, [filter])

  const refreshCount = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      if (res.success) setUnreadCount(res.data.count)
    } catch { /* ignore */ }
  }, [setUnreadCount])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getNotifications()
      if (res.success) setItems(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch(); refreshCount() }, [fetch, refreshCount])

  const openItem = async (n) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id)
        setItems(prev => prev.map(i => i.id === n.id ? { ...i, is_read: true } : i))
        refreshCount()
      } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link)
  }

  const onMarkAll = async () => {
    try {
      await markAllRead()
      setItems(prev => prev.map(i => ({ ...i, is_read: true })))
      setUnreadCount(0)
      toast.success('All marked as read')
    } catch (err) {
      toast.error(err.message || 'Failed')
    }
  }

  const filtered = filter === 'unread' ? items.filter(i => !i.is_read) : items
  const unread = items.filter(i => !i.is_read).length

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-surface-900 dark:text-surface-50">
            <Bell className="h-5 w-5 text-primary-600" /> Notifications
          </h1>
          <p className="text-sm text-surface-500">{unread > 0 ? `${unread} unread` : 'You are all caught up.'}</p>
        </div>
        {unread > 0 && <Button variant="secondary" size="sm" icon={CheckCheck} onClick={onMarkAll}>Mark all read</Button>}
      </div>

      <div className="flex gap-2">
        {['all', 'unread'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors', filter === f ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300')}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center dark:border-surface-700">
          <Inbox className="mx-auto h-8 w-8 text-surface-300" />
          <p className="mt-2 text-sm text-surface-500">Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice((page - 1) * 50, page * 50).map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.GENERAL
            const Icon = meta.icon
            return (
              <button key={n.id} onClick={() => openItem(n)} className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors', n.is_read ? 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800' : 'border-primary-200 bg-primary-50/40 dark:border-primary-800 dark:bg-primary-900/10')}>
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.color)}><Icon className="h-4.5 w-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-sm', n.is_read ? 'font-medium text-surface-700 dark:text-surface-200' : 'font-semibold text-surface-900 dark:text-surface-50')}>{n.title}</span>
                    <span className="shrink-0 text-xs text-surface-400">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-surface-500">{n.body}</p>}
                </div>
                {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
              </button>
            )
          })}
          <TablePagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={50}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
