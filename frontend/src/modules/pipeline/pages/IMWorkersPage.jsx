import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Truck, Users, Loader2, Package, Building2, Inbox, CheckCircle2,
  Clock, ClipboardList, UserCheck,
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getDispatchWorkers, getPipelines } from '../../../api/endpoints/pipeline.api'
import { getOrders } from '../../../api/endpoints/orders.api'
import AssignWorkerControl from '../components/AssignWorkerControl'
import { stageConfig } from '../constants'

const ACTIVE_STAGES = ['DW_ASSIGNMENT', 'OUT_FOR_DELIVERY']

// Deterministic soft colour per worker for their avatar.
const AVATAR_COLORS = [
  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
]
const initials = (name = '') => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

export default function IMWorkersPage() {
  const [workers, setWorkers] = useState([])
  const [pipelines, setPipelines] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, pRes, oRes] = await Promise.all([getDispatchWorkers(), getPipelines(), getOrders({ status: 'PENDING' })])
      if (wRes.success) setWorkers(wRes.data)
      if (pRes.success) setPipelines(pRes.data)
      if (oRes.success) setPendingOrders(oRes.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load dispatch workers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Per-worker workload derived from the pipeline rows.
  const workerStats = useMemo(() => {
    const map = {}
    workers.forEach(w => { map[w.id] = { active: [], outForDelivery: 0, delivered: 0, fulfilled: 0 } })
    pipelines.forEach(p => {
      if (!p.dw_id || !map[p.dw_id]) return
      if (p.stage === 'DW_ASSIGNMENT' || p.stage === 'OUT_FOR_DELIVERY') {
        map[p.dw_id].active.push(p)
        if (p.stage === 'OUT_FOR_DELIVERY') map[p.dw_id].outForDelivery += 1
      } else if (p.stage === 'DELIVERED') map[p.dw_id].delivered += 1
      else if (p.stage === 'FULFILLED') map[p.dw_id].fulfilled += 1
    })
    return map
  }, [workers, pipelines])

  // Orders placed by SM that still need the IM to approve + assign a worker:
  // still-PENDING orders (no pipeline yet) plus any legacy admin-approved rows.
  const awaitingPipelines = useMemo(
    () => pipelines.filter(p => p.stage === 'ADMIN_APPROVAL' || p.stage === 'IM_APPROVAL'),
    [pipelines]
  )
  const awaiting = useMemo(() => ([
    ...pendingOrders.map(o => ({ key: `o-${o.id}`, order_id: o.id, order_number: o.order_number, party: o.party, salesManager: o.salesManager, pipeline: null })),
    ...awaitingPipelines.map(p => ({ key: `p-${p.id}`, order_id: p.order_id, order_number: p.order?.order_number, party: p.order?.party, salesManager: p.salesManager, pipeline: p })),
  ]), [pendingOrders, awaitingPipelines])
  // Assigned but not yet delivered — can be reassigned.
  const inProgress = useMemo(
    () => pipelines.filter(p => ACTIVE_STAGES.includes(p.stage)),
    [pipelines]
  )

  const onAssigned = () => load()

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-surface-900 dark:text-surface-50">
          <Users className="h-5 w-5 text-primary-600" /> Dispatch Workers
        </h1>
        <p className="text-sm text-surface-500">View your delivery team and assign approved orders to them.</p>
      </div>

      {/* Worker roster */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((w, idx) => {
          const st = workerStats[w.id] || { active: [], outForDelivery: 0, delivered: 0, fulfilled: 0 }
          const activeLoad = st.active.length
          return (
            <div key={w.id} className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold', AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                  {initials(w.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-surface-900 dark:text-surface-50">{w.name}</div>
                  <div className="text-xs text-surface-400">{w.login_id}</div>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', activeLoad === 0 ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400' : 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400')}>
                  {activeLoad === 0 ? 'Idle' : `${activeLoad} active`}
                </span>
              </div>

              {/* Mini stats */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface-50 py-1.5 dark:bg-surface-700/40">
                  <div className="text-sm font-bold text-surface-900 dark:text-surface-50">{st.outForDelivery}</div>
                  <div className="text-[10px] text-surface-400">In transit</div>
                </div>
                <div className="rounded-lg bg-surface-50 py-1.5 dark:bg-surface-700/40">
                  <div className="text-sm font-bold text-surface-900 dark:text-surface-50">{st.delivered}</div>
                  <div className="text-[10px] text-surface-400">Delivered</div>
                </div>
                <div className="rounded-lg bg-surface-50 py-1.5 dark:bg-surface-700/40">
                  <div className="text-sm font-bold text-surface-900 dark:text-surface-50">{st.fulfilled}</div>
                  <div className="text-[10px] text-surface-400">Fulfilled</div>
                </div>
              </div>

              {/* Their active orders */}
              {st.active.length > 0 && (
                <div className="mt-3 space-y-1">
                  {st.active.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="truncate text-surface-600 dark:text-surface-300">{p.order?.order_number || `#${p.order_id}`}</span>
                      <span className="text-surface-400">{stageConfig(p.stage).label}</span>
                    </div>
                  ))}
                  {st.active.length > 3 && <div className="text-xs text-surface-400">+{st.active.length - 3} more</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Orders awaiting a worker */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-50">
          <Inbox className="h-4 w-4 text-warning-500" /> Orders awaiting a worker
          {awaiting.length > 0 && <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">{awaiting.length}</span>}
        </h2>
        {awaiting.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-300 py-10 text-center dark:border-surface-700">
            <CheckCircle2 className="mx-auto h-7 w-7 text-success-400" />
            <p className="mt-2 text-sm text-surface-500">No orders waiting — every order has a worker assigned.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {awaiting.map(item => (
              <div key={item.key} className="flex flex-col gap-3 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{item.order_number || `Order #${item.order_id}`}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-surface-500">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {item.party?.company_name || '—'}</span>
                    <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> {item.salesManager?.name || '—'}</span>
                  </div>
                </div>
                <AssignWorkerControl orderId={item.order_id} pipeline={item.pipeline} party={item.party} workers={workers} onAssigned={onAssigned} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned / in progress (reassign) */}
      {inProgress.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-50">
            <Truck className="h-4 w-4 text-primary-500" /> In progress
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">{inProgress.length}</span>
          </h2>
          <div className="space-y-2">
            {inProgress.map(p => {
              const cfg = stageConfig(p.stage)
              return (
                <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{p.order?.order_number || `Order #${p.order_id}`}</span>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', cfg.color)}>{cfg.label}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-surface-500">
                      <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {p.dispatchWorker?.name || '—'}</span>
                      <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {p.items?.length || 0} parts</span>
                      {p.expected_delivery_at && <span className="flex items-center gap-1 text-warning-600 dark:text-warning-400"><Clock className="h-3.5 w-3.5" /> by {new Date(p.expected_delivery_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                  <AssignWorkerControl orderId={p.order_id} pipeline={p} party={p.order?.party} workers={workers} onAssigned={onAssigned} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
