import { useState, useEffect } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { getLowStock } from '../../../api/endpoints/inventory.api'
import {
  ShoppingCart, TrendingUp, IndianRupee, Clock, AlertTriangle,
  CreditCard, RefreshCcw, Lightbulb, Users, ArrowUp, ArrowDown,
  ArrowRight, Package, Plus, FileDown, Bell, Activity, Shield,
  CheckCircle2, XCircle, Zap,
} from 'lucide-react'
import Card, { CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import { Link } from 'react-router-dom'

// ─── Mock data ───────────────────────────────────────────────
const KPI_DATA = [
  {
    id: 'orders-today',
    label: 'Orders Today',
    value: '47',
    subValue: '₹2,34,500',
    trend: +12.4,
    icon: ShoppingCart,
    color: 'primary',
    href: '/admin/orders',
  },
  {
    id: 'orders-week',
    label: 'Orders This Week',
    value: '312',
    subValue: '₹15,67,200',
    trend: +8.2,
    icon: TrendingUp,
    color: 'success',
    href: '/admin/orders',
  },
  {
    id: 'revenue-month',
    label: 'Revenue This Month',
    value: '₹58.4L',
    subValue: 'vs ₹51.2L last month',
    trend: +14.1,
    icon: IndianRupee,
    color: 'success',
    href: '/admin/payments',
  },
  {
    id: 'pending-approvals',
    label: 'Pending Approvals',
    value: '8',
    subValue: '3 urgent',
    trend: -5,
    icon: Clock,
    color: 'warning',
    href: '/admin/orders',
  },
  {
    id: 'low-stock',
    label: 'Low Stock Alerts',
    value: '23',
    subValue: '4 out of stock',
    trend: +3,
    icon: AlertTriangle,
    color: 'danger',
    href: '/admin/inventory/stock',
  },
  {
    id: 'credit-alerts',
    label: 'Credit Limit Alerts',
    value: '11',
    subValue: '₹8.4L overdue',
    trend: +2,
    icon: CreditCard,
    color: 'danger',
    href: '/admin/payments',
  },
  {
    id: 'reorder-summary',
    label: 'Reorder Items',
    value: '34',
    subValue: '12 ordered',
    trend: -8,
    icon: RefreshCcw,
    color: 'warning',
    href: '/admin/reorder',
  },
  {
    id: 'suggestion-conversion',
    label: 'Suggestion Conversion',
    value: '68.4%',
    subValue: '124 of 181 this month',
    trend: +4.2,
    icon: Lightbulb,
    color: 'primary',
    href: '/admin/reports/suggestions',
  },
  {
    id: 'active-users',
    label: 'Active Users Online',
    value: '14',
    subValue: '6 SMs · 5 IMs · 3 DWs',
    trend: 0,
    icon: Users,
    color: 'success',
    href: '/admin/users',
  },
]

const COLOR_MAP = {
  primary: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    icon: 'text-primary-600 dark:text-primary-400',
    badge: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
  },
  success: {
    bg: 'bg-success-50 dark:bg-success-900/20',
    icon: 'text-success-600 dark:text-success-400',
    badge: 'bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300',
  },
  warning: {
    bg: 'bg-warning-50 dark:bg-warning-900/20',
    icon: 'text-warning-600 dark:text-warning-400',
    badge: 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300',
  },
  danger: {
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    icon: 'text-danger-600 dark:text-danger-400',
    badge: 'bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300',
  },
}

const REVENUE_BARS = [
  { month: 'Jan', value: 42, amount: '₹42.1L' },
  { month: 'Feb', value: 38, amount: '₹38.4L' },
  { month: 'Mar', value: 55, amount: '₹55.2L' },
  { month: 'Apr', value: 48, amount: '₹48.7L' },
  { month: 'May', value: 51, amount: '₹51.2L' },
  { month: 'Jun', value: 58, amount: '₹58.4L' },
]

