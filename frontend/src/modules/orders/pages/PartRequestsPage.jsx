import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ClipboardList, FilePlus, Search, ChevronDown, Plus, Trash2,
  Eye, Printer, CheckCircle2, Loader2, X, Package, Calendar,
  FileText, Filter, Building2, ShoppingBag,
} from 'lucide-react'
import { getVendors } from '../../../api/endpoints/parties.api'
import { getProducts, initializeProductStock } from '../../../api/endpoints/products.api'
import { getOrderItems, createPurchaseOrder, getPurchaseOrders } from '../../../api/endpoints/purchaseOrders.api'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import AdminPOPage from '../../inward/pages/AdminPOPage'
import TablePagination from '../../../components/data/TablePagination'
import { printPOPDF } from '../../../utils/poPrint'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (v == null || v === '') return '—'
  return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const fmtN = (v) => { const n = Number(v); return isNaN(n) ? 0 : n }
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const genPO  = () => `#${Math.floor(1000 + Math.random() * 9000)}`
const genINV = () => { const d = new Date(); return `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(10000+Math.random()*90000))}` }

// ─── Input cls ────────────────────────────────────────────────────────────────
const inputCls = (e='') => cn(
  'w-full text-sm px-3.5 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl',
  'bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors',
  e
)
const roInputCls = cn(
  'w-full text-sm px-3.5 py-2.5 border border-surface-100 dark:border-surface-800 rounded-xl',
  'bg-surface-50 dark:bg-surface-800/50 text-surface-400 cursor-not-allowed font-mono'
)

