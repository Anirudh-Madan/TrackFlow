import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ShoppingBag, Plus, Pencil, Trash2, RotateCcw, Eye, Search, Filter,
  AlertCircle, CheckCircle, X, Loader2, Shield, Calendar,
  ExternalLink, Lock, Info, ArrowLeft, Hash, Download, Printer
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder,
  deletePurchaseOrder, returnPurchaseOrder
} from '../../../api/endpoints/purchaseOrders.api'
import { useAuthStore } from '../../../store/authStore'
import TablePagination from '../../../components/data/TablePagination'

const STATUS_CONFIG = {
  SUBMITTED:  { label: 'Submitted',  color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400' },
  DRAFT:      { label: 'Draft',      color: 'bg-surface-100 text-surface-600 border-surface-300 dark:bg-surface-700 dark:text-surface-300' },
  RETURNED:   { label: 'Returned',   color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400' },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>{cfg.label}</span>
}

function getPOHTML(po) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Purchase Order — ${po.po_number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; font-size: 13px; margin: 0; padding: 40px; color: #0f172a; }
        .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .company-info h1 { font-size: 22px; font-weight: 700; color: #1e3a8a; margin: 0 0 8px 0; }
        .po-number-box { border: 1px solid #1e3a8a; border-radius: 6px; padding: 6px 14px; display: inline-block; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th { text-align: left; font-size: 10px; color: #9ca3af; text-transform: uppercase; padding-bottom: 12px; }
        td { padding: 12px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="company-info">
          <h1>SHREE RAMDEV MOTORS</h1>
          <p>Purchase Order ${po.po_number}</p>
        </div>
        <div>Date: ${new Date(po.po_date).toLocaleDateString('en-IN')}</div>
      </div>
      <div style="margin: 20px 0;">
        <p><strong>Vendor:</strong> ${po.vendor?.company_name || po.vendor_name || '—'}</p>
        <p><strong>Bill No:</strong> ${po.bill_number || '—'}</p>
      </div>
      <table>
        <thead>
          <tr><th>Part No</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr>
        </thead>
        <tbody>
          ${(po.items || []).map(i => `
            <tr>
              <td>${i.part_number || i.product?.sku || '—'}</td>
              <td>${i.description || i.product?.name || '—'}</td>
              <td class="text-right">${i.quantity}</td>
              <td class="text-right">₹${parseFloat(i.unit_price || 0).toFixed(2)}</td>
              <td class="text-right">₹${parseFloat(i.total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align: right;"><h3>Total: ₹${parseFloat(po.total || 0).toFixed(2)}</h3></div>
    </body>
    </html>
  `
}

function generatePOPDF(po) {
  const html = getPOHTML(po)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function downloadPOHTML(po) {
  const html = getPOHTML(po)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `purchase_order_${po.po_number || po.id}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('PO HTML downloaded!')
}

function PinModal({ open, onVerify, onClose, loading }) {
  const [pin, setPin] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { if (open) { setPin(''); setTimeout(() => inputRef.current?.focus(), 100) } }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Admin PIN Required" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 border border-primary-200">
          <Shield className="h-5 w-5 text-primary-600 shrink-0" />
          <p className="text-xs text-primary-700">Enter your admin PIN to proceed.</p>
        </div>
        <input ref={inputRef} type="password" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && pin.length >= 4) onVerify(pin) }}
          className="input-base text-center tracking-widest text-lg" placeholder="● ● ● ●" id="po-pin-input" />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={() => onVerify(pin)} loading={loading} disabled={pin.length < 4} id="po-pin-submit">Verify PIN</Button>
        </div>
      </div>
    </Modal>
  )
}

const EMPTY_ITEM = { part_number: '', description: '', quantity: 1, unit_price: '' }

export default function AdminPOPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin'

  const [pos, setPos]             = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')

  const [showCreate, setShowCreate]   = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [viewPO, setViewPO]           = useState(null)
  const [editPO, setEditPO]           = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinLoading, setPinLoading]     = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const [form, setForm] = useState({ vendor_name: '', po_date: new Date().toISOString().split('T')[0], notes: '', bill_number: '', items: [{ ...EMPTY_ITEM }] })
  const [editForm, setEditForm]   = useState({ reason: '', notes: '', vendor_name: '', bill_number: '' })
  const [returnForm, setReturnForm] = useState({ reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchPOs = useCallback(async () => {
    setLoading(true)
    try { const res = await getPurchaseOrders(); if (res.success) setPos(res.data) }
    catch { toast.error('Failed to load purchase orders') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPOs() }, [fetchPOs])

  const filtered = useMemo(() => {
    return pos.filter(p => {
      const s = search.toLowerCase()
      const match = (p.po_number || '').toLowerCase().includes(s) || (p.vendor_name || '').toLowerCase().includes(s) || (p.bill_number || '').toLowerCase().includes(s)
      const status = filterStatus === 'all' || p.status === filterStatus
      return match && status
    })
  }, [pos, search, filterStatus])

  const [page, setPage]           = useState(1)
  useEffect(() => { setPage(1) }, [search, filterStatus])

  const paginatedPOs = useMemo(() => {
    return filtered.slice((page - 1) * 50, page * 50)
  }, [filtered, page])

  const stats = useMemo(() => {
    return {
      total:     pos.length,
      submitted: pos.filter(p => p.status === 'SUBMITTED').length,
      draft:     pos.filter(p => p.status === 'DRAFT').length,
      returned:  pos.filter(p => p.status === 'RETURNED').length,
    }
  }, [pos])

  const requirePin = (action) => { setPendingAction(() => action); setPinModalOpen(true) }

  const handlePinVerified = async (pin) => {
    if (!pendingAction) return
    setPinLoading(true)
    try { await pendingAction(pin); setPinModalOpen(false); setPendingAction(null) }
    catch (err) { toast.error(err.response?.data?.error || err.message || 'PIN verification failed') }
    finally { setPinLoading(false) }
  }

  const updateItem = (index, field, value) => {
    setForm(f => { const items = [...f.items]; items[index] = { ...items[index], [field]: value }; return { ...f, items } })
  }

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unit_price || 0)), 0)

  const handlePreview = (e) => {
    e.preventDefault()
    if (!form.bill_number.trim()) { toast.error('Bill number is mandatory'); return }
    if (form.items.some(i => !i.part_number.trim())) { toast.error('All items must have a part number'); return }
    setShowPreview(true)
  }

  const handleSubmitCreate = () => {
    requirePin(async (pin) => {
      setSubmitting(true)
      try {
        const body = {
          pin,
          vendor_name:  form.vendor_name.trim() || undefined,
          po_date:      form.po_date,
          notes:        form.notes.trim() || undefined,
          bill_number:  form.bill_number.trim(),
          items: form.items.map(i => ({ part_number: i.part_number.trim().toUpperCase(), description: i.description, quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) || 0 })),
        }
        const res = await createPurchaseOrder(body)
        if (res.success) {
          toast.success(`PO ${res.data.po_number} created!`)
          setShowPreview(false); setShowCreate(false)
          fetchPOs()
        } else { toast.error(res.error || 'Failed to create PO') }
      } catch (err) { toast.error(err.response?.data?.error || 'Failed to create PO'); throw err }
      finally { setSubmitting(false) }
    })
  }

  const handleEdit = () => {
    if (!editForm.reason.trim()) { toast.error('Edit reason is required'); return }
    requirePin(async (pin) => {
      const res = await updatePurchaseOrder(editPO.id, { pin, ...editForm })
      if (res.success) { toast.success('PO updated'); setEditPO(null); fetchPOs() }
      else { toast.error(res.error || 'Failed to update'); throw new Error(res.error) }
    })
  }

  const handleDelete = (po) => {
    requirePin(async (pin) => {
      const res = await deletePurchaseOrder(po.id, { pin })
      if (res.success) { toast.success('PO deleted'); fetchPOs() }
      else { toast.error(res.error || 'Cannot delete'); throw new Error(res.error) }
    })
  }

  const handleReturn = () => {
    if (!returnForm.reason.trim()) { toast.error('Return reason is required'); return }
    requirePin(async (pin) => {
      const res = await returnPurchaseOrder(returnTarget.id, { pin, reason: returnForm.reason })
      if (res.success) { toast.success('PO returned and stock restored'); setReturnTarget(null); fetchPOs() }
      else { toast.error(res.error || 'Failed to return'); throw new Error(res.error) }
    })
  }

  const exportPOsCSV = () => {
    if (filtered.length === 0) { toast.error('No POs to export'); return }
    const headers = ['PO Number', 'Bill No', 'Vendor', 'Date', 'Status', 'Total']
    const rows = filtered.map(p => [
      p.po_number,
      p.bill_number || 'NIL',
      p.vendor?.company_name || p.vendor_name || 'NIL',
      new Date(p.po_date).toLocaleDateString('en-IN'),
      p.status,
      parseFloat(p.total || 0).toFixed(2)
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.map(x => `"${x}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `purchase_orders_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Purchase Orders exported!')
  }

  if (!isAdmin) return (
    <div className="animate-in flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-10 w-10 text-danger-500" />
      <p className="text-sm text-surface-500">Admin access required.</p>
    </div>
  )

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary-600" /> Purchase Orders
          </h1>
          <p className="text-sm text-surface-500 mt-1">Create and manage purchase orders with PIN authorization.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={exportPOsCSV}>Export CSV</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { setForm({ vendor_name: '', po_date: new Date().toISOString().split('T')[0], notes: '', bill_number: '', items: [{ ...EMPTY_ITEM }] }); setShowCreate(true) }} id="create-po-btn">
            Create PO
          </Button>
        </div>
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total POs',  value: stats.total,     color: 'text-surface-900 dark:text-surface-50' },
          { label: 'Submitted',  value: stats.submitted, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Draft',      value: stats.draft,     color: 'text-surface-600 dark:text-surface-400' },
          { label: 'Returned',   value: stats.returned,  color: 'text-amber-600 dark:text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input type="text" placeholder="Search PO, vendor, bill no..." value={search} onChange={e => setSearch(e.target.value)} className="input-base pl-9 py-1.5" />
          </div>
          <div className="flex items-center gap-2">
            {['all', 'SUBMITTED', 'DRAFT', 'RETURNED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={cn('px-3 py-1 rounded-lg text-xs font-medium border',
                filterStatus === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600')}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" /></div>
          : filtered.length === 0 ? <div className="p-12 text-center text-surface-500 text-sm">No purchase orders found</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">PO NUMBER</th>
                    <th className="px-5 py-3.5">BILL NO</th>
                    <th className="px-5 py-3.5">VENDOR</th>
                    <th className="px-5 py-3.5">DATE</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5">TOTAL</th>
                    <th className="px-5 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm">
                  {paginatedPOs.map(p => {
                    const locked = !!(p.bill_number || p.is_returned)
                    return (
                      <tr key={p.id} className="table-row-hover">
                        <td className="px-5 py-4">
                          <div className="font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs">{p.po_number}</div>
                          {p.share_token && (
                            <a href={`/po/view/${p.share_token}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-xs text-surface-400 hover:text-primary-500 mt-0.5">
                              <ExternalLink className="h-3 w-3" /> Share link
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {p.bill_number ? <span className="flex items-center gap-1 text-xs font-semibold text-primary-700"><Lock className="h-3 w-3 text-warning-500" />{p.bill_number}</span> : <span className="text-surface-400 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">{p.vendor?.company_name || p.vendor_name || '—'}</td>
                        <td className="px-5 py-4 text-xs text-surface-500">{new Date(p.po_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-4 font-semibold text-xs">₹{parseFloat(p.total || 0).toFixed(2)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setViewPO(p)}>View</Button>
                            {!locked && <Button variant="ghost" size="sm" icon={Pencil} onClick={() => { setEditPO(p); setEditForm({ reason: '', notes: p.notes || '', vendor_name: p.vendor_name || '', bill_number: '' }) }}>Edit</Button>}
                            {!p.is_returned && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => { setReturnTarget(p); setReturnForm({ reason: '' }) }} className="text-amber-600">Return</Button>}
                            {!locked && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(p)} className="text-danger-500">Delete</Button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Purchase Order" size="xl">
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">Vendor / Supplier</label><input type="text" value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} className="input-base" placeholder="Vendor name" /></div>
            <div><label className="label-base">PO Date</label><input type="date" value={form.po_date} onChange={e => setForm(f => ({ ...f, po_date: e.target.value }))} className="input-base" /></div>
            <div><label className="label-base">Bill Number <span className="text-danger-500">*</span></label><input type="text" value={form.bill_number} onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))} className="input-base" placeholder="Bill no" required /></div>
            <div><label className="label-base">Notes</label><input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" placeholder="Optional notes" /></div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-surface-500 uppercase pb-1 border-b border-surface-200 dark:border-surface-700">
              <div className="col-span-3">Part No *</div><div className="col-span-3">Description</div><div className="col-span-2">Qty</div><div className="col-span-2">Unit Price</div><div className="col-span-1">Total</div><div className="col-span-1"></div>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3"><input type="text" value={item.part_number} onChange={e => updateItem(i, 'part_number', e.target.value.toUpperCase())} className="input-base text-xs" placeholder="Part No" /></div>
                <div className="col-span-3"><input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="input-base text-xs" placeholder="Description" /></div>
                <div className="col-span-2"><input type="number" value={item.quantity} min={1} onChange={e => updateItem(i, 'quantity', e.target.value)} className="input-base text-xs" /></div>
                <div className="col-span-2"><input type="number" value={item.unit_price} min={0} step={0.01} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="input-base text-xs" /></div>
                <div className="col-span-1 text-xs font-medium">{item.quantity && item.unit_price ? `₹${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(0)}` : '—'}</div>
                <div className="col-span-1 flex justify-center"><button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="text-danger-400 hover:text-danger-600"><X className="h-4 w-4" /></button></div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}>Add Item</Button>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-surface-200 dark:border-surface-700">
            <span className="text-sm text-surface-500">Total: <strong>₹{subtotal.toFixed(2)}</strong></span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Preview & Submit</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Preview Purchase Order" size="lg">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-surface-400">Vendor:</span><div className="font-medium">{form.vendor_name || '—'}</div></div>
            <div><span className="text-xs text-surface-400">Date:</span><div className="font-medium">{form.po_date}</div></div>
            <div><span className="text-xs text-surface-400">Bill No:</span><div className="font-semibold text-primary-700 dark:text-primary-400">{form.bill_number}</div></div>
            <div><span className="text-xs text-surface-400">Notes:</span><div className="font-medium">{form.notes || '—'}</div></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setShowPreview(false)}>Back to Edit</Button>
            <Button variant="primary" onClick={handleSubmitCreate} loading={submitting} id="submit-po-btn">Submit PO</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editPO} onClose={() => setEditPO(null)} title={`Edit PO: ${editPO?.po_number}`} size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-warning-50 text-xs text-warning-700">Setting a bill number will lock this PO from further edits.</div>
          {[{ label: 'Notes', field: 'notes' }, { label: 'Vendor Name', field: 'vendor_name' }, { label: 'Bill Number (locks PO)', field: 'bill_number' }, { label: 'Edit Reason *', field: 'reason' }].map(({ label, field }) => (
            <div key={field}><label className="label-base">{label}</label><input type="text" value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} className="input-base" placeholder={label} /></div>
          ))}
          <div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setEditPO(null)}>Cancel</Button><Button variant="primary" onClick={handleEdit}>Save Changes</Button></div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title={`Return PO: ${returnTarget?.po_number}`} size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 text-xs text-amber-700">Returning this PO will restore stock and lock it from edits/deletion.</div>
          <div><label className="label-base">Return Reason <span className="text-danger-500">*</span></label><textarea value={returnForm.reason} onChange={e => setReturnForm({ reason: e.target.value })} className="input-base min-h-[80px]" placeholder="Reason for return..." /></div>
          <div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancel</Button><Button variant="primary" onClick={handleReturn} className="bg-amber-600 hover:bg-amber-700">Confirm Return</Button></div>
        </div>
      </Modal>

      {/* View Modal with Items Table */}
      {viewPO && (
        <Modal open={!!viewPO} onClose={() => setViewPO(null)} title={`Purchase Order: ${viewPO.po_number}`} size="lg">
          <div className="space-y-5">
            {/* Header summary strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
              <div>
                <span className="text-xs text-surface-400 block">PO Number</span>
                <div className="text-lg font-bold font-mono text-primary-700 dark:text-primary-400">
                  {viewPO.po_number}
                </div>
              </div>
              <div>
                <span className="text-xs text-surface-400 block">PO Date</span>
                <div className="text-sm font-semibold">
                  {new Date(viewPO.po_date).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div>
                <span className="text-xs text-surface-400 block">Bill Number</span>
                <div className="text-sm font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-1">
                  {viewPO.bill_number ? <><Lock className="h-3 w-3 text-warning-500" />Locked: #{viewPO.bill_number}</> : '—'}
                </div>
              </div>
              <div>
                <StatusBadge status={viewPO.status} />
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs card p-4">
              <div>
                <span className="text-surface-400 block">Vendor / Supplier</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">{viewPO.vendor?.company_name || viewPO.vendor_name || '—'}</span>
              </div>
              <div>
                <span className="text-surface-400 block">Total Amount</span>
                <span className="font-bold text-primary-700 dark:text-primary-400">₹{parseFloat(viewPO.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {viewPO.notes && (
              <div className="text-xs p-3 rounded-lg bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700">
                <span className="font-semibold text-surface-500">Notes: </span>{viewPO.notes}
              </div>
            )}

            {viewPO.is_returned && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                <strong>Return Reason: </strong>{viewPO.return_reason || 'PO returned'}
              </div>
            )}

            {/* Line Items Table */}
            {(viewPO.items && viewPO.items.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Items List</h4>
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Part No</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                      {viewPO.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono text-primary-700 dark:text-primary-400">{item.part_number || item.product?.sku || '—'}</td>
                          <td className="p-2.5">{item.description || item.product?.name || '—'}</td>
                          <td className="p-2.5 text-right font-semibold">{item.quantity}</td>
                          <td className="p-2.5 text-right">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold">₹{parseFloat(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-700">
              <Button variant="secondary" onClick={() => setViewPO(null)}>Close</Button>
              <Button variant="secondary" icon={Download} onClick={() => downloadPOHTML(viewPO)}>Download HTML</Button>
              <Button icon={Printer} onClick={() => generatePOPDF(viewPO)}>Print PDF</Button>
            </div>
          </div>
        </Modal>
      )}

      <PinModal open={pinModalOpen} onVerify={handlePinVerified} onClose={() => { setPinModalOpen(false); setPendingAction(null) }} loading={pinLoading} />
    </div>
  )
}
