import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Home, CheckCircle2, Truck, ArrowRight, Inbox, Loader2, GitBranch, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { getPipelineStats, getPipelines } from '../../../api/endpoints/pipeline.api'
import { stageConfig } from '../../pipeline/constants'
import { cn } from '../../../utils/cn'
import Button from '../../../components/ui/Button'

export default function SMDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({})
  const [awaiting, setAwaiting] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, listRes] = await Promise.all([getPipelineStats(), getPipelines()])
      if (statsRes.success) setStats(statsRes.data)
      // Highlight deliveries waiting for the SM to mark sold.
      if (listRes.success) setAwaiting(listRes.data.filter(p => p.stage === 'DELIVERED'))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const kpis = [
    { label: 'In transit', value: stats.OUT_FOR_DELIVERY || 0, icon: Truck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Awaiting sale', value: stats.DELIVERED || 0, icon: Home, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Fulfilled', value: stats.FULFILLED || 0, icon: CheckCircle2, color: 'text-success-600 bg-success-50 dark:bg-success-900/20' },
    { label: 'In pipeline', value: (stats.ADMIN_APPROVAL || 0) + (stats.IM_APPROVAL || 0) + (stats.DW_ASSIGNMENT || 0), icon: GitBranch, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Hi {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-surface-500">Your orders as they move through fulfilment.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/sm/orders"><Button size="sm" variant="secondary" icon={ShoppingCart}>Orders</Button></Link>
          <Link to="/sm/pipeline"><Button size="sm" icon={GitBranch}>Pipeline</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-medium text-surface-500">{k.label}</p><p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50">{k.value}</p></div>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', k.color)}><k.icon className="h-4.5 w-4.5" /></div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Delivered — ready to mark sold</h2>
          <Link to="/sm/pipeline" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : awaiting.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-300 py-12 text-center dark:border-surface-700">
            <Inbox className="mx-auto h-7 w-7 text-surface-300" />
            <p className="mt-2 text-sm text-surface-500">No deliveries awaiting a sale confirmation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {awaiting.map(p => {
              const cfg = stageConfig(p.stage)
              return (
                <Link key={p.id} to="/sm/pipeline" className="flex items-center justify-between rounded-xl border border-surface-200 bg-white p-3 transition-colors hover:border-primary-300 dark:border-surface-700 dark:bg-surface-800">
                  <div>
                    <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{p.order?.order_number || `Order #${p.order_id}`}</div>
                    <div className="mt-0.5 text-xs text-surface-500">{p.order?.party?.company_name || '—'} · {p.items?.length || 0} parts</div>
                  </div>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', cfg.color)}>{cfg.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
