import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCcw, Search, Filter, Package, AlertCircle, Clock,
  CheckCircle2, Loader2, Plus, ChevronDown, Calendar,
} from 'lucide-react'
import { getReorders, createReorderFlag } from '../../../api/endpoints/reorder.api'
import { getProducts } from '../../../api/endpoints/products.api'
import { cn } from '../../../utils/cn'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import toast from 'react-hot-toast'
import TablePagination from '../../../components/data/TablePagination'

const STATUS_CONFIG = {
  OPEN:     { label: 'Open',     variant: 'warning' },
  ORDERED:  { label: 'Ordered',  variant: 'primary' },
  RECEIVED: { label: 'Received', variant: 'success' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.OPEN
  return (
    <Badge variant={cfg.variant} dot size="sm">
      {cfg.label}
    </Badge>
  )
}

function NewFlagModal({ products, onClose, onSuccess }) {
  const [productId, setProductId]       = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productOpen, setProductOpen]   = useState(false)
  const [qty, setQty]                   = useState(1)
  const [note, setNote]                 = useState('')
  const [submitting, setSubmitting]     = useState(false)

  const filtered = useMemo(() =>
    products
      .filter(p =>
        (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.part_number || '').toLowerCase().includes(productSearch.toLowerCase())
      )
      .slice(0, 20),
    [products, productSearch]
  )

  const selected = products.find(p => String(p.id) === String(productId))

  const handleSubmit = async () => {
    if (!productId) return toast.error('Select a product')
    if (!qty || qty < 1) return toast.error('Enter a valid quantity')

    setSubmitting(true)
    try {
      const res = await createReorderFlag({ product_id: productId, quantity_requested: qty, note })
      if (res?.success) {
        toast.success('Reorder flag created!')
        onSuccess()
        onClose()
      } else {
        toast.error(res?.error || 'Failed to create flag')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create reorder flag')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Flag Item for Reorder</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1.5">Product *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProductOpen(o => !o)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all',
                  'bg-white dark:bg-surface-800 focus:outline-none',
                  productOpen ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-surface-200 dark:border-surface-700'
                )}
              >
                {selected ? (
                  <div>
                    <span className="font-medium text-surface-900 dark:text-surface-100">{selected.name}</span>
                    <span className="ml-2 text-xs text-surface-400 font-mono">{selected.part_number}</span>
                  </div>
                ) : (
                  <span className="text-surface-400">Search product…</span>
                )}
                <ChevronDown className={cn('h-3.5 w-3.5 text-surface-400 shrink-0', productOpen && 'rotate-180')} />
              </button>
              {productOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-surface-100 dark:border-surface-800">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <Search className="h-3 w-3 text-surface-400" />
                      <input
                        autoFocus
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search…"
                        className="bg-transparent text-xs outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {filtered.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProductId(String(p.id)); setProductOpen(false); setProductSearch('') }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <span className="text-xs font-medium text-surface-900 dark:text-surface-100">{p.name}</span>
                        <span className="text-[11px] text-surface-400 font-mono">{p.part_number}</span>
                      </button>
                    ))}
                    {filtered.length === 0 && <p className="px-3 py-4 text-xs text-surface-400 text-center">No products found</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1.5">Quantity Wanted *</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Context or reason…"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
            Cancel
          </button>
          <button
            id="create-reorder-flag-btn"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-60 transition-all"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            {submitting ? 'Creating…' : 'Create Flag'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyReorderFlagsPage() {
  const [reorders, setReorders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage]         = useState(1)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => { setPage(1) }, [search, filterStatus])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reordersRes, productsRes] = await Promise.allSettled([
        getReorders(),
        getProducts(),
      ])
      if (reordersRes.status === 'fulfilled' && reordersRes.value?.success) {
        setReorders(reordersRes.value.data ?? [])
      }
      if (productsRes.status === 'fulfilled' && productsRes.value?.success) {
        setProducts(productsRes.value.data ?? [])
      }
    } catch {
      toast.error('Failed to load reorder flags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = useMemo(() => {
    return reorders.filter(r => {
      const searchMatch =
        (r.product?.name || r.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.product?.part_number || r.part_number || '').toLowerCase().includes(search.toLowerCase())
      const statusMatch = filterStatus === 'all' || r.status?.toUpperCase() === filterStatus
      return searchMatch && statusMatch
    })
  }, [reorders, search, filterStatus])

  const counts = useMemo(() => ({
    open:     reorders.filter(r => r.status === 'OPEN').length,
    ordered:  reorders.filter(r => r.status === 'ORDERED').length,
    received: reorders.filter(r => r.status === 'RECEIVED').length,
  }), [reorders])

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Reorder Flags</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">Items you've flagged for restocking</p>
        </div>
        <Button
          id="new-reorder-flag-btn"
          onClick={() => setShowNewModal(true)}
          icon={Plus}
          size="sm"
        >
          Flag Item
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'OPEN',     label: 'Open',     count: counts.open,     color: 'text-warning-600 dark:text-warning-400' },
          { key: 'ORDERED',  label: 'Ordered',  count: counts.ordered,  color: 'text-primary-600 dark:text-primary-400' },
          { key: 'RECEIVED', label: 'Received', count: counts.received, color: 'text-success-600 dark:text-success-400' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
            className={cn(
              'card p-3 text-center transition-all hover:border-surface-300 dark:hover:border-surface-700',
              filterStatus === s.key && 'border-primary-300 dark:border-primary-700 ring-2 ring-primary-500/20'
            )}
          >
            <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.count}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name or part number…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        {filterStatus !== 'all' && (
          <button
            onClick={() => setFilterStatus('all')}
            className="px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden" padding={false}>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-surface-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading flags…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-surface-400">
            <RefreshCcw className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">{reorders.length === 0 ? 'No reorder flags yet' : 'No matches found'}</p>
            {reorders.length === 0 && <p className="text-xs mt-1">Flag items that are out of stock when creating orders</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Note</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Date Flagged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filtered.slice((page - 1) * 50, page * 50).map(r => (
                  <tr key={r.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-surface-400" />
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-surface-100">{r.product?.name || r.product_name || '—'}</p>
                          <p className="text-xs text-surface-400 font-mono mt-0.5">{r.product?.part_number || r.part_number || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm font-bold text-surface-700 dark:text-surface-300">
                        {r.quantity_requested}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-surface-500 text-xs max-w-[200px] truncate">{r.note || '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-surface-400 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={50}
          onPageChange={setPage}
        />
      </Card>

      {showNewModal && (
        <NewFlagModal
          products={products}
          onClose={() => setShowNewModal(false)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  )
}
