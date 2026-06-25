import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  AlertTriangle,
  ClipboardList,
  FileDown,
  ChevronRight,
  TrendingUp,
  Package,
  Calendar,
  Warehouse,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { getPendingOrders } from '../../../api/endpoints/orders.api'
import { getLowStock } from '../../../api/endpoints/inventory.api'
import { getReorders } from '../../../api/endpoints/reorder.api'
import { getInwards } from '../../../api/endpoints/inward.api'
import toast from 'react-hot-toast'

export default function IMDashboard() {
  const [stats, setStats] = useState({
    pendingOrdersCount: 0,
    lowStockCount: 0,
    openReordersCount: 0,
    inwardsCount: 0,
  })
  const [pendingOrders, setPendingOrders] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [openReorders, setOpenReorders] = useState([])
  const [inwardEntries, setInwardEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [ordersRes, lowStockRes, reordersRes, inwardsRes] = await Promise.all([
          getPendingOrders(),
          getLowStock(),
          getReorders(),
          getInwards(),
        ]);

        if (ordersRes.data?.success) {
          const pending = ordersRes.data.data;
          setPendingOrders(pending.slice(0, 5));
          setStats(prev => ({ ...prev, pendingOrdersCount: pending.length }));
        }

        if (lowStockRes.data?.success) {
          const low = lowStockRes.data.data;
          setLowStockItems(low.slice(0, 5));
          setStats(prev => ({ ...prev, lowStockCount: low.length }));
        }

        if (reordersRes.data?.success) {
          const reorders = reordersRes.data.data;
          const open = reorders.filter(r => r.status === 'OPEN');
          setOpenReorders(open.slice(0, 5));
          setStats(prev => ({ ...prev, openReordersCount: open.length }));
        }

        if (inwardsRes.data?.success) {
          const inwards = inwardsRes.data.data;
          // Filter inwards received today
          const today = new Date().toISOString().split('T')[0];
          const todayInwards = inwards.filter(i => {
            const dateStr = new Date(i.created_at).toISOString().split('T')[0];
            return dateStr === today;
          });
          setInwardEntries(inwards.slice(0, 5));
          setStats(prev => ({ ...prev, inwardsCount: todayInwards.length }));
        }
      } catch (error) {
        console.error('Dashboard load failed:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Greeting Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            Inventory Management Workspace
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Overview of pending order approvals, low stock indicators, and incoming supplier entries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/im/inward/new"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-sm transition-all shadow-primary-500/10"
          >
            New Inward Entry
          </Link>
        </div>
      </div>

      {/* ─── Stats Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Approvals */}
        <div className="bg-white dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 tracking-wider uppercase">Pending Approvals</span>
            <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.pendingOrdersCount}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 tracking-wider uppercase">Low Stock Alerts</span>
            <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.lowStockCount}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Open Reorder Flags */}
        <div className="bg-white dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 tracking-wider uppercase">Open Reorders</span>
            <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.openReordersCount}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Inwards */}
        <div className="bg-white dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-surface-400 tracking-wider uppercase">Inward Received Today</span>
            <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.inwardsCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <FileDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── Grid Dashboard Widgets ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Approvals Table */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <ShoppingCart className="w-4.5 h-4.5 text-blue-600" />
              Pending Approvals
            </h2>
            <Link to="/im/orders/pending" className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-0.5">
              Manage Orders <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-surface-200 dark:divide-surface-800 overflow-y-auto max-h-96">
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-surface-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold">All Clear!</p>
                <p className="text-xs">No pending orders require your approval.</p>
              </div>
            ) : (
              pendingOrders.map(o => (
                <div key={o.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{o.order_number}</p>
                    <p className="text-xs text-surface-500">{o.party?.company_name}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">{formatCurrency(o.grand_total)}</p>
                    <p className="text-[10px] text-surface-400 font-mono">{o.items?.length || 0} line items</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              Low Stock Watchlist
            </h2>
            <Link to="/im/stock" className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-0.5">
              Stock Overview <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-surface-200 dark:divide-surface-800 overflow-y-auto max-h-96">
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-surface-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold">Healthy Levels</p>
                <p className="text-xs">No products are below their reorder threshold.</p>
              </div>
            ) : (
              lowStockItems.map(p => (
                <div key={p.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{p.name}</p>
                    <p className="text-xs text-surface-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {p.stockOnHand?.quantity || 0} / {p.reorder_threshold} <span className="text-[10px] text-surface-400 font-normal">{p.uom?.code}</span>
                    </p>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider font-semibold">Below limit</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Open Reorders */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-purple-500" />
              Recent Reorder Requests
            </h2>
            <Link to="/im/reorder" className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-0.5">
              Reorder flags <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-surface-200 dark:divide-surface-800 overflow-y-auto max-h-96">
            {openReorders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-surface-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold">No Demands</p>
                <p className="text-xs">No pending requests flagged by sales team.</p>
              </div>
            ) : (
              openReorders.map(r => (
                <div key={r.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{r.product?.name}</p>
                    <p className="text-xs text-surface-500">Needed for: {r.party?.company_name || 'N/A'}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold text-purple-600">{r.quantity_wanted} units</p>
                    <p className="text-[10px] text-surface-400 font-medium">Flagged by: {r.flagger?.name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inwards History Table */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <FileDown className="w-4.5 h-4.5 text-emerald-500" />
              Latest Inward Goods Receipts
            </h2>
            <Link to="/im/inward" className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-0.5">
              Inward History <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-surface-200 dark:divide-surface-800 overflow-y-auto max-h-96">
            {inwardEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-surface-400">
                <Clock className="w-8 h-8 text-surface-400 mb-2" />
                <p className="text-sm font-semibold">No Receipts Logged</p>
                <p className="text-xs">Log inward shipments to add new product stock.</p>
              </div>
            ) : (
              inwardEntries.map(i => (
                <div key={i.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{i.entry_number}</p>
                    <p className="text-xs text-surface-500">Supplier: {i.supplier_name}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-surface-500 font-mono">Bill No: {i.bill_number}</p>
                    <p className="text-[10px] text-surface-400">{i.items?.length || 0} unique items</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
