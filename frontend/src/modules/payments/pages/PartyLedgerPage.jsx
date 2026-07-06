import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, MapPin, Phone, Mail, ShieldCheck,
  ShoppingCart, Wallet, AlertCircle, CheckCircle2, Clock,
  Loader2, AlertTriangle, TrendingDown, TrendingUp, IndianRupee,
  ChevronRight,
} from 'lucide-react'
import { getCustomers } from '../../../api/endpoints/parties.api'
import { getPartyLedger } from '../../../api/endpoints/payments.api'
import { getOrders } from '../../../api/endpoints/orders.api'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'

function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getAgeingColor(days) {
  if (days <= 15) return { dot: 'bg-success-500', text: 'text-success-600 dark:text-success-400', badge: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400' }
  if (days <= 30) return { dot: 'bg-warning-500', text: 'text-warning-600 dark:text-warning-400', badge: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400' }
  return { dot: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-400', badge: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400' }
}

const ORDER_STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: 'text-warning-600 dark:text-warning-400', icon: Clock },
  APPROVED:   { label: 'Approved',   color: 'text-primary-600 dark:text-primary-400', icon: CheckCircle2 },
  DISPATCHED: { label: 'Dispatched', color: 'text-success-600 dark:text-success-400', icon: CheckCircle2 },
  FLAGGED:    { label: 'Flagged',    color: 'text-danger-600 dark:text-danger-400',   icon: AlertCircle },
  RETURNED:   { label: 'Returned',   color: 'text-surface-500',                        icon: AlertCircle },
}

