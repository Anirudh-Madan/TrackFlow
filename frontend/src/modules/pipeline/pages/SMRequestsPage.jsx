import { useState, useEffect, useCallback } from 'react'
import {
  Send, RefreshCw, PackagePlus, Loader2, Plus, Building2, FileText,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getPartRequests, createPartRequest } from '../../../api/endpoints/partRequests.api'
import { getProducts } from '../../../api/endpoints/products.api'

const STATUS_META = {
  OPEN:         { label: 'Open', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' },
  ORDERED:      { label: 'Ordered', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400' },
  CLOSED:       { label: 'Closed', color: 'bg-surface-100 text-surface-500 border-surface-200 dark:bg-surface-700 dark:text-surface-400' },
}

export default function SMRequestsPage() {
  const [requests, setRequests] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ type: 'REORDER', product_id: '', proposed_name: '', quantity: 1, notes: '' })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPartRequests()
      if (res.success) setRequests(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
    getProducts().then(res => { if (res.success) setProducts(res.data.rows || res.data) }).catch(() => {})
  }, [fetchRequests])

  const openModal = () => { setForm({ type: 'REORDER', product_id: '', proposed_name: '', quantity: 1, notes: '' }); setModal(true) }

  const submit = async () => {
    if (form.type === 'REORDER' && !form.product_id) return toast.error('Pick a product')
    if (form.type === 'NEW_PART' && !form.proposed_name.trim()) return toast.error('Enter the part name')
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error('Enter a quantity')
    setSubmitting(true)
    try {
      const payload = {
        type: form.type,
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
        ...(form.type === 'REORDER' ? { product_id: Number(form.product_id) } : { proposed_name: form.proposed_name.trim() }),
      }
      const res = await createPartRequest(payload)
      if (res.success) { toast.success('Request sent to Inventory Manager'); setModal(false); fetchRequests() }
      else toast.error(res.error || 'Failed')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-surface-900 dark:text-surface-50">
            <Send className="h-5 w-5 text-primary-600" /> My Part Requests
          </h1>
          <p className="text-sm text-surface-500">Reorders and new-part requests you've sent to Inventory.</p>
        </div>
        <Button icon={Plus} onClick={openModal}>New Request</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center dark:border-surface-700">
          <p className="text-sm text-surface-500">You haven't sent any requests yet.</p>
          <Button className="mt-3" size="sm" icon={Plus} onClick={openModal}>New Request</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const meta = STATUS_META[r.status]
            const isNew = r.type === 'NEW_PART'
            return (
              <div key={r.id} className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold', isNew ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400')}>
                    {isNew ? <PackagePlus className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />} {isNew ? 'New Part' : 'Reorder'}
                  </span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', meta.color)}>{meta.label}</span>
                  <span className="ml-auto text-xs text-surface-400">to {r.assignedIM?.name || 'Inventory'}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-surface-900 dark:text-surface-50">
                  {isNew ? r.proposed_name : (r.product?.name || `Product #${r.product_id}`)}
                  {r.product?.sku && <span className="ml-1.5 text-xs font-normal text-surface-400">{r.product.sku}</span>}
                  <span className="ml-2 text-surface-500">× {r.quantity}</span>
                </div>
                {r.notes && <p className="mt-2 text-xs text-surface-500">{r.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Part Request" description="Ask Inventory to reorder a part or stock a new one." size="md"
        footer={(<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button icon={Send} loading={submitting} onClick={submit}>Send Request</Button></>)}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {['REORDER', 'NEW_PART'].map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} className={cn('flex-1 rounded-xl border p-3 text-sm font-medium transition-colors', form.type === t ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400' : 'border-surface-200 text-surface-600 dark:border-surface-700 dark:text-surface-300')}>
                {t === 'REORDER' ? 'Reorder existing' : 'Request new part'}
              </button>
            ))}
          </div>

          {form.type === 'REORDER' ? (
            <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Product</span>
              <select className="input-base w-full" value={form.product_id} onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))}>
                <option value="">Select a product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </label>
          ) : (
            <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Part name</span>
              <input className="input-base w-full" value={form.proposed_name} onChange={(e) => setForm(f => ({ ...f, proposed_name: e.target.value }))} placeholder="e.g. Heavy-Duty Clutch Plate 320mm" />
            </label>
          )}

          <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Quantity</span><input type="number" min="1" className="input-base w-full" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} /></label>
          <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Notes (optional)</span><textarea className="input-base min-h-[70px] w-full" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Context for the Inventory Manager." /></label>
        </div>
      </Modal>
    </div>
  )
}
