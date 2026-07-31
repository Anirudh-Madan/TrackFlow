import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ShoppingBag, Plus, Pencil, Trash2, RotateCcw, Eye, Search, Filter,
  AlertCircle, CheckCircle, X, Loader2, Shield, Calendar,
  ExternalLink, Lock, Info, ArrowLeft, Hash, Download, Printer, History
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder,
  deletePurchaseOrder, returnPurchaseOrder
} from '../../../api/endpoints/purchaseOrders.api'
import { getProducts } from '../../../api/endpoints/products.api'
import { getVendors } from '../../../api/endpoints/parties.api'
import { useAuthStore } from '../../../store/authStore'
import TablePagination from '../../../components/data/TablePagination'
import { printPOPDF, getPOHTML } from '../../../utils/poPrint'

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

function generatePOPDF(po) {
  printPOPDF(po)
}

function downloadPOHTML(po) {
  printPOPDF(po)
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

export default function AdminPOPage({ onSwitchToNewPO }) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin'

  const [pos, setPos]             = useState([])
  const [products, setProducts]   = useState([])
  const [vendors, setVendors]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')

  const [showCreate, setShowCreate]     = useState(false)
  const [showPreview, setShowPreview]   = useState(false)
  const [viewPO, setViewPO]             = useState(null)
  const [editPO, setEditPO]             = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)

  // PIN modal — pinFor tells us which action to run on confirm
  const [pinOpen, setPinOpen]       = useState(false)
  const [pinFor, setPinFor]         = useState(null) // 'create' | 'edit' | 'delete' | 'return'
  const [pinLoading, setPinLoading] = useState(false)

  const [form, setForm]           = useState({ vendor_name: '', po_date: new Date().toISOString().split('T')[0], notes: '', bill_number: '', items: [{ ...EMPTY_ITEM }] })
  const [editForm, setEditForm]   = useState({ reason: '', notes: '', vendor_name: '', bill_number: '' })
  const [returnForm, setReturnForm] = useState({ reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchPOs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPurchaseOrders()
      if (res.success) setPos(res.data)
      const pRes = await getProducts()
      if (pRes.success) setProducts(pRes.data)
      const vRes = await getVendors().catch(() => ({ success: false, data: [] }))
      if (vRes && vRes.success && Array.isArray(vRes.data)) setVendors(vRes.data)
    }
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

  const updateItem = (index, field, value) => {
    setForm(f => { const items = [...f.items]; items[index] = { ...items[index], [field]: value }; return { ...f, items } })
  }

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unit_price || 0)), 0)

  const handlePreview = (e) => {
    e.preventDefault()
    if (!form.vendor_name?.trim()) { toast.error('Vendor / Supplier is compulsory for Purchase Orders'); return }
    if (form.items.some(i => !i.part_number.trim())) { toast.error('All items must have a part number'); return }
    setShowPreview(true)
  }

  // PIN confirmation: open modal for a specific action
  const openPin = (action) => { setPinFor(action); setPinOpen(true) }
  const closePin = () => { setPinOpen(false); setPinFor(null) }

  const handlePinConfirmed = async (pin) => {
    setPinLoading(true)
    try {
      if (pinFor === 'create') {
        const body = {
          pin,
          vendor_name: form.vendor_name?.trim() || undefined,
          po_date:     form.po_date,
          notes:       form.notes?.trim() || undefined,
          bill_number: form.bill_number?.trim() || undefined,
          items: form.items.map(i => ({
            part_number: (i.part_number || '').trim().toUpperCase(),
            description: i.description,
            quantity:    parseInt(i.quantity) || 1,
            unit_price:  parseFloat(i.unit_price) || 0,
          })),
        }
        const res = await createPurchaseOrder(body)
        if (res.success) {
          toast.success(`PO ${res.data.po_number} created!`)
          closePin(); setShowPreview(false); setShowCreate(false); fetchPOs()
        } else { toast.error(res.error || 'Failed to create PO') }
      } else if (pinFor === 'edit') {
        const payload = {
          pin,
          reason: editForm.reason.trim(),
          vendor_name: editForm.vendor_name.trim(),
          notes: editForm.notes?.trim() || undefined,
          bill_number: editForm.bill_number?.trim() || undefined,
          items: (editForm.items || []).map(i => ({
            product_id: i.product_id ? parseInt(i.product_id) : undefined,
            part_number: i.part_number ? String(i.part_number).trim().toUpperCase() : undefined,
            description: i.description ? String(i.description).trim() : undefined,
            quantity: parseInt(i.quantity) || 1,
            unit_price: parseFloat(i.unit_price) || 0,
          })),
        }
        const res = await updatePurchaseOrder(editPO.id, payload)
        if (res.success) { toast.success('PO updated successfully!'); closePin(); setEditPO(null); fetchPOs() }
        else { toast.error(res.error || 'Failed to update') }
      } else if (pinFor === 'delete') {
        const res = await deletePurchaseOrder(deleteTarget.id, { pin })
        if (res.success) { toast.success('PO deleted'); closePin(); setDeleteTarget(null); fetchPOs() }
        else { toast.error(res.error || 'Cannot delete') }
      } else if (pinFor === 'return') {
        const res = await returnPurchaseOrder(returnTarget.id, {
          pin,
          reason: returnForm.reason.trim(),
          items: (returnForm.items || []).map(i => ({
            product_id: i.product_id,
            sku: i.sku,
            return_qty: parseInt(i.return_qty) || 0,
          }))
        })
        if (res.success) { toast.success('PO returned and stock adjusted'); closePin(); setReturnTarget(null); fetchPOs() }
        else { toast.error(res.error || 'Failed to return') }
      }
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setPinLoading(false)
    }
  }

  const handleSubmitCreate = () => openPin('create')

  const handleEdit = () => {
    if (!editForm.reason.trim()) { toast.error('Edit reason is required'); return }
    if (!editForm.vendor_name.trim()) { toast.error('Vendor / Supplier Name is required'); return }
    if ((editForm.items || []).some(i => !i.part_number && !i.product_id)) { toast.error('All items must have a part number'); return }
    openPin('edit')
  }

  const handleDelete = (po) => { setDeleteTarget(po); openPin('delete') }

  const handleReturn = () => {
    if (!returnForm.reason.trim()) { toast.error('Return reason is required'); return }
    const itemsToReturn = (returnForm.items || []).filter(i => (parseInt(i.return_qty) || 0) > 0)
    if ((returnForm.items || []).length > 0 && itemsToReturn.length === 0) {
      toast.error('Specify at least 1 item with return quantity > 0')
      return
    }
    openPin('return')
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
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              if (onSwitchToNewPO) {
                onSwitchToNewPO()
              } else {
                setForm({ vendor_name: '', po_date: new Date().toISOString().split('T')[0], notes: '', bill_number: '', items: [{ ...EMPTY_ITEM }] });
                setShowCreate(true)
              }
            }}
            id="create-po-btn"
          >
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
                    const isReturned  = p.is_returned || p.status === 'RETURNED'
                    const hasBill     = !!p.bill_number
                    const isEditable  = !isReturned
                    const isDeletable = !isReturned
                    const isReturnable = !isReturned
                    return (
                      <tr key={p.id} className="table-row-hover">
                        <td className="px-5 py-4">
                          <div className="font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs flex items-center gap-1.5">
                            {p.po_number}
                            {hasBill && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold" title={`Bill #${p.bill_number}`}>
                                <Lock className="h-3 w-3 text-warning-500" />{p.bill_number}
                              </span>
                            )}
                          </div>
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
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={Eye}
                              onClick={() => setViewPO(p)}
                              title="View PO details"
                            >
                              View
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={Pencil}
                              disabled={!isEditable}
                              title={isReturned ? 'Returned POs cannot be edited' : 'Edit PO'}
                              onClick={() => {
                                setEditPO(p);
                                const rawItems = (p.items || []).map(i => ({
                                  product_id: i.product_id || i.product?.id || '',
                                  part_number: i.part_number || i.product?.sku || '',
                                  description: i.description || i.product?.name || '',
                                  quantity: i.quantity || 1,
                                  unit_price: i.unit_price || 0,
                                }));
                                setEditForm({
                                  reason: '',
                                  notes: p.notes || '',
                                  vendor_name: p.vendor_name || p.vendor?.company_name || '',
                                  bill_number: p.bill_number || '',
                                  items: rawItems.length > 0 ? rawItems : [{ product_id: '', part_number: '', description: '', quantity: 1, unit_price: 0 }]
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={RotateCcw}
                              disabled={!isReturnable}
                              title={isReturned ? 'PO is already returned' : `Return PO & associated Bill #${p.bill_number}`}
                             onClick={() => {
                                setReturnTarget(p);
                                const poItems = p.items || [];
                                setReturnForm({
                                  reason: '',
                                  items: poItems.map(it => ({
                                    product_id: it.product_id || it.product?.id,
                                    sku: it.part_number || it.product?.sku || '',
                                    name: it.description || it.product?.name || '',
                                    ordered_qty: it.quantity || 1,
                                    return_qty: it.quantity || 1,
                                  }))
                                });
                              }}
                              className={cn(isReturnable && 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20')}
                            >
                              {isReturned ? 'Returned' : 'Return'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={Trash2}
                              disabled={!isDeletable}
                              title={isReturned ? 'Returned POs cannot be deleted' : 'Delete PO'}
                              onClick={() => handleDelete(p)}
                              className={cn(isDeletable && 'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20')}
                            >
                              Delete
                            </Button>
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
            <div>
              <label className="label-base">Vendor / Supplier <span className="text-danger-500">*</span></label>
              {vendors.length > 0 ? (
                <select
                  value={form.vendor_name}
                  onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
                  className="input-base"
                  required
                >
                  <option value="">— Select Compulsory Supplier —</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.company_name}>{v.company_name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.vendor_name}
                  onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
                  className="input-base"
                  placeholder="Enter vendor / supplier name"
                  required
                />
              )}
            </div>
            <div><label className="label-base">PO Date</label><input type="date" value={form.po_date} onChange={e => setForm(f => ({ ...f, po_date: e.target.value }))} className="input-base" /></div>
            <div className="col-span-2"><label className="label-base">Notes</label><input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" placeholder="Optional notes" /></div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-surface-500 uppercase pb-1 border-b border-surface-200 dark:border-surface-700">
              <div className="col-span-3">Part No *</div><div className="col-span-3">Description</div><div className="col-span-2">Qty</div><div className="col-span-2">Unit Price</div><div className="col-span-1">Total</div><div className="col-span-1"></div>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-surface-50/50 dark:bg-surface-800/20 p-2 rounded-xl border border-surface-200 dark:border-surface-700">
                <div className="col-span-3">
                  <select
                    className="input-base text-xs font-mono bg-white dark:bg-surface-900"
                    value={item.product_id || ''}
                    onChange={e => {
                      const selId = e.target.value
                      const p = products.find(prod => String(prod.id) === String(selId))
                      if (p) {
                        setForm(f => {
                          const items = [...f.items]
                          items[i] = {
                            ...items[i],
                            product_id: p.id,
                            part_number: p.sku,
                            description: p.name || p.sku,
                            unit_price: p.purchase_price != null ? p.purchase_price : (p.dealer_landing_price != null ? p.dealer_landing_price : '0')
                          }
                          return { ...f, items }
                        })
                      }
                    }}
                  >
                    <option value="">— Select Catalog Part —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} – {p.name || 'No Name'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="text" readOnly disabled value={item.description} className="input-base text-xs bg-surface-100 dark:bg-surface-800 cursor-not-allowed" placeholder="Description" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.quantity} min={1} onChange={e => updateItem(i, 'quantity', e.target.value)} className="input-base text-xs" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.unit_price} min={0} step={0.01} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="input-base text-xs" />
                </div>
                <div className="col-span-1 text-xs font-medium font-mono">{item.quantity && item.unit_price ? `₹${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(0)}` : '—'}</div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="text-danger-400 hover:text-danger-600"><X className="h-4 w-4" /></button>
                </div>
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
            <div className="col-span-2"><span className="text-xs text-surface-400">Notes:</span><div className="font-medium">{form.notes || '—'}</div></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setShowPreview(false)}>Back to Edit</Button>
            <Button variant="primary" onClick={handleSubmitCreate} loading={submitting} id="submit-po-btn">Submit PO</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editPO} onClose={() => setEditPO(null)} title={`Edit PO: ${editPO?.po_number}`} size="lg">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-warning-50 text-xs text-warning-700 dark:bg-warning-950/30 dark:text-warning-300 border border-warning-200 dark:border-warning-900/40">
            <strong>Audit Required:</strong> Compulsory edit reason is required for audit logging.
          </div>

          <div>
            <label className="label-base">Compulsory Edit Reason <span className="text-danger-500">*</span></label>
            <input
              type="text"
              value={editForm.reason || ''}
              onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
              className="input-base"
              placeholder="Why is this PO being edited?"
              required
            />
          </div>

          <div>
            <label className="label-base">Vendor / Supplier Name <span className="text-danger-500">*</span></label>
            <input
              type="text"
              value={editForm.vendor_name || ''}
              onChange={e => setEditForm(f => ({ ...f, vendor_name: e.target.value }))}
              className="input-base"
              placeholder="Vendor Name"
              required
            />
          </div>

          <div>
            <label className="label-base">Notes</label>
            <input
              type="text"
              value={editForm.notes || ''}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              className="input-base"
              placeholder="Remarks / notes"
            />
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300">
                Purchase Order Line Items
              </h4>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                icon={Plus}
                onClick={() => setEditForm(f => ({ ...f, items: [...(f.items || []), { product_id: '', part_number: '', description: '', quantity: 1, unit_price: 0 }] }))}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(editForm.items || []).map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-surface-50/50 dark:bg-surface-800/20 p-2 rounded-xl border border-surface-200 dark:border-surface-700">
                  <div className="col-span-4">
                    <select
                      className="input-base text-xs font-mono bg-white dark:bg-surface-900"
                      value={item.product_id || ''}
                      onChange={e => {
                        const selId = e.target.value
                        const prod = products.find(p => String(p.id) === String(selId))
                        setEditForm(f => {
                          const updated = [...(f.items || [])]
                          updated[i] = {
                            ...updated[i],
                            product_id: prod ? prod.id : '',
                            part_number: prod ? prod.sku : updated[i].part_number,
                            description: prod ? prod.name : updated[i].description,
                            unit_price: prod && prod.purchase_price != null ? prod.purchase_price : (prod && prod.dealer_landing_price != null ? prod.dealer_landing_price : updated[i].unit_price)
                          }
                          return { ...f, items: updated }
                        })
                      }}
                    >
                      <option value="">— Select Catalog Part —</option>
                      {products.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.sku} – {prod.name || 'No Name'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={e => {
                        const val = e.target.value
                        setEditForm(f => {
                          const updated = [...(f.items || [])]
                          updated[i] = { ...updated[i], description: val }
                          return { ...f, items: updated }
                        })
                      }}
                      className="input-base text-xs"
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity || 1}
                      min={1}
                      onChange={e => {
                        const val = e.target.value
                        setEditForm(f => {
                          const updated = [...(f.items || [])]
                          updated[i] = { ...updated[i], quantity: val }
                          return { ...f, items: updated }
                        })
                      }}
                      className="input-base text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unit_price || 0}
                      min={0}
                      step={0.01}
                      onChange={e => {
                        const val = e.target.value
                        setEditForm(f => {
                          const updated = [...(f.items || [])]
                          updated[i] = { ...updated[i], unit_price: val }
                          return { ...f, items: updated }
                        })
                      }}
                      className="input-base text-xs"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, items: (f.items || []).filter((_, idx) => idx !== i) }))}
                      className="text-danger-400 hover:text-danger-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 text-xs font-semibold">
              <span className="text-surface-600 dark:text-surface-400">Total Calculated Amount:</span>
              <span className="text-sm font-bold text-primary-700 dark:text-primary-400 font-mono">
                ₹{(editForm.items || []).reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unit_price || 0)), 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setEditPO(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title={`Return PO: ${returnTarget?.po_number}`} size="lg">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
            <strong>Partial / Full Return:</strong> Select quantities to return to the supplier. Stock will be adjusted accordingly.
          </div>

          <div>
            <label className="label-base">Return Reason <span className="text-danger-500">*</span></label>
            <textarea
              value={returnForm.reason}
              onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}
              className="input-base min-h-[70px]"
              placeholder="Reason for returning this PO..."
              required
            />
          </div>

          {/* Itemized Return Quantities */}
          <div className="space-y-2 pt-2 border-t border-surface-200 dark:border-surface-700">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300">
              Items to Return (Partial / Full)
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(returnForm.items || []).map((it, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-bold text-surface-900 dark:text-surface-100">{it.sku || 'Part'}</p>
                    <p className="text-surface-500 truncate">{it.name}</p>
                    <span className="text-[10px] text-surface-400">Total Ordered: {it.ordered_qty}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] font-semibold text-surface-600 dark:text-surface-300">Qty to Return:</label>
                    <input
                      type="number"
                      min={0}
                      max={it.ordered_qty}
                      value={it.return_qty}
                      onChange={e => {
                        const val = Math.min(it.ordered_qty, Math.max(0, parseInt(e.target.value) || 0))
                        setReturnForm(f => {
                          const updated = [...f.items]
                          updated[idx] = { ...updated[idx], return_qty: val }
                          return { ...f, items: updated }
                        })
                      }}
                      className="input-base w-20 text-center text-xs font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleReturn} className="bg-amber-600 hover:bg-amber-700 text-white">
              Confirm Return
            </Button>
          </div>
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

            {/* ── Compulsory Edit History Section at Bottom ── */}
            <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-primary-600" />
                  Edit History & Reasons
                </h4>
                <span className="text-xs text-surface-400">
                  {(viewPO.editHistory || viewPO.edit_history || []).length} record(s)
                </span>
              </div>

              {(viewPO.editHistory || viewPO.edit_history) && (viewPO.editHistory || viewPO.edit_history).length > 0 ? (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {(viewPO.editHistory || viewPO.edit_history).map((log, idx) => (
                    <div key={log.id || idx} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-surface-900 dark:text-surface-100 font-semibold">{log.editor?.name || 'Admin'}</span>
                        <span className="text-surface-400 text-[11px]">{new Date(log.created_at || log.timestamp).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-surface-700 dark:text-surface-300">
                        <span className="text-surface-400">Reason: </span>
                        <span className="font-semibold text-primary-700 dark:text-primary-300">{log.edit_reason || log.reason || '—'}</span>
                      </div>
                      {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                        <div className="text-[11px] text-surface-500 pt-1 border-t border-surface-200/50 dark:border-surface-700/50">
                          {Object.entries(log.changed_fields).map(([k, v]) => (
                            <div key={k} className="font-mono flex items-center gap-1.5">
                              <span className="capitalize text-surface-400">{k.replace('_', ' ')}:</span>
                              <span className="line-through text-surface-400">{typeof v === 'object' ? String(v?.from ?? 'none') : 'none'}</span>
                              <span>➔</span>
                              <span className="text-success-600 font-semibold">{typeof v === 'object' ? String(v?.to ?? '') : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-xs text-surface-400 text-center italic">
                  No edit history recorded for this purchase order.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-700">
              <Button variant="secondary" onClick={() => setViewPO(null)}>Close</Button>
              <Button icon={Printer} onClick={() => generatePOPDF(viewPO)}>Print / Save PDF</Button>
            </div>
          </div>
        </Modal>
      )}

      <PinModal open={pinOpen} onVerify={handlePinConfirmed} onClose={closePin} loading={pinLoading} />
    </div>
  )
}
