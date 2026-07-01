import { useState, useEffect, useMemo, useCallback } from 'react'
import ChallansListPage from '../../challans/pages/ChallansListPage'
import {
  ShoppingCart, FileText, Search, Filter, Calendar, MapPin, Plus, Eye,
  CheckCircle, Clock, AlertCircle, Package, DollarSign, X, Check, Flag, Loader2
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import { getOrders, approveOrder, flagOrder, returnOrder } from '../../../api/endpoints/orders.api'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

const ORDER_STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40', icon: Clock },
  approved:   { label: 'Approved',   color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40', icon: CheckCircle },
  dispatched: { label: 'Dispatched', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40', icon: CheckCircle },
  flagged:    { label: 'Flagged',    color: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40', icon: AlertCircle },
  returned:   { label: 'Returned',   color: 'bg-surface-50 text-surface-700 border-surface-200 dark:bg-surface-800/20 dark:text-surface-400 dark:border-surface-700/40', icon: AlertCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40', icon: AlertCircle },
}

export default function OrdersListPage() {
  const [activeTab, setActiveTab]       = useState('orders') // 'orders' | 'challans'
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewOrder, setViewOrder]       = useState(null)
  
  // Real data state
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [submittingAction, setSubmittingAction] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [showFlagInput, setShowFlagInput] = useState(false)

  const { user } = useAuthStore()
  const roleName = typeof user?.role === 'object' ? user.role.name : user?.role;
  const isIM = roleName === 'inventory_manager';

  const fetchOrdersList = useCallback(async () => {
    setLoading(true)
    try {
      // If user is IM, show pending orders by default or restrict view
      const params = isIM ? { status: 'PENDING' } : {}
      const res = await getOrders(params)
      if (res.success) {
        setOrders(res.data)
      }
    } catch (err) {
      toast.error('Failed to load orders list')
    } finally {
      setLoading(false)
    }
  }, [isIM])

  useEffect(() => {
    fetchOrdersList()
  }, [fetchOrdersList])

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.party?.company_name.toLowerCase().includes(search.toLowerCase())
      
      const statusKey = o.status.toLowerCase()
      const matchStatus = filterStatus === 'all' || statusKey === filterStatus
      return matchSearch && matchStatus
    })
  }, [orders, search, filterStatus])

  const stats = useMemo(() => {
    return {
      total:      orders.length,
      pending:    orders.filter(o => o.status === 'PENDING').length,
      approved:   orders.filter(o => o.status === 'APPROVED').length,
      dispatched: orders.filter(o => o.status === 'DISPATCHED').length,
    }
  }, [orders])

  const handleApprove = async (orderId) => {
    setSubmittingAction(true)
    try {
      const res = await approveOrder(orderId)
      if (res.success) {
        toast.success(`Order approved successfully. Challan generated: ${res.data.challan_number}`)
        setViewOrder(null)
        fetchOrdersList()
      } else {
        toast.error(res.error || 'Failed to approve order')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve order')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleFlag = async (orderId) => {
    if (!flagReason.trim()) return toast.error('Flag reason is required')
    setSubmittingAction(true)
    try {
      const res = await flagOrder(orderId, flagReason)
      if (res.success) {
        toast.success('Order flagged back to Sales Manager')
        setViewOrder(null)
        setShowFlagInput(false)
        setFlagReason('')
        fetchOrdersList()
      } else {
        toast.error(res.error || 'Failed to flag order')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to flag order')
    } finally {
      setSubmittingAction(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">
      {/* Tabs Selector */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6">
        <button
          onClick={() => { setActiveTab('orders'); setSearch(''); setFilterStatus('all'); }}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'orders'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="orders-tab-btn"
        >
          <ShoppingCart className="h-4 w-4" />
          Orders List
        </button>
        <button
          onClick={() => { setActiveTab('challans'); setSearch(''); setFilterStatus('all'); }}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'challans'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="challans-tab-btn"
        >
          <FileText className="h-4 w-4" />
          Delivery Challans
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                {isIM ? 'Pending Orders Approval' : 'Customer Orders'}
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {isIM ? 'Review, approve, or flag submitted sales orders.' : 'View, track, and manage all sales orders.'}
              </p>
            </div>
          </div>

          {/* Stat Strip */}
          {!isIM && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Orders', value: stats.total,      color: 'text-surface-900 dark:text-surface-50' },
                { label: 'Pending Approval', value: stats.pending, color: 'text-warning-600 dark:text-warning-400' },
                { label: 'Approved', value: stats.approved,       color: 'text-primary-600 dark:text-primary-400' },
                { label: 'Dispatched', value: stats.dispatched,   color: 'text-success-600 dark:text-success-400' },
              ].map(s => (
                <div key={s.label} className="card p-4">
                  <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
                  <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Table Card */}
          <div className="card overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search by order number or customer..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 text-sm w-full input bg-white dark:bg-surface-900"
                />
              </div>

              {!isIM && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-sm select w-full sm:w-auto bg-white dark:bg-surface-900"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="flagged">Flagged</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-surface-400 text-center">
                  <ShoppingCart className="h-12 w-12 text-surface-300 dark:text-surface-700 mb-3" />
                  <p className="font-semibold text-base">No orders found</p>
                  <p className="text-xs">Try adjusting your search filters or check back later.</p>
                </div>
              ) : (
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Order Number</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Party (Customer)</th>
                      <th className="px-5 py-3.5">Items</th>
                      <th className="px-5 py-3.5">Grand Total</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                    {filteredOrders.map(o => {
                      const statusKey = o.status.toLowerCase()
                      const statusConfig = ORDER_STATUS_CONFIG[statusKey] || { label: o.status, color: 'bg-surface-100', icon: AlertCircle }
                      const StatusIcon = statusConfig.icon
                      return (
                        <tr key={o.id} className="table-row-hover">
                          <td className="px-5 py-4">
                            <div className="font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs">{o.order_number}</div>
                            {o.challan?.challan_number && (
                              <div className="text-[10px] text-surface-500 font-mono mt-1 flex items-center gap-1">
                                <FileText className="h-3 w-3" /> {o.challan.challan_number}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-surface-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-surface-900 dark:text-surface-50 text-sm">{o.party?.company_name}</div>
                            <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> Regional Outstanding check active
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-surface-600 dark:text-surface-400">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-700 dark:text-surface-300">
                              <Package className="h-3.5 w-3.5 text-surface-400" />
                              {o.items?.length || 0} SKUs
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">
                            {formatCurrency(o.grand_total)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', statusConfig.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setViewOrder(o)} id={`view-order-${o.id}`}>
                              {isIM ? 'Review' : 'View'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ChallansListPage />
      )}

      {/* View Order Modal */}
      <Modal
        open={!!viewOrder}
        onClose={() => { setViewOrder(null); setShowFlagInput(false); setFlagReason(''); }}
        title={`Order details: ${viewOrder?.order_number}`}
        description="Detailed items summary, customer risk parameters, and approval actions."
        size="md"
      >
        {viewOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', ORDER_STATUS_CONFIG[viewOrder.status.toLowerCase()]?.color || 'bg-surface-100')}>
                {viewOrder.status}
              </span>
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(viewOrder.order_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Party Details</p>
                <p className="font-semibold text-surface-900 dark:text-surface-50 text-sm">{viewOrder.party?.company_name}</p>
                <p className="text-xs text-surface-500">Credit Limit: {formatCurrency(viewOrder.party?.credit_limit || 0)}</p>
              </div>

              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Order Information</p>
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Sales rep: {viewOrder.salesManager?.name}</p>
                <p className="text-xs text-surface-500">Submitted: {new Date(viewOrder.created_at || new Date()).toLocaleString('en-IN')}</p>
                {viewOrder.challan?.challan_number && (
                  <p className="text-xs font-mono text-primary-600 dark:text-primary-400 mt-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {viewOrder.challan.challan_number}
                  </p>
                )}
              </div>
            </div>

            {viewOrder.credit_hold && (
              <div className="p-3 bg-danger-50 text-danger-700 rounded-lg border border-danger-100 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Credit Limit Warning</p>
                  <p>This customer exceeds their outstanding credit limit. Review parameters before approving.</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">Order Items</p>
              <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                <table className="w-full min-w-[600px] text-sm text-left border-collapse">
                  <thead className="bg-surface-50 dark:bg-surface-700/50">
                    <tr className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Price</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                    {viewOrder.items?.map((item, i) => (
                      <tr key={item.id} className="table-row-hover">
                        <td className="px-4 py-2.5 text-surface-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-50">
                          {item.product?.name}
                          <div className="text-[10px] text-surface-400 font-mono">{item.product?.sku}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-surface-500">{formatCurrency(item.sm_price)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 dark:bg-surface-700/50 text-xs">
                      <td colSpan={4} className="px-4 py-1.5 text-surface-500 text-right">Subtotal</td>
                      <td className="px-4 py-1.5 text-right font-medium">{formatCurrency(viewOrder.subtotal)}</td>
                    </tr>
                    <tr className="bg-surface-50 dark:bg-surface-700/50 text-xs">
                      <td colSpan={4} className="px-4 py-1.5 text-surface-500 text-right">GST (18%)</td>
                      <td className="px-4 py-1.5 text-right font-medium">{formatCurrency(viewOrder.gst_amount)}</td>
                    </tr>
                    <tr className="bg-surface-50 dark:bg-surface-700/50 font-bold text-sm">
                      <td colSpan={4} className="px-4 py-2.5 text-surface-900 dark:text-surface-50 text-right">Grand Total</td>
                      <td className="px-4 py-2.5 text-right text-primary-600 dark:text-primary-400">{formatCurrency(viewOrder.grand_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Flag input */}
            {showFlagInput && (
              <div className="space-y-2 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                <label className="text-xs font-semibold text-surface-700 dark:text-surface-300">Reason for flagging order *</label>
                <textarea
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  placeholder="Explain why this order is being flagged (e.g. credit breach, incorrect prices)"
                  rows={2}
                  className="w-full text-sm px-3 py-2 border rounded-lg bg-white dark:bg-surface-950 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFlagInput(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-200/50 rounded-lg border"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlag(viewOrder.id)}
                    disabled={submittingAction}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-danger-600 hover:bg-danger-500 rounded-lg disabled:opacity-50"
                  >
                    Confirm Flag
                  </button>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex justify-between items-center pt-3 border-t border-surface-150 dark:border-surface-800">
              <div>
                {viewOrder.status === 'PENDING' && isIM && !showFlagInput && (
                  <button
                    onClick={() => setShowFlagInput(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-danger-700 hover:bg-danger-50 rounded-lg transition-colors border border-danger-200"
                  >
                    <Flag className="w-4 h-4" /> Flag Order
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setViewOrder(null); setShowFlagInput(false); }}>
                  Close
                </Button>
                {viewOrder.status === 'PENDING' && isIM && !showFlagInput && (
                  <button
                    onClick={() => handleApprove(viewOrder.id)}
                    disabled={submittingAction}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-success-600 hover:bg-success-500 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {submittingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Approve & Create Challan
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
