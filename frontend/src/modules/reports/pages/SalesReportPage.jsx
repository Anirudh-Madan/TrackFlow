import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, TrendingUp, TrendingDown, RefreshCcw,
  ShoppingCart, DollarSign, Package, FileText, Users, Truck,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getSalesReport } from '../../../api/endpoints/reports.api'
import TablePagination from '../../../components/data/TablePagination'

// ─── helpers ─────────────────────────────────────────────────────────────────
const formatDateLocal = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
const today = new Date()
const PRESETS = {
  today:     { label: 'Today',      start: formatDateLocal(today), end: formatDateLocal(today) },
  sevenDays: { label: '7 Days',     start: formatDateLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate()-6)), end: formatDateLocal(today) },
  thisMonth: { label: 'This Month', start: formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1)), end: formatDateLocal(today) },
  lastMonth: { label: 'Last Month', start: formatDateLocal(new Date(today.getFullYear(), today.getMonth()-1, 1)), end: formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 0)) },
}
const fINR = (v) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(v ?? 0)
const fNum  = (v) => new Intl.NumberFormat('en-IN').format(v ?? 0)
const fPct  = (v) => `${Number(v ?? 0).toFixed(1)}%`

function Trend({ pct }) {
  if (pct == null) return null
  const up = pct >= 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400')}>
      {up ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
      {up ? '+' : ''}{fPct(pct)}
    </span>
  )
}

