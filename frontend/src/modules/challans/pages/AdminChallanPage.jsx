import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  FileText, Plus, Pencil, Trash2, RotateCcw, Eye, Search, Filter,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock, X,
  Loader2, Shield, Package, Calendar, History, Share2, ExternalLink,
  Lock, Info, ArrowLeft, Download, Printer, ArrowUpRight, MapPin, User
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import {
  getChallans, createChallan, updateChallan, deleteChallan,
  returnChallan, getChallanEditHistory, checkPartAvailability,
  setBillNumber, approveChallan
} from '../../../api/endpoints/challans.api'
import { useAuthStore } from '../../../store/authStore'
import TablePagination from '../../../components/data/TablePagination'

const STATUS_CONFIG = {
  delivered:  { label: 'Delivered',  color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400', icon: ArrowUpRight },
  pending:    { label: 'Pending',    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400', icon: Clock },
  returned:   { label: 'Returned',   color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400', icon: RotateCcw },
  cancelled:  { label: 'Cancelled',  color: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400', icon: X },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

// ── PDF Generator Utility ──────────────────────────────────────────────────────
function getChallanHTML(challan) {
  const now = new Date().toLocaleString('en-IN')
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Delivery Challan — ${challan.challan_number || challan.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; font-size: 13px; margin: 0; padding: 40px; color: #0f172a; }
        .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .company-info h1 { font-size: 22px; font-weight: 700; color: #1e3a8a; margin: 0 0 8px 0; letter-spacing: 0.5px; }
        .company-info p { font-size: 12px; color: #334155; margin: 4px 0; font-weight: 500; }
        .challan-meta { text-align: right; }
        .challan-number-box { border: 1px solid #1e3a8a; border-radius: 6px; padding: 6px 14px; display: inline-block; margin-bottom: 12px; }
        .challan-number-box span:first-child { font-weight: 400; font-size: 13px; color: #1e3a8a; margin-right: 6px; }
        .challan-number-box span:last-child { font-weight: 700; font-size: 15px; color: #0f172a; }
        .challan-date { font-size: 12px; color: #475569; font-weight: 500; }
        .divider { border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; height: 2px; margin: 20px 0; }
        .title-section { text-align: center; margin: 24px 0 32px 0; }
        .title-section h2 { font-size: 14px; font-weight: 600; letter-spacing: 2.5px; color: #0f172a; margin: 0; }
        .customer-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .customer-block h4 { font-size: 10px; font-weight: 600; color: #64748b; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .customer-block p { font-size: 14px; font-weight: 500; color: #1e3a8a; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { text-align: left; font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 16px; }
        th.text-right { text-align: right; }
        td { padding: 16px 0; font-size: 13px; color: #0f172a; }
        td.text-right { text-align: right; }
        td.font-medium { font-weight: 500; color: #1e3a8a; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="company-info">
          <h1>SHREE RAMDEV MOTORS</h1>
          <p>OLD POWER HOUSE ROAD, BIKANER</p>
          <p>GSTIN: 08ALDPD3168N1ZW</p>
        </div>
        <div class="challan-meta">
          <div class="challan-number-box">
            <span>No.</span><span>${challan.challan_number || challan.id}</span>
          </div>
          <div class="challan-date">Date: ${new Date(challan.generated_at || challan.created_at || new Date()).toLocaleDateString('en-IN')}</div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="title-section"><h2>DELIVERY CHALLAN</h2></div>
      <div class="customer-section">
        <div class="customer-block">
          <h4>CUSTOMER / PARTY</h4>
          <p>${challan.party_name || challan.party?.company_name || '—'}</p>
        </div>
        <div class="customer-block" style="text-align: right;">
          <h4>BILL NUMBER</h4>
          <p>${challan.bill_number || '—'}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>PART NO</th><th>DESCRIPTION</th><th class="text-right">QTY</th><th class="text-right">PRICE</th></tr>
        </thead>
        <tbody>
          ${(challan.order?.items || challan.items || []).map(i => `
            <tr>
              <td class="font-medium">${i.sku || i.product?.sku || '—'}</td>
              <td>${i.product?.name || i.name || '—'}</td>
              <td class="text-right">${i.quantity || i.qty || 1}</td>
              <td class="text-right">₹${parseFloat(i.price || i.unit_price || i.product?.dealer_landing_price || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `
}

function generateChallanPDF(challan) {
  const html = getChallanHTML(challan)
  const win = window.open('', '_blank')
  if (!win) { toast.error('Popup blocked'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 500)
}

function downloadChallanHTML(challan) {
  const html = getChallanHTML(challan)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `challan_${challan.challan_number || challan.id}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Challan HTML downloaded!')
}

// ── PIN Modal ──────────────────────────────────────────────────────────────────
function PinModal({ open, onVerify, onClose, loading }) {
  const [pin, setPin] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { if (open) { setPin(''); setTimeout(() => inputRef.current?.focus(), 100) } }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Admin PIN Required" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-900/40">
          <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0" />
          <p className="text-xs text-primary-700 dark:text-primary-300">Enter your admin PIN to proceed with this action.</p>
        </div>
        <input ref={inputRef} type="password" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && pin.length >= 4) onVerify(pin) }}
          className="input-base text-center tracking-widest text-lg" placeholder="● ● ● ●" id="pin-input" />
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={() => onVerify(pin)} loading={loading} disabled={pin.length < 4} id="pin-submit">Verify PIN</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Part Row Lookup ────────────────────────────────────────────────────────────
function PartRow({ item, index, onChange, onRemove }) {
  const [status, setStatus] = useState(null)
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef(null)

  const handleSkuChange = (sku) => {
    onChange(index, 'sku', sku)
    clearTimeout(debounceRef.current)
    if (sku.length < 2) { setStatus(null); return }
    setChecking(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkPartAvailability(sku)
        setStatus(res.status)
        if (res.status !== 'not_found' && res.product) {
          onChange(index, 'name', res.product.name || '')
          if (res.product.dealer_landing_price != null) {
            const unitPrice = parseFloat(res.product.dealer_landing_price) || 0
            onChange(index, 'dl_price', unitPrice)
            if (!item.price) onChange(index, 'price', unitPrice)
          }
        }
      } catch { setStatus(null) }
      finally { setChecking(false) }
    }, 500)
  }

  const handleQtyChange = (qtyVal) => {
    const qty = parseInt(qtyVal) || 1
    onChange(index, 'qty', qty)
  }

  const dl = parseFloat(item.dl_price || 0)
  const sp = parseFloat(item.price || 0)
  let marginBadge = null
  if (dl > 0 && sp > 0) {
    const pct = ((sp - dl) / dl) * 100
    const formatted = Math.abs(pct).toFixed(1) + '%'
    if (pct > 0) {
      marginBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800 shrink-0" title={`+₹${(sp - dl).toFixed(2)} margin above DL price`}>+{formatted}</span>
    } else if (pct < 0) {
      marginBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-800 shrink-0" title={`-₹${(dl - sp).toFixed(2)} discount below DL price`}>-{formatted}</span>
    } else {
      marginBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-100 dark:bg-surface-800 text-surface-500 border border-surface-200 dark:border-surface-700 shrink-0">0%</span>
    }
  }

  const lineTotal = (parseFloat(item.qty || 1) * sp).toFixed(2)

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-2">
        <div className="relative">
          <input type="text" value={item.sku} onChange={e => handleSkuChange(e.target.value.toUpperCase())}
            className={cn('input-base text-xs font-mono', status === 'in_stock' && 'border-success-400', status === 'not_found' && 'border-danger-400')} placeholder="Part No *" />
          {checking && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-surface-400" />}
        </div>
      </div>
      <div className="col-span-2"><input type="text" value={item.name} onChange={e => onChange(index, 'name', e.target.value)} className="input-base text-xs" placeholder="Description" /></div>
      <div className="col-span-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-surface-400">₹</span>
          <input type="text" disabled readOnly value={dl ? dl.toFixed(2) : '0.00'} className="input-base text-xs pl-5 bg-surface-100 dark:bg-surface-800 font-mono text-surface-500 cursor-not-allowed" placeholder="DL Price" title="DL Price (non-editable)" />
        </div>
      </div>
      <div className="col-span-1"><input type="number" value={item.qty} min={1} onChange={e => handleQtyChange(e.target.value)} className="input-base text-xs text-center" placeholder="Qty *" /></div>
      <div className="col-span-3 flex items-center gap-1.5">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-surface-400">₹</span>
          <input type="number" value={item.price} min={0} step={0.01} onChange={e => onChange(index, 'price', e.target.value)} className="input-base text-xs pl-5 font-mono font-medium" placeholder="Selling Price" />
        </div>
        {marginBadge}
      </div>
      <div className="col-span-1 text-xs text-primary-700 dark:text-primary-400 font-bold whitespace-nowrap">₹{lineTotal}</div>
      <div className="col-span-1 flex justify-center"><button type="button" onClick={() => onRemove(index)} className="text-danger-400 hover:text-danger-600 p-1"><X className="h-4 w-4" /></button></div>
    </div>
  )
}

// ── Edit History Modal ─────────────────────────────────────────────────────────
function EditHistoryModal({ open, onClose, challanId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!open || !challanId) return
    setLoading(true)
    getChallanEditHistory(challanId).then(r => { if (r.success) setLogs(r.data) }).catch(() => {}).finally(() => setLoading(false))
  }, [open, challanId])
  return (
    <Modal open={open} onClose={onClose} title="Edit History & Audit Log" size="md">
      {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
        : logs.length === 0 ? <div className="text-center py-8 text-surface-500 text-sm">No edits recorded</div>
        : <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{log.editor?.name || 'Admin'}</span>
                  <span className="text-xs text-surface-400">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-surface-600 dark:text-surface-300 font-medium">Reason: {log.edit_reason}</p>
              </div>
            ))}
          </div>}
    </Modal>
  )
}

const EMPTY_ITEM = { sku: '', name: '', qty: 1, dl_price: '', price: '' }

export default function AdminChallanPage() {
  const { user } = useAuthStore()
  const roleName = typeof user?.role === 'object' ? user?.role?.name : user?.role
  const isAdmin = roleName === 'admin' || user?.role_id === 1 || user?.role === 'admin'

  const [challans, setChallans]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Pagination state
  const [page, setPage]               = useState(1)
  useEffect(() => { setPage(1) }, [search, filterStatus])

  const [showCreate, setShowCreate]   = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [viewChallan, setViewChallan] = useState(null)
  const [editChallan, setEditChallan] = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)
  const [billModalTarget, setBillModalTarget] = useState(null)
  const [billModalValue, setBillModalValue]   = useState('')
  const [historyId, setHistoryId]     = useState(null)

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinLoading, setPinLoading]     = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const [form, setForm] = useState({ party_name: '', supplier: '', notes: '', items: [{ ...EMPTY_ITEM }] })
  const [editForm, setEditForm]     = useState({ reason: '', notes: '', supplier: '', party_name: '', bill_number: '' })
  const [returnForm, setReturnForm] = useState({ reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSaveBillNumber = async (e) => {
    e.preventDefault()
    if (!billModalTarget || !billModalValue.trim()) { toast.error('Please enter a bill number'); return }
    setSubmitting(true)
    try {
      const res = await setBillNumber(billModalTarget.id, { bill_number: billModalValue.trim() })
      if (res.success) {
        toast.success(`Bill number updated to #${billModalValue.trim()} everywhere!`)
        setBillModalTarget(null)
        setBillModalValue('')
        fetchChallansList()
      } else {
        toast.error(res.error || 'Failed to set bill number')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set bill number')
    } finally {
      setSubmitting(false)
    }
  }

  const fetchChallansList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getChallans()
      if (res?.success && Array.isArray(res?.data)) {
        setChallans(res.data)
      } else {
        toast.error(res?.error || 'Failed to fetch challans')
      }
    } catch (err) {
      console.error('Failed to load challans:', err)
      toast.error('Failed to load challans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChallansList() }, [fetchChallansList])

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
  const removeItem = (index) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))

  const grandTotal = form.items.reduce((s, i) => s + (parseFloat(i.qty || 0) * parseFloat(i.price || 0)), 0)

  const handlePreview = (e) => {
    e.preventDefault()
    if (form.items.some(i => !i.sku.trim())) { toast.error('All items must have a Part No'); return }
    setShowPreview(true)
  }

  const handleSubmitCreate = () => {
    requirePin(async (pin) => {
      setSubmitting(true)
      try {
        const body = {
          pin,
          party_name:  form.party_name.trim() || undefined,
          supplier:    form.supplier.trim() || undefined,
          bill_number: form.bill_number.trim() || undefined,
          notes:       form.notes.trim() || undefined,
          items: form.items.map(i => ({ sku: i.sku.trim().toUpperCase(), qty: parseInt(i.qty), price: parseFloat(i.price) || undefined })),
        }
        const res = await createChallan(body)
        if (res.success) {
          toast.success(`Challan ${res.data.challan_number} created!`)
          setShowPreview(false); setShowCreate(false)
          fetchChallansList()
        } else { toast.error(res.error || 'Failed to create') }
      } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); throw err }
      finally { setSubmitting(false) }
    })
  }

  const handleEdit = () => {
    if (!editForm.reason.trim()) { toast.error('Edit reason is required'); return }
    requirePin(async (pin) => {
      const res = await updateChallan(editChallan.id, { pin, ...editForm })
      if (res.success) { toast.success('Challan updated'); setEditChallan(null); fetchChallansList() }
      else { toast.error(res.error || 'Failed to update'); throw new Error(res.error) }
    })
  }

  const handleDelete = (challan) => {
    requirePin(async (pin) => {
      const res = await deleteChallan(challan.id, { pin })
      if (res.success) { toast.success('Challan deleted and stock restored'); fetchChallansList() }
      else { toast.error(res.error || 'Cannot delete'); throw new Error(res.error) }
    })
  }

  const handleReturn = () => {
    if (!returnForm.reason.trim()) { toast.error('Return reason is required'); return }
    requirePin(async (pin) => {
      const res = await returnChallan(returnTarget.id, { pin, reason: returnForm.reason })
      if (res.success) {
        toast.success(res.message || 'Challan returned successfully');
        setReturnTarget(null);
        fetchChallansList();
      } else {
        toast.error(res.error || 'Failed to return');
        throw new Error(res.error);
      }
    })
  }

  const filtered = useMemo(() => {
    if (!Array.isArray(challans)) return []
    return challans.filter(c => {
      if (!c) return false
      const cNo   = (c.challan_number || '').toLowerCase()
      const party = (c.party_name || c.party?.company_name || c.order?.party?.company_name || '').toLowerCase()
      const bill  = (c.bill_number || '').toLowerCase()
      const supplier = (c.supplier || '').toLowerCase()
      const salesman = (c.order?.salesManager?.name || c.creator?.name || '').toLowerCase()
      const s     = search.toLowerCase()
      const matchSearch = cNo.includes(s) || party.includes(s) || bill.includes(s) || supplier.includes(s) || salesman.includes(s)
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [challans, search, filterStatus])

  const stats = useMemo(() => {
    if (!Array.isArray(challans)) return { total: 0, delivered: 0, in_transit: 0, returned: 0 }
    return {
      total:      challans.length,
      delivered:  challans.filter(c => c && (c.status === 'delivered' || c.status === 'active')).length,
      in_transit: challans.filter(c => c && c.status === 'in_transit').length,
      returned:   challans.filter(c => c && (c.status === 'returned' || c.is_returned)).length,
    }
  }, [challans])

  const exportChallansCSV = () => {
    if (filtered.length === 0) { toast.error('No challans to export'); return }
    const headers = ['Challan NO', 'Date', 'Customer', 'Company', 'Salesman', 'Supplier', 'Bill No', 'Status', 'Grand Total']
    const rows = filtered.map(c => [
      c.challan_number,
      new Date(c.generated_at || c.created_at).toLocaleDateString('en-IN'),
      c.party_name || c.party?.company_name || 'NIL',
      c.party?.company_name || c.party_name || 'NIL',
      c.order?.salesManager?.name || c.creator?.name || 'NIL',
      c.supplier || 'NIL',
      c.bill_number || 'NIL',
      c.status,
      c.grand_total ? String(c.grand_total) : '0.00'
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.map(x => `"${x}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `challans_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Challans exported to CSV!')
  }

  if (!isAdmin) return (
    <div className="animate-in flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-10 w-10 text-danger-500" />
      <p className="text-sm text-surface-500">Admin access required.</p>
    </div>
  )

  const paginatedChallans = filtered.slice((page - 1) * 50, page * 50)

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Challan History</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">View, track, edit, return, and manage delivery challans.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={exportChallansCSV}>Export CSV</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { setForm({ party_name: '', supplier: '', bill_number: '', notes: '', items: [{ ...EMPTY_ITEM }] }); setShowCreate(true) }} id="create-challan-btn">
            Create Challan
          </Button>
        </div>
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Challans',  value: stats.total,      color: 'text-surface-900 dark:text-surface-50' },
          { label: 'Active / Delivered', value: stats.delivered, color: 'text-success-600 dark:text-success-400' },
          { label: 'In Transit',      value: stats.in_transit,  color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Returned',        value: stats.returned,    color: 'text-amber-600 dark:text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input type="text" placeholder="Search challan no, customer, company..." value={search} onChange={e => setSearch(e.target.value)} className="input-base pl-9 py-1.5" id="challan-search" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            {['all', 'active', 'returned', 'cancelled'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                filterStatus === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600 hover:bg-surface-100')}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
          <span className="text-xs text-surface-500 shrink-0">{filtered.length} record(s)</span>
        </div>

        {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600 mb-3" /></div>
          : filtered.length === 0 ? <div className="p-12 text-center text-surface-500 text-sm">No challans found</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">CHALLAN NO</th>
                    <th className="px-5 py-3.5">DATE</th>
                    <th className="px-5 py-3.5">CUSTOMER</th>
                    <th className="px-5 py-3.5">COMPANY</th>
                    <th className="px-5 py-3.5">SALESMAN</th>
                    <th className="px-5 py-3.5">SUPPLIER</th>
                    <th className="px-5 py-3.5 text-center">ITEMS</th>
                    <th className="px-5 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm">
                  {paginatedChallans.map(c => {
                    const isReturned = c.is_returned || c.status === 'returned'
                    const hasBill = !!c.bill_number
                    const isEditable = !isReturned && !hasBill
                    const isDeletable = !isReturned && !hasBill
                    const isReturnable = !isReturned

                    const customerName = c.party_name || c.party?.company_name || '—'
                    const companyName = c.party?.company_name || c.party_name || '—'
                    const salesmanName = c.order?.salesManager?.name || c.creator?.name || '—'
                    const itemsCount = c.items?.length || c.order?.items?.length || 1
                    const rawDate = c.generated_at || c.created_at || c.createdAt
                    const dateObj = rawDate ? new Date(rawDate) : null
                    const dateFormatted = dateObj && !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'

                    return (
                      <tr key={c.id} className="table-row-hover">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-surface-900 dark:text-surface-50 text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{c.challan_number}</span>
                            {hasBill && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold font-mono text-xs border border-indigo-100/80 dark:border-indigo-900/40" title={`Bill #${c.bill_number}`}>
                                <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                                <span>{c.bill_number}</span>
                              </span>
                            )}
                          </div>
                          {c.share_token && (
                            <a href={`/challan/view/${c.share_token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-surface-400 hover:text-primary-500 mt-1">
                              <ExternalLink className="h-3 w-3" /> Link
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-surface-600 dark:text-surface-400 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">{customerName}</td>
                        <td className="px-5 py-4 text-xs text-surface-700 dark:text-surface-300 font-medium">{companyName}</td>
                        <td className="px-5 py-4 text-xs text-surface-600 dark:text-surface-400">{salesmanName}</td>
                        <td className="px-5 py-4 text-xs font-medium text-surface-700 dark:text-surface-300">{c.supplier || '—'}</td>
                        <td className="px-5 py-4 text-center font-bold text-surface-900 dark:text-surface-100 text-xs">{itemsCount}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={Eye}
                              onClick={() => setViewChallan(c)}
                              title="View details & edit history"
                            >
                              View
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={Pencil}
                              disabled={!isEditable}
                              title={isReturned ? 'Returned challans cannot be edited' : hasBill ? 'Challans with a bill number cannot be edited' : 'Edit challan'}
                              onClick={() => { setEditChallan(c); setEditForm({ reason: '', notes: c.notes || '', supplier: c.supplier || '', party_name: c.party_name || '', bill_number: '' }) }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={RotateCcw}
                              disabled={!isReturnable}
                              title={isReturned ? 'Challan is returned' : hasBill ? `Return challan & associated Bill #${c.bill_number}` : 'Return challan'}
                              onClick={() => { setReturnTarget(c); setReturnForm({ reason: '' }) }}
                              className={cn(isReturnable && 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20')}
                            >
                              {isReturned ? 'Returned' : 'Return'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={Trash2}
                              disabled={!isDeletable}
                              title={isReturned ? 'Returned challans cannot be deleted' : hasBill ? 'Challans with a bill number cannot be deleted' : 'Delete challan'}
                              onClick={() => handleDelete(c)}
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Delivery Challan" size="xl">
        <form onSubmit={handlePreview} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label-base">Party Name</label><input type="text" value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} className="input-base" placeholder="Customer / party name" /></div>
            <div><label className="label-base">Supplier</label><input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="input-base" placeholder="Supplier name" /></div>
            <div><label className="label-base">Notes</label><input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" placeholder="Optional notes" /></div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-surface-500 uppercase pb-1 border-b border-surface-200 dark:border-surface-700">
              <div className="col-span-2">Part No *</div><div className="col-span-2">Description</div><div className="col-span-2">DL Price</div><div className="col-span-1 text-center">Qty *</div><div className="col-span-3">Selling Price</div><div className="col-span-1">Total</div><div className="col-span-1"></div>
            </div>
            {form.items.map((item, i) => (
              <PartRow key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />
            ))}
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addItem}>Add Item</Button>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-surface-200 dark:border-surface-700">
            <span className="text-sm text-surface-500">Grand Total: <strong>₹{grandTotal.toFixed(2)}</strong></span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" variant="primary" id="preview-challan-btn">Preview & Submit</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Preview Challan" size="lg">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-xs text-surface-400">Party:</span><div className="font-medium">{form.party_name || '—'}</div></div>
            <div><span className="text-xs text-surface-400">Supplier:</span><div className="font-medium">{form.supplier || '—'}</div></div>
            <div><span className="text-xs text-surface-400">Notes:</span><div className="font-medium">{form.notes || '—'}</div></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setShowPreview(false)}>Back to Edit</Button>
            <Button variant="primary" onClick={handleSubmitCreate} loading={submitting} id="submit-challan-btn">Submit & Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editChallan} onClose={() => setEditChallan(null)} title={`Edit Challan: ${editChallan?.challan_number}`} size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-warning-50 text-xs text-warning-700">
            A compulsory edit reason must be provided for audit logging.
          </div>
          <div>
            <label className="label-base">Compulsory Edit Reason <span className="text-danger-500">*</span></label>
            <input
              type="text"
              value={editForm.reason}
              onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
              className="input-base"
              placeholder="Why is this challan being edited?"
              required
            />
          </div>
          {[{ label: 'Notes', field: 'notes' }, { label: 'Supplier', field: 'supplier' }, { label: 'Party Name', field: 'party_name' }].map(({ label, field }) => (
            <div key={field}><label className="label-base">{label}</label><input type="text" value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} className="input-base" placeholder={label} /></div>
          ))}
          <div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setEditChallan(null)}>Cancel</Button><Button variant="primary" onClick={handleEdit}>Save Changes</Button></div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title={`Return Challan: ${returnTarget?.challan_number}`} size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
            {returnTarget?.bill_number ? (
              <span>
                <strong>Notice:</strong> This challan has Bill <strong>#{returnTarget.bill_number}</strong>. Returning this challan will restore stock and mark both the challan and the bill as returned.
              </span>
            ) : (
              <span>Returning this challan will restore stock and lock it from further edits or deletion.</span>
            )}
          </div>
          <div>
            <label className="label-base">Return Reason <span className="text-danger-500">*</span></label>
            <textarea
              value={returnForm.reason}
              onChange={e => setReturnForm({ reason: e.target.value })}
              className="input-base min-h-[80px]"
              placeholder="Compulsory reason for returning this challan..."
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleReturn} className="bg-amber-600 hover:bg-amber-700 text-white">
              Confirm Return
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal with Compulsory Edit History at the bottom */}
      {viewChallan && (
        <Modal open={!!viewChallan} onClose={() => setViewChallan(null)} title={`Challan: ${viewChallan.challan_number}`} size="lg">
          <div className="space-y-5">
            {/* Summary Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
              <div>
                <span className="text-xs text-surface-400 block">Challan Number</span>
                <div className="text-lg font-bold font-mono text-primary-700 dark:text-primary-400">
                  {viewChallan.challan_number}
                </div>
              </div>
              <div>
                <span className="text-xs text-surface-400 block">Date</span>
                <div className="text-sm font-semibold">
                  {new Date(viewChallan.generated_at || viewChallan.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div>
                <span className="text-xs text-surface-400 block">Bill Number</span>
                <div className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                  {viewChallan.bill_number ? `Locked: #${viewChallan.bill_number}` : '—'}
                </div>
              </div>
              <div>
                <StatusBadge status={viewChallan.status} />
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs card p-4">
              <div>
                <span className="text-surface-400 block">Customer</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">{viewChallan.party_name || viewChallan.party?.company_name || '—'}</span>
              </div>
              <div>
                <span className="text-surface-400 block">Company</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">{viewChallan.party?.company_name || viewChallan.party_name || '—'}</span>
              </div>
              <div>
                <span className="text-surface-400 block">Salesman</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">{viewChallan.order?.salesManager?.name || viewChallan.creator?.name || '—'}</span>
              </div>
              <div>
                <span className="text-surface-400 block">Supplier</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">{viewChallan.supplier || '—'}</span>
              </div>
            </div>

            {/* Notes if any */}
            {viewChallan.notes && (
              <div className="text-xs p-3 rounded-lg bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700">
                <span className="font-semibold text-surface-500">Notes: </span>{viewChallan.notes}
              </div>
            )}

            {/* Return reason banner if returned */}
            {viewChallan.is_returned && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                <strong>Return Reason: </strong>{viewChallan.return_reason || 'Challan returned'}
              </div>
            )}

            {/* Items list if available */}
            {((viewChallan.order?.items && viewChallan.order.items.length > 0) || (viewChallan.items && viewChallan.items.length > 0)) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Items List</h4>
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Part No</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                      {(viewChallan.order?.items || viewChallan.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono">{item.sku || item.product?.sku}</td>
                          <td className="p-2.5">{item.product?.name || item.name || '—'}</td>
                          <td className="p-2.5 text-right font-semibold">{item.quantity || item.qty}</td>
                          <td className="p-2.5 text-right">₹{item.price || item.unit_price || item.product?.dealer_landing_price || 0}</td>
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
                  {viewChallan.editHistory?.length || 0} record(s)
                </span>
              </div>

              {viewChallan.editHistory && viewChallan.editHistory.length > 0 ? (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {viewChallan.editHistory.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-surface-900 dark:text-surface-100 font-semibold">{log.editor?.name || 'Admin'}</span>
                        <span className="text-surface-400 text-[11px]">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-surface-700 dark:text-surface-300">
                        <span className="text-surface-400">Reason: </span>
                        <span className="font-semibold text-primary-700 dark:text-primary-300">{log.edit_reason}</span>
                      </div>
                      {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                        <div className="text-[11px] text-surface-500 pt-1 border-t border-surface-200/50 dark:border-surface-700/50">
                          {Object.entries(log.changed_fields).map(([k, v]) => (
                            <div key={k} className="font-mono">
                              {k}: <span className="line-through text-surface-400">{String(v?.from ?? 'none')}</span> ➔ <span className="text-success-600 font-semibold">{String(v?.to)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-xs text-surface-400 text-center italic">
                  No edit history recorded for this challan.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
              <Button variant="secondary" onClick={() => setViewChallan(null)}>Close</Button>
              <Button variant="secondary" icon={Download} onClick={() => downloadChallanHTML(viewChallan)}>Download HTML</Button>
              <Button icon={Printer} onClick={() => generateChallanPDF(viewChallan)}>Print PDF</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Write Bill Number Modal */}
      <Modal open={!!billModalTarget} onClose={() => setBillModalTarget(null)} title="Write / Update Bill Number" size="md">
        {billModalTarget && (
          <form onSubmit={handleSaveBillNumber} className="space-y-4">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/30 text-xs text-primary-800 dark:text-primary-300">
              <p className="font-semibold mb-1">Pipeline: Stock Checked → Bill Created → Write Bill Number</p>
              <p className="text-surface-600 dark:text-surface-400">
                Writing this bill number will link it to <strong>{billModalTarget.challan_number}</strong> and update it across the system.
              </p>
            </div>

            <div>
              <label className="label-base">Bill Number <span className="text-danger-500">*</span></label>
              <input
                type="text"
                required
                value={billModalValue}
                onChange={e => setBillModalValue(e.target.value)}
                className="input-base font-mono"
                placeholder="e.g. BILL-2026-001"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setBillModalTarget(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={submitting}>Save & Update Everywhere</Button>
            </div>
          </form>
        )}
      </Modal>

      <PinModal open={pinModalOpen} onVerify={handlePinVerified} onClose={() => { setPinModalOpen(false); setPendingAction(null) }} loading={pinLoading} />
      <EditHistoryModal open={!!historyId} onClose={() => setHistoryId(null)} challanId={historyId} />
    </div>
  )
}