// ─── Vendor Dropdown ──────────────────────────────────────────────────────────
function VendorDropdown({ vendors, value, onChange, placeholder = 'Select supplier…' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() =>
    vendors.filter(v => (v.company_name || '').toLowerCase().includes(search.toLowerCase())),
    [vendors, search]
  )
  const selected = value ? vendors.find(v => v.id === value) : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors',
          'bg-white dark:bg-surface-800',
          open ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300',
        )}
      >
        {selected ? (
          <span className="text-surface-900 dark:text-surface-100 font-medium truncate">{selected.company_name}</span>
        ) : (
          <span className="text-surface-400">{placeholder}</span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 text-surface-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-50 dark:bg-surface-800">
              <Search className="h-3 w-3 text-surface-400 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor…"
                className="bg-transparent text-xs outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); setSearch('') }}
              className="w-full px-3.5 py-2.5 text-left text-sm text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors italic"
            >
              — No vendor / Clear
            </button>
            {filtered.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => { onChange(v.id); setOpen(false); setSearch('') }}
                className={cn(
                  'w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors',
                  value === v.id && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <p className="font-medium text-surface-900 dark:text-surface-100">{v.company_name}</p>
                <p className="text-xs text-surface-400 font-mono">{v.gst}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-4 text-xs text-surface-400 text-center">No vendors found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Print CSS injection ──────────────────────────────────────────────────────
function printDoc(html) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`
    <!DOCTYPE html><html><head>
    <title>Purchase Order</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;font-size:12px;color:#111;padding:24px}
      h1{font-size:20px;font-weight:700;margin-bottom:4px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:16px}
      .label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
      .value{font-size:13px;font-weight:600}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#f3f4f6;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #ddd}
      td{padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px}
      .totals{display:flex;justify-content:flex-end}
      .totals-box{width:240px}
      .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
      .grand{font-size:14px;font-weight:700;border-top:2px solid #222;padding-top:6px;margin-top:4px}
      .footer{margin-top:32px;border-top:1px solid #ddd;padding-top:12px;font-size:10px;color:#888;text-align:center}
      @media print{body{padding:12px}}
    </style>
    </head><body>${html}<div class="footer">Generated by TrackFlow — ${new Date().toLocaleString('en-IN')}</div></body></html>
  `)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}

// ─── PO Preview + Print Modal ─────────────────────────────────────────────────
function POPreviewModal({ open, onClose, onConfirm, submitting, data, items, vendors, user }) {
  if (!open) return null

  const vendor = data.vendor_id ? vendors.find(v => v.id === data.vendor_id) : null
  const subtotal = items.reduce((s, it) => s + fmtN(it.unit_price) * fmtN(it.qty), 0)

  const handlePrint = () => {
    printPOPDF({ ...data, vendor_name: vendor?.company_name, vendor_gst: vendor?.gst, items }, user)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-surface-100">Purchase Order Preview</h2>
              <p className="text-xs text-surface-400 font-mono">{data.po_number}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* PO Meta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-950/20 dark:to-indigo-950/10 border border-primary-100 dark:border-primary-900/30">
            <div>
              <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">Supplier</p>
              <p className="text-sm font-bold text-surface-800 dark:text-surface-200">{vendor?.company_name || '—'}</p>
              {vendor?.gst && <p className="text-xs text-surface-400 font-mono">{vendor.gst}</p>}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">PO Date</p>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                {data.po_date ? new Date(data.po_date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">Prepared By</p>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{user?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">PO Number</p>
              <p className="text-sm font-bold font-mono text-surface-800 dark:text-surface-200">{data.po_number}</p>
            </div>
            {data.notes && (
              <div className="col-span-full">
                <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">Notes</p>
                <p className="text-sm text-surface-700 dark:text-surface-300">{data.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-100 dark:border-surface-800">
                  {['#','Part No.','Description','Unit Price','Qty','Total'].map(h => (
                    <th key={h} className={cn('px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide', h==='#'?'text-left':h==='Description'?'text-left':'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {items.filter(it => it.part_number || it.description).map((it, i) => {
                  const tot = fmtN(it.unit_price) * fmtN(it.qty)
                  return (
                    <tr key={i} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-surface-400">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-medium text-surface-700 dark:text-surface-300">{it.part_number||'—'}</td>
                      <td className="px-4 py-3 text-surface-700 dark:text-surface-300 max-w-[200px] truncate">{it.description||'—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-surface-700 dark:text-surface-300">{fmt(it.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-900 dark:text-surface-100">{it.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-surface-900 dark:text-surface-100">{fmt(tot)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between pt-2 border-t border-surface-200 dark:border-surface-700">
                <span className="font-bold text-surface-900 dark:text-surface-100">Total</span>
                <span className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400">{fmt(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-b-2xl">
          <button type="button" onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
              Back to Edit
            </button>
            <button type="button" onClick={onConfirm} disabled={submitting} id="confirm-submit-po-btn"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-lg shadow-primary-500/25 disabled:opacity-60 transition-all"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting ? 'Submitting…' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PartNumberDropdown({ products, vendor, value, onSelect, onProductUpdated }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [addingId, setAddingId] = useState(null)
  const ref = useRef(null)

  const hasSupplier = Boolean(vendor && (vendor.company_name || vendor.name))
  const supplierName = vendor?.company_name || vendor?.name || ''

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const supplierProducts = useMemo(() => {
    if (!hasSupplier) return []
    const sLower = supplierName.trim().toLowerCase()
    let list = products.filter(p => p.supplier && p.supplier.trim().toLowerCase() === sLower)
    if (list.length === 0) list = products
    return list
  }, [products, supplierName, hasSupplier])

  const { inStockItems, priceListOnlyItems } = useMemo(() => {
    const q = search.trim().toLowerCase()

    let matched = supplierProducts
    if (q) {
      matched = matched.filter(p =>
        (p.sku || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q)
      )
    }

    const inStock = []
    const priceListOnly = []

    matched.forEach(p => {
      const isStock = p.is_in_stock || (p.available ?? p.on_hand ?? p.stock ?? p.quantity ?? 0) > 0
      if (isStock) {
        inStock.push(p)
      } else {
        priceListOnly.push(p)
      }
    })

    return {
      inStockItems: inStock.slice(0, 40),
      priceListOnlyItems: priceListOnly.slice(0, 20),
    }
  }, [supplierProducts, search])

  const handleAddToStock = async (e, product) => {
    e.stopPropagation()
    setAddingId(product.id)
    try {
      const res = await initializeProductStock(product.id)
      if (res?.success) {
        toast.success(`Item "${product.sku}" added to stock inventory (0 Qty)`)
        const updated = res.data || { ...product, is_in_stock: true, on_hand: 0, available: 0 }
        if (onProductUpdated) onProductUpdated(updated)
        onSelect(updated)
        setOpen(false)
        setSearch('')
      } else {
        toast.error(res?.error || 'Failed to add item to stock')
      }
    } catch (err) {
      console.error('Error adding item to stock:', err)
      toast.error(err.message || 'Failed to add item to stock')
    } finally {
      setAddingId(null)
    }
  }

  const selected = value ? products.find(p => p.id === value || p.sku === value) : null

  const handleToggle = () => {
    if (!hasSupplier) {
      toast.error('Please select a Supplier in Order Details first!')
      return
    }
    setOpen(o => !o)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors',
          'bg-white dark:bg-surface-800',
          !hasSupplier
            ? 'border-warning-300 dark:border-warning-900/50 bg-warning-50/30 dark:bg-warning-900/10 cursor-pointer'
            : open
              ? 'border-primary-400 ring-2 ring-primary-500/20'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
        )}
      >
        {!hasSupplier ? (
          <span className="text-warning-600 dark:text-warning-400 font-medium flex items-center gap-1.5 text-xs">
            <span className="shrink-0">⚠️</span> Select Supplier First
          </span>
        ) : selected ? (
          <div className="min-w-0 text-left">
            <p className="font-mono font-bold text-surface-900 dark:text-surface-100 truncate">{selected.sku}</p>
            <p className="text-[11px] text-surface-400 truncate">{selected.name}</p>
          </div>
        ) : (
          <span className="text-surface-400">
            Search {supplierName} Part No (In Stock)…
          </span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 text-surface-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && hasSupplier && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden min-w-[320px]">
          <div className="p-2 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-50 dark:bg-surface-800">
              <Search className="h-3 w-3 text-surface-400 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Filter ${supplierName} Part No (SKU)…`}
                className="bg-transparent text-xs outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400 font-mono"
              />
            </div>
          </div>
          <div className="px-3.5 py-1.5 bg-primary-50/70 dark:bg-primary-950/40 text-[11px] font-semibold text-primary-700 dark:text-primary-300 border-b border-primary-100/60 dark:border-primary-900/40 flex items-center justify-between">
            <span>Supplier: <strong>{supplierName}</strong></span>
            <span className="text-[10px] opacity-80">{inStockItems.length} in-stock part(s)</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-surface-50 dark:divide-surface-800">
            {inStockItems.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); setSearch('') }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-surface-900 dark:text-surface-100 truncate">{p.sku}</p>
                  <p className="text-[11px] text-surface-400 truncate">{p.name}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-mono text-surface-700 dark:text-surface-300">{fmt(p.dealer_landing_price || p.selling_price)}</p>
                  <p className="text-[10px] text-success-600 dark:text-success-400 font-medium">Stock: {p.available ?? p.on_hand ?? 0}</p>
                </div>
              </button>
            ))}

            {priceListOnlyItems.length > 0 && (
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900/50">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40">
                  ⚠️ Price List Items (Not Available in Stock)
                </div>
                {priceListOnlyItems.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={addingId === p.id}
                    onClick={(e) => handleAddToStock(e, p)}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-amber-100 dark:border-amber-900/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono font-bold text-surface-900 dark:text-surface-100 truncate">{p.sku}</p>
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">Price List</span>
                      </div>
                      <p className="text-[11px] text-surface-500 truncate">{p.name}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Not in stock (Click to add 0 Qty & select)</p>
                    </div>
                    <div className="shrink-0 text-xs px-2.5 py-1 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all flex items-center gap-1">
                      {addingId === p.id ? 'Adding…' : '➕ Add to Stock'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {inStockItems.length === 0 && priceListOnlyItems.length === 0 && (
              <p className="px-4 py-6 text-xs text-surface-400 text-center italic">No matching parts found for {supplierName}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Blank PO Item ────────────────────────────────────────────────────────────
const BLANK_ITEM = () => ({ part_number: '', description: '', unit_price: '', qty: '1', product_id: null })

// ─── Tab 2: New Purchase Order ────────────────────────────────────────────────
function NewPOTab({ vendors, products, onProductUpdated }) {
  const { user } = useAuthStore()
  const [vendorId, setVendorId]   = useState(null)
  const [poDate, setPoDate]       = useState(todayStr)
  const [notes, setNotes]         = useState('')
  const [items, setItems]         = useState([BLANK_ITEM()])
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  const [poNumber, setPoNumber]   = useState(genPO)

  const selectedVendor = useMemo(() => vendors.find(v => String(v.id) === String(vendorId)), [vendors, vendorId])

  const updateItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  const addItem    = () => {
    if (!vendorId) {
      toast.error('Please select a Supplier first!')
      return
    }
    setItems(prev => [...prev, BLANK_ITEM()])
  }
  const removeItem = (idx) => setItems(prev => prev.length === 1 ? [BLANK_ITEM()] : prev.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, it) => s + fmtN(it.unit_price) * fmtN(it.qty), 0)

  const handlePreview = () => {
    if (!vendorId) {
      toast.error('Supplier selection is compulsory to create a Purchase Order')
      return
    }
    const valid = items.filter(it => (it.product_id || it.part_number || it.description) && fmtN(it.qty) > 0)
    if (valid.length === 0) { toast.error('Add at least one item with a Part Number and Qty'); return }
    setShowPreview(true)
  }

  const handleSubmit = async () => {
    if (!vendorId) {
      toast.error('Supplier selection is compulsory to create a Purchase Order')
      return
    }
    const valid = items.filter(it => (it.product_id || it.part_number || it.description) && fmtN(it.qty) > 0)
    if (valid.length === 0) { toast.error('Add at least one item with a Part Number and Qty'); return }
    setSubmitting(true)
    try {
      const res = await createPurchaseOrder({
        vendor_id: vendorId,
        po_date: poDate,
        notes: notes || undefined,
        items: valid.map(it => ({
          product_id: it.product_id || undefined,
          part_number: it.part_number || undefined,
          description: it.description || undefined,
          unit_price: parseFloat(it.unit_price) || 0,
          quantity: parseInt(it.qty),
        })),
      })
      if (res?.success) {
        toast.success(`Purchase Order ${res.data?.po_number || poNumber} submitted!`)
        setShowPreview(false)
        setItems([BLANK_ITEM()])
        setNotes('')
        setVendorId(null)
        setPoNumber(genPO())
      } else {
        toast.error(res?.error || 'Failed to create PO')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <POPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleSubmit}
        submitting={submitting}
        data={{ po_number: poNumber, vendor_id: vendorId, po_date: poDate, notes }}
        items={items}
        vendors={vendors}
        user={user}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <FilePlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">New Purchase Order</h2>
            <p className="text-xs text-surface-400 mt-0.5">Create a PO for your supplier</p>
          </div>
        </div>

        {/* PO Details Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-5 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">1</span>
            </div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">Order Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Supplier (Compulsory) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-surface-500">Supplier <span className="text-danger-500">*</span></label>
              <VendorDropdown vendors={vendors} value={vendorId} onChange={setVendorId} placeholder="Select compulsory supplier…" />
            </div>

            {/* PO Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-surface-500">PO Date <span className="text-danger-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className={inputCls('pl-9')} />
              </div>
            </div>

            {/* PO Number */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-surface-500">PO Number</label>
              <input type="text" disabled value={poNumber} className={roInputCls} />
            </div>

            {/* Prepared By */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-surface-500">Prepared By</label>
              <input type="text" disabled value={user?.name || 'Sales Manager'} className={roInputCls + ' font-sans'} />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-surface-500 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Delivery instructions, terms, etc."
              className={inputCls('resize-none')}
            />
          </div>
        </div>

        {/* Items Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">2</span>
              </div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">Line Items</h3>
            </div>
            <span className="text-xs text-surface-400">{items.filter(it => it.part_number || it.description).length} item(s)</span>
          </div>

          {/* Column Headers */}
          <div className="hidden lg:grid gap-3 px-4 mb-2" style={{ gridTemplateColumns: '2.5fr 2fr 1fr 1fr 1.5fr auto' }}>
            {['Part No. (SKU) *', 'Description', 'Unit Price', 'Qty *', 'Total', ''].map(h => (
              <div key={h} className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide">{h}</div>
            ))}
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineTotal = fmtN(item.unit_price) * fmtN(item.qty)
              return (
                <div key={idx} className="grid gap-3 p-4 rounded-2xl border border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30"
                  style={{ gridTemplateColumns: '2.5fr 2fr 1fr 1fr 1.5fr auto' }}
                >
                  {/* Part Number Search Dropdown */}
                  <PartNumberDropdown
                    products={products}
                    vendor={selectedVendor}
                    value={item.product_id || item.part_number}
                    onProductUpdated={onProductUpdated}
                    onSelect={p => {
                      updateItem(idx, {
                        product_id: p.id,
                        part_number: p.sku || '',
                        description: p.name || '',
                        unit_price: String(p.dealer_landing_price || p.selling_price || ''),
                      })
                    }}
                  />
                  {/* Description (auto-filled) */}
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                    placeholder="Catalog description"
                    className={inputCls('text-xs')}
                  />
                  {/* Unit Price */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-surface-400">₹</span>
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={e => updateItem(idx, { unit_price: e.target.value })}
                      placeholder="0.00" className={inputCls('pl-6 text-xs font-mono')}
                    />
                  </div>
                  {/* Qty */}
                  <input type="number" min="1" value={item.qty}
                    onChange={e => updateItem(idx, { qty: e.target.value })}
                    placeholder="1" className={inputCls('text-xs')}
                  />
                  {/* Total */}
                  <div className={cn(
                    'px-3.5 py-2.5 rounded-xl border text-xs font-semibold font-mono flex items-center',
                    lineTotal > 0
                      ? 'border-primary-100 dark:border-primary-900/30 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400'
                      : 'border-surface-100 dark:border-surface-800 bg-surface-50 text-surface-400'
                  )}>
                    {lineTotal > 0 ? fmt(lineTotal) : '—'}
                  </div>
                  {/* Remove */}
                  <button type="button" onClick={() => removeItem(idx)}
                    className="self-center p-1.5 rounded-lg text-surface-300 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          <button type="button" onClick={addItem}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Line Item
          </button>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between p-5 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
          <div>
            <span className="text-xs text-surface-400 block mb-0.5">Total</span>
            <span className="text-xl font-bold font-mono text-surface-900 dark:text-surface-50">{fmt(subtotal)}</span>
          </div>
          <button type="button" onClick={handlePreview} id="po-tab-preview-btn"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-lg shadow-primary-500/25 transition-all"
          >
            <Eye className="h-4 w-4" /> Preview & Submit
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Tab 1: Ordered Items History ─────────────────────────────────────────────
function OrderHistoryTab({ vendors }) {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false)
  const [page, setPage]           = useState(1)

  useEffect(() => { setPage(1) }, [search, vendorFilter])

  useEffect(() => {
    getOrderItems()
      .then(res => { if (res?.success) setItems(res.data ?? []) })
      .catch(() => toast.error('Failed to load order items'))
      .finally(() => setLoading(false))
  }, [])

  // Collect all distinct supplier names from items
  const supplierNames = useMemo(() => {
    const set = new Set()
    items.forEach(it => {
      const s = it.order?.supplier
      if (s) set.add(s)
    })
    return Array.from(set).sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(it => {
      const matchSearch =
        (it.part_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (it.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (it.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (it.product?.sku || '').toLowerCase().includes(search.toLowerCase()) ||
        (it.order?.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (it.order?.customer_company || '').toLowerCase().includes(search.toLowerCase()) ||
        (it.order?.party?.company_name || '').toLowerCase().includes(search.toLowerCase())

      const supplier = it.order?.supplier || ''
      const matchVendor = vendorFilter === 'all' || supplier === vendorFilter

      return matchSearch && matchVendor
    })
  }, [items, search, vendorFilter])

  const selectedVendorLabel = vendorFilter === 'all' ? 'All Suppliers' : vendorFilter

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Ordered Items History</h2>
          <p className="text-xs text-surface-400 mt-0.5">All items from your submitted challans</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search part no., description, order…"
            className={inputCls('pl-10')}
          />
        </div>

        {/* Supplier filter dropdown */}
        <div className="relative w-full sm:w-56">
          <button type="button"
            onClick={() => setVendorFilterOpen(o => !o)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm transition-colors',
              'bg-white dark:bg-surface-800',
              vendorFilterOpen ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
            )}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-surface-400" />
              <span className={vendorFilter === 'all' ? 'text-surface-400' : 'text-surface-900 dark:text-surface-100 font-medium'}>
                {selectedVendorLabel}
              </span>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-surface-400 shrink-0 transition-transform', vendorFilterOpen && 'rotate-180')} />
          </button>
          {vendorFilterOpen && (
            <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl overflow-hidden">
              <div className="max-h-52 overflow-y-auto">
                <button type="button" onClick={() => { setVendorFilter('all'); setVendorFilterOpen(false) }}
                  className={cn('w-full px-4 py-2.5 text-left text-sm hover:bg-surface-50 dark:hover:bg-surface-800', vendorFilter === 'all' && 'bg-primary-50 dark:bg-primary-900/20 font-semibold')}
                >All Suppliers</button>
                {supplierNames.map(s => (
                  <button key={s} type="button" onClick={() => { setVendorFilter(s); setVendorFilterOpen(false) }}
                    className={cn('w-full px-4 py-2.5 text-left text-sm hover:bg-surface-50 dark:hover:bg-surface-800', vendorFilter === s && 'bg-primary-50 dark:bg-primary-900/20 font-semibold')}
                  >{s}</button>
                ))}
                {supplierNames.length === 0 && (
                  <p className="px-4 py-4 text-xs text-surface-400 text-center">No suppliers found in orders</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-surface-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading items…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-surface-400">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-100 dark:border-surface-800">
                  {['Order #','Date','Supplier','Part No.','Description','DL Price','Qty','Sell Price','Total','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {filtered.slice((page - 1) * 50, page * 50).map((it, i) => (
                  <tr key={it.id || i} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-surface-900 dark:text-surface-100 whitespace-nowrap">
                      {it.order?.order_number || '—'}
                      {it.order?.challan_number && <div className="text-[10px] text-surface-400">#{it.order.challan_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-surface-500 whitespace-nowrap">
                      {it.order?.order_date ? new Date(it.order.order_date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    </td>
                    <td className="px-4 py-3 text-surface-700 dark:text-surface-300 whitespace-nowrap">
                      {it.order?.supplier || <span className="text-surface-300 dark:text-surface-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-700 dark:text-surface-300 whitespace-nowrap">
                      {it.part_number || it.product?.sku || '—'}
                    </td>
                    <td className="px-4 py-3 text-surface-700 dark:text-surface-300 max-w-[180px] truncate">
                      {it.description || it.product?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-600 dark:text-surface-400 whitespace-nowrap">
                      {fmt(it.dl_price ?? it.product?.dealer_landing_price)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-surface-900 dark:text-surface-100 text-center">{it.quantity}</td>
                    <td className="px-4 py-3 font-mono text-surface-700 dark:text-surface-300 whitespace-nowrap">{fmt(it.sm_price)}</td>
                    <td className="px-4 py-3 font-semibold font-mono text-surface-900 dark:text-surface-100 whitespace-nowrap">{fmt(it.line_total)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        it.order?.status === 'DISPATCHED' ? 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400' :
                        it.order?.status === 'APPROVED'   ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400' :
                        it.order?.status === 'FLAGGED'    ? 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400' :
                        'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400'
                      )}>
                        {it.order?.status || '—'}
                      </span>
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
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PartRequestsPage() {
  const { user } = useAuthStore()
  const location = useLocation()
  const roleName = typeof user?.role === 'object' ? user.role.name : user?.role
  const isSM = roleName === 'sales_manager'
  const isAdmin = roleName === 'admin'

  const [activeTab, setActiveTab] = useState('new-po')
  const [vendors, setVendors]     = useState([])
  const [products, setProducts]   = useState([])

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    getVendors().then(r => { if (r?.success) setVendors(r.data ?? []) }).catch(() => {})
    getProducts().then(r => { if (r?.success) setProducts(r.data ?? []) }).catch(() => {})
  }, [])

  const tabs = isSM
    ? [{ id: 'history', label: 'Ordered Items', icon: ClipboardList }]
    : isAdmin
    ? [
        { id: 'new-po',  label: 'New Purchase Order', icon: FilePlus },
        { id: 'po-list', label: 'Purchase Orders List', icon: ShoppingBag },
        { id: 'history', label: 'Ordered Items', icon: ClipboardList },
      ]
    : [
        { id: 'new-po',  label: 'New Purchase Order', icon: FilePlus },
        { id: 'history', label: 'Ordered Items', icon: ClipboardList },
      ]

  const handleProductUpdated = useCallback((updatedProd) => {
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? { ...p, ...updatedProd, is_in_stock: true } : p))
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-0">
      {/* Tab bar */}
      {!isSM && (
        <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6 mb-0">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id}
                onClick={() => setActiveTab(t.id)}
                id={`${t.id}-tab-btn`}
                className={cn(
                  'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
                  activeTab === t.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="pt-6">
        {activeTab === 'history'
          ? <OrderHistoryTab vendors={vendors} />
          : activeTab === 'po-list'
          ? <AdminPOPage onSwitchToNewPO={() => setActiveTab('new-po')} />
          : <NewPOTab vendors={vendors} products={products} onProductUpdated={handleProductUpdated} />
        }
      </div>
    </div>
  )
}
