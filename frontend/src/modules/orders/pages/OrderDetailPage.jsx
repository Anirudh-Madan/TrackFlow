import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Package, Building2, Calendar, Hash, Clock, CheckCircle2,
  AlertCircle, AlertTriangle, Loader2, Flag, RotateCcw, FileText,
  ChevronRight, IndianRupee, User, MapPin, Printer,
} from 'lucide-react'
import { getOrderDetails, flagOrder, returnOrder } from '../../../api/endpoints/orders.api'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../utils/cn'
import { printChallanPDF } from '../../../utils/challanPrint'
import toast from 'react-hot-toast'

function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400',  icon: Clock },
  APPROVED:   { label: 'Approved',   color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400',  icon: CheckCircle2 },
  DISPATCHED: { label: 'Dispatched', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400',  icon: CheckCircle2 },
  FLAGGED:    { label: 'Flagged',    color: 'bg-danger-50  text-danger-700  border-danger-200  dark:bg-danger-900/20  dark:text-danger-400',   icon: AlertCircle },
  RETURNED:   { label: 'Returned',   color: 'bg-surface-50 text-surface-600 border-surface-200 dark:bg-surface-800   dark:text-surface-400',   icon: RotateCcw },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-danger-50  text-danger-600  border-danger-200  dark:bg-danger-900/20  dark:text-danger-400',   icon: AlertCircle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border', cfg.color)}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  )
}

