import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getStockSummary, getLowStock, getTransactions,
  getDamaged, recordDamage, getAdjustments, createAdjustment, placeReorder,
} from '../../../api/endpoints/inventory.api'
import { getProducts } from '../../../api/endpoints/products.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import {
  Package, Search, AlertTriangle, Boxes, Activity, Wrench,
  ArrowUpCircle, ArrowDownCircle, RotateCcw, ShoppingCart,
  TrendingDown, Plus, X, RefreshCw, ChevronDown,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtQty = (v) => v != null ? parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'

function StockBar({ available, onHand, threshold }) {
  if (!onHand || onHand === 0) return <span className="text-surface-400 text-xs">No stock</span>
  const pct = Math.min(100, (available / onHand) * 100)
  const color = available <= 0 ? 'bg-danger-500' : available <= threshold ? 'bg-warning-500' : 'bg-success-500'
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, pct)}%` }} />
      </div>
      <span className="text-xs font-mono text-surface-500 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

function TypeIcon({ type }) {
  const map = {
    stock_in:   { Icon: ArrowUpCircle,   cls: 'text-success-500' },
    dispatch:   { Icon: ArrowDownCircle, cls: 'text-danger-500' },
    damage:     { Icon: AlertTriangle,   cls: 'text-warning-500' },
    adjustment: { Icon: Wrench,          cls: 'text-primary-500' },
    reserved:   { Icon: Clock,           cls: 'text-blue-500' },
    released:   { Icon: RotateCcw,       cls: 'text-surface-400' },
  }
  const { Icon, cls } = map[type] || { Icon: Activity, cls: 'text-surface-400' }
  return <Icon className={cn('h-4 w-4', cls)} />
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
      <AlertCircle className="h-4 w-4 shrink-0" />{msg}
    </div>
  )
}

const SELECT_CLS = `input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockOverviewPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Data
  const [stock,        setStock]        = useState([])
  const [transactions, setTransactions] = useState([])
  const [damaged,      setDamaged]      = useState([])
  const [adjustments,  setAdjustments]  = useState([])
  const [products,     setProducts]     = useState([])
  const [lowStock,     setLowStock]     = useState([])
  const [loading,      setLoading]      = useState(true)

  // Filters
  const [search,      setSearch]      = useState('')
  const [txnFilter,   setTxnFilter]   = useState({ product_id: '', type: '' })
  const [dmgFilter,   setDmgFilter]   = useState('')
  const [adjFilter,   setAdjFilter]   = useState('')

  // Modals
  const [reorderOpen,  setReorderOpen]  = useState(false)
  const [damageOpen,   setDamageOpen]   = useState(false)
  const [adjOpen,      setAdjOpen]      = useState(false)

  // Forms
  const [damageForm, setDamageForm] = useState({ product_id: '', quantity: '', damage_reason: '', remarks: '' })
  const [adjForm,    setAdjForm]    = useState({ product_id: '', new_quantity: '', reason: '', remarks: '' })
  const [damageErr,  setDamageErr]  = useState(null)
  const [adjErr,     setAdjErr]     = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Reorder state per product
  const [reorderQty,        setReorderQty]        = useState({})
  const [reorderingProduct, setReorderingProduct] = useState(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, tRes, dRes, aRes, pRes, lRes] = await Promise.all([
        getStockSummary(), getTransactions(), getDamaged(),
        getAdjustments(), getProducts(), getLowStock(),
      ])
      if (sRes.data?.success)  setStock(sRes.data.data)
      if (tRes.data?.success)  setTransactions(tRes.data.data)
      if (dRes.data?.success)  setDamaged(dRes.data.data)
      if (aRes.data?.success)  setAdjustments(aRes.data.data)
      if (pRes.data?.success)  setProducts(pRes.data.data)
      if (lRes.data?.success)  setLowStock(lRes.data.data)
    } catch (err) {
      toast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Filtered Data ─────────────────────────────────────────────────────────
  const filteredStock = useMemo(() => stock.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  }), [stock, search])

  const filteredTxns = useMemo(() => transactions.filter(t => {
    if (txnFilter.product_id && String(t.product_id) !== txnFilter.product_id) return false
    if (txnFilter.type && t.type !== txnFilter.type) return false
    return true
  }), [transactions, txnFilter])

  const filteredDamaged = useMemo(() => damaged.filter(d =>
    !dmgFilter || String(d.product_id) === dmgFilter
  ), [damaged, dmgFilter])

  const filteredAdj = useMemo(() => adjustments.filter(a =>
    !adjFilter || String(a.product_id) === adjFilter
  ), [adjustments, adjFilter])

  // ── Summary Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalProducts: stock.length,
    lowStockCount: lowStock.length,
    totalOnHand:   stock.reduce((s, p) => s + (p.on_hand || 0), 0),
    totalDamaged:  damaged.reduce((s, d) => s + parseFloat(d.quantity || 0), 0),
  }), [stock, lowStock, damaged])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRecordDamage = async (e) => {
    e.preventDefault()
    setDamageErr(null)
    if (!damageForm.product_id) return setDamageErr('Select a product')
    if (!damageForm.quantity || parseFloat(damageForm.quantity) <= 0) return setDamageErr('Enter a valid quantity')
    if (!damageForm.damage_reason.trim()) return setDamageErr('Damage reason is required')
    setSubmitting(true)
    try {
      const res = await recordDamage({
        product_id: parseInt(damageForm.product_id),
        quantity: parseFloat(damageForm.quantity),
        damage_reason: damageForm.damage_reason,
        remarks: damageForm.remarks || undefined,
      })
      if (res.data?.success) {
        toast.success('Damage recorded successfully')
        setDamageOpen(false)
        setDamageForm({ product_id: '', quantity: '', damage_reason: '', remarks: '' })
        fetchAll()
      } else {
        setDamageErr(res.data?.error || 'Failed to record damage')
      }
    } catch (err) {
      setDamageErr(err.response?.data?.error || 'Failed to record damage')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdjustment = async (e) => {
    e.preventDefault()
    setAdjErr(null)
    if (!adjForm.product_id) return setAdjErr('Select a product')
    if (adjForm.new_quantity === '' || adjForm.new_quantity == null) return setAdjErr('Enter the new quantity')
    if (!adjForm.reason.trim()) return setAdjErr('Reason is required')
    setSubmitting(true)
    try {
      const res = await createAdjustment({
        product_id:   parseInt(adjForm.product_id),
        new_quantity: parseFloat(adjForm.new_quantity),
        reason:       adjForm.reason,
        remarks:      adjForm.remarks || undefined,
      })
      if (res.data?.success) {
        toast.success('Adjustment applied successfully')
        setAdjOpen(false)
        setAdjForm({ product_id: '', new_quantity: '', reason: '', remarks: '' })
        fetchAll()
      } else {
        setAdjErr(res.data?.error || 'Failed to apply adjustment')
      }
    } catch (err) {
      setAdjErr(err.response?.data?.error || 'Failed to apply adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReorder = async (productId) => {
    const qty = parseFloat(reorderQty[productId] || 0)
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity to order')
    setReorderingProduct(productId)
    try {
      const res = await placeReorder({ product_id: productId, quantity: qty })
      if (res.data?.success) {
        toast.success(res.data.message || 'Reorder placed')
        setReorderQty(prev => ({ ...prev, [productId]: '' }))
        fetchAll()
      } else {
        toast.error(res.data?.error || 'Reorder failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reorder failed')
    } finally {
      setReorderingProduct(null)
    }
  }

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',     label: 'Stock Overview',    Icon: Boxes },
    { id: 'transactions', label: 'Transactions',      Icon: Activity },
    { id: 'damaged',      label: 'Damaged Stock',     Icon: AlertTriangle },
    { id: 'adjustments',  label: 'Adjustments',       Icon: Wrench },
  ]

  const TH = ({ children, right }) => (
    <th className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400', right && 'text-right')}>
      {children}
    </th>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-in space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-primary-600" />
            Inventory
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Live stock levels, movement ledger, damage records, and manual adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-inventory-btn"
            onClick={fetchAll}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>

          {/* Reorder Alert Button */}
          <button
            id="reorder-alert-btn"
            onClick={() => setReorderOpen(true)}
            className={cn(
              'relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              lowStock.length > 0
                ? 'bg-warning-500 hover:bg-warning-600 text-white shadow-md shadow-warning-200 dark:shadow-warning-900/30'
                : 'bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Reorder Alert
            {lowStock.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-danger-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {lowStock.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products',   value: stats.totalProducts, Icon: Package,       color: 'text-primary-600',  bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Low Stock Alerts', value: stats.lowStockCount, Icon: TrendingDown,  color: 'text-warning-600',  bg: 'bg-warning-50 dark:bg-warning-900/20', warn: true },
          { label: 'Total On Hand',    value: fmtQty(stats.totalOnHand), Icon: Boxes,  color: 'text-success-600',  bg: 'bg-success-50 dark:bg-success-900/20' },
          { label: 'Total Damaged',    value: fmtQty(stats.totalDamaged), Icon: AlertTriangle, color: 'text-danger-600', bg: 'bg-danger-50 dark:bg-danger-900/20' },
        ].map(({ label, value, Icon, color, bg, warn }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', bg)}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
            <div>
              <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">{label}</p>
              <p className={cn('text-xl font-bold tracking-tight', warn && stats.lowStockCount > 0 ? 'text-warning-600' : 'text-surface-900 dark:text-surface-50')}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`inventory-tab-${id}`}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all',
              activeTab === id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === 'damaged' && damaged.length > 0 && (
              <span className="ml-0.5 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {damaged.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: STOCK OVERVIEW                                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="card overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-9 py-1.5"
                id="stock-search-input"
              />
            </div>
            {search && (
              <button onClick={() => setSearch('')} className="flex items-center gap-1 text-xs text-surface-500 hover:text-danger-600 transition-colors shrink-0">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <span className="text-xs text-surface-500 font-medium ml-auto">
              {filteredStock.length} of {stock.length} products
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />)}
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No products found</h3>
                <p className="text-xs text-surface-500 mt-1">Try adjusting the search filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70">
                    <TH>Product</TH>
                    <TH>SKU</TH>
                    <TH>On Hand</TH>
                    <TH>Reserved</TH>
                    <TH>Damaged</TH>
                    <TH>Available</TH>
                    <TH>Status</TH>
                    <TH>Fill Rate</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50 text-sm">
                  {filteredStock.map(p => {
                    const isLow  = p.is_low_stock
                    const isOut  = p.available <= 0
                    return (
                      <tr key={p.id} className={cn('table-row-hover', isOut && 'bg-danger-50/30 dark:bg-danger-900/10', isLow && !isOut && 'bg-warning-50/30 dark:bg-warning-900/10')}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-surface-900 dark:text-surface-50">{p.name}</div>
                          {p.category && <div className="text-xs text-surface-400 mt-0.5">{p.category.name}</div>}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-surface-500">{p.sku}</td>
                        <td className="px-4 py-3.5 font-semibold text-surface-800 dark:text-surface-200">{fmtQty(p.on_hand)} <span className="text-xs text-surface-400 font-normal">{p.uom?.code}</span></td>
                        <td className="px-4 py-3.5 text-blue-600 dark:text-blue-400">{fmtQty(p.reserved)}</td>
                        <td className="px-4 py-3.5 text-warning-600 dark:text-warning-400">{fmtQty(p.damaged)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn('font-bold', isOut ? 'text-danger-600' : isLow ? 'text-warning-600' : 'text-success-600')}>
                            {fmtQty(p.available)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isOut ? (
                            <Badge variant="danger" dot>Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="warning" dot>Low Stock</Badge>
                          ) : (
                            <Badge variant="success" dot>In Stock</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StockBar available={p.available} onHand={p.on_hand} threshold={p.reorder_threshold} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: TRANSACTIONS                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center">
            <select
              value={txnFilter.product_id}
              onChange={e => setTxnFilter(f => ({ ...f, product_id: e.target.value }))}
              className={cn(SELECT_CLS, 'w-full sm:w-56')}
              id="txn-product-filter"
            >
              <option value="">All Products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <select
              value={txnFilter.type}
              onChange={e => setTxnFilter(f => ({ ...f, type: e.target.value }))}
              className={cn(SELECT_CLS, 'w-full sm:w-44')}
              id="txn-type-filter"
            >
              <option value="">All Types</option>
              {['stock_in','dispatch','damage','adjustment','reserved','released'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            {(txnFilter.product_id || txnFilter.type) && (
              <button onClick={() => setTxnFilter({ product_id: '', type: '' })} className="flex items-center gap-1 text-xs text-surface-500 hover:text-danger-600 transition-colors shrink-0">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <span className="text-xs text-surface-500 ml-auto">{filteredTxns.length} records</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse bg-surface-100 dark:bg-surface-800 rounded" />)}</div>
            ) : filteredTxns.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No transactions yet</h3>
                <p className="text-xs text-surface-500 mt-1">Every stock movement will appear here as an immutable record.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70">
                    <TH>Type</TH>
                    <TH>Product</TH>
                    <TH>Reference</TH>
                    <TH right>Change</TH>
                    <TH right>After</TH>
                    <TH>Performed By</TH>
                    <TH>Date</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50 text-sm">
                  {filteredTxns.map(t => (
                    <tr key={t.id} className="table-row-hover">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <TypeIcon type={t.type} />
                          <span className="capitalize text-xs font-medium text-surface-700 dark:text-surface-300">{t.type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-surface-900 dark:text-surface-100">{t.product?.name || '—'}</div>
                        <div className="text-xs font-mono text-surface-400">{t.product?.sku}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-surface-500">{t.reference || '—'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cn('font-bold font-mono', parseFloat(t.quantity_change) >= 0 ? 'text-success-600' : 'text-danger-600')}>
                          {parseFloat(t.quantity_change) >= 0 ? '+' : ''}{fmtQty(t.quantity_change)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-surface-700 dark:text-surface-300">{fmtQty(t.quantity_after)}</td>
                      <td className="px-4 py-3.5 text-surface-600 dark:text-surface-400">{t.performer?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-surface-500">{new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: DAMAGED STOCK                                              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'damaged' && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Damaged stock is excluded from available quantity calculations.
            </p>
            <Button
              id="record-damage-btn"
              icon={Plus}
              size="sm"
              variant="danger"
              onClick={() => { setDamageErr(null); setDamageForm({ product_id: '', quantity: '', damage_reason: '', remarks: '' }); setDamageOpen(true) }}
            >
              Record Damage
            </Button>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex gap-3 items-center">
              <select
                value={dmgFilter}
                onChange={e => setDmgFilter(e.target.value)}
                className={cn(SELECT_CLS, 'w-full sm:w-64')}
                id="damage-product-filter"
              >
                <option value="">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              {dmgFilter && (
                <button onClick={() => setDmgFilter('')} className="flex items-center gap-1 text-xs text-surface-500 hover:text-danger-600 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
              <span className="text-xs text-surface-500 ml-auto">{filteredDamaged.length} records</span>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse bg-surface-100 dark:bg-surface-800 rounded" />)}</div>
              ) : filteredDamaged.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-success-300 dark:text-success-600 mb-3" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No damage records</h3>
                  <p className="text-xs text-surface-500 mt-1">All stock appears to be in good condition.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70">
                      <TH>Product</TH>
                      <TH right>Qty Damaged</TH>
                      <TH>Reason</TH>
                      <TH>Recorded By</TH>
                      <TH>Remarks</TH>
                      <TH>Date</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50 text-sm">
                    {filteredDamaged.map(d => (
                      <tr key={d.id} className="table-row-hover">
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-surface-900 dark:text-surface-100">{d.product?.name || '—'}</div>
                          <div className="text-xs font-mono text-surface-400">{d.product?.sku}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-bold text-warning-600 dark:text-warning-400 font-mono">{fmtQty(d.quantity)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 rounded-full border border-warning-200 dark:border-warning-800/50">
                            <AlertTriangle className="h-3 w-3" />
                            {d.damage_reason}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-surface-600 dark:text-surface-400">{d.recorder?.name || '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-surface-500 italic max-w-[200px] line-clamp-1">{d.remarks || '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-surface-500">{new Date(d.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: ADJUSTMENTS                                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'adjustments' && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Manual stock corrections. Each adjustment is logged in the transactions ledger.
            </p>
            <Button
              id="new-adjustment-btn"
              icon={Wrench}
              size="sm"
              onClick={() => { setAdjErr(null); setAdjForm({ product_id: '', new_quantity: '', reason: '', remarks: '' }); setAdjOpen(true) }}
            >
              New Adjustment
            </Button>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex gap-3 items-center">
              <select
                value={adjFilter}
                onChange={e => setAdjFilter(e.target.value)}
                className={cn(SELECT_CLS, 'w-full sm:w-64')}
                id="adj-product-filter"
              >
                <option value="">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              {adjFilter && (
                <button onClick={() => setAdjFilter('')} className="flex items-center gap-1 text-xs text-surface-500 hover:text-danger-600 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
              <span className="text-xs text-surface-500 ml-auto">{filteredAdj.length} records</span>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse bg-surface-100 dark:bg-surface-800 rounded" />)}</div>
              ) : filteredAdj.length === 0 ? (
                <div className="p-12 text-center">
                  <Wrench className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No adjustments yet</h3>
                  <p className="text-xs text-surface-500 mt-1">Manual stock corrections will appear here.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70">
                      <TH>Product</TH>
                      <TH right>Before</TH>
                      <TH right>After</TH>
                      <TH right>Delta</TH>
                      <TH>Reason</TH>
                      <TH>Performed By</TH>
                      <TH>Approved By</TH>
                      <TH>Date</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50 text-sm">
                    {filteredAdj.map(a => {
                      const delta = parseFloat(a.quantity_after) - parseFloat(a.quantity_before)
                      return (
                        <tr key={a.id} className="table-row-hover">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-surface-900 dark:text-surface-100">{a.product?.name || '—'}</div>
                            <div className="text-xs font-mono text-surface-400">{a.product?.sku}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-surface-500">{fmtQty(a.quantity_before)}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-surface-900 dark:text-surface-100">{fmtQty(a.quantity_after)}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={cn('font-bold font-mono', delta >= 0 ? 'text-success-600' : 'text-danger-600')}>
                              {delta >= 0 ? '+' : ''}{fmtQty(delta)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-surface-700 dark:text-surface-300 max-w-[200px] line-clamp-1">{a.reason}</td>
                          <td className="px-4 py-3.5 text-surface-600 dark:text-surface-400">{a.performer?.name || '—'}</td>
                          <td className="px-4 py-3.5">
                            {a.approver ? (
                              <span className="text-success-600 dark:text-success-400 text-xs font-medium">{a.approver.name}</span>
                            ) : (
                              <span className="text-xs text-surface-400 italic">Self</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-surface-500">{new Date(a.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REORDER ALERT                                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        title="Reorder Alert"
        description={
          lowStock.length > 0
            ? `${lowStock.length} product${lowStock.length !== 1 ? 's' : ''} are at or below their reorder threshold.`
            : 'All products are above their reorder thresholds.'
        }
        size="xl"
      >
        {lowStock.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success-400 mb-4" />
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Stock levels are healthy!</h3>
            <p className="text-sm text-surface-500 mt-1">No products require reordering at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className={cn(
                  'w-2 h-10 rounded-full shrink-0',
                  p.available <= 0 ? 'bg-danger-500' : 'bg-warning-500'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-surface-900 dark:text-surface-50 truncate">{p.name}</div>
                  <div className="text-xs text-surface-500 font-mono mt-0.5">
                    {p.sku} &nbsp;·&nbsp; Available: <span className={cn('font-bold', p.available <= 0 ? 'text-danger-600' : 'text-warning-600')}>{fmtQty(p.available)}</span>
                    {p.uom?.code && ` ${p.uom.code}`} &nbsp;·&nbsp; Threshold: {fmtQty(p.reorder_threshold)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    id={`reorder-qty-${p.id}`}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    value={reorderQty[p.id] || ''}
                    onChange={e => setReorderQty(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="input-base w-24 py-1.5 text-sm font-mono text-center"
                  />
                  <Button
                    id={`order-now-btn-${p.id}`}
                    size="sm"
                    icon={ShoppingCart}
                    loading={reorderingProduct === p.id}
                    onClick={() => handleReorder(p.id)}
                  >
                    Order
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RECORD DAMAGE                                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal
        open={damageOpen}
        onClose={() => setDamageOpen(false)}
        title="Record Damaged Stock"
        description="Damaged quantities are deducted from available stock and excluded from future calculations."
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDamageOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={submitting} onClick={handleRecordDamage} id="submit-damage-btn">
              Record Damage
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordDamage} className="space-y-4" noValidate>
          <ErrorBanner msg={damageErr} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Product <span className="text-danger-500">*</span></label>
            <select
              value={damageForm.product_id}
              onChange={e => setDamageForm(f => ({ ...f, product_id: e.target.value }))}
              className={SELECT_CLS}
              id="damage-product-select"
            >
              <option value="">— Select Product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <Input
            label="Quantity Damaged"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="e.g. 5"
            value={damageForm.quantity}
            onChange={e => setDamageForm(f => ({ ...f, quantity: e.target.value }))}
            id="damage-quantity-input"
          />
          <Input
            label="Damage Reason"
            required
            placeholder="e.g. Water damage during transit"
            value={damageForm.damage_reason}
            onChange={e => setDamageForm(f => ({ ...f, damage_reason: e.target.value }))}
            id="damage-reason-input"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Remarks</label>
            <textarea
              rows={2}
              placeholder="Additional notes (optional)"
              value={damageForm.remarks}
              onChange={e => setDamageForm(f => ({ ...f, remarks: e.target.value }))}
              className="input-base resize-none"
              id="damage-remarks-input"
            />
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: INVENTORY ADJUSTMENT                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal
        open={adjOpen}
        onClose={() => setAdjOpen(false)}
        title="Manual Stock Adjustment"
        description="Set the exact new quantity for a product. The difference will be logged as a transaction."
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAdjOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleAdjustment} id="submit-adjustment-btn">
              Apply Adjustment
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdjustment} className="space-y-4" noValidate>
          <ErrorBanner msg={adjErr} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Product <span className="text-danger-500">*</span></label>
            <select
              value={adjForm.product_id}
              onChange={e => {
                const pid = e.target.value
                const stockRow = stock.find(s => String(s.id) === pid)
                setAdjForm(f => ({ ...f, product_id: pid, new_quantity: stockRow ? String(stockRow.on_hand) : '' }))
              }}
              className={SELECT_CLS}
              id="adj-product-select"
            >
              <option value="">— Select Product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          {adjForm.product_id && (
            <div className="flex items-center gap-2 text-xs text-surface-500 bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2">
              <span>Current on-hand:</span>
              <span className="font-bold font-mono text-surface-900 dark:text-surface-50">
                {fmtQty(stock.find(s => String(s.id) === adjForm.product_id)?.on_hand)}
              </span>
            </div>
          )}
          <Input
            label="New Quantity (set to)"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="e.g. 250"
            value={adjForm.new_quantity}
            onChange={e => setAdjForm(f => ({ ...f, new_quantity: e.target.value }))}
            id="adj-quantity-input"
          />
          <Input
            label="Reason"
            required
            placeholder="e.g. Physical count correction"
            value={adjForm.reason}
            onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
            id="adj-reason-input"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Remarks</label>
            <textarea
              rows={2}
              placeholder="Additional notes (optional)"
              value={adjForm.remarks}
              onChange={e => setAdjForm(f => ({ ...f, remarks: e.target.value }))}
              className="input-base resize-none"
              id="adj-remarks-input"
            />
          </div>
        </form>
      </Modal>

    </div>
  )
}