const LOW_STOCK_ITEMS = [
  { id: 1, sku: 'IB-6204', name: 'Industrial Bearing 6204', stock1: 4, stock2: 2, reorder: 50, status: 'critical' },
  { id: 2, sku: 'SR-12MM', name: 'Steel Rod 12mm (per kg)', stock1: 18, stock2: 5, reorder: 100, status: 'low' },
  { id: 3, sku: 'HB-M10', name: 'Hex Bolt M10 (pack of 100)', stock1: 0, stock2: 0, reorder: 500, status: 'out' },
  { id: 4, sku: 'OPK-32', name: 'Oil Pump Kit 32mm', stock1: 7, stock2: 3, reorder: 20, status: 'low' },
  { id: 5, sku: 'VBT-100', name: 'Vibration Belt Type-100', stock1: 0, stock2: 2, reorder: 30, status: 'critical' },
]

const RECENT_NOTIFICATIONS = [
  { id: 1, type: 'order',   title: 'New order ORD-2024-0312', sub: 'Raj Enterprises · ₹45,000', time: '2m ago', read: false, severity: 'info' },
  { id: 2, type: 'stock',   title: 'Out of stock: HB-M10', sub: 'Hex Bolt M10 — reorder needed', time: '14m ago', read: false, severity: 'danger' },
  { id: 3, type: 'credit',  title: 'Credit limit breach: Verma Traders', sub: 'Outstanding ₹2.8L / Limit ₹2.0L', time: '1h ago', read: false, severity: 'warning' },
  { id: 4, type: 'dispatch', title: 'Dispatch completed: CHN-0089', sub: 'Delivered to Sharma & Co.', time: '2h ago', read: true, severity: 'success' },
  { id: 5, type: 'user',    title: 'New user added: Priya Singh (SM)', sub: 'Added by Admin · Mumbai region', time: '3h ago', read: true, severity: 'info' },
]

const AUDIT_LOGS = [
  { id: 1, user: 'Arjun M.', action: 'Updated price list', entity: 'Steel Rod 12mm', time: '5m ago', type: 'update' },
  { id: 2, user: 'Priya S.', action: 'Created order', entity: 'ORD-2024-0312', time: '18m ago', type: 'create' },
  { id: 3, user: 'Rajesh K.', action: 'Approved order', entity: 'ORD-2024-0309', time: '45m ago', type: 'approve' },
  { id: 4, user: 'Admin', action: 'Deactivated user', entity: 'Vikram Patel (SM)', time: '2h ago', type: 'delete' },
  { id: 5, user: 'Kiran L.', action: 'Inward entry added', entity: 'INW-2024-0044', time: '3h ago', type: 'create' },
]

const QUICK_ACTIONS = [
  { label: 'New User', icon: Users, href: '/admin/users/new', color: 'primary' },
  { label: 'Stock Overview', icon: Package, href: '/admin/inventory/stock', color: 'success' },
  { label: 'Audit Logs', icon: Shield, href: '/admin/reports/audit', color: 'warning' },
  { label: 'Notifications', icon: Bell, href: '/admin/notifications', color: 'danger' },
]

