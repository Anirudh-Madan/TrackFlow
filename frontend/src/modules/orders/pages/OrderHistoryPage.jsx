import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  History, Search, Filter, Eye, Copy, Calendar, Clock,
  CheckCircle2, AlertCircle, Package, ChevronRight, Loader2,
  ShoppingCart,
} from 'lucide-react'
import { getOrders } from '../../../api/endpoints/orders.api'
import { cn } from '../../../utils/cn'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import toast from 'react-hot-toast'

function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN')}`
}

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400',  icon: Clock },
  APPROVED:   { label: 'Approved',   color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400',  icon: CheckCircle2 },
  DISPATCHED: { label: 'Dispatched', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400',  icon: CheckCircle2 },
  FLAGGED:    { label: 'Flagged',    color: 'bg-danger-50  text-danger-700  border-danger-200  dark:bg-danger-900/20  dark:text-danger-400',   icon: AlertCircle },
  RETURNED:   { label: 'Returned',   color: 'bg-surface-50 text-surface-600 border-surface-200 dark:bg-surface-800   dark:text-surface-400',   icon: AlertCircle },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-danger-50  text-danger-600  border-danger-200  dark:bg-danger-900/20  dark:text-danger-400',   icon: AlertCircle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

const ALL_STATUSES = ['all', 'pending', 'approved', 'dispatched', 'flagged', 'returned', 'cancelled']

export default function OrderHistoryPage({ isTab = false }) {
  const navigate = useNavigate()

  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders()
      if (res?.success) setOrders(res.data ?? [])
      else toast.error('Failed to load order history')
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const searchMatch =
        (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.party?.company_name || '').toLowerCase().includes(search.toLowerCase())
      const statusMatch = filterStatus === 'all' || o.status?.toLowerCase() === filterStatus
      let dateMatch = true
      if (dateFrom) dateMatch = dateMatch && new Date(o.created_at) >= new Date(dateFrom)
      if (dateTo)   dateMatch = dateMatch && new Date(o.created_at) <= new Date(dateTo + 'T23:59:59')
      return searchMatch && statusMatch && dateMatch
    })
  }, [orders, search, filterStatus, dateFrom, dateTo])

  const stats = useMemo(() => ({
    total:      orders.length,
    dispatched: orders.filter(o => o.status === 'DISPATCHED').length,
    pending:    orders.filter(o => o.status === 'PENDING').length,
    flagged:    orders.filter(o => o.status === 'FLAGGED').length,
  }), [orders])

  return (
    <div className={cn("space-y-6 animate-in", isTab && "pt-1")}>
      {/* Header */}
      {!isTab && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Order History</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">All your submitted orders</p>
          </div>
          <Button
            size="sm"
            icon={ShoppingCart}
            onClick={() => navigate('/sm/orders/new')}
          >
            New Order
          </Button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total,      color: 'text-surface-900 dark:text-surface-100' },
          { label: 'Dispatched', value: stats.dispatched, color: 'text-success-600 dark:text-success-400' },
          { label: 'Pending', value: stats.pending,  color: 'text-warning-600 dark:text-warning-400' },
          { label: 'Flagged', value: stats.flagged,  color: 'text-danger-600 dark:text-danger-400' },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center" padding={false}>
            <p className={cn('text-xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-medium">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3" padding={false}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders or party name…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              showFilters
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-surface-100 dark:border-surface-800">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <span className="flex items-center text-surface-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            {(filterStatus !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => { setFilterStatus('all'); setDateFrom(''); setDateTo('') }}
                className="px-3 py-2 rounded-lg text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Orders table */}
      <Card className="p-0 overflow-hidden" padding={false}>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-surface-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading orders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-surface-400">
            <History className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Party</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-medium text-surface-900 dark:text-surface-100">
                        {order.order_number || `ORD-${order.id}`}
                      </p>
                      {order.challan_number && (
                        <p className="text-xs text-surface-400 font-mono mt-0.5">#{order.challan_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-surface-700 dark:text-surface-300">
                      {order.party?.company_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-surface-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-surface-900 dark:text-surface-100">
                      {formatCurrency(order.grand_total)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/sm/orders/${order.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400">
            Showing {filtered.length} of {orders.length} orders
          </div>
        )}
      </Card>
    </div>
  )
}
