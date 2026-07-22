import { useState, useEffect } from 'react'
import {
  Loader2, Package, AlertTriangle, Archive, BarChart2, RefreshCcw, Truck,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getStockReport } from '../../../api/endpoints/reports.api'
import TablePagination from '../../../components/data/TablePagination'

// ─── helpers ─────────────────────────────────────────────────────────────────
const fINR = (v) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(v ?? 0)
const fNum  = (v) => new Intl.NumberFormat('en-IN').format(v ?? 0)

// ─── KPI config ──────────────────────────────────────────────────────────────
const KPI_CONFIGS = [
  { key:'stockValue',  label:'Stock Value',           sub:'at cost price', format:fINR, icon:BarChart2,    color:'primary' },
  { key:'outOfStock',  label:'Out of Stock',          sub:'parts',         format:fNum, icon:Package,      color:'danger'  },
  { key:'lowStock',    label:'Low Stock',             sub:'below threshold',format:fNum, icon:AlertTriangle,color:'warning' },
  { key:'deadStock',   label:'Dead Stock',            sub:'never sold',    format:fNum, icon:Archive,      color:'surface' },
]
const COLOR_MAP = {
  primary: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20',
  success: 'text-success-600 bg-success-50 dark:bg-success-900/20',
  warning: 'text-warning-600 bg-warning-50 dark:bg-warning-900/20',
  danger:  'text-danger-600 bg-danger-50 dark:bg-danger-900/20',
  surface: 'text-surface-500 bg-surface-100 dark:bg-surface-800',
}

// ─── component ────────────────────────────────────────────────────────────────
export default function StockReportPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getStockReport()
      if (res.success) setData(res.data)
      else toast.error(res.error || 'Failed to load stock report')
    } catch (err) {
      toast.error(err.message || 'Failed to load stock report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const totals = (data?.supplierBreakdown ?? []).reduce(
    (acc, r) => ({ parts: acc.parts + r.parts, units: acc.units + r.units, value: acc.value + r.value }),
    { parts: 0, units: 0, value: 0 }
  )

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Stock Reports</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Real-time inventory health snapshot across all suppliers.</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={fetchData}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-surface-400">
          <Loader2 className="h-7 w-7 animate-spin mr-3 text-primary-500" />Loading inventory data…
        </div>
      ) : !data ? null : (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPI_CONFIGS.map(({ key, label, sub, format, icon: Icon, color }) => (
              <div key={key} className="card p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-surface-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">{format(data.kpis?.[key] ?? 0)}</p>
                    <p className="mt-0.5 text-xs text-surface-400">{sub}</p>
                  </div>
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', COLOR_MAP[color])}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Supplier breakdown table ───────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Inventory Health</h2>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">Stock value and units broken down by supplier / vendor.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Supplier</th>
                    <th className="px-6 py-3.5 text-right">Parts</th>
                    <th className="px-6 py-3.5 text-right">Units</th>
                    <th className="px-6 py-3.5 text-right">Value at Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                  {(data.supplierBreakdown ?? []).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-surface-400">No supplier data found.</td>
                    </tr>
                  ) : (data.supplierBreakdown ?? []).slice((page - 1) * 50, page * 50).map((row, i) => (
                    <tr key={i} className="table-row-hover">
                      <td className="px-6 py-4 font-semibold text-surface-900 dark:text-surface-50 uppercase text-xs tracking-wide">{row.name}</td>
                      <td className="px-6 py-4 text-right font-mono">{fNum(row.parts)}</td>
                      <td className="px-6 py-4 text-right font-mono">{fNum(row.units)}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-primary-600 dark:text-primary-400">{fINR(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
                {(data.supplierBreakdown ?? []).length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-sm font-bold text-surface-900 dark:text-surface-50">
                      <td className="px-6 py-4 text-xs uppercase tracking-widest font-black">Total</td>
                      <td className="px-6 py-4 text-right font-mono">{fNum(totals.parts)}</td>
                      <td className="px-6 py-4 text-right font-mono">{fNum(totals.units)}</td>
                      <td className="px-6 py-4 text-right font-mono font-black text-primary-600 dark:text-primary-400">{fINR(totals.value)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <TablePagination
              currentPage={page}
              totalItems={(data.supplierBreakdown ?? []).length}
              pageSize={50}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
