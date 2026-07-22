import { useState, useEffect, useCallback } from 'react'
import {
  Inbox, RefreshCw, PackagePlus, Loader2, Check, ShoppingCart,
  X, Building2, FileText, Clock,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import TablePagination from '../../../components/data/TablePagination'
import {
  getPartRequests, acknowledgeRequest, reorderRequest, closeRequest,
} from '../../../api/endpoints/partRequests.api'

const STATUS_META = {
  OPEN:         { label: 'Open', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' },
  ORDERED:      { label: 'Ordered', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400' },
  CLOSED:       { label: 'Closed', color: 'bg-surface-100 text-surface-500 border-surface-200 dark:bg-surface-700 dark:text-surface-400' },
}

export default function IMRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage]     = useState(1)

  useEffect(() => { setPage(1) }, [filter])
  const [newPartModal, setNewPartModal] = useState(null)
  const [npForm, setNpForm] = useState({ sku: '', selling_price: '', purchase_price: '' })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPartRequests()
      if (res.success) setRequests(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const run = async (fn, id, hint) => {
    setBusyId(id)
    try {
      const res = await fn()
      if (res.success) { toast.success(res.message || hint); await fetchRequests(); return true }
      toast.error(res.error || 'Failed'); return false
    } catch (err) { toast.error(err.message || 'Failed'); return false }
    finally { setBusyId(null) }
  }

  const onAck = (r) => run(() => acknowledgeRequest(r.id), r.id, 'Acknowledged')
  const onClose = (r) => run(() => closeRequest(r.id), r.id, 'Closed')
  const onReorder = (r) => {
    if (r.type === 'NEW_PART' && !r.product_id) { setNpForm({ sku: '', selling_price: '', purchase_price: '' }); setNewPartModal(r); return }
    return run(() => reorderRequest(r.id), r.id, 'Reorder placed')
  }
  const submitNewPart = async () => {
    const ok = await run(() => reorderRequest(newPartModal.id, {
      sku: npForm.sku || undefined,
      selling_price: npForm.selling_price ? Number(npForm.selling_price) : undefined,
      purchase_price: npForm.purchase_price ? Number(npForm.purchase_price) : undefined,
    }), newPartModal.id, 'New part created & reorder placed')
    if (ok) setNewPartModal(null)
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const openCount = requests.filter(r => r.status === 'OPEN').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-surface-900 dark:text-surface-50">
          <Inbox className="h-5 w-5 text-primary-600" /> Part Requests
        </h1>
        <p className="text-sm text-surface-500">{openCount} open request{openCount === 1 ? '' : 's'} from Sales Managers.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'OPEN', 'ACKNOWLEDGED', 'ORDERED', 'CLOSED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors', filter === f ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300')}>{f === 'all' ? 'All' : STATUS_META[f].label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center dark:border-surface-700">
          <p className="text-sm text-surface-500">No requests to show.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice((page - 1) * 50, page * 50).map(r => {
            const meta = STATUS_META[r.status]
            const isNew = r.type === 'NEW_PART'
            return (
              <div key={r.id} className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold', isNew ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400')}>
                        {isNew ? <PackagePlus className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />} {isNew ? 'New Part' : 'Reorder'}
                      </span>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', meta.color)}>{meta.label}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-50">
                      {isNew ? r.proposed_name : (r.product?.name || `Product #${r.product_id}`)}
                      {r.product?.sku && <span className="ml-1.5 text-xs font-normal text-surface-400">{r.product.sku}</span>}
                      <span className="ml-2 text-surface-500">× {r.quantity}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {r.requester?.name || '—'}</span>
                      {r.order?.order_number && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.order.order_number}</span>}
                      {r.customer?.company_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {r.customer.company_name}</span>}
                    </div>
                    {r.notes && <p className="mt-2 rounded-lg bg-surface-50 px-2.5 py-1.5 text-xs text-surface-600 dark:bg-surface-700/50 dark:text-surface-300">{r.notes}</p>}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                    {r.status === 'OPEN' && <Button size="sm" variant="secondary" icon={Check} loading={busyId === r.id} onClick={() => onAck(r)}>Acknowledge</Button>}
                    {(r.status === 'OPEN' || r.status === 'ACKNOWLEDGED') && <Button size="sm" icon={ShoppingCart} loading={busyId === r.id} onClick={() => onReorder(r)}>{isNew ? 'Create & Order' : 'Place Reorder'}</Button>}
                    {r.status !== 'CLOSED' && r.status !== 'ORDERED' && <Button size="sm" variant="ghost" icon={X} loading={busyId === r.id} onClick={() => onClose(r)}>Close</Button>}
                  </div>
                </div>
              </div>
            )
          })}
          <TablePagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={50}
            onPageChange={setPage}
          />
        </div>
      )}

      <Modal open={!!newPartModal} onClose={() => setNewPartModal(null)} title="Create New Part & Reorder" description="This creates one product with a single SKU used everywhere." size="md"
        footer={(<><Button variant="secondary" onClick={() => setNewPartModal(null)}>Cancel</Button><Button loading={busyId === newPartModal?.id} onClick={submitNewPart}>Create & Order</Button></>)}>
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-50 p-3 text-sm dark:bg-surface-700/50">
            <span className="text-surface-500">Requested part:</span> <span className="font-medium text-surface-900 dark:text-surface-50">{newPartModal?.proposed_name}</span>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>SKU (optional — auto-generated if blank)</span><input className="input-base w-full" value={npForm.sku} onChange={(e) => setNpForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. CLP-HD-320" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Selling price</span><input type="number" className="input-base w-full" value={npForm.selling_price} onChange={(e) => setNpForm(f => ({ ...f, selling_price: e.target.value }))} placeholder="0.00" /></label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Purchase price</span><input type="number" className="input-base w-full" value={npForm.purchase_price} onChange={(e) => setNpForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0.00" /></label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
