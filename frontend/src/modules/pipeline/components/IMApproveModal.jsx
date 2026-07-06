import { useState, useEffect } from 'react'
import { Loader2, Package, AlertTriangle, Truck } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getAvailableParts, getDispatchWorkers, imApprove } from '../../../api/endpoints/pipeline.api'

/**
 * IMApproveModal — the Inventory Manager (or Admin override) picks which
 * available parts to dispatch and assigns a Dispatch Worker, all in one step.
 */
export default function IMApproveModal({ pipeline, open, onClose, onDone }) {
  const [parts, setParts] = useState([])
  const [selected, setSelected] = useState({})
  const [workers, setWorkers] = useState([])
  const [form, setForm] = useState({ dw_id: '', vehicle_number: '', driver_name: '', driver_phone: '' })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !pipeline) return
    setLoading(true)
    Promise.all([getAvailableParts(pipeline.order_id), getDispatchWorkers()])
      .then(([partsRes, wRes]) => {
        if (partsRes.success) {
          const p = partsRes.data.parts || []
          setParts(p)
          const init = {}
          p.forEach(part => { init[part.product_id] = { checked: part.dispatchable > 0, qty: part.dispatchable } })
          setSelected(init)
        }
        if (wRes.success) setWorkers(wRes.data)
      })
      .catch(err => toast.error(err.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [open, pipeline])

  useEffect(() => {
    if (!open) { setForm({ dw_id: '', vehicle_number: '', driver_name: '', driver_phone: '' }); setParts([]); setSelected({}) }
  }, [open])

  const toggle = (pid) => setSelected(s => ({ ...s, [pid]: { ...s[pid], checked: !s[pid].checked } }))
  const setQty = (pid, qty) => setSelected(s => ({ ...s, [pid]: { ...s[pid], qty } }))

  const submit = async () => {
    if (!form.dw_id) return toast.error('Select a dispatch worker')
    const items = parts
      .filter(p => selected[p.product_id]?.checked)
      .map(p => ({ product_id: p.product_id, quantity: Number(selected[p.product_id].qty) }))
      .filter(i => i.quantity > 0)
    if (items.length === 0) return toast.error('Select at least one part with a quantity')
    for (const it of items) {
      const part = parts.find(p => p.product_id === it.product_id)
      if (part && it.quantity > part.available) return toast.error(`${part.name}: only ${part.available} available`)
    }

    setSubmitting(true)
    try {
      const res = await imApprove(pipeline.id, { ...form, items })
      if (res.success) { toast.success(res.message || 'Approved & assigned'); onDone?.() }
      else toast.error(res.error || 'Failed')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve & Assign"
      description="Pick the parts to dispatch from available stock and assign a worker."
      size="xl"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={submitting} onClick={submit}>Approve & Assign</Button>
        </>
      )}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-surface-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-5">
          {/* Parts picker */}
          <div className="rounded-2xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Available parts</h3>
            </div>
            {parts.length === 0 ? (
              <p className="py-4 text-sm text-surface-400">No line items on this order.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1.5fr_0.8fr_0.8fr_0.9fr] gap-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
                  <span></span><span>Part (SKU)</span><span className="text-right">Ordered</span><span className="text-right">Available</span><span className="text-right">Dispatch Qty</span>
                </div>
                {parts.map(part => {
                  const sel = selected[part.product_id] || { checked: false, qty: 0 }
                  const insufficient = part.available < part.ordered_quantity
                  return (
                    <div key={part.product_id} className={cn('grid grid-cols-[auto_1.5fr_0.8fr_0.8fr_0.9fr] items-center gap-3 rounded-lg border p-2.5', sel.checked ? 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/10' : 'border-surface-200 dark:border-surface-700')}>
                      <input type="checkbox" checked={sel.checked} disabled={part.available <= 0} onChange={() => toggle(part.product_id)} className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-surface-900 dark:text-surface-50">{part.name}</div>
                        <div className="text-xs text-surface-400">{part.sku}</div>
                      </div>
                      <div className="text-right text-sm text-surface-600 dark:text-surface-300">{part.ordered_quantity}</div>
                      <div className={cn('text-right text-sm font-medium', part.available <= 0 ? 'text-danger-600' : insufficient ? 'text-warning-600' : 'text-success-600')}>{part.available}</div>
                      <input type="number" min="0" max={part.available} disabled={!sel.checked} value={sel.qty} onChange={(e) => setQty(part.product_id, e.target.value)} className="input-base w-full text-right disabled:opacity-50" />
                    </div>
                  )
                })}
                {parts.some(p => p.available < p.ordered_quantity) && (
                  <p className="flex items-center gap-1.5 pt-1 text-xs text-warning-600 dark:text-warning-400"><AlertTriangle className="h-3.5 w-3.5" /> Some parts have less stock than ordered — dispatch what's available.</p>
                )}
              </div>
            )}
          </div>

          {/* Worker + logistics */}
          <div className="rounded-2xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="mb-3 flex items-center gap-2"><Truck className="h-4 w-4 text-surface-400" /><h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Assign worker</h3></div>
            <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Dispatch Worker <span className="text-danger-500">*</span></span>
              <select className="input-base w-full" value={form.dw_id} onChange={(e) => setForm(f => ({ ...f, dw_id: e.target.value }))}>
                <option value="">Select a worker…</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.login_id})</option>)}
              </select>
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Vehicle No.</span><input className="input-base w-full" value={form.vehicle_number} onChange={(e) => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="KA01 AB 1234" /></label>
              <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Driver</span><input className="input-base w-full" value={form.driver_name} onChange={(e) => setForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="Driver name" /></label>
              <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200"><span>Phone</span><input className="input-base w-full" value={form.driver_phone} onChange={(e) => setForm(f => ({ ...f, driver_phone: e.target.value }))} placeholder="9876543210" /></label>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
