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
  returnChallan, getChallanEditHistory, checkPartAvailability
} from '../../../api/endpoints/challans.api'
import { useAuthStore } from '../../../store/authStore'

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
        .header-container { display: flex; justify-space-between; align-items: flex-start; margin-bottom: 24px; }
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
        .summary-section { display: flex; justify-content: space-between; margin-bottom: 80px; }
        .footer-sig-container { display: flex; justify-content: flex-end; margin-top: 60px; }
        .footer-sig { text-align: center; width: 220px; }
        .footer-sig .line { border-top: 1px solid #0f172a; margin-bottom: 8px; }
        .footer-sig p { font-size: 11px; color: #64748b; font-weight: 500; margin: 0; }
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
          <tr>
            <th>SR</th>
            <th>PART NUMBER</th>
            <th>DESCRIPTION</th>
            <th class="text-right">QTY</th>
            <th class="text-right">PRICE/UNIT</th>
            <th class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${(challan.order?.items || []).map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="font-medium">${item.product?.sku || 'N/A'}</td>
              <td>${item.product?.name || 'N/A'}</td>
              <td class="text-right font-medium">${item.quantity}</td>
              <td class="text-right font-medium">₹${parseFloat(item.sm_price || 0).toFixed(2)}</td>
              <td class="text-right font-medium">₹${parseFloat(item.line_total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary-section">
        <div>Salesman: <strong>${challan.creator?.name || 'Admin'}</strong></div>
        <div style="text-align: right;">Total Amount: <strong>₹${challan.grand_total ? parseFloat(challan.grand_total).toFixed(2) : '0.00'}</strong></div>
      </div>
      <div class="footer-sig-container">
        <div class="footer-sig"><div class="line"></div><p>Authorized Signature</p></div>
      </div>
    </body>
    </html>
  `
}

function generateChallanPDF(challan) {
  const html = getChallanHTML(challan)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Please allow popups to print/download challan.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
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
          if (!item.price && res.product.dealer_landing_price) {
            onChange(index, 'price', res.product.dealer_landing_price)
          }
        }
      } catch { setStatus(null) }
      finally { setChecking(false) }
    }, 500)
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-3">
        <div className="relative">
          <input type="text" value={item.sku} onChange={e => handleSkuChange(e.target.value.toUpperCase())}
            className={cn('input-base text-xs', status === 'in_stock' && 'border-success-400', status === 'not_found' && 'border-danger-400')} placeholder="Part No *" />
          {checking && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-surface-400" />}
        </div>
      </div>
      <div className="col-span-3"><input type="text" value={item.name} onChange={e => onChange(index, 'name', e.target.value)} className="input-base text-xs" placeholder="Description" /></div>
      <div className="col-span-2"><input type="number" value={item.qty} min={1} onChange={e => onChange(index, 'qty', e.target.value)} className="input-base text-xs" placeholder="Qty *" /></div>
      <div className="col-span-2"><input type="number" value={item.price} min={0} step={0.01} onChange={e => onChange(index, 'price', e.target.value)} className="input-base text-xs" placeholder="Price/unit" /></div>
      <div className="col-span-1 text-xs text-surface-600 pt-2 font-medium">{item.qty && item.price ? `₹${(parseFloat(item.qty) * parseFloat(item.price)).toFixed(0)}` : '—'}</div>
      <div className="col-span-1 flex justify-center pt-1"><button onClick={() => onRemove(index)} className="text-danger-400 hover:text-danger-600 p-1"><X className="h-4 w-4" /></button></div>
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
    <Modal open={open} onClose={onClose} title="Edit History" size="md">
      {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
        : logs.length === 0 ? <div className="text-center py-8 text-surface-500 text-sm">No edits recorded</div>
        : <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{log.editor?.name || 'Admin'}</span>
                  <span className="text-xs text-surface-400">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-surface-600 dark:text-surface-300">{log.edit_reason}</p>
              </div>
            ))}
          </div>}
    </Modal>
  )
}

const EMPTY_ITEM = { sku: '', name: '', qty: 1, price: '' }

export default function AdminChallanPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin'

  const [challans, setChallans]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [showCreate, setShowCreate]   = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [viewChallan, setViewChallan] = useState(null)
  const [editChallan, setEditChallan] = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)
  const [historyId, setHistoryId]     = useState(null)

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinLoading, setPinLoading]     = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const [form, setForm] = useState({ party_name: '', supplier: '', bill_number: '', notes: '', items: [{ ...EMPTY_ITEM }] })
  const [editForm, setEditForm]     = useState({ reason: '', notes: '', supplier: '', party_name: '', bill_number: '' })
  const [returnForm, setReturnForm] = useState({ reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchChallansList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getChallans()
      if (res.success) setChallans(res.data)
      else toast.error('Failed to fetch challans')
    } catch { toast.error('Failed to load challans') }
    finally { setLoading(false) }
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
    if (!form.bill_number.trim()) { toast.error('Bill number is mandatory'); return }
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
          bill_number: form.bill_number.trim(),
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
      if (res.success) { toast.success('Challan returned and stock restored'); setReturnTarget(null); fetchChallansList() }
      else { toast.error(res.error || 'Failed to return'); throw new Error(res.error) }
    })
  }

  const filtered = useMemo(() => {
    return challans.filter(c => {
      const cNo   = (c.challan_number || '').toLowerCase()
      const party = (c.party_name || c.party?.company_name || '').toLowerCase()
      const bill  = (c.bill_number || '').toLowerCase()
      const s     = search.toLowerCase()
      const matchSearch = cNo.includes(s) || party.includes(s) || bill.includes(s)
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [challans, search, filterStatus])

  const stats = useMemo(() => {
    return {
      total:      challans.length,
      delivered:  challans.filter(c => c.status === 'delivered' || c.status === 'active').length,
      in_transit: challans.filter(c => c.status === 'in_transit').length,
      pending:    challans.filter(c => c.status === 'pending').length,
    }
  }, [challans])

  const exportChallansCSV = () => {
    if (filtered.length === 0) { toast.error('No challans to export'); return }
    const headers = ['Challan NO', 'Date', 'Party', 'Supplier', 'Bill No', 'Status', 'Grand Total']
    const rows = filtered.map(c => [
      c.challan_number,
      new Date(c.generated_at || c.created_at).toLocaleDateString('en-IN'),
      c.party_name || c.party?.company_name || 'NIL',
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

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Delivery Challans</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Create, view, edit, and track all delivery challans.</p>
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
          { label: 'Delivered / Active', value: stats.delivered,   color: 'text-success-600 dark:text-success-400' },
          { label: 'In Transit',      value: stats.in_transit,  color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Pending',         value: stats.pending,     color: 'text-warning-600 dark:text-warning-400' },
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
            <input type="text" placeholder="Search challan, party, bill no..." value={search} onChange={e => setSearch(e.target.value)} className="input-base pl-9 py-1.5" id="challan-search" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            {['all', 'active', 'returned', 'cancelled'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-3 py-1 rounded-lg text-xs font-medium border',
                filterStatus === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600')}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
          <span className="text-xs text-surface-500 shrink-0">{filtered.length} / {challans.length}</span>
        </div>

        {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600 mb-3" /></div>
          : filtered.length === 0 ? <div className="p-12 text-center text-surface-500 text-sm">No challans found</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">CHALLAN NO</th>
                    <th className="px-5 py-3.5">DATE</th>
                    <th className="px-5 py-3.5">BILL NO</th>
                    <th className="px-5 py-3.5">PARTY</th>
                    <th className="px-5 py-3.5">SUPPLIER</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5">GRAND TOTAL</th>
                    <th className="px-5 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm">
                  {filtered.map(c => {
                    const locked = !!(c.bill_number || c.is_returned)
                    const partyName = c.party_name || c.party?.company_name || '—'
                    return (
                      <tr key={c.id} className="table-row-hover">
                        <td className="px-5 py-4">
                          <div className="font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs">{c.challan_number}</div>
                          {c.share_token && (
                            <a href={`/challan/view/${c.share_token}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-xs text-surface-400 hover:text-primary-500 mt-0.5">
                              <ExternalLink className="h-3 w-3" /> Share link
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-surface-500">
                          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(c.generated_at || c.created_at).toLocaleDateString('en-IN')}</div>
                        </td>
                        <td className="px-5 py-4">
                          {c.bill_number ? <span className="flex items-center gap-1 text-xs font-semibold text-primary-700 dark:text-primary-400"><Lock className="h-3 w-3 text-warning-500" />{c.bill_number}</span> : <span className="text-surface-400 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">{partyName}</td>
                        <td className="px-5 py-4 text-xs">{c.supplier || '—'}</td>
                        <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                        <td className="px-5 py-4 font-semibold text-xs">{c.grand_total ? `₹${parseFloat(c.grand_total).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setViewChallan(c)}>View</Button>
                            <Button variant="ghost" size="sm" icon={Download} onClick={() => downloadChallanHTML(c)}>Download</Button>
                            <Button variant="ghost" size="sm" icon={Printer} onClick={() => generateChallanPDF(c)}>Print</Button>
                            {!locked && <Button variant="ghost" size="sm" icon={Pencil} onClick={() => { setEditChallan(c); setEditForm({ reason: '', notes: c.notes || '', supplier: c.supplier || '', party_name: c.party_name || '', bill_number: '' }) }}>Edit</Button>}
                            {!c.is_returned && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => { setReturnTarget(c); setReturnForm({ reason: '' }) }} className="text-amber-600">Return</Button>}
                            {!locked && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(c)} className="text-danger-500">Delete</Button>}
                            <Button variant="ghost" size="sm" icon={History} onClick={() => setHistoryId(c.id)}>History</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Delivery Challan" size="xl">
        <form onSubmit={handlePreview} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">Party Name</label><input type="text" value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} className="input-base" placeholder="Customer / party name" /></div>
            <div><label className="label-base">Supplier</label><input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="input-base" placeholder="Supplier name" /></div>
            <div><label className="label-base">Bill Number <span className="text-danger-500">*</span></label><input type="text" value={form.bill_number} onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))} className="input-base" placeholder="Enter bill number" required /></div>
            <div><label className="label-base">Notes</label><input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" placeholder="Optional notes" /></div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-surface-500 uppercase pb-1 border-b border-surface-200 dark:border-surface-700">
              <div className="col-span-3">Part No *</div><div className="col-span-3">Description</div><div className="col-span-2">Qty *</div><div className="col-span-2">Price/Unit</div><div className="col-span-1">Total</div><div className="col-span-1"></div>
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
          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-surface-400">Party:</span><div className="font-medium">{form.party_name || '—'}</div></div>
            <div><span className="text-xs text-surface-400">Supplier:</span><div className="font-medium">{form.supplier || '—'}</div></div>
            <div><span className="text-xs text-surface-400">Bill No:</span><div className="font-semibold text-primary-700 dark:text-primary-400">{form.bill_number}</div></div>
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
          <div className="p-3 rounded-xl bg-warning-50 text-xs text-warning-700">Setting a bill number will lock this challan from further edits.</div>
          {[{ label: 'Notes', field: 'notes' }, { label: 'Supplier', field: 'supplier' }, { label: 'Party Name', field: 'party_name' }, { label: 'Bill Number (locks challan)', field: 'bill_number' }, { label: 'Edit Reason *', field: 'reason' }].map(({ label, field }) => (
            <div key={field}><label className="label-base">{label}</label><input type="text" value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} className="input-base" placeholder={label} /></div>
          ))}
          <div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setEditChallan(null)}>Cancel</Button><Button variant="primary" onClick={handleEdit}>Save Changes</Button></div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title={`Return Challan: ${returnTarget?.challan_number}`} size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 text-xs text-amber-700">Returning this challan will restore stock and lock it from edits/deletion.</div>
          <div><label className="label-base">Return Reason <span className="text-danger-500">*</span></label><textarea value={returnForm.reason} onChange={e => setReturnForm({ reason: e.target.value })} className="input-base min-h-[80px]" placeholder="Reason for return..." /></div>
          <div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancel</Button><Button variant="primary" onClick={handleReturn} className="bg-amber-600 hover:bg-amber-700">Confirm Return</Button></div>
        </div>
      </Modal>

      {/* View Modal */}
      {viewChallan && (
        <Modal open={!!viewChallan} onClose={() => setViewChallan(null)} title={`Challan: ${viewChallan.challan_number}`} size="lg">
          <div className="space-y-4">
            <StatusBadge status={viewChallan.status} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-surface-400">Party</span><div className="font-medium">{viewChallan.party_name || viewChallan.party?.company_name || '—'}</div></div>
              <div><span className="text-xs text-surface-400">Supplier</span><div className="font-medium">{viewChallan.supplier || '—'}</div></div>
              <div><span className="text-xs text-surface-400">Bill No</span><div className="font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-1">{viewChallan.bill_number ? <><Lock className="h-3 w-3" />{viewChallan.bill_number}</> : '—'}</div></div>
              <div><span className="text-xs text-surface-400">Notes</span><div>{viewChallan.notes || '—'}</div></div>
              {viewChallan.is_returned && <div className="col-span-2"><span className="text-xs text-surface-400">Return Reason</span><div className="text-amber-600">{viewChallan.return_reason}</div></div>}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-700">
              <Button variant="secondary" onClick={() => setViewChallan(null)}>Close</Button>
              <Button variant="secondary" icon={Download} onClick={() => downloadChallanHTML(viewChallan)}>Download HTML</Button>
              <Button icon={Printer} onClick={() => generateChallanPDF(viewChallan)}>Print PDF</Button>
            </div>
          </div>
        </Modal>
      )}

      <PinModal open={pinModalOpen} onVerify={handlePinVerified} onClose={() => { setPinModalOpen(false); setPendingAction(null) }} loading={pinLoading} />
      <EditHistoryModal open={!!historyId} onClose={() => setHistoryId(null)} challanId={historyId} />
    </div>
  )
}
