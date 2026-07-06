import { useState } from 'react'
import { UserCheck, Loader2, Check, Truck } from 'lucide-react'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { quickAssignWorker } from '../../../api/endpoints/pipeline.api'

/**
 * AssignWorkerControl — a compact "assign Dispatch Worker" dropdown + button for
 * use inside the IM's Orders and Challans lists.
 *
 * DW assignment lives on the order's pipeline row, so this only acts once the
 * order is in the pipeline (Admin-approved). It talks to the same endpoint the
 * pipeline uses, so there is a single source of truth for who the worker is.
 *
 * Props:
 *   orderId   — the order this control assigns for
 *   pipeline  — the pipeline row for this order (or null if not yet in pipeline)
 *   workers   — [{ id, name }] list of dispatch workers
 *   onAssigned(updatedPipeline) — called after a successful assign/reassign
 */
export default function AssignWorkerControl({ orderId, pipeline, workers = [], onAssigned }) {
  const [dwId, setDwId] = useState(pipeline?.dw_id ? String(pipeline.dw_id) : '')
  const [busy, setBusy] = useState(false)

  // Assignable only when the order is in the pipeline and pre-delivery.
  const stage = pipeline?.stage
  const notInPipeline = !pipeline
  const tooLate = pipeline && !['ADMIN_APPROVAL', 'IM_APPROVAL', 'DW_ASSIGNMENT'].includes(stage)
  const disabled = tooLate

  const currentName = pipeline?.dispatchWorker?.name

  // If it's already assigned and moved on, just show who has it.
  if (tooLate && currentName) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-surface-500">
        <Truck className="h-3.5 w-3.5" /> {currentName}
      </span>
    )
  }

  if (disabled) {
    return (
      <span className="whitespace-nowrap text-xs text-surface-400" title="Assignment window has passed">
        —
      </span>
    )
  }

  const assign = async () => {
    if (!dwId) return toast.error('Pick a worker first')
    setBusy(true)
    try {
      const res = await quickAssignWorker(orderId, Number(dwId))
      if (res.success) {
        toast.success(res.message || 'Worker assigned')
        onAssigned?.(res.data)
      } else {
        toast.error(res.error || 'Failed to assign')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to assign')
    } finally {
      setBusy(false)
    }
  }

  const isReassign = stage === 'DW_ASSIGNMENT'
  const isApproval = notInPipeline || stage === 'ADMIN_APPROVAL' || stage === 'IM_APPROVAL'
  const selectLabel = isReassign ? 'Reassign…' : isApproval ? 'Approve & assign…' : 'Assign worker…'
  const buttonLabel = isReassign ? 'Reassign' : isApproval ? 'Approve' : 'Assign'

  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className="relative">
        <UserCheck className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
        <select
          value={dwId}
          onChange={(e) => setDwId(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="h-8 rounded-lg border border-surface-200 bg-white pl-7 pr-2 text-xs text-surface-700 focus:border-primary-400 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
        >
          <option value="">{selectLabel}</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); assign() }}
        disabled={busy || !dwId}
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-white transition-colors',
          busy || !dwId ? 'bg-surface-300 dark:bg-surface-600' : 'bg-primary-600 hover:bg-primary-500'
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {buttonLabel}
      </button>
    </div>
  )
}
