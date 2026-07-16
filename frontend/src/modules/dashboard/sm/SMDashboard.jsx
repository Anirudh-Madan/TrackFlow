import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Clock, AlertCircle, IndianRupee, TrendingUp, TrendingDown,
  ArrowRight, Plus, Wallet, RefreshCcw, Lightbulb, Building2, CheckCircle2,
  Package, Zap, Star, ChevronRight, BarChart2, Activity, FilePlus, FileText,
  UserPlus,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { getOrders } from '../../../api/endpoints/orders.api'
import { getCustomers } from '../../../api/endpoints/parties.api'
import { getReorders } from '../../../api/endpoints/reorder.api'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import Button from '../../../components/ui/Button'
import Card, { CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'

// ─── Ageing helpers ────────────────────────────────────────────────────────────
function getAgeingInfo(daysOverdue) {
  if (daysOverdue <= 15) return { label: `${daysOverdue}d`, color: 'text-success-600 dark:text-success-400', dot: 'bg-success-500' }
  if (daysOverdue <= 30) return { label: `${daysOverdue}d`, color: 'text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' }
  return { label: `${daysOverdue}d`, color: 'text-danger-600 dark:text-danger-400', dot: 'bg-danger-500' }
}

const REORDER_STATUS_CONFIG = {
  OPEN:     { label: 'Open',     variant: 'warning', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400', icon: AlertCircle },
  ORDERED:  { label: 'Ordered',  variant: 'primary', color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400', icon: Clock },
  RECEIVED: { label: 'Received', variant: 'success', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400', icon: CheckCircle2 },
}

const COLOR_MAP = {
  primary: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  success: {
    bg: 'bg-success-50 dark:bg-success-900/20',
    icon: 'text-success-600 dark:text-success-400',
  },
  warning: {
    bg: 'bg-warning-50 dark:bg-warning-900/20',
    icon: 'text-warning-600 dark:text-warning-400',
  },
  danger: {
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    icon: 'text-danger-600 dark:text-danger-400',
  },
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subValue, color = 'primary', href, trend }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.primary
  const isPositive = trend > 0
  const isNeutral = trend === 0 || trend === undefined

  const inner = (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>

        {trend !== undefined && !isNeutral && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
            isPositive
              ? (color === 'danger' || color === 'warning')
                 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                 : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
              : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="stat-value mb-0.5">{value}</div>
      <p className="text-xs text-surface-500 dark:text-surface-400 font-medium truncate">{label}</p>
      <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">{subValue}</p>
    </div>
  )

  if (href) return <Link to={href} className="block">{inner}</Link>
  return inner
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyRow({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-surface-400 dark:text-surface-500">
      <Package className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function SMDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [orders, setOrders]     = useState([])
  const [parties, setParties]   = useState([])
  const [reorders, setReorders] = useState([])
  const [loading, setLoading]   = useState(true)

  const smName = user?.name || 'Sales Manager'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, partiesRes, reordersRes] = await Promise.allSettled([
        getOrders(),
        getCustomers(),
        getReorders(),
      ])
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.success)   setOrders(ordersRes.value.data ?? [])
      if (partiesRes.status === 'fulfilled' && partiesRes.value?.success) setParties(partiesRes.value.data ?? [])
      if (reordersRes.status === 'fulfilled' && reordersRes.value?.success) setReorders(reordersRes.value.data ?? [])
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const today            = new Date().toDateString()
  const yesterday        = new Date(Date.now() - 86400000).toDateString()
  const ordersToday      = orders.filter(o => new Date(o.created_at).toDateString() === today).length
  const ordersYesterday  = orders.filter(o => new Date(o.created_at).toDateString() === yesterday).length
  const ordersPending    = orders.filter(o => o.status === 'PENDING').length
  const ordersFlagged    = orders.filter(o => o.status === 'FLAGGED').length
  const totalOutstanding = parties.reduce((acc, p) => acc + (p.outstanding_balance || 0), 0)

  let ordersTrend = undefined
  if (ordersYesterday > 0) {
    ordersTrend = Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 100)
  } else if (ordersToday > 0) {
    ordersTrend = 100
  }

  const overdueParties = [...parties]
    .filter(p => (p.outstanding_balance || 0) > 0)
    .sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0))
    .slice(0, 5)

  const myReorders = [...reorders].slice(0, 8)

  const belowBase   = orders.filter(o => o.below_base_price).length
  const avgDiscount = orders.length > 0
    ? Math.round(orders.reduce((acc, o) => acc + (o.discount_pct || 0), 0) / orders.length * 10) / 10
    : 0

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const kpis = [
    { icon: ShoppingCart, label: 'Orders Today',      value: loading ? '—' : String(ordersToday),   subValue: loading ? '' : `${orders.length} total`, color: 'primary', href: '/sm/orders', trend: ordersTrend },
    { icon: Clock,        label: 'Pending Approval',  value: loading ? '—' : String(ordersPending),  subValue: 'Awaiting IM review',                    color: 'warning', href: '/sm/orders' },
    { icon: AlertCircle,  label: 'Flagged Orders',    value: loading ? '—' : String(ordersFlagged),  subValue: 'Needs attention',                       color: 'danger',  href: '/sm/orders' },
    { icon: IndianRupee,  label: 'Total Outstanding', value: loading ? '—' : `₹${(totalOutstanding / 1000).toFixed(1)}K`, subValue: loading ? '' : `Across ${parties.length} parties`, color: 'success', href: '/sm/payments' },
  ]

  return (
    <div className="space-y-6 animate-in pb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            {getGreeting()}, {smName.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            Here's a summary of your sales activity today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            size="xl"
            icon={Wallet}
            onClick={() => navigate('/sm/payments', { state: { openNewPayment: true } })}
            className="shadow-sm hover:bg-surface-50 active:bg-surface-100 font-semibold transition-all duration-150 active:scale-98"
          >
            Log Payment
          </Button>
          <Button
            variant="outline"
            size="xl"
            icon={UserPlus}
            onClick={() => navigate('/sm/customers', { state: { openNewCustomer: true } })}
            className="font-semibold transition-all duration-150 active:scale-98"
          >
            New Customer
          </Button>
          <Button
            variant="success"
            size="xl"
            icon={FileText}
            onClick={() => navigate('/sm/orders', { state: { openNewOrder: true } })}
            className="bg-gradient-to-r from-success-600 to-emerald-600 hover:from-success-700 hover:to-emerald-700 text-white shadow-md shadow-success-500/10 hover:shadow-lg hover:shadow-success-500/20 font-semibold border-none transition-all duration-150 active:scale-98"
          >
            Create Sales Challan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-0 overflow-hidden" padding={false}>
          <div className="px-5 pt-5 pb-3 border-b border-surface-100 dark:border-surface-700">
            <CardHeader
              className="mb-0"
              action={
                <Link to="/sm/payments" className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <CardTitle>Outstanding Balances</CardTitle>
              <CardDescription>Parties with pending dues</CardDescription>
            </CardHeader>
          </div>
          {loading ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : overdueParties.length === 0 ? (
            <EmptyRow message="No outstanding balances" />
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-700/60">
              {overdueParties.map(party => {
                const daysOverdue = party.days_overdue || 0
                const ageing = getAgeingInfo(daysOverdue)
                const pct = Math.min(100, Math.round((party.outstanding_balance / (party.credit_limit || 1)) * 100))
                return (
                  <Link
                    key={party.id}
                    to={`/sm/ledger/${party.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                          {(party.company_name || 'P').charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">{party.company_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-16 h-1 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                            <div className={cn('h-full rounded-full', pct >= 90 ? 'bg-danger-500' : pct >= 70 ? 'bg-warning-500' : 'bg-success-500')} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-surface-400">{pct}% of limit</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                          ₹{(party.outstanding_balance || 0).toLocaleString('en-IN')}
                        </p>
                        {daysOverdue > 0 && (
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <div className={cn('w-1.5 h-1.5 rounded-full', ageing.dot)} />
                            <span className={cn('text-[10px] font-medium', ageing.color)}>{ageing.label} overdue</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-surface-500 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <CardHeader>
              <CardTitle>Pricing Summary</CardTitle>
              <CardDescription>Order pricing analysis</CardDescription>
            </CardHeader>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-warning-500" />
                  <span className="text-xs text-surface-600 dark:text-surface-300">Avg Discount</span>
                </div>
                <span className="text-xs font-bold text-warning-600 dark:text-warning-400">{avgDiscount}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-danger-500" />
                  <span className="text-xs text-surface-600 dark:text-surface-300">Below Base Price</span>
                </div>
                <span className="text-xs font-bold text-danger-600 dark:text-danger-400">{belowBase} orders</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary-500" />
                  <span className="text-xs text-surface-600 dark:text-surface-300">Total Orders</span>
                </div>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{orders.length}</span>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span className="text-xs font-semibold text-surface-900 dark:text-surface-100">Smart Suggestions</span>
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-3 leading-relaxed">
              When you create a new order, smart suggestions appear based on each party's order history.
            </p>
            <Link
              to="/sm/orders"
              state={{ openNewOrder: true }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline transition-colors"
            >
              <Zap className="h-3 w-3" />
              Start a new order
            </Link>
          </Card>
        </div>
      </div>

      <Card className="p-0 overflow-hidden" padding={false}>
        <div className="px-5 pt-5 pb-3 border-b border-surface-100 dark:border-surface-700">
          <CardHeader
            className="mb-0"
            action={
              <Link to="/sm/reorder-flags" className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <CardTitle>My Reorder Flags</CardTitle>
            <CardDescription>Items flagged for restocking</CardDescription>
          </CardHeader>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ))}
          </div>
        ) : myReorders.length === 0 ? (
          <EmptyRow message="No reorder flags raised" />
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700/60">
            {myReorders.map(r => {
              const cfg = REORDER_STATUS_CONFIG[r.status] || REORDER_STATUS_CONFIG.OPEN
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-50/70 dark:hover:bg-surface-800/70 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Package className="h-4 w-4 text-surface-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-surface-800 dark:text-surface-200 truncate">
                        {r.product?.part_number || r.part_number || '—'}
                      </p>
                      <p className="text-[11px] text-surface-400 truncate">
                        {r.product?.name || r.product_name || 'Product'} · Qty: {r.quantity_requested}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                    <span className="text-[11px] text-surface-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
