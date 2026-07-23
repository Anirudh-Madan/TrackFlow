import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Loader2, Eye, CheckCircle2, X, Printer,
  FileText, Search, ChevronDown, User, Calendar, Package,
} from 'lucide-react'
import { getProducts } from '../../../api/endpoints/products.api'
import { createOrder } from '../../../api/endpoints/orders.api'
import { getVendors } from '../../../api/endpoints/parties.api'
import { cn } from '../../../utils/cn'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null || val === '') return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtNum(val) {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function genChallanNo() {
  const d = new Date()
  return `CHN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

// ─── Field component ─────────────────────────────────────────────────────────
function Field({ label, required, children, className = '' }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-semibold text-surface-500 dark:text-surface-400">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = (extra = '') =>
  cn(
    'w-full text-sm px-3.5 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl',
    'bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors',
    extra,
  )

const roInputCls = cn(
  'w-full text-sm px-3.5 py-2.5 border border-surface-100 dark:border-surface-800 rounded-xl',
  'bg-surface-50 dark:bg-surface-800/50 text-surface-400 dark:text-surface-500 cursor-not-allowed',
)

function VendorDropdown({ vendors, value, onChange, placeholder = 'Select supplier' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => (
    vendors
      .filter(v => (
        (v.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.gst || '').toLowerCase().includes(search.toLowerCase())
      ))
      .slice(0, 40)
  ), [vendors, search])

  const selected = value ? vendors.find(v => String(v.id) === String(value)) : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors',
          'bg-white dark:bg-surface-800',
          open
            ? 'border-primary-400 ring-2 ring-primary-500/20'
            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
        )}
      >
        {selected ? (
          <div className="min-w-0">
            <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{selected.company_name}</p>
            {selected.gst && <p className="text-[11px] text-surface-400 font-mono">{selected.gst}</p>}
          </div>
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
                onChange={event => setSearch(event.target.value)}
                placeholder="Search supplier"
                className="bg-transparent text-xs outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-surface-50 dark:divide-surface-800">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              className="w-full px-3.5 py-2.5 text-left text-sm text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors italic"
            >
              Clear supplier
            </button>
            {filtered.map(vendor => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => { onChange(String(vendor.id)); setOpen(false); setSearch('') }}
                className={cn(
                  'w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors',
                  String(value) === String(vendor.id) && 'bg-primary-50 dark:bg-primary-900/20',
                )}
              >
                <p className="font-medium text-surface-900 dark:text-surface-100">{vendor.company_name}</p>
                {vendor.gst && <p className="text-xs text-surface-400 font-mono">{vendor.gst}</p>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-4 text-xs text-surface-400 text-center">No suppliers found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function printChallan(data, items, user) {
  const printableItems = items.filter(it => it.product_id || it.part_number)
  const subtotal = printableItems.reduce((acc, it) => acc + fmtNum(it.sell_price) * fmtNum(it.qty), 0)
  const gst = subtotal * 0.18
  const grand = subtotal + gst
  const win = window.open('', '_blank', 'width=920,height=720')

  if (!win) {
    toast.error('Please allow popups to print the challan')
    return
  }

  const rows = printableItems.map((it, i) => {
    const total = fmtNum(it.sell_price) * fmtNum(it.qty)
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${it.part_number || '-'}</td>
        <td>${it.description || '-'}</td>
        <td class="num">${fmt(it.dl_price)}</td>
        <td class="num">${it.qty}</td>
        <td class="num">${fmt(it.sell_price)}</td>
        <td class="num">${fmt(total)}</td>
      </tr>
    `
  }).join('')

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Challan ${data.challan_number}</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:28px;font-size:12px}
          .header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:18px}
          h1{font-size:22px;margin:0 0 4px}
          .muted{color:#6b7280}
          .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
          .label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:3px}
          .value{font-size:13px;font-weight:700}
          table{width:100%;border-collapse:collapse;margin-top:8px}
          th{background:#f3f4f6;text-align:left;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#4b5563}
          th,td{border-bottom:1px solid #e5e7eb;padding:9px 10px}
          .num{text-align:right}
          .totals{margin-left:auto;width:250px;margin-top:18px}
          .total-row{display:flex;justify-content:space-between;padding:5px 0}
          .grand{font-size:15px;font-weight:700;border-top:2px solid #111827;margin-top:4px;padding-top:8px}
          .footer{margin-top:36px;border-top:1px solid #e5e7eb;padding-top:12px;color:#6b7280;text-align:center;font-size:10px}
          @media print{body{padding:16px}}
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Delivery Challan</h1>
            <div class="muted">TrackFlow</div>
          </div>
          <div style="text-align:right">
            <div class="label">Challan No.</div>
            <div class="value">${data.challan_number}</div>
            <div class="label" style="margin-top:8px">Date</div>
            <div class="value">${data.order_date ? new Date(data.order_date + 'T00:00:00').toLocaleDateString('en-IN') : '-'}</div>
          </div>
        </div>
        <div class="grid">
          <div><div class="label">Supplier</div><div class="value">${data.supplier || '-'}</div></div>
          <div><div class="label">Bill Number</div><div class="value">${data.bill_number || '-'}</div></div>
          <div><div class="label">Customer Name</div><div class="value">${data.customer_name || '-'}</div></div>
          <div><div class="label">Customer Company</div><div class="value">${data.customer_company || '-'}</div></div>
          <div><div class="label">Sales Manager</div><div class="value">${user?.name || '-'}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Part No.</th><th>Description</th><th class="num">DL Price</th><th class="num">Qty</th><th class="num">Sell Price</th><th class="num">Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div class="total-row"><span>Subtotal</span><strong>${fmt(subtotal)}</strong></div>
          <div class="total-row"><span>GST (18%)</span><strong>${fmt(gst)}</strong></div>
          <div class="total-row grand"><span>Grand Total</span><span>${fmt(grand)}</span></div>
        </div>
        <div class="footer">Generated by TrackFlow on ${new Date().toLocaleString('en-IN')}</div>
      </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 300)
}

// ─── Product Search Dropdown ──────────────────────────────────────────────────
function ProductDropdown({ products, value, onSelect }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    products.filter(p =>
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 30),
    [products, search]
  )

  const selected = value ? products.find(p => p.id === value) : null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors',
          'bg-white dark:bg-surface-800',
          open
            ? 'border-primary-400 ring-2 ring-primary-500/20'
            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
        )}
      >
        {selected ? (
          <div className="min-w-0 text-left">
            <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{selected.name}</p>
            <p className="text-[11px] text-surface-400 font-mono">{selected.sku}</p>
          </div>
        ) : (
          <span className="text-surface-400">Search product…</span>
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
                placeholder="Search by name or SKU…"
                className="bg-transparent text-xs outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-surface-50 dark:divide-surface-800">
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-xs text-surface-400 text-center">No products found</p>
            ) : filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); setSearch('') }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-surface-900 dark:text-surface-100 truncate">{p.name}</p>
                  <p className="text-[11px] text-surface-400 font-mono">{p.sku}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-mono text-surface-700 dark:text-surface-300">{fmt(p.dealer_landing_price)}</p>
                  <p className="text-[10px] text-surface-400">DL Price</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, index, products, onChange, onRemove }) {
  const dl = fmtNum(item.dl_price)
  const sp = item.sell_price !== '' && item.sell_price != null ? fmtNum(item.sell_price) : dl
  const lineTotal = sp * fmtNum(item.qty)

  let marginBadge = null
  if (dl > 0 && sp > 0) {
    const pct = ((sp - dl) / dl) * 100
    const formatted = Math.abs(pct).toFixed(1) + '%'
    if (pct > 0) {
      marginBadge = (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800 shrink-0" title={`+₹${(sp - dl).toFixed(2)} margin above DL price`}>
          +{formatted}
        </span>
      )
    } else if (pct < 0) {
      marginBadge = (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-800 shrink-0" title={`-₹${(dl - sp).toFixed(2)} discount below DL price`}>
          -{formatted}
        </span>
      )
    } else {
      marginBadge = (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-100 dark:bg-surface-800 text-surface-500 border border-surface-200 dark:border-surface-700 shrink-0">
          0%
        </span>
      )
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1.5fr_1fr_auto] gap-3 p-4 pr-10 lg:pr-4 lg:p-4 rounded-2xl border border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 relative items-center">
      {/* Product / Part search */}
      <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-1">
        <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">Product</label>
        <ProductDropdown
          products={products}
          value={item.product_id}
          onSelect={p => {
            const dlVal = p.dealer_landing_price != null ? String(p.dealer_landing_price) : (p.selling_price != null ? String(p.selling_price) : '0')
            const spVal = p.selling_price != null ? String(p.selling_price) : dlVal
            onChange(index, {
              product_id: p.id,
              product_name: p.name,
              part_number: item.part_number || p.sku || '',
              description: item.description || p.name || '',
              dl_price: dlVal,
              sell_price: spVal || dlVal,
            })
          }}
        />
      </div>

      {/* Part Number (Auto-filled from Catalog) */}
      <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-1">
        <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">
          Part No. <span className="text-danger-500">*</span>
        </label>
        <input
          type="text"
          readOnly
          disabled
          value={item.part_number}
          placeholder="Select Catalog Product"
          className={roInputCls + ' text-xs font-mono'}
          title="Auto-filled from catalog product"
        />
      </div>

      {/* Description (Auto-filled from Catalog) */}
      <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-1">
        <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">Description</label>
        <input
          type="text"
          readOnly
          disabled
          value={item.description}
          placeholder="Catalog product description"
          className={roInputCls + ' text-xs'}
          title="Auto-filled from catalog product"
        />
      </div>

      {/* DL Price (NON-EDITABLE) */}
      <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-1">
        <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">DL Price</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-surface-400">₹</span>
          <input
            type="text"
            disabled
            readOnly
            value={item.dl_price !== '' && item.dl_price != null ? Number(item.dl_price).toFixed(2) : '0.00'}
            placeholder="0.00"
            className={roInputCls + ' pl-6 text-xs font-mono'}
            title="DL Price (non-editable)"
          />
        </div>
      </div>

      {/* Qty (Editable) */}
      <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-1">
        <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">Qty <span className="text-danger-500">*</span></label>
        <input
          type="number"
          min="1"
          value={item.qty}
          onChange={e => onChange(index, { qty: e.target.value })}
          placeholder="1"
          className={inputCls('text-xs')}
        />
      </div>

      {/* Selling Price per Unit (EDITABLE + MARGIN BOX) */}
      <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">Sell Price/Unit</label>
          <div className="lg:hidden">{marginBadge}</div>
        </div>
        <div className="relative flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-surface-400">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.sell_price}
              onChange={e => onChange(index, { sell_price: e.target.value })}
              placeholder="0.00"
              className={inputCls('pl-6 text-xs font-mono font-medium')}
            />
          </div>
          <div className="hidden lg:block shrink-0">
            {marginBadge}
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-1">
        <label className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide lg:hidden">Total</label>
        <div className={cn(
          'px-3.5 py-2.5 rounded-xl border text-xs font-semibold font-mono h-[38px] flex items-center',
          lineTotal > 0
            ? 'border-success-100 dark:border-success-900/30 bg-success-50 dark:bg-success-900/10 text-success-700 dark:text-success-400'
            : 'border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-surface-400',
        )}>
          {lineTotal > 0 ? fmt(lineTotal) : '—'}
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-3 right-3 lg:static lg:self-end lg:mb-1 p-1.5 rounded-lg text-surface-300 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-all shrink-0"
        aria-label="Remove row"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ open, onClose, onConfirm, submitting, data, items, user }) {
  if (!open) return null

  const subtotal = items.reduce((acc, it) => acc + fmtNum(it.sell_price) * fmtNum(it.qty), 0)
  const gst = subtotal * 0.18
  const grand = subtotal + gst

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FileText className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-surface-100">Challan Preview</h2>
              <p className="text-xs text-surface-400">Review before submitting</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Challan header info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-950/20 dark:to-indigo-950/10 border border-primary-100 dark:border-primary-900/30">
            <div>
              <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">Challan No.</p>
              <p className="text-sm font-bold text-primary-700 dark:text-primary-300 font-mono">{data.challan_number}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                {data.order_date ? new Date(data.order_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">Sales Manager</p>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{user?.name || '—'}</p>
            </div>
            {data.supplier && (
              <div>
                <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">Supplier</p>
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{data.supplier}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">Customer Name</p>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{data.customer_name || '—'}</p>
            </div>
            {data.customer_company && (
              <div>
                <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-0.5">Customer Company</p>
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{data.customer_company}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-100 dark:border-surface-800">
                  <th className="text-left px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">Part No.</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">DL Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">Sell Price/Unit</th>
                  <th className="text-right px-4 py-3 font-semibold text-surface-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {items.filter(it => it.product_id || it.part_number).map((it, i) => {
                  const total = fmtNum(it.sell_price) * fmtNum(it.qty)
                  return (
                    <tr key={i} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 text-surface-400">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-medium text-surface-700 dark:text-surface-300">{it.part_number || '—'}</td>
                      <td className="px-4 py-3 text-surface-700 dark:text-surface-300 max-w-[200px] truncate">{it.description || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-surface-600 dark:text-surface-400">{fmt(it.dl_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-900 dark:text-surface-100">{it.qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-surface-700 dark:text-surface-300">{fmt(it.sell_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-surface-900 dark:text-surface-100">{fmt(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Subtotal</span>
                <span className="font-medium font-mono text-surface-900 dark:text-surface-100">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">GST (18%)</span>
                <span className="font-medium font-mono text-surface-900 dark:text-surface-100">{fmt(gst)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-surface-200 dark:border-surface-700">
                <span className="font-bold text-surface-900 dark:text-surface-100">Grand Total</span>
                <span className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400">{fmt(grand)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-b-2xl">
          <button
            type="button"
            onClick={() => printChallan(data, items, user)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print Challan
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            id="confirm-submit-challan-btn"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-lg shadow-primary-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const BLANK_ITEM = () => ({
  product_id: null,
  product_name: '',
  part_number: '',
  description: '',
  dl_price: '',
  qty: '1',
  sell_price: '',
})

export default function OrderNewPage({ isModal = false, onClose, onSuccess, preselectedPartyId }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Challan header state
  const [challanNumber] = useState(genChallanNo)
  const [orderDate, setOrderDate] = useState(todayStr)
  const [supplier, setSupplier] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [notes, setNotes] = useState('')

  // Item rows
  const [items, setItems] = useState([BLANK_ITEM()])

  // Preview / submit
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load products and suppliers
  useEffect(() => {
    getProducts()
      .then(res => {
        if (res?.success) setProducts(res.data ?? [])
      })
      .catch(() => toast.error('Could not load products'))
      .finally(() => setLoadingProducts(false))

    getVendors()
      .then(res => {
        if (res?.success) setVendors(res.data ?? [])
      })
      .catch(() => {})
  }, [])

  const handleSupplierSelect = useCallback((value) => {
    setSupplierId(value)
    const selectedVendor = vendors.find(v => String(v.id) === String(value))
    setSupplier(selectedVendor?.company_name || '')
  }, [vendors])

  const handleItemChange = useCallback((index, patch) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }, [])

  const handleAddRow = () => setItems(prev => [...prev, BLANK_ITEM()])

  const handleRemoveRow = (index) => {
    setItems(prev => prev.length === 1 ? [BLANK_ITEM()] : prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((acc, it) => acc + (it.sell_price !== '' && it.sell_price != null ? fmtNum(it.sell_price) : fmtNum(it.dl_price)) * fmtNum(it.qty), 0)
  const gst = subtotal * 0.18
  const grand = subtotal + gst

  // Validate and open preview
  const handlePreview = () => {
    if (!customerName.trim()) {
      toast.error('Customer Name is required')
      return
    }
    const validItems = items.filter(it => (it.product_id || it.part_number?.trim()) && Number(it.qty) > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one item with a Part Number and Qty')
      return
    }
    setShowPreview(true)
  }

  // Actual submit
  const handleSubmit = async () => {
    const validItems = items.filter(it => (it.product_id || it.part_number?.trim()) && Number(it.qty) > 0)
    setSubmitting(true)
    try {
      const res = await createOrder({
        supplier: supplier || undefined,
        challan_number: challanNumber,
        order_date: orderDate,
        customer_name: customerName,
        customer_company: customerCompany || undefined,
        party_id: undefined,
        notes: notes || undefined,
        items: validItems.map(it => ({
          product_id: it.product_id,
          part_number: it.part_number || undefined,
          description: it.description || undefined,
          dl_price: it.dl_price !== '' ? parseFloat(it.dl_price) : undefined,
          quantity: parseInt(it.qty),
          sm_price: parseFloat(it.sell_price) || parseFloat(it.dl_price) || 0,
        })),
      })

      if (res?.success) {
        toast.success(`Challan ${res.data?.challan_number || challanNumber} created!`)
        setShowPreview(false)
        if (onSuccess) onSuccess()
        else navigate('/sm/orders')
      } else {
        toast.error(res?.error || 'Failed to create challan')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit challan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleSubmit}
        submitting={submitting}
        data={{ challan_number: challanNumber, order_date: orderDate, supplier, customer_name: customerName, customer_company: customerCompany }}
        items={items}
        user={user}
      />

      <div className="space-y-0">
        {/* ── Page title ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">New Challan</h1>
            <p className="text-xs text-surface-400 mt-0.5">Create a delivery challan for your customer</p>
          </div>
        </div>

        {/* ── Challan Details Card ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-5 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">1</span>
            </div>
            <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100">Challan Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Supplier */}
            <Field label="Supplier">
              <VendorDropdown
                vendors={vendors}
                value={supplierId}
                onChange={handleSupplierSelect}
                placeholder="Select supplier"
              />
            </Field>

            {/* Challan Number (auto) */}
            <Field label="Challan Number">
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={challanNumber}
                  className={roInputCls + ' font-mono'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
              </div>
            </Field>

            {/* Date */}
            <Field label="Date" required>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className={inputCls('pl-9')}
                />
              </div>
            </Field>

            {/* Customer Name */}
            <Field label="Customer Name" required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className={inputCls('pl-9')}
                />
              </div>
            </Field>

            {/* Customer Company */}
            <Field label="Customer Company">
              <input
                type="text"
                value={customerCompany}
                onChange={e => setCustomerCompany(e.target.value)}
                placeholder="e.g. Vertex Builders Ltd."
                className={inputCls()}
              />
            </Field>

            {/* Sales Manager (read-only) */}
            <Field label="Sales Manager">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  disabled
                  value={user?.name || 'Sales Manager'}
                  className={roInputCls + ' pl-9'}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* ── Items Card ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">2</span>
              </div>
              <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100">Line Items</h2>
            </div>
            <span className="text-xs text-surface-400">{items.filter(it => it.part_number || it.product_id).length} item(s)</span>
          </div>

          {/* Column labels (desktop) */}
          <div className="hidden lg:grid gap-3 px-4 mb-2"
            style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr auto' }}
          >
            {['Product', 'Part No. *', 'Description', 'DL Price', 'Qty *', 'Sell Price/Unit', 'Total'].map(h => (
              <div key={h} className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide">{h}</div>
            ))}
            <div />
          </div>

          {loadingProducts ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-surface-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading products…
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <ItemRow
                  key={i}
                  index={i}
                  item={item}
                  products={products}
                  onChange={handleItemChange}
                  onRemove={handleRemoveRow}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddRow}
            className="mt-4 flex items-center gap-2 w-full px-4 py-3 rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-sm text-surface-400 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-600 dark:hover:text-primary-400 transition-all justify-center"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </button>
        </div>

        {/* ── Notes ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 mb-4">
          <label className="block text-sm font-bold text-surface-900 dark:text-surface-100 mb-3">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special instructions or delivery notes…"
            className={inputCls('resize-none')}
          />
        </div>

        {/* ── Summary + Actions ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5">
            {/* Totals */}
            <div className="space-y-2 min-w-[220px]">
              <div className="flex justify-between text-sm gap-8">
                <span className="text-surface-500">Subtotal</span>
                <span className="font-mono font-medium text-surface-900 dark:text-surface-100">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm gap-8">
                <span className="text-surface-500">GST (18%)</span>
                <span className="font-mono font-medium text-surface-900 dark:text-surface-100">{fmt(gst)}</span>
              </div>
              <div className="flex justify-between gap-8 pt-2 border-t border-surface-100 dark:border-surface-800">
                <span className="font-bold text-surface-900 dark:text-surface-100">Grand Total</span>
                <span className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400">{fmt(grand)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {!isModal && (
                <button
                  type="button"
                  onClick={onClose || (() => navigate(-1))}
                  className="px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                id="preview-challan-btn"
                onClick={handlePreview}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-lg shadow-primary-500/25 transition-all"
              >
                <Eye className="h-4 w-4" />
                Preview Challan
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