function KpiCard({ label, value, sub, trend, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20',
    success: 'text-success-600 bg-success-50 dark:bg-success-900/20',
    warning: 'text-warning-600 bg-warning-50 dark:bg-warning-900/20',
    blue:    'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  }
  return (
    <div className="card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-surface-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight truncate">{value}</p>
          <div className="mt-1 flex items-center gap-2">
            {sub && <p className="text-xs text-surface-400">{sub}</p>}
            <Trend pct={trend} />
          </div>
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colors[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────
export default function SalesReportPage() {
  const [preset, setPreset]   = useState('thisMonth')
  const [start,  setStart]    = useState(PRESETS.thisMonth.start)
  const [end,    setEnd]      = useState(PRESETS.thisMonth.end)
  const [showCustom, setShowCustom] = useState(false)
  const [customS, setCustomS] = useState(start)
  const [customE, setCustomE] = useState(end)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [smPage,  setSmPage]  = useState(1)

  useEffect(() => { setSmPage(1) }, [start, end])

  const fetchReport = useCallback(async (s, e) => {
    setLoading(true)
    try {
      const res = await getSalesReport({ startDate: s, endDate: e })
      if (res.success) setData(res.data)
      else toast.error(res.error || 'Failed to load report')
    } catch (err) {
      toast.error(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReport(start, end) }, [start, end])

  const applyPreset = (key) => {
    const p = PRESETS[key]
    setPreset(key); setStart(p.start); setEnd(p.end); setShowCustom(false)
  }

  const applyCustom = () => {
    if (!customS || !customE) return toast.error('Select both dates')
    if (customS > customE)    return toast.error('Start must be before end')
    setPreset('custom'); setStart(customS); setEnd(customE); setShowCustom(false)
  }

  const kpis = data?.kpis

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Sales Reports</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Revenue, margins, and salesman performance analytics.</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={() => fetchReport(start, end)}>Refresh</Button>
      </div>

      {/* ── Date presets ────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} onClick={() => applyPreset(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                preset === key
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
              )}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setShowCustom(v => !v)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              showCustom
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
            )}>
            Custom Range
          </button>
          {showCustom && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customS} onChange={e => setCustomS(e.target.value)} className="input-base w-36 py-1.5 text-xs" />
              <span className="text-surface-400 text-xs">to</span>
              <input type="date" value={customE} onChange={e => setCustomE(e.target.value)} className="input-base w-36 py-1.5 text-xs" />
              <Button size="sm" onClick={applyCustom}>Apply</Button>
            </div>
          )}
          <span className="ml-auto text-xs text-surface-400">{start} → {end}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-surface-400">
          <Loader2 className="h-7 w-7 animate-spin mr-3 text-primary-500" />Loading sales data…
        </div>
      ) : !data ? null : (
        <>
          {/* ── KPIs ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Total Revenue"     value={fINR(kpis.revenue)}     sub={`${fNum(kpis.orders)} orders`}    trend={kpis.revenueTrend}  icon={DollarSign}   color="primary" />
            <KpiCard label="Gross Profit"      value={fINR(kpis.profit)}      sub={`Margin: ${fPct(kpis.margin)}`}  trend={kpis.profitTrend}   icon={TrendingUp}   color="success" />
            <KpiCard label="Challans Issued"   value={fNum(kpis.challans)}    sub="dispatched"                       trend={kpis.challansTrend} icon={FileText}     color="blue"    />
            <KpiCard label="Avg Order Value"   value={fINR(kpis.avgOrderVal)} sub="per order"                                                   icon={ShoppingCart} color="warning" />
          </div>

          {/* ── Salesman Performance ──────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Salesman Performance</h2>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">Ranked by revenue generated in the selected period.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">#</th>
                    <th className="px-6 py-3.5">Salesman</th>
                    <th className="px-6 py-3.5 text-right">Revenue</th>
                    <th className="px-6 py-3.5 text-right">Profit</th>
                    <th className="px-6 py-3.5 text-right">Margin</th>
                    <th className="px-6 py-3.5 text-right">Challans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                  {(data.salesmanPerformance ?? []).length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-10 text-center text-surface-400">No salesman data for this period.</td></tr>
                  ) : (data.salesmanPerformance ?? []).slice((smPage - 1) * 50, smPage * 50).map((sm, i) => {
                    const margin = sm.revenue > 0 ? (sm.profit / sm.revenue) * 100 : 0
                    return (
                      <tr key={sm.id} className="table-row-hover">
                        <td className="px-6 py-4 text-surface-400 font-mono text-xs">{(smPage - 1) * 50 + i + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {sm.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                            <span className="font-semibold text-surface-900 dark:text-surface-50">{sm.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold font-mono">{fINR(sm.revenue)}</td>
                        <td className="px-6 py-4 text-right font-mono text-success-600 dark:text-success-400">{fINR(sm.profit)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', margin >= 20 ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400' : margin >= 10 ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400' : 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400')}>
                            {fPct(margin)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{fNum(sm.challans)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={smPage}
              totalItems={(data.salesmanPerformance ?? []).length}
              pageSize={50}
              onPageChange={setSmPage}
            />
          </div>

          {/* ── 2-col: Supplier breakdown + Top parts ─────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Supplier breakdown */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary-500" />
                  <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Supplier Breakdown</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Supplier</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                      <th className="px-5 py-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                    {(data.supplierBreakdown ?? []).map((s, i) => (
                      <tr key={i} className="table-row-hover">
                        <td className="px-5 py-3 font-medium">{s.supplier || 'Direct'}</td>
                        <td className="px-5 py-3 text-right font-mono">{fINR(s.revenue)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xs font-semibold text-surface-500">{fPct(s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 parts */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-success-500" />
                  <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Top 5 Parts by Revenue</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Part</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                      <th className="px-5 py-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                    {(data.topPartsByRevenue ?? []).map((p, i) => (
                      <tr key={i} className="table-row-hover">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-surface-900 dark:text-surface-50">{p.sku}</div>
                          <div className="text-xs text-surface-400 truncate max-w-[180px]">{p.name}</div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-success-600 dark:text-success-400">{fINR(p.revenue)}</td>
                        <td className="px-5 py-3 text-right font-mono text-surface-500">{fNum(p.quantitySold)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Lowest selling parts ──────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning-500" />
                <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Top 5 Lowest Selling Parts</h2>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">Parts with lowest sales volume — may need attention or discontinuation.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Part</th>
                    <th className="px-6 py-3.5 text-right">Units Sold</th>
                    <th className="px-6 py-3.5 text-right">Stock Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                  {(data.lowestSellingParts ?? []).map((p, i) => (
                    <tr key={i} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{p.sku}</div>
                        <div className="text-xs text-surface-400 truncate max-w-[280px]">{p.name}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', p.quantitySold === 0 ? 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400' : 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400')}>
                          {fNum(p.quantitySold)} {p.quantitySold === 0 ? '(dead stock)' : 'units'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-surface-500">{fNum(p.availableStock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Inventory snapshot ────────────────────────────────────── */}
          {data.inventorySnapshot && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Stock Value',     value: fINR(data.inventorySnapshot.stockValue), color: 'text-primary-600 dark:text-primary-400' },
                { label: 'Out of Stock',    value: fNum(data.inventorySnapshot.outOfStock) + ' parts', color: 'text-danger-600 dark:text-danger-400' },
                { label: 'Low Stock Parts', value: fNum(data.inventorySnapshot.lowStock) + ' parts',   color: 'text-warning-600 dark:text-warning-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                  <div>
                    <p className="text-lg font-bold text-surface-900 dark:text-surface-50 font-mono">{value}</p>
                    <p className={cn('text-xs font-medium', color)}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
