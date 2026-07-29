import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, Clock, GitBranch, CheckCircle2, XCircle, Shield,
  RefreshCcw, Activity, AlertTriangle, Loader2, ArrowRight, Package,
  TrendingUp, Users, Truck, FileText, FileUp,
} from 'lucide-react'
import Card, { CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import { getAnalyticsOverview } from '../../../api/endpoints/analytics.api'
import { PIPELINE_STAGE } from '../../pipeline/constants'

// ─── Small presentational helpers (no chart lib — hand-rolled SVG/CSS) ─────────

function KpiCard({ label, value, sub, icon: Icon, color = 'primary', to }) {
  const colors = {
    primary: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20',
    success: 'text-success-600 bg-success-50 dark:bg-success-900/20',
    warning: 'text-warning-600 bg-warning-50 dark:bg-warning-900/20',
    danger:  'text-danger-600 bg-danger-50 dark:bg-danger-900/20',
    blue:    'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  }
  const inner = (
    <Card className="h-full p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-surface-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-surface-400">{sub}</p>}
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colors[color])}><Icon className="h-4.5 w-4.5" /></div>
      </div>
    </Card>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function CompletionDonut({ completed, incomplete, rate }) {
  const total = completed + incomplete || 1
  const pct = Math.round((completed / total) * 100)
  const r = 52, c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" className="stroke-surface-200 dark:stroke-surface-700" />
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`} className="stroke-success-500 transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-50">{rate}%</span>
          <span className="text-[10px] uppercase tracking-wide text-surface-400">complete</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success-500" /> <span className="text-surface-600 dark:text-surface-300">Complete</span> <span className="font-semibold text-surface-900 dark:text-surface-50">{completed}</span></div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-surface-300 dark:bg-surface-600" /> <span className="text-surface-600 dark:text-surface-300">In progress</span> <span className="font-semibold text-surface-900 dark:text-surface-50">{incomplete}</span></div>
      </div>
    </div>
  )
}

function FunnelBars({ funnel }) {
  const max = Math.max(1, ...funnel.map(f => f.count))
  return (
    <div className="space-y-2.5">
      {funnel.map(f => {
        const cfg = PIPELINE_STAGE[f.stage]
        const Icon = cfg?.icon || Package
        return (
          <div key={f.stage} className="flex items-center gap-3">
            <div className="flex w-36 shrink-0 items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
              <Icon className="h-3.5 w-3.5 text-surface-400" /> {f.label}
            </div>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-100 dark:bg-surface-700">
              <div className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-primary-400 to-primary-600 px-2 text-[11px] font-semibold text-white transition-all duration-700"
                style={{ width: `${Math.max(6, (f.count / max) * 100)}%` }}>
                {f.count > 0 && f.count}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ThroughputBars({ throughput }) {
  const max = Math.max(1, ...throughput.map(t => t.count))
  return (
    <div className="flex h-32 items-end gap-1">
      {throughput.map(t => (
        <div key={t.date} className="group flex flex-1 flex-col items-center gap-1" title={`${t.date}: ${t.count}`}>
          <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
            <div className="w-full rounded-t bg-primary-500/80 transition-all duration-500 group-hover:bg-primary-600"
              style={{ height: `${(t.count / max) * 100}%`, minHeight: t.count > 0 ? '4px' : '0' }} />
          </div>
          <span className="text-[8px] text-surface-400">{new Date(t.date).getDate()}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAnalyticsOverview()
      if (res.success) setData(res.data)
      else toast.error(res.error || 'Failed to load analytics')
    } catch (err) {
      toast.error(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-surface-400"><Loader2 className="h-7 w-7 animate-spin" /></div>
  }
  if (!data) {
    return <div className="py-24 text-center text-surface-500">No analytics available. <button className="text-primary-600 underline" onClick={fetchData}>Retry</button></div>
  }

  const h = data.headline
  const worst = data.worst_bottleneck

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}</h1>
          <p className="text-sm text-surface-500">Live view of the fulfilment pipeline and its health.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={fetchData}>Refresh</Button>
          <Link to="/admin/challans" state={{ activeTab: 'new-challan' }}><Button size="sm" variant="secondary" icon={FileText}>Create Challan</Button></Link>
          <Link to="/admin/purchase-orders" state={{ openNewPO: true }}><Button size="sm" variant="secondary" icon={FileUp}>Create PO</Button></Link>
          <Link to="/admin/pipeline"><Button size="sm" icon={GitBranch}>Open Pipeline</Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total Orders" value={h.total_orders} icon={ShoppingCart} color="primary" to="/admin/challans" />
        <KpiCard label="Awaiting Approval" value={h.pending_admin_approval} sub="need admin action" icon={Clock} color="warning" to="/admin/pipeline" />
        <KpiCard label="In Pipeline" value={h.in_pipeline} sub="active orders" icon={Truck} color="blue" to="/admin/pipeline" />
        <KpiCard label="Completed" value={h.completed} sub={`${h.completion_rate}% completion`} icon={CheckCircle2} color="success" />
      </div>

      {/* Row: completion + funnel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Order Completion</CardTitle><CardDescription>Master ledger — sold vs still in progress</CardDescription></CardHeader>
          <div className="p-5 pt-2"><CompletionDonut completed={data.completion.completed} incomplete={data.completion.incomplete} rate={data.completion.rate} /></div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pipeline Funnel</CardTitle><CardDescription>Orders currently at each stage</CardDescription></CardHeader>
          <div className="p-5 pt-2"><FunnelBars funnel={data.funnel} /></div>
        </Card>
      </div>

      {/* Row: bottleneck + throughput */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Stage Dwell Times</CardTitle><CardDescription>Average hours spent before advancing</CardDescription></CardHeader>
          <div className="space-y-3 p-5 pt-2">
            {worst && worst.avg_hours > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:border-warning-900/40 dark:bg-warning-900/20 dark:text-warning-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Biggest bottleneck: <strong>{worst.label}</strong> (~{worst.avg_hours}h avg)
              </div>
            )}
            <div className="space-y-2">
              {data.bottlenecks.map(b => {
                const maxH = Math.max(1, ...data.bottlenecks.map(x => x.avg_hours))
                const isWorst = worst && b.stage === worst.stage && b.avg_hours > 0
                return (
                  <div key={b.stage} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs text-surface-600 dark:text-surface-300">{b.label}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-surface-100 dark:bg-surface-700">
                      <div className={cn('h-full rounded transition-all duration-700', isWorst ? 'bg-warning-500' : 'bg-primary-400')} style={{ width: `${Math.max(3, (b.avg_hours / maxH) * 100)}%` }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs font-medium text-surface-500">{b.avg_hours}h</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Throughput</CardTitle><CardDescription>Orders fulfilled per day (last 14 days)</CardDescription></CardHeader>
          <div className="p-5 pt-2"><ThroughputBars throughput={data.throughput} /></div>
        </Card>
      </div>

      {/* Row: overrides + reorder pressure + workload */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-warning-500" /> Admin Overrides</CardTitle><CardDescription>{h.total_overrides} total</CardDescription></CardHeader>
          <div className="p-5 pt-2">
            {data.overrides.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-400">No overrides — pipeline flowing smoothly.</p>
            ) : (
              <div className="space-y-2">
                {data.overrides.map(o => (
                  <div key={o.stage} className="flex items-center justify-between text-sm">
                    <span className="text-surface-600 dark:text-surface-300">{o.label}</span>
                    <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">{o.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><RefreshCcw className="h-4 w-4 text-primary-500" /> Reorder Pressure</CardTitle><CardDescription>Top parts awaiting reorder</CardDescription></CardHeader>
          <div className="p-5 pt-2">
            {data.reorder_pressure.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-400">No open reorder requests.</p>
            ) : (
              <div className="space-y-2">
                {data.reorder_pressure.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 flex-1 truncate text-surface-600 dark:text-surface-300">{p.name} <span className="text-surface-400">{p.sku}</span></span>
                    <span className="ml-2 shrink-0 font-semibold text-surface-900 dark:text-surface-50">{p.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-500" /> Active Workload</CardTitle><CardDescription>Live assignments per person</CardDescription></CardHeader>
          <div className="space-y-3 p-5 pt-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-surface-400">Inventory Managers</p>
              {data.workload.im.length === 0 ? <p className="text-xs text-surface-400">None active</p> : data.workload.im.map((w, i) => (
                <div key={i} className="flex justify-between text-sm"><span className="text-surface-600 dark:text-surface-300">{w.name}</span><span className="font-medium text-surface-500">{w.count}</span></div>
              ))}
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-surface-400">Dispatch Workers</p>
              {data.workload.dw.length === 0 ? <p className="text-xs text-surface-400">None active</p> : data.workload.dw.map((w, i) => (
                <div key={i} className="flex justify-between text-sm"><span className="text-surface-600 dark:text-surface-300">{w.name}</span><span className="font-medium text-surface-500">{w.count}</span></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Footer chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"><XCircle className="h-5 w-5 text-danger-500" /><div><p className="text-lg font-bold text-surface-900 dark:text-surface-50">{h.rejected}</p><p className="text-xs text-surface-500">Rejected</p></div></div>
        <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"><Activity className="h-5 w-5 text-primary-500" /><div><p className="text-lg font-bold text-surface-900 dark:text-surface-50">{h.in_pipeline}</p><p className="text-xs text-surface-500">In pipeline</p></div></div>
        <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"><RefreshCcw className="h-5 w-5 text-warning-500" /><div><p className="text-lg font-bold text-surface-900 dark:text-surface-50">{h.open_reorder_flags}</p><p className="text-xs text-surface-500">Open reorders</p></div></div>
        <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"><TrendingUp className="h-5 w-5 text-success-500" /><div><p className="text-lg font-bold text-surface-900 dark:text-surface-50">{h.completion_rate}%</p><p className="text-xs text-surface-500">Completion</p></div></div>
      </div>
    </div>
  )
}