export default function PartyLedgerPage() {
  const { partyId } = useParams()
  const navigate    = useNavigate()

  const [party, setParty]       = useState(null)
  const [ledger, setLedger]     = useState([])
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [partiesRes, ordersRes] = await Promise.allSettled([
        getCustomers(),
        getOrders({ party_id: partyId }),
      ])

      if (partiesRes.status === 'fulfilled' && partiesRes.value?.success) {
        const p = (partiesRes.value.data || []).find(x => String(x.id) === String(partyId))
        setParty(p || null)
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.success) {
        setOrders(ordersRes.value.data || [])
      }

      // Load ledger
      try {
        const ledgerRes = await getPartyLedger(partyId)
        if (ledgerRes?.success) setLedger(ledgerRes.data || [])
      } catch { /* ledger may not be implemented */ }

    } catch {
      toast.error('Failed to load ledger')
    } finally {
      setLoading(false)
    }
  }, [partyId])

  useEffect(() => { loadData() }, [loadData])

  const totalOrders    = orders.reduce((acc, o) => acc + (o.grand_total || 0), 0)
  const totalPaid      = ledger.reduce((acc, l) => l.type === 'payment' ? acc + (l.amount || 0) : acc, 0)
  const outstanding    = party?.outstanding_balance ?? (totalOrders - totalPaid)
  const creditUsedPct  = party?.credit_limit ? Math.min(100, Math.round((outstanding / party.credit_limit) * 100)) : 0
  const daysOverdue    = party?.days_overdue || 0
  const ageing         = getAgeingColor(daysOverdue)

  // Build combined timeline from orders + ledger payments
  const timeline = useMemo(() => {
    const entries = []
    orders.forEach(o => {
      entries.push({
        id: `order-${o.id}`,
        type: 'order',
        date: o.created_at,
        label: o.order_number || `ORD-${o.id}`,
        amount: o.grand_total || 0,
        meta: o.status,
        link: `/sm/orders/${o.id}`,
      })
    })
    ledger.forEach(l => {
      if (l.type === 'payment') {
        entries.push({
          id: `pay-${l.id}`,
          type: 'payment',
          date: l.payment_date || l.created_at,
          label: `${l.payment_mode} Payment`,
          amount: l.amount || 0,
          meta: l.reference_number,
          link: null,
        })
      }
    })
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [orders, ledger])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading ledger…
      </div>
    )
  }

  if (!party) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-surface-400">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="text-sm">Party not found</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-primary-500">Go back</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">{party.company_name}</h1>
          <p className="text-xs text-surface-400 mt-0.5">Party Ledger</p>
        </div>
      </div>

      {/* Party info card */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
        <div className="flex flex-wrap gap-4 text-sm">
          {party.region && (
            <div className="flex items-center gap-2 text-surface-500">
              <MapPin className="h-4 w-4 text-surface-300" />
              <span>{party.region.name || party.region}</span>
            </div>
          )}
          {party.phone && (
            <div className="flex items-center gap-2 text-surface-500">
              <Phone className="h-4 w-4 text-surface-300" />
              <span>{party.phone}</span>
            </div>
          )}
          {party.gst && (
            <div className="flex items-center gap-2 text-surface-500">
              <ShieldCheck className="h-4 w-4 text-surface-300" />
              <span className="font-mono text-xs">{party.gst}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: formatCurrency(totalOrders), icon: ShoppingCart, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Total Paid',   value: formatCurrency(totalPaid),   icon: CheckCircle2, color: 'text-success-600 dark:text-success-400' },
          { label: 'Outstanding',  value: formatCurrency(outstanding), icon: AlertCircle,  color: outstanding > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400' },
          { label: 'Credit Limit', value: formatCurrency(party.credit_limit || 0), icon: ShieldCheck, color: 'text-surface-700 dark:text-surface-300' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-surface-300" />
                <p className="text-xs text-surface-400">{s.label}</p>
              </div>
              <p className={cn('text-base font-bold tabular-nums', s.color)}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Credit usage bar */}
      {party.credit_limit > 0 && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Credit Utilization</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-bold', creditUsedPct >= 90 ? 'text-danger-600 dark:text-danger-400' : creditUsedPct >= 70 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400')}>
                {creditUsedPct}%
              </span>
              {daysOverdue > 0 && (
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', ageing.badge)}>
                  <div className={cn('w-1.5 h-1.5 rounded-full', ageing.dot)} />
                  {daysOverdue}d overdue
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                creditUsedPct >= 90 ? 'bg-danger-500' : creditUsedPct >= 70 ? 'bg-warning-500' : 'bg-success-500'
              )}
              style={{ width: `${creditUsedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-surface-400 mt-1.5">
            <span>Used: {formatCurrency(outstanding)}</span>
            <span>Limit: {formatCurrency(party.credit_limit)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to="/sm/orders"
          state={{ openNewOrder: true, partyId: party.id }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          New Order
        </Link>
        <Link
          to="/sm/payments"
          state={{ openNewPayment: true, partyId: party.id }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md shadow-primary-500/25 transition-all"
        >
          <Wallet className="h-4 w-4" />
          Log Payment
        </Link>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="flex border-b border-surface-100 dark:border-surface-800">
          {['timeline', 'orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors capitalize',
                activeTab === tab
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              )}
            >
              {tab === 'timeline' ? 'Activity Timeline' : 'Orders'}
            </button>
          ))}
        </div>

        {activeTab === 'timeline' && (
          <div>
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                <IndianRupee className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {timeline.map(entry => {
                  const isOrder   = entry.type === 'order'
                  const isPayment = entry.type === 'payment'
                  const statusCfg = isOrder && ORDER_STATUS_CONFIG[entry.meta?.toUpperCase()]

                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        isOrder ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-success-50 dark:bg-success-900/20'
                      )}>
                        {isOrder
                          ? <ShoppingCart className="h-4 w-4 text-primary-500" />
                          : <Wallet className="h-4 w-4 text-success-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 font-mono truncate">{entry.label}</p>
                          {statusCfg && (
                            <span className={cn('text-xs font-medium', statusCfg.color)}>{statusCfg.label}</span>
                          )}
                        </div>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {entry.meta && !isOrder && ` · ${entry.meta}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className={cn('text-sm font-semibold tabular-nums', isPayment ? 'text-success-600 dark:text-success-400' : 'text-surface-900 dark:text-surface-100')}>
                          {isPayment ? '-' : ''}{formatCurrency(entry.amount)}
                        </p>
                        {entry.link && (
                          <Link to={entry.link} className="p-1 rounded-lg text-surface-300 hover:text-primary-500 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {orders.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-surface-400">No orders found</td></tr>
                ) : orders.map(order => {
                  const cfg = ORDER_STATUS_CONFIG[order.status?.toUpperCase()]
                  const Icon = cfg?.icon || Clock
                  return (
                    <tr key={order.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/sm/orders/${order.id}`} className="font-mono font-medium text-primary-600 dark:text-primary-400 hover:underline">
                          {order.order_number || `ORD-${order.id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-surface-500 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-surface-900 dark:text-surface-100">
                        {formatCurrency(order.grand_total)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', cfg?.color || 'text-surface-400')}>
                          <Icon className="h-3 w-3" />
                          {cfg?.label || order.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