// Timeline component
function StatusTrail({ order }) {
  const steps = [
    { key: 'CREATED',    label: 'Order Created',   date: order.created_at },
    { key: 'PENDING',    label: 'Pending Review',  date: order.created_at },
    { key: 'APPROVED',   label: 'Approved by IM',  date: order.approved_at },
    { key: 'DISPATCHED', label: 'Dispatched',       date: order.dispatched_at },
  ]

  const statusOrder = ['PENDING', 'APPROVED', 'DISPATCHED']
  const currentIndex = statusOrder.indexOf(order.status?.toUpperCase())

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isDone = i <= currentIndex + 1 || step.date
        const isCurrent = statusOrder[currentIndex] === step.key
        return (
          <div key={step.key} className="flex items-center gap-0 flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
                isDone
                  ? 'border-primary-500 bg-primary-500'
                  : isCurrent
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900'
              )}>
                {isDone && <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
              <p className={cn('text-[10px] mt-1 text-center font-medium max-w-[64px]',
                isDone ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'
              )}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-[10px] text-surface-400 text-center">
                  {new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-6', isDone ? 'bg-primary-400' : 'bg-surface-200 dark:bg-surface-700')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [order, setOrder]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [flagReason, setFlagReason]   = useState('')
  const [showFlagInput, setShowFlagInput] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const roleName = typeof user?.role === 'object' ? user.role.name : user?.role
  const isIM = roleName === 'inventory_manager'
  const isSM = roleName === 'sales_manager'

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrderDetails(id)
      if (res?.success) setOrder(res.data)
      else toast.error('Order not found')
    } catch {
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleFlag = async () => {
    if (!flagReason.trim()) return toast.error('Please enter a flag reason')
    setActionLoading(true)
    try {
      const res = await flagOrder(id, flagReason)
      if (res?.success) {
        toast.success('Order flagged')
        fetchOrder()
        setShowFlagInput(false)
        setFlagReason('')
      } else {
        toast.error(res?.error || 'Failed to flag order')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to flag order')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async () => {
    setActionLoading(true)
    try {
      const res = await returnOrder(id, 'Returned by SM')
      if (res?.success) {
        toast.success('Order returned')
        fetchOrder()
      } else {
        toast.error(res?.error || 'Failed to return order')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to return order')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading order…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-surface-400">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="text-sm">Order not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-3 text-sm text-primary-500 hover:text-primary-600"
        >
          Go back
        </button>
      </div>
    )
  }

  const subtotal = (order.items || []).reduce((acc, it) => acc + ((it.sm_price || 0) * (it.quantity || 0)), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50 font-mono">
                {order.order_number || `ORD-${order.id}`}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {order.challan_number && <span className="flex items-center gap-1 font-mono"><Hash className="h-3 w-3" />{order.challan_number}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => printChallanPDF(order)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4 text-primary-600" /> Print / Save PDF
          </button>
          {isIM && order.status === 'PENDING' && (
            <>
              <button
                onClick={() => setShowFlagInput(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-danger-200 dark:border-danger-900/40 text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
              >
                <Flag className="h-3.5 w-3.5" /> Flag
              </button>
            </>
          )}
          {(isIM || isSM) && ['PENDING', 'FLAGGED'].includes(order.status?.toUpperCase()) && (
            <button
              onClick={handleReturn}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Return
            </button>
          )}
        </div>
      </div>

      {/* Flag input */}
      {showFlagInput && (
        <div className="bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-900/40 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-danger-700 dark:text-danger-300">Flag this order</p>
          <textarea
            value={flagReason}
            onChange={e => setFlagReason(e.target.value)}
            rows={2}
            placeholder="Reason for flagging…"
            className="w-full px-3 py-2 rounded-xl border border-danger-200 dark:border-danger-700 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-danger-500/20 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleFlag}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-danger-500 hover:bg-danger-600 disabled:opacity-60 transition-colors"
            >
              {actionLoading ? 'Flagging…' : 'Confirm Flag'}
            </button>
            <button
              onClick={() => { setShowFlagInput(false); setFlagReason('') }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Flagged reason banner */}
      {order.status?.toUpperCase() === 'FLAGGED' && order.flag_reason && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/40">
          <AlertCircle className="h-4 w-4 text-danger-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger-700 dark:text-danger-300">Flagged by Inventory Manager</p>
            <p className="text-xs text-danger-600/80 dark:text-danger-400/80 mt-0.5">{order.flag_reason}</p>
          </div>
        </div>
      )}

      {/* Status trail */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">Order Progress</h3>
        <StatusTrail order={order} />
      </div>

      {/* Party info */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 border-b pb-2">Order & Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {/* Supplier */}
          {order.supplier && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-surface-400 block uppercase">Supplier</span>
              <span className="font-medium text-surface-700 dark:text-surface-300">{order.supplier}</span>
            </div>
          )}

          {/* Challan Number */}
          {(order.challan_number || order.challan?.challan_number) && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-surface-400 block uppercase">Challan Number</span>
              <span className="font-mono font-medium text-primary-600 dark:text-primary-400">{order.challan_number || order.challan?.challan_number}</span>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 block uppercase">Date</span>
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {new Date(order.order_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>

          {/* Customer Name */}
          {order.customer_name && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-surface-400 block uppercase">Customer Name</span>
              <span className="font-medium text-surface-700 dark:text-surface-300">{order.customer_name}</span>
            </div>
          )}

          {/* Company Name */}
          {order.company_name && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-surface-400 block uppercase">Company Name</span>
              <span className="font-medium text-surface-700 dark:text-surface-300">{order.company_name}</span>
            </div>
          )}

          {/* Customer Company */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 block uppercase">Customer Company</span>
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {order.customer_company || order.party?.company_name || '—'}
            </span>
          </div>

          {/* Sales Manager */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 block uppercase">Sales Manager</span>
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {order.salesManager?.name || order.created_by?.name || '—'}
            </span>
          </div>

          {order.party?.region && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-surface-400 block uppercase">Region</span>
              <span className="font-medium text-surface-700 dark:text-surface-300">{order.party.region.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Base Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">SM Price</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {(order.items || []).map((item, i) => {
                const lineTotal = (item.sm_price || 0) * (item.quantity || 0)
                const belowBase = item.sm_price < item.base_price
                return (
                  <tr key={i} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-surface-900 dark:text-surface-100">{item.product?.name || '—'}</p>
                      <p className="text-xs text-surface-400 font-mono mt-0.5">{item.product?.part_number || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-surface-700 dark:text-surface-300">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-surface-500">{formatCurrency(item.base_price)}</td>
                    <td className={cn('px-4 py-3.5 text-right tabular-nums font-medium', belowBase ? 'text-warning-600 dark:text-warning-400' : 'text-surface-900 dark:text-surface-100')}>
                      {formatCurrency(item.sm_price)}
                      {belowBase && <span className="ml-1 text-xs">⚠</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-surface-900 dark:text-surface-100">{formatCurrency(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-surface-100 dark:border-surface-800 px-5 py-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500 font-medium">Subtotal (GST Incl.)</span>
                <span className="font-medium text-surface-900 dark:text-surface-100 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-surface-100 dark:border-surface-800">
                <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">Grand Total</span>
                <span className="text-base font-bold text-primary-600 dark:text-primary-400 tabular-nums">{formatCurrency(order.grand_total || subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Notes</h3>
          <p className="text-sm text-surface-600 dark:text-surface-300">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
