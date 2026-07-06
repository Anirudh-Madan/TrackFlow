import { useState, useEffect } from 'react'
import { CheckCircle2, RefreshCw, Send } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import toast from 'react-hot-toast'
import { fulfill } from '../../../api/endpoints/pipeline.api'

/**
 * FulfillModal — Sales Manager marks the order sold. This mandatorily notifies
 * the Inventory Manager ("Order sold") and, by default, raises a reorder request
 * for the same parts based on customer demand.
 */
export default function FulfillModal({ pipeline, open, onClose, onDone }) {
  const [reorder, setReorder] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!open) { setReorder(true); setNote('') } }, [open])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fulfill(pipeline.id, { reorder, note: note || undefined })
      if (res.success) { toast.success(res.message || 'Order marked sold'); onDone?.() }
      else toast.error(res.error || 'Failed')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const items = pipeline?.items || []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark Order Sold"
      description="Confirm the sale. This notifies the Inventory Manager and can auto-raise a reorder."
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" icon={CheckCircle2} loading={submitting} onClick={submit}>Confirm Sale</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400"><Send className="h-3.5 w-3.5" /> The IM will be notified: "Order sold"</p>
          <div className="space-y-1">
            {items.map(it => (
              <div key={it.id} className="flex justify-between text-sm text-surface-600 dark:text-surface-300">
                <span>{it.product?.name || `#${it.product_id}`} <span className="text-surface-400">({it.product?.sku})</span></span>
                <span>× {Number(it.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700 cursor-pointer">
          <input type="checkbox" checked={reorder} onChange={(e) => setReorder(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-surface-900 dark:text-surface-50"><RefreshCw className="h-3.5 w-3.5" /> Request reorder for the same parts</span>
            <span className="text-xs text-surface-500">Raises a reorder request to the IM based on customer demand.</span>
          </span>
        </label>

        <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
          <span>Note to IM (optional)</span>
          <textarea className="input-base min-h-[70px] w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer wants double quantity next month." />
        </label>
      </div>
    </Modal>
  )
}