const AUDIT_TYPE_STYLES = {
  create:  { dot: 'bg-success-500', text: 'text-success-600 dark:text-success-400' },
  update:  { dot: 'bg-primary-500', text: 'text-primary-600 dark:text-primary-400' },
  delete:  { dot: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-400' },
  approve: { dot: 'bg-warning-500', text: 'text-warning-600 dark:text-warning-400' },
}

const NOTIF_SEVERITY_STYLES = {
  info:    'bg-blue-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
}

// ─── KPI Card ───────────────────────────────────────────────
function KPICard({ kpi }) {
  const { label, value, subValue, trend, icon: Icon, color, href, id } = kpi
  const colors = COLOR_MAP[color]
  const isPositive = trend > 0
  const isNeutral = trend === 0

  return (
    <Link to={href} id={`kpi-${id}`}>
      <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <Icon className={cn('h-4 w-4', colors.icon)} />
          </div>

          {!isNeutral && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
              isPositive
                ? (color === 'danger' || color === 'warning')
                  ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                  : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
            )}>
              {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        <div className="stat-value mb-0.5">{value}</div>
        <p className="text-xs text-surface-500 dark:text-surface-400 font-medium truncate">{label}</p>
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">{subValue}</p>
      </div>
    </Link>
  )
}

// ─── Mini sparkline chart (CSS-only) ────────────────────────
function SparkBar({ value, max, label, amount }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="group flex flex-col gap-1">
      <div className="flex-1 flex items-end">
        <div
          className="w-full rounded-t-md bg-primary-500/20 dark:bg-primary-500/30 relative overflow-hidden transition-all duration-200 group-hover:bg-primary-500/40"
          style={{ height: `${Math.max(8, pct * 0.8)}px` }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-primary-500 dark:bg-primary-400 rounded-t-md transition-all"
            style={{ height: '40%' }}
          />
        </div>
      </div>
      <span className="text-[10px] text-center text-surface-400 dark:text-surface-500 truncate">{label}</span>
    </div>
  )
}

// ─── Stock status badge ──────────────────────────────────────
function StockStatusBadge({ status }) {
  if (status === 'out')      return <Badge variant="danger" dot size="sm">Out of Stock</Badge>
  if (status === 'critical') return <Badge variant="warning" dot size="sm">Critical</Badge>
  return <Badge variant="default" dot size="sm">Low</Badge>
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const maxRevenue = Math.max(...REVENUE_BARS.map((b) => b.value))
  const [lowStockItems, setLowStockItems] = useState([])
  const [kpis, setKpis] = useState(KPI_DATA)

  useEffect(() => {
    async function fetchLowStock() {
      try {
        const res = await getLowStock();
        if (res.success) {
          const items = res.data.slice(0, 5); // Take top 5
          setLowStockItems(items);
          
          // Update KPI count
          setKpis(prev => prev.map(kpi => {
            if (kpi.id === 'low-stock') {
              return { ...kpi, value: res.data.length.toString() };
            }
            return kpi;
          }));
        }
      } catch (error) {
        console.error('Failed to fetch low stock', error);
      }
    }
    fetchLowStock();
  }, []);

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6 animate-in pb-4">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            Here's what's happening in your operations today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={FileDown}>
            Export
          </Button>
          <Button size="sm" icon={Plus}>
            Quick Action
          </Button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {kpis.slice(0, 5).map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.slice(5).map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* ── Middle row: Revenue chart + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Chart */}
        <Card className="lg:col-span-2 p-5">
          <CardHeader
            action={
              <Button variant="ghost" size="xs" iconRight={ArrowRight}>
                View reports
              </Button>
            }
          >
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue — last 6 months</CardDescription>
          </CardHeader>

          {/* Summary row */}
          <div className="flex items-center gap-6 mb-6">
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">₹58.4L</p>
              <p className="text-xs text-surface-500 mt-0.5">This month</p>
            </div>
            <div className="flex items-center gap-1.5 text-success-600 dark:text-success-400">
              <ArrowUp className="h-4 w-4" />
              <span className="text-sm font-semibold">+14.1%</span>
              <span className="text-xs text-surface-400">vs last month</span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-2 h-28">
            {REVENUE_BARS.map((bar, i) => {
              const pct = (bar.value / maxRevenue) * 100
              const isCurrent = i === REVENUE_BARS.length - 1
              return (
                <div key={bar.month} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                    {bar.amount}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={cn(
                        'w-full rounded-t-lg transition-all duration-300',
                        isCurrent
                          ? 'bg-primary-500 shadow-md shadow-primary-500/25'
                          : 'bg-primary-200 dark:bg-primary-900/50 group-hover:bg-primary-300 dark:group-hover:bg-primary-800/60'
                      )}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-surface-400">{bar.month}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Activity feed */}
        <Card className="p-5">
          <CardHeader
            action={
              <Link to="/admin/reports/audit" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                View all
              </Link>
            }
          >
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest audit events</CardDescription>
          </CardHeader>

          <div className="space-y-0">
            {AUDIT_LOGS.map((log, i) => {
              const styles = AUDIT_TYPE_STYLES[log.type] || AUDIT_TYPE_STYLES.create
              return (
                <div
                  key={log.id}
                  className={cn(
                    'flex gap-3 py-2.5',
                    i < AUDIT_LOGS.length - 1 && 'border-b border-surface-100 dark:border-surface-700/60'
                  )}
                >
                  <div className="relative flex flex-col items-center mt-1.5">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', styles.dot)} />
                    {i < AUDIT_LOGS.length - 1 && (
                      <div className="w-px flex-1 bg-surface-200 dark:bg-surface-700 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-xs font-semibold text-surface-800 dark:text-surface-200 truncate">
                      {log.user}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                      {log.action} · <span className="font-mono text-[10px]">{log.entity}</span>
                    </p>
                    <p className="text-[10px] text-surface-400 mt-0.5">{log.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ── Bottom row: Low Stock + Notifications + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Low Stock Table */}
        <Card className="lg:col-span-3 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-surface-100 dark:border-surface-700">
            <div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Low Stock Alerts</h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Items requiring reorder</p>
            </div>
            <Link
              to="/admin/inventory/stock"
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]" id="low-stock-table">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-surface-500 dark:text-surface-400">Product</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 dark:text-surface-400">On Hand</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 dark:text-surface-400">Reserved</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 dark:text-surface-400">Reorder At</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-surface-500 dark:text-surface-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-8 text-center text-surface-500 text-sm">
                      No low stock alerts.
                    </td>
                  </tr>
                ) : lowStockItems.map((item, i) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'table-row-hover',
                      i < lowStockItems.length - 1 && 'border-b border-surface-100 dark:border-surface-700/60'
                    )}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-surface-900 dark:text-surface-100 text-xs">{item.name}</p>
                      <p className="text-[10px] font-mono text-surface-400 dark:text-surface-500">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'text-xs font-semibold tabular-nums',
                        item.stockOnHand?.quantity === 0 ? 'text-danger-600' : (item.stockOnHand?.quantity < item.reorder_threshold ? 'text-warning-600' : 'text-surface-700 dark:text-surface-300')
                      )}>
                        {item.stockOnHand?.quantity || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-surface-600 dark:text-surface-400 tabular-nums">
                        {item.stockReserved?.quantity || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-surface-500 dark:text-surface-400 tabular-nums">
                      {item.reorder_threshold}
                    </td>
                    <td className="px-5 py-3">
                      <StockStatusBadge status={item.stockOnHand?.quantity === 0 ? 'out' : (item.stockOnHand?.quantity <= item.reorder_threshold * 0.2 ? 'critical' : 'low')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right column: Notifications + Quick Actions */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Recent Notifications */}
          <Card className="p-5 flex-1">
            <CardHeader
              action={
                <Link to="/admin/notifications" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  View all
                </Link>
              }
            >
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Recent system alerts</CardDescription>
            </CardHeader>

            <div className="space-y-2.5">
              {RECENT_NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer',
                    'hover:bg-surface-50 dark:hover:bg-surface-700/50',
                    !n.read && 'bg-primary-50/50 dark:bg-primary-900/10'
                  )}
                >
                  <div className="mt-1 shrink-0">
                    <div className={cn('w-2 h-2 rounded-full', NOTIF_SEVERITY_STYLES[n.severity])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs truncate',
                      n.read
                        ? 'text-surface-600 dark:text-surface-400 font-medium'
                        : 'text-surface-900 dark:text-surface-100 font-semibold'
                    )}>
                      {n.title}
                    </p>
                    <p className="text-[10px] text-surface-400 truncate mt-0.5">{n.sub}</p>
                    <p className="text-[10px] text-surface-300 dark:text-surface-600 mt-0.5">{n.time}</p>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5">
            <CardTitle className="mb-3">Quick Actions</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                const colors = COLOR_MAP[action.color]
                return (
                  <Link key={action.label} to={action.href} id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl text-center',
                      'hover:scale-[1.02] transition-transform duration-150 cursor-pointer',
                      colors.bg
                    )}>
                      <Icon className={cn('h-5 w-5', colors.icon)} />
                      <span className={cn('text-xs font-semibold', colors.icon)}>{action.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
