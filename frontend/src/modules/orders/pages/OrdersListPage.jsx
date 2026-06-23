import { useState } from 'react'
import ChallansListPage from '../../challans/pages/ChallansListPage'
import {
  ShoppingCart, FileText, Search, Filter, Calendar, MapPin, Plus, Eye,
  CheckCircle, Clock, AlertCircle, Package, DollarSign
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'

// ─── Dummy Orders Data ───────────────────────────────────────────────────────
const DUMMY_ORDERS = [
  {
    id: 'ORD-2406-0098',
    date: '2026-06-22',
    party_name: 'Verma Enterprises Pvt Ltd',
    party_city: 'Lucknow',
    region: 'North UP',
    amount: 45200,
    items_count: 3,
    status: 'dispatched',
    items: [
      { name: 'Heavy Duty Pipe 2"', qty: 120, price: 250 },
      { name: 'Elbow Connector 90°', qty: 80, price: 110 },
      { name: 'PVC Reducer 2"×1.5"', qty: 40, price: 160 },
    ]
  },
  {
    id: 'ORD-2406-0095',
    date: '2026-06-22',
    party_name: 'Singh Traders',
    party_city: 'Kanpur',
    region: 'Central UP',
    amount: 28900,
    items_count: 2,
    status: 'dispatched',
    items: [
      { name: 'GI Clamp 1"', qty: 200, price: 80 },
      { name: 'GI Clamp 1.5"', qty: 150, price: 86 },
    ]
  },
  {
    id: 'ORD-2406-0091',
    date: '2026-06-21',
    party_name: 'Gupta & Sons Hardware',
    party_city: 'Agra',
    region: 'West UP',
    amount: 18500,
    items_count: 4,
    status: 'dispatched',
    items: [
      { name: 'Ball Valve 3/4"', qty: 60, price: 120 },
      { name: 'Ball Valve 1"', qty: 40, price: 150 },
      { name: 'Gate Valve 1.5"', qty: 25, price: 180 },
      { name: 'Non-Return Valve 1"', qty: 30, price: 100 },
    ]
  },
  {
    id: 'ORD-2406-0088',
    date: '2026-06-21',
    party_name: 'Rajput Plumbing Supplies',
    party_city: 'Meerut',
    region: 'North UP',
    amount: 56000,
    items_count: 2,
    status: 'approved',
    items: [
      { name: 'CPVC Pipe 3/4" (10ft)', qty: 500, price: 80 },
      { name: 'CPVC Elbow 3/4"', qty: 200, price: 80 },
    ]
  },
  {
    id: 'ORD-2406-0085',
    date: '2026-06-20',
    party_name: 'Khan Construction Co.',
    party_city: 'Varanasi',
    region: 'East UP',
    amount: 32000,
    items_count: 3,
    status: 'dispatched',
    items: [
      { name: 'Cement Pipe 6"', qty: 80, price: 150 },
      { name: 'Cement Pipe 4"', qty: 120, price: 120 },
      { name: 'Manhole Cover CI', qty: 10, price: 560 },
    ]
  },
  {
    id: 'ORD-2406-0082',
    date: '2026-06-20',
    party_name: 'Metro Build Infra',
    party_city: 'Noida',
    region: 'NCR',
    amount: 78000,
    items_count: 3,
    status: 'pending',
    items: [
      { name: 'HDPE Pipe 110mm', qty: 300, price: 200 },
      { name: 'HDPE Coupler 110mm', qty: 100, price: 120 },
      { name: 'HDPE Elbow 90° 110mm', qty: 50, price: 120 },
    ]
  },
]

const ORDER_STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40', icon: Clock },
  approved:   { label: 'Approved',   color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40', icon: CheckCircle },
  dispatched: { label: 'Dispatched', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40', icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40', icon: AlertCircle },
}

export default function OrdersListPage() {
  const [activeTab, setActiveTab]       = useState('orders') // 'orders' | 'challans'
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewOrder, setViewOrder]       = useState(null)

  const filteredOrders = DUMMY_ORDERS.filter(o => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.party_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total:      DUMMY_ORDERS.length,
    pending:    DUMMY_ORDERS.filter(o => o.status === 'pending').length,
    approved:   DUMMY_ORDERS.filter(o => o.status === 'approved').length,
    dispatched: DUMMY_ORDERS.filter(o => o.status === 'dispatched').length,
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
                Customer Orders
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                View, track, and manage all sales orders.
              </p>
            </div>
            <Button icon={Plus} size="md" id="create-order-btn" className="w-full sm:w-auto">
              Create Order
            </Button>
          </div>

          {/* Stat Strip */}
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

          {/* Table Card */}
          <div className="card overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search order, party..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-base pl-9 py-1.5"
                  id="order-search"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-surface-400" />
                {['all', 'pending', 'approved', 'dispatched', 'cancelled'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium transition-colors border',
                      filterStatus === s
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700'
                    )}
                  >
                    {s === 'all' ? 'All' : ORDER_STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingCart className="mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No orders found</h3>
                  <p className="text-xs text-surface-500 mt-1">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Party</th>
                      <th className="px-5 py-3.5">Items</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                    {filteredOrders.map(o => {
                      const StatusIcon = ORDER_STATUS_CONFIG[o.status].icon
                      return (
                        <tr key={o.id} className="table-row-hover">
                          <td className="px-5 py-4">
                            <div className="font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs">{o.id}</div>
                          </td>
                          <td className="px-5 py-4 text-xs text-surface-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-surface-900 dark:text-surface-50 text-sm">{o.party_name}</div>
                            <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {o.party_city} · {o.region}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-surface-600 dark:text-surface-400">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-700 dark:text-surface-300">
                              <Package className="h-3.5 w-3.5 text-surface-400" />
                              {o.items_count} SKUs
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">
                            ₹{o.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', ORDER_STATUS_CONFIG[o.status].color)}>
                              <StatusIcon className="h-3 w-3" />
                              {ORDER_STATUS_CONFIG[o.status].label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setViewOrder(o)} id={`view-order-${o.id}`}>
                              View
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
        onClose={() => setViewOrder(null)}
        title={`Order details: ${viewOrder?.id}`}
        description="Detailed items summary and pricing values."
        size="md"
      >
        {viewOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', ORDER_STATUS_CONFIG[viewOrder.status].color)}>
                {ORDER_STATUS_CONFIG[viewOrder.status].label}
              </span>
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(viewOrder.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </span>
            </div>

            <div className="rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Party Details</p>
              <p className="font-semibold text-surface-900 dark:text-surface-50">{viewOrder.party_name}</p>
              <p className="text-sm text-surface-500">{viewOrder.party_city}</p>
              <p className="text-xs text-surface-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {viewOrder.region}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">Order Items</p>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
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
                    {viewOrder.items.map((item, i) => (
                      <tr key={item.name} className="table-row-hover">
                        <td className="px-4 py-2.5 text-surface-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-50">{item.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{item.qty}</td>
                        <td className="px-4 py-2.5 text-right text-surface-500">₹{item.price}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">₹{(item.qty * item.price).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 dark:bg-surface-700/50 font-semibold text-sm">
                      <td colSpan={4} className="px-4 py-2.5 text-surface-600 dark:text-surface-300">Total Amount</td>
                      <td className="px-4 py-2.5 text-right text-surface-900 dark:text-surface-50">₹{viewOrder.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-100 dark:border-surface-700">
              <Button variant="secondary" onClick={() => setViewOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
