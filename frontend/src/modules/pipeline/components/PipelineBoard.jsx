import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Truck, Package, FileText, Building2, User as UserIcon, Phone,
  Loader2, PackageCheck, Home, CheckCircle2, XCircle, ClipboardList, ShieldAlert, GitBranch, Clock,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import {
  getPipelines, startDelivery, markDelivered, rejectPipeline,
} from '../../../api/endpoints/pipeline.api'
import { PIPELINE_FLOW, stageConfig } from '../constants'
import PipelineProgress from './PipelineProgress'
import IMApproveModal from './IMApproveModal'
import FulfillModal from './FulfillModal'

/**
 * PipelineBoard — one component powering the pipeline view for every role.
 * The backend already scopes which rows the caller can see (visibility gating);
 * here we render the actions the current role may perform on each stage:
 *
 *   Admin → can advance ANY stage (override), plus reject
 *   IM    → Approve & assign (at IM_APPROVAL), reject
 *   DW    → Start delivery / Mark delivered (their assigned rows)
 *   SM    → Mark sold (at DELIVERED)
 */
export default function PipelineBoard({ title, subtitle }) {
  const { user } = useAuthStore()
  const role = typeof user?.role === 'object' ? user.role.name : user?.role

  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const [imModal, setImModal] = useState(null)
  const [fulfillModal, setFulfillModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchPipelines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPipelines()
      if (res.success) setPipelines(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPipelines() }, [fetchPipelines])

  const filtered = useMemo(() => pipelines.filter(p => {
    const hay = `${p.order?.order_number || ''} ${p.order?.party?.company_name || ''} ${p.driver_name || ''} ${p.vehicle_number || ''}`.toLowerCase()
    const matchSearch = hay.includes(search.toLowerCase())
    const matchStage = stageFilter === 'all' || p.stage === stageFilter
    return matchSearch && matchStage
  }), [pipelines, search, stageFilter])

  const stats = useMemo(() => {
    const s = { total: pipelines.length }
    PIPELINE_FLOW.forEach(k => { s[k] = pipelines.filter(p => p.stage === k).length })
    return s
  }, [pipelines])

  const runAction = async (fn, id, hint) => {
    setBusyId(id)
    try {
      const res = await fn()
      if (res.success) { toast.success(res.message || hint); await fetchPipelines(); return true }
      toast.error(res.error || 'Action failed'); return false
    } catch (err) {
      toast.error(err.message || 'Action failed'); return false
    } finally {
      setBusyId(null)
    }
  }

  const onStart = (p) => runAction(() => startDelivery(p.id), p.id, 'Out for delivery')
  const onDeliver = (p) => runAction(() => markDelivered(p.id), p.id, 'Delivered')

  const submitReject = async () => {
    if (!rejectReason.trim()) return toast.error('Enter a reason')
    const ok = await runAction(() => rejectPipeline(rejectModal.id, rejectReason.trim()), rejectModal.id, 'Rejected')
    if (ok) { setRejectModal(null); setRejectReason('') }
  }

  const isAdmin = role === 'admin'

  // Actions per stage & role. Admin may act at any stage (override).
  const renderActions = (p) => {
    const busy = busyId === p.id
    const btns = []
    const canIM = isAdmin || role === 'inventory_manager'
    const canDW = isAdmin || role === 'dispatch_worker'
    const canSM = isAdmin || role === 'sales_manager'

    if (p.stage === 'IM_APPROVAL' && canIM) {
      btns.push(<Button key="im" size="sm" icon={PackageCheck} disabled={busy} onClick={() => setImModal(p)}>{isAdmin ? 'Override: Approve & Assign' : 'Approve & Assign'}</Button>)
    }
    if (p.stage === 'DW_ASSIGNMENT' && canDW) {
      btns.push(<Button key="sd" size="sm" icon={Truck} loading={busy} onClick={() => onStart(p)}>{isAdmin ? 'Override: Start' : 'Start Delivery'}</Button>)
    }
    if (p.stage === 'OUT_FOR_DELIVERY' && canDW) {
      btns.push(<Button key="dl" size="sm" icon={Home} loading={busy} onClick={() => onDeliver(p)}>{isAdmin ? 'Override: Delivered' : 'Mark Delivered'}</Button>)
    }
    if (p.stage === 'DELIVERED' && canSM) {
      btns.push(<Button key="ff" size="sm" variant="success" icon={CheckCircle2} disabled={busy} onClick={() => setFulfillModal(p)}>{isAdmin ? 'Override: Mark Received' : 'Mark Received'}</Button>)
    }
    if ((isAdmin || role === 'inventory_manager') && ['IM_APPROVAL', 'DW_ASSIGNMENT'].includes(p.stage)) {
      btns.push(<Button key="rj" size="sm" variant="danger" icon={XCircle} disabled={busy} onClick={() => setRejectModal(p)}>Reject</Button>)
    }

    if (btns.length === 0) return <span className="text-xs text-surface-400">No action</span>
    return <div className="flex flex-wrap justify-end gap-2">{btns}</div>
  }

  const pills = [
    { key: 'all', label: 'Total', value: stats.total },
    { key: 'IM_APPROVAL', label: 'IM Review', value: stats.IM_APPROVAL },
    { key: 'DW_ASSIGNMENT', label: 'Assigned', value: stats.DW_ASSIGNMENT },
    { key: 'OUT_FOR_DELIVERY', label: 'In Transit', value: stats.OUT_FOR_DELIVERY },
    { key: 'DELIVERED', label: 'Delivered', value: stats.DELIVERED },
    { key: 'FULFILLED', label: 'Fulfilled', value: stats.FULFILLED },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-surface-900 dark:text-surface-50">
          <GitBranch className="h-5 w-5 text-primary-600" /> {title || 'Fulfilment Pipeline'}
        </h1>
        <p className="text-sm text-surface-500">{subtitle || 'Track orders through the supply chain.'}</p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {pills.map(pill => (
          <button key={pill.key} onClick={() => setStageFilter(pill.key)} className={cn('rounded-xl border p-3 text-left transition-colors', stageFilter === pill.key ? 'border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20' : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800')}>
            <div className="text-2xl font-bold text-surface-900 dark:text-surface-50">{pill.value}</div>
            <div className="text-xs text-surface-500">{pill.label}</div>
          </button>
        ))}
      </div>

      {/* Admin override hint */}
      {isAdmin && (
        <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:border-warning-900/40 dark:bg-warning-900/20 dark:text-warning-400">
          <ShieldAlert className="h-4 w-4" /> As Admin you can advance any stalled stage on behalf of a role. Overrides are logged.
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input className="input-base w-full pl-9" placeholder="Search order, party, driver…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center dark:border-surface-700">
          <ClipboardList className="mx-auto h-8 w-8 text-surface-300" />
          <p className="mt-2 text-sm text-surface-500">No orders in the pipeline to show.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const cfg = stageConfig(p.stage)
            const StageIcon = cfg.icon
            return (
              <div key={p.id} className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-surface-900 dark:text-surface-50">{p.order?.order_number || `Order #${p.order_id}`}</span>
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', cfg.color)}>
                        <StageIcon className="h-3.5 w-3.5" /> {cfg.label}
                      </span>
                      {p.had_override && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700 dark:border-warning-900/40 dark:bg-warning-900/20 dark:text-warning-400">
                          <ShieldAlert className="h-3 w-3" /> Override
                        </span>
                      )}
                      {p.fulfillment?.state === 'COMPLETE' && (
                        <span className="rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700 dark:border-success-900/40 dark:bg-success-900/20 dark:text-success-400">COMPLETE</span>
                      )}
                    </div>
                    <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-surface-600 dark:text-surface-300 sm:grid-cols-2">
                      <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-surface-400" /> {p.order?.party?.company_name || '—'}</span>
                      <span className="flex items-center gap-1.5"><Package className="h-4 w-4 text-surface-400" /> {p.items?.length || 0} parts</span>
                      <span className="flex items-center gap-1.5"><UserIcon className="h-4 w-4 text-surface-400" /> DW: {p.dispatchWorker?.name || 'unassigned'}</span>
                      <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-surface-400" /> SM: {p.salesManager?.name || '—'}</span>
                      {p.driver_name && <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-surface-400" /> {p.driver_name} · {p.vehicle_number}</span>}
                      {p.driver_phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-surface-400" /> {p.driver_phone}</span>}
                      {p.expected_delivery_at && !['FULFILLED', 'DELIVERED', 'REJECTED'].includes(p.stage) && (
                        <span className="flex items-center gap-1.5 text-warning-600 dark:text-warning-400"><Clock className="h-4 w-4" /> Deliver by {new Date(p.expected_delivery_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>

                    {p.items?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.items.map(it => (
                          <span key={it.id} className="rounded-md bg-surface-100 px-2 py-0.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                            {it.product?.sku || `#${it.product_id}`} × {Number(it.quantity)}
                          </span>
                        ))}
                      </div>
                    )}

                    {p.stage === 'REJECTED' && p.reject_reason && (
                      <p className="mt-2 text-xs text-danger-600 dark:text-danger-400">Reason: {p.reject_reason}</p>
                    )}

                    <div className="mt-3"><PipelineProgress stage={p.stage} /></div>
                  </div>

                  <div className="lg:w-60 lg:shrink-0 lg:text-right">{renderActions(p)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <IMApproveModal pipeline={imModal} open={!!imModal} onClose={() => setImModal(null)} onDone={() => { setImModal(null); fetchPipelines() }} />
      <FulfillModal pipeline={fulfillModal} open={!!fulfillModal} onClose={() => setFulfillModal(null)} onDone={() => { setFulfillModal(null); fetchPipelines() }} />

      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason('') }} title="Reject Pipeline" size="md"
        footer={(<><Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason('') }}>Cancel</Button><Button variant="danger" loading={busyId === rejectModal?.id} onClick={submitReject}>Reject</Button></>)}>
        <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
          <span>Reason <span className="text-danger-500">*</span></span>
          <textarea className="input-base min-h-[100px] w-full" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
        </label>
      </Modal>
    </div>
  )
}
