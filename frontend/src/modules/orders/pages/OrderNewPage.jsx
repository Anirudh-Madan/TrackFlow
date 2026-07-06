import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, Search, Plus, Trash2, AlertCircle, Lightbulb, X,
  ChevronDown, Package, IndianRupee, Loader2, CheckCircle2, Zap,
  Info, ArrowLeft,
} from 'lucide-react'
import { getCustomers } from '../../../api/endpoints/parties.api'
import { createOrder, getSuggestions } from '../../../api/endpoints/orders.api'
import { getProducts } from '../../../api/endpoints/products.api'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import Button from '../../../components/ui/Button'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STOCK_CONFIG = {
  in_stock:    { label: 'In Stock',    color: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-900/40' },
  low_stock:   { label: 'Low Stock',   color: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-900/40' },
  out_of_stock:{ label: 'Out of Stock',color: 'text-danger-600  dark:text-danger-400  bg-danger-50  dark:bg-danger-900/20  border-danger-200  dark:border-danger-900/40' },
}

function StockBadge({ state }) {
  const cfg = STOCK_CONFIG[state] || STOCK_CONFIG.in_stock
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      {cfg.label}
    </span>
  )
}

// ─── Party Selector ─────────────────────────────────────────────────────────────
function PartySelector({ parties, value, onChange, creditWarning }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    parties.filter(p => (p.company_name || '').toLowerCase().includes(search.toLowerCase())),
    [parties, search]
  )

  const selected = parties.find(p => p.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        id="party-selector"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all',
          'bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30',
          open
            ? 'border-primary-400 dark:border-primary-600 ring-2 ring-primary-500/20'
            : 'border-surface-300 dark:border-surface-700 hover:border-surface-400 dark:hover:border-surface-600',
          creditWarning ? 'border-warning-400 dark:border-warning-600' : ''
        )}
      >
        {selected ? (
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{selected.company_name}</p>
            <p className="text-xs text-surface-400 truncate mt-0.5">
              Credit: {formatCurrency(selected.credit_limit)} · Outstanding: {formatCurrency(selected.outstanding_balance)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-surface-400">Select a party…</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-surface-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800">
              <Search className="h-3.5 w-3.5 text-surface-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search parties…"
                className="bg-transparent text-sm outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-surface-400 text-center">No parties found</p>
            ) : filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch('') }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
                  'hover:bg-surface-50 dark:hover:bg-surface-800',
                  value === p.id && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{p.company_name}</p>
                  <p className="text-xs text-surface-400">
                    {p.region?.name || 'Unknown region'} · GST: {p.gst}
                  </p>
                </div>
                {value === p.id && <CheckCircle2 className="h-4 w-4 text-primary-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Smart Suggestion Panel ──────────────────────────────────────────────────────
function SmartSuggestionPanel({ suggestions, onAdd, addedIds }) {
  if (!suggestions || suggestions.length === 0) return null

  const available = suggestions.filter(s => !addedIds.includes(s.product_id))
  if (available.length === 0) return null

  return (
    <div className="rounded-xl border border-primary-200 dark:border-primary-900/40 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-950/20 dark:to-indigo-950/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Smart Suggestions</p>
          <p className="text-xs text-primary-600/70 dark:text-primary-400/70">Based on this party's last 3 orders</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {available.map(s => (
          <div
            key={s.product_id}
            className="flex items-center gap-2 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 border border-primary-100 dark:border-primary-900/30 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-surface-900 dark:text-surface-100 truncate max-w-[140px]">
                {s.product_name}
              </p>
              <p className="text-[11px] text-surface-400">Last qty: {s.last_qty} · {s.last_date}</p>
            </div>
            <StockBadge state={s.stock_state || 'in_stock'} />
            <button
              type="button"
              onClick={() => onAdd(s)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors shrink-0"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Order Item Row ──────────────────────────────────────────────────────────────
function OrderItemRow({ item, products, onUpdate, onRemove, index }) {
  const [productSearch, setProductSearch] = useState('')
  const [productOpen, setProductOpen] = useState(false)

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.part_number || '').toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 20),
    [products, productSearch]
  )

  const selectedProduct = products.find(p => p.id === item.product_id)
  const belowBase = item.sm_price && item.base_price && parseFloat(item.sm_price) < parseFloat(item.base_price)
  const lineTotal = (parseFloat(item.sm_price) || 0) * (parseInt(item.quantity) || 0)

  return (
    <div className="relative flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 group">
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-3 right-3 p-1 rounded-lg text-surface-300 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-all"
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Product selector */}
      <div className="flex-[2] relative">
        <label className="block text-xs font-medium text-surface-500 mb-1">Product</label>
        <button
          type="button"
          onClick={() => setProductOpen(o => !o)}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all',
            'bg-white dark:bg-surface-800 focus:outline-none',
            productOpen
              ? 'border-primary-400 ring-2 ring-primary-500/20'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300',
          )}
        >
          {selectedProduct ? (
            <div className="min-w-0">
              <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{selectedProduct.name}</p>
              <p className="text-xs text-surface-400 font-mono">{selectedProduct.part_number}</p>
            </div>
          ) : (
            <span className="text-surface-400">Search product…</span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 text-surface-400 shrink-0', productOpen && 'rotate-180')} />
        </button>

        {productOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-50 dark:bg-surface-800">
                <Search className="h-3 w-3 text-surface-400" />
                <input
                  autoFocus
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search by name or part no…"
                  className="bg-transparent text-xs outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredProducts.map(p => {
                const stockState = p.combined_qty > (p.low_stock_threshold || 5)
                  ? 'in_stock' : p.combined_qty > 0 ? 'low_stock' : 'out_of_stock'
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={stockState === 'out_of_stock'}
                    onClick={() => {
                      onUpdate(index, {
                        product_id: p.id,
                        product_name: p.name,
                        base_price: p.base_price || p.selling_price || 0,
                        sm_price: p.base_price || p.selling_price || 0,
                        stock_state: stockState,
                        combined_qty: p.combined_qty || 0,
                      })
                      setProductOpen(false)
                      setProductSearch('')
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                      'hover:bg-surface-50 dark:hover:bg-surface-800',
                      stockState === 'out_of_stock' && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div>
                      <p className="text-xs font-medium text-surface-900 dark:text-surface-100">{p.name}</p>
                      <p className="text-[11px] text-surface-400 font-mono">{p.part_number} · Stock: {p.combined_qty ?? '—'}</p>
                    </div>
                    <StockBadge state={stockState} />
                  </button>
                )
              })}
              {filteredProducts.length === 0 && (
                <p className="px-3 py-4 text-xs text-surface-400 text-center">No products found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Qty */}
      <div className="w-24">
        <label className="block text-xs font-medium text-surface-500 mb-1">Qty</label>
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={e => onUpdate(index, { quantity: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          placeholder="1"
        />
      </div>

      {/* Base price (read-only) */}
      <div className="w-32">
        <label className="block text-xs font-medium text-surface-500 mb-1">Base Price</label>
        <div className="px-3 py-2.5 rounded-lg border border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 text-sm text-surface-500 dark:text-surface-400 tabular-nums">
          {item.base_price ? formatCurrency(item.base_price) : '—'}
        </div>
      </div>

      {/* SM price (editable) */}
      <div className="w-36">
        <label className={cn('block text-xs font-medium mb-1', belowBase ? 'text-warning-600 dark:text-warning-400' : 'text-surface-500')}>
          SM Price {belowBase && <span className="ml-1">⚠</span>}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">₹</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.sm_price}
            onChange={e => onUpdate(index, { sm_price: e.target.value })}
            className={cn(
              'w-full pl-6 pr-3 py-2.5 rounded-lg border text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 transition-colors',
              belowBase
                ? 'border-warning-300 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/10 focus:ring-warning-500/20 focus:border-warning-400'
                : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:ring-primary-500/30 focus:border-primary-400'
            )}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Line total */}
      <div className="w-32">
        <label className="block text-xs font-medium text-surface-500 mb-1">Line Total</label>
        <div className={cn(
          'px-3 py-2.5 rounded-lg border text-sm font-semibold tabular-nums',
          lineTotal > 0
            ? 'border-success-100 dark:border-success-900/30 bg-success-50 dark:bg-success-900/10 text-success-700 dark:text-success-400'
            : 'border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 text-surface-400'
        )}>
          {lineTotal > 0 ? formatCurrency(lineTotal) : '—'}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function OrderNewPage({ isModal = false, onClose, onSuccess, preselectedPartyId }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [parties, setParties]   = useState([])
  const [products, setProducts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [items, setItems] = useState([{ product_id: null, quantity: 1, base_price: 0, sm_price: 0, stock_state: 'in_stock' }])
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadingSugg, setLoadingSugg] = useState(false)
  const [creditWarning, setCreditWarning] = useState(null)

  // Load parties + products
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [partiesRes, productsRes] = await Promise.allSettled([
          getCustomers(),
          getProducts(),
        ])
        let loadedParties = []
        if (partiesRes.status === 'fulfilled' && partiesRes.value?.success) {
          loadedParties = partiesRes.value.data ?? []
          setParties(loadedParties)
        }
        if (productsRes.status === 'fulfilled' && productsRes.value?.success) {
          setProducts(productsRes.value.data ?? [])
        }

        // Set initial party if provided
        const partyId = preselectedPartyId || location.state?.partyId
        if (partyId && loadedParties.some(p => p.id === partyId)) {
          setSelectedParty(partyId)
          // also trigger suggestion loading
          const party = loadedParties.find(p => p.id === partyId)
          if (party) {
            if ((party.outstanding_balance || 0) >= (party.credit_limit || Infinity)) {
              setCreditWarning({
                outstanding: party.outstanding_balance,
                limit: party.credit_limit,
              })
            }
            setLoadingSugg(true)
            getSuggestions(partyId).then(res => {
              if (res?.success && Array.isArray(res.data)) {
                setSuggestions(res.data)
              }
            }).catch(() => {}).finally(() => setLoadingSugg(false))
          }
        }
      } catch {
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // When party changes, load suggestions + check credit
  const handlePartyChange = useCallback(async (partyId) => {
    setSelectedParty(partyId)
    setSuggestions([])
    setCreditWarning(null)

    const party = parties.find(p => p.id === partyId)
    if (!party) return

    // Credit check
    if ((party.outstanding_balance || 0) >= (party.credit_limit || Infinity)) {
      setCreditWarning({
        outstanding: party.outstanding_balance,
        limit: party.credit_limit,
      })
    }

    // Load smart suggestions
    setLoadingSugg(true)
    try {
      const res = await getSuggestions(partyId)
      if (res?.success && Array.isArray(res.data)) {
        setSuggestions(res.data)
      }
    } catch {
      // Suggestions are optional — fail silently
    } finally {
      setLoadingSugg(false)
    }
  }, [parties])

  const handleAddItem = () => {
    setItems(prev => [...prev, { product_id: null, quantity: 1, base_price: 0, sm_price: 0, stock_state: 'in_stock' }])
  }

  const handleUpdateItem = (index, patch) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddSuggestion = (s) => {
    setItems(prev => [
      ...prev.filter(it => it.product_id !== null), // remove blank row if only blank
      {
        product_id: s.product_id,
        product_name: s.product_name,
        base_price: s.base_price || 0,
        sm_price: s.sm_price || s.base_price || 0,
        quantity: s.last_qty || 1,
        stock_state: s.stock_state || 'in_stock',
        suggestion_added: true,
      }
    ])
    toast.success(`Added ${s.product_name} from suggestions`)
  }

  const addedSuggestionIds = items.map(it => it.product_id).filter(Boolean)

  // Totals
  const subtotal = items.reduce((acc, it) => acc + ((parseFloat(it.sm_price) || 0) * (parseInt(it.quantity) || 0)), 0)
  const gst = subtotal * 0.18
  const grand = subtotal + gst

  const handleSubmit = async () => {
    if (!selectedParty) return toast.error('Please select a party')
    const validItems = items.filter(it => it.product_id && parseInt(it.quantity) > 0)
    if (validItems.length === 0) return toast.error('Add at least one item')

    setSubmitting(true)
    try {
      const res = await createOrder({
        party_id: selectedParty,
        items: validItems.map(it => ({
          product_id: it.product_id,
          quantity: parseInt(it.quantity),
          sm_price: parseFloat(it.sm_price),
          suggestion_added: it.suggestion_added || false,
        })),
        notes,
      })

      if (res?.success) {
        toast.success(`Order ${res.data?.order_number || ''} submitted successfully!`)
        if (onSuccess) {
          onSuccess()
        } else {
          navigate('/sm/orders')
        }
      } else {
        toast.error(res?.error || 'Failed to create order')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn("max-w-5xl mx-auto space-y-6", isModal && "p-1")}>
      {/* Header */}
      {!isModal && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">New Order</h1>
            <p className="text-xs text-surface-400 mt-0.5">Fill in the party and items to create an order</p>
          </div>
        </div>
      )}

      {/* Party selection card */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">1</span>
          </div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Select Party</h2>
        </div>

        {loading ? (
          <div className="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
        ) : (
          <PartySelector
            parties={parties}
            value={selectedParty}
            onChange={handlePartyChange}
            creditWarning={!!creditWarning}
          />
        )}

        {/* Credit warning */}
        {creditWarning && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-900/40">
            <AlertCircle className="h-4 w-4 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warning-700 dark:text-warning-300">Credit Limit Exceeded</p>
              <p className="text-xs text-warning-600/80 dark:text-warning-400/80 mt-0.5">
                Outstanding: {formatCurrency(creditWarning.outstanding)} / Limit: {formatCurrency(creditWarning.limit)}. Admin has been notified.
              </p>
            </div>
          </div>
        )}

        {/* Smart suggestions */}
        {loadingSugg && (
          <div className="flex items-center gap-2 text-xs text-surface-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading smart suggestions…
          </div>
        )}
        {suggestions.length > 0 && (
          <SmartSuggestionPanel
            suggestions={suggestions}
            onAdd={handleAddSuggestion}
            addedIds={addedSuggestionIds}
          />
        )}
      </div>

      {/* Items section */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">2</span>
            </div>
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Order Items</h2>
          </div>
          <span className="text-xs text-surface-400">{items.filter(it => it.product_id).length} item(s)</span>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <OrderItemRow
              key={i}
              index={i}
              item={item}
              products={products}
              onUpdate={handleUpdateItem}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-sm text-surface-400 hover:border-primary-400 hover:text-primary-500 transition-all w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>

        {/* GST info */}
        <div className="flex items-center gap-2 text-xs text-surface-400">
          <Info className="h-3.5 w-3.5" />
          GST @ 18% applied at order submission
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
        <label className="block text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Any special instructions or notes for this order…"
          className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-none"
        />
      </div>

      {/* Order summary + submit */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          {/* Totals */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-8 text-sm">
              <span className="text-surface-500">Subtotal</span>
              <span className="font-medium text-surface-900 dark:text-surface-100 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-8 text-sm">
              <span className="text-surface-500">GST (18%)</span>
              <span className="font-medium text-surface-900 dark:text-surface-100 tabular-nums">{formatCurrency(gst)}</span>
            </div>
            <div className="flex items-center justify-between gap-8 border-t border-surface-100 dark:border-surface-800 pt-1.5">
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">Grand Total</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400 tabular-nums">{formatCurrency(grand)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose || (() => navigate(-1))}
              className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              id="submit-order-btn"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md shadow-primary-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {submitting ? 'Submitting…' : 'Submit Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
