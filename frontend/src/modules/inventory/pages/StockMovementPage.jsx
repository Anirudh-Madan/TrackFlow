import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight, AlertTriangle, Skull, Package, Download, BarChart2,
  Search, Filter, Activity, Clock, ShieldAlert, CheckCircle2, RotateCcw,
  TrendingDown, Layers, FileText, ExternalLink
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import Modal from '../../../components/ui/Modal'
import Badge from '../../../components/ui/Badge'
import TablePagination from '../../../components/data/TablePagination'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getStockMovement } from '../../../api/endpoints/reports.api'

function fmt(val) {
  if (val == null || val === '') return '₹0.00'
  const n = Number(val)
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const SELECT_CLS = `input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`

export default function StockMovementPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab]         = useState('slow_movers') // 'slow_movers' | 'at_risk' | 'dead_stock'
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [search, setSearch]                 = useState('')
  const [loading, setLoading]               = useState(true)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [data, setData] = useState({
    summary: {
      slowMoversCount: 0,
      atRiskCount: 0,
      deadStockCount: 0,
      unitsStuck: 0,
      valueStuck: 0,
      neverSold: 0,
    },
    suppliers: [],
    parts: [],
    totalParts: 0,
  })

  // Velocity Modal state
  const [isVelocityModalOpen, setIsVelocityModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStockMovement({
        category: activeTab,
        supplier: supplierFilter,
        search,
      })
      if (res?.success) {
        setData(res.data || {})
      } else {
        toast.error('Failed to load stock movement analysis')
      }
    } catch (err) {
      console.error('Error fetching stock movement data:', err)
      toast.error('Failed to load stock movement analysis')
    } finally {
      setLoading(false)
    }
  }, [activeTab, supplierFilter, search])

  useEffect(() => {
    fetchData()
    setPage(1)
  }, [fetchData])

  // Handle Export to CSV
  const handleExport = () => {
    if (!data.parts || data.parts.length === 0) {
      toast.error('No stock movement data available to export')
      return
    }

    const headers = ['#', 'Part Number', 'Description', 'Supplier', 'Planner', 'Stock', 'Value Stuck (INR)', 'Last Sold', 'Suggested Action']
    const rows = data.parts.map((p, idx) => [
      idx + 1,
      `"${p.partNumber}"`,
      `"${p.description}"`,
      `"${p.supplier}"`,
      `"${p.planner}"`,
      p.stock,
      p.valueStuck.toFixed(2),
      `"${p.lastSold}"`,
      `"${p.suggestedAction}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Stock_Movement_Analysis_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${data.parts.length} rows to CSV`)
  }

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil((data.parts?.length || 0) / pageSize))
  const paginatedParts = useMemo(() => {
    const start = (page - 1) * pageSize
    return (data.parts || []).slice(start, start + pageSize)
  }, [data.parts, page, pageSize])

  const activeTabInfo = useMemo(() => {
    switch (activeTab) {
      case 'slow_movers':
        return {
          title: 'Slow Movers',
          subtitle: '45–90 days without sale',
          count: data.summary.slowMoversCount,
        }
      case 'at_risk':
        return {
          title: 'At Risk',
          subtitle: '90–180 days without sale',
          count: data.summary.atRiskCount,
        }
      case 'dead_stock':
        return {
          title: 'Dead Stock',
          subtitle: '>180 days or never sold',
          count: data.summary.deadStockCount,
        }
      default:
        return {}
    }
  }, [activeTab, data.summary])

  return (
    <div className="space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary-600" />
            Stock Movement Analysis
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Identify slow-moving inventory, at-risk parts, and dead stock to free up working capital.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={BarChart2}
            onClick={() => navigate('/admin/velocity-min-stock')}
            className="text-xs"
          >
            Velocity & Min Stock
          </Button>

          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExport}
            className="text-xs"
          >
            Export
          </Button>
        </div>
      </div>

      {/* ── TAB NAVIGATION ─────────────────────────────────────────────────── */}
      <div className="border-b border-surface-200 dark:border-surface-700 flex items-center gap-6 overflow-x-auto">
        {/* Slow Movers Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('slow_movers')}
          className={cn(
            'pb-3 font-semibold text-xs flex items-center gap-2 transition-colors relative border-b-2 whitespace-nowrap',
            activeTab === 'slow_movers'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Slow Movers
          <Badge variant="warning">{data.summary.slowMoversCount || 0}</Badge>
        </button>

        {/* At Risk Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('at_risk')}
          className={cn(
            'pb-3 font-semibold text-xs flex items-center gap-2 transition-colors relative border-b-2 whitespace-nowrap',
            activeTab === 'at_risk'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          <span className="h-2 w-2 rounded-full bg-danger-500" />
          At Risk
          <Badge variant="danger">{data.summary.atRiskCount || 0}</Badge>
        </button>

        {/* Dead Stock Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('dead_stock')}
          className={cn(
            'pb-3 font-semibold text-xs flex items-center gap-2 transition-colors relative border-b-2 whitespace-nowrap',
            activeTab === 'dead_stock'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          <Skull className="h-4 w-4 text-rose-600" />
          Dead Stock
          <Badge variant="danger">{data.summary.deadStockCount || 0}</Badge>
        </button>
      </div>

      {/* ── KPI CARDS GRID (4 CARDS) ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Category Count */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">{activeTabInfo.title}</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
            {activeTabInfo.count?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">
            {activeTabInfo.subtitle}
          </p>
        </Card>

        {/* Card 2: Units Stuck */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Units Stuck</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
            {data.summary.unitsStuck?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">Total physical stock</p>
        </Card>

        {/* Card 3: Value Stuck */}
        <Card className="relative overflow-hidden border-danger-200/80 dark:border-danger-800/80 bg-danger-50/10 dark:bg-danger-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-danger-700 dark:text-danger-400 uppercase tracking-wider">Value Stuck</span>
            <div className="p-2 rounded-xl bg-danger-100 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-danger-600 dark:text-danger-400 mt-2 font-mono">
            {fmt(data.summary.valueStuck)}
          </p>
          <p className="text-[11px] text-danger-600/80 dark:text-danger-400/80 mt-1 font-medium">Tied-up dealer capital</p>
        </Card>

        {/* Card 4: Never Sold */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Never Sold</span>
            <div className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
            {data.summary.neverSold?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">Zero sales history recorded</p>
        </Card>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <Card padding={false} className="p-4 bg-white dark:bg-surface-900 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Supplier Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider shrink-0">Supplier:</span>
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className={cn(SELECT_CLS, 'text-xs py-2 w-full sm:w-48 bg-white dark:bg-surface-800 font-medium')}
            >
              <option value="all">All Suppliers</option>
              {data.suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {(supplierFilter !== 'all' || search || activeTab !== 'slow_movers') && (
            <button
              type="button"
              onClick={() => {
                setSupplierFilter('all')
                setSearch('')
                setActiveTab('slow_movers')
              }}
              className="text-xs font-semibold text-danger-600 hover:text-danger-700 dark:text-danger-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search part number, description…"
            className="input-base pl-10 text-xs w-full"
          />
        </div>
      </Card>

      {/* ── PARTS TABLE ───────────────────────────────────────────────────── */}
      <Card padding={false} className="overflow-hidden">
        {/* Table Subtitle */}
        <div className="px-6 py-3.5 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
          <p className="text-xs font-bold text-surface-700 dark:text-surface-300">
            {data.totalParts} {data.totalParts === 1 ? 'part' : 'parts'} found — <span className="font-normal text-surface-400">sorted by value stuck</span>
          </p>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-5 py-3">PART NUMBER</th>
                <th className="px-5 py-3">DESCRIPTION</th>
                <th className="px-5 py-3">SUPPLIER</th>
                <th className="px-5 py-3">PLANNER</th>
                <th className="px-5 py-3 text-center">STOCK</th>
                <th className="px-5 py-3 text-right">VALUE STUCK</th>
                <th className="px-5 py-3 text-center">LAST SOLD</th>
                <th className="px-5 py-3 text-right">SUGGESTED ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-5 py-12 text-center text-surface-400">
                    Loading stock movement analysis…
                  </td>
                </tr>
              ) : paginatedParts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-12 text-center text-surface-400">
                    No stock movement parts recorded.
                  </td>
                </tr>
              ) : (
                paginatedParts.map((p, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx + 1
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td className="px-4 py-3 text-center font-mono text-surface-400 font-medium">
                        {globalIdx}
                      </td>

                      <td className="px-5 py-3 font-mono font-bold text-primary-700 dark:text-primary-300 whitespace-nowrap">
                        {p.partNumber}
                      </td>

                      <td className="px-5 py-3 font-medium text-surface-900 dark:text-surface-100">
                        {p.description}
                      </td>

                      <td className="px-5 py-3 font-mono text-surface-600 dark:text-surface-300">
                        {p.supplier}
                      </td>

                      <td className="px-5 py-3 font-mono text-surface-500 font-medium">
                        {p.planner}
                      </td>

                      <td className="px-5 py-3 text-center font-mono font-bold text-surface-900 dark:text-surface-50">
                        {p.stock}
                      </td>

                      <td className="px-5 py-3 text-right font-mono font-bold text-danger-600 dark:text-danger-400 whitespace-nowrap">
                        {fmt(p.valueStuck)}
                      </td>

                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold font-mono',
                          p.lastSold === 'Never sold'
                            ? 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        )}>
                          {p.lastSold}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className="font-semibold text-xs text-surface-600 dark:text-surface-300 hover:text-primary-600 transition-colors cursor-pointer italic">
                          {p.suggestedAction}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && data.parts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className={cn(SELECT_CLS, 'text-xs py-1 px-2 w-16 bg-white dark:bg-surface-800')}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <TablePagination
              currentPage={page}
              totalItems={data.parts.length}
              pageSize={pageSize}
              onPageChange={setPage}
              className="border-0 bg-transparent py-0 px-0"
            />
          </div>
        )}
      </Card>

      {/* ── VELOCITY MODAL ────────────────────────────────────────────────── */}
      {isVelocityModalOpen && (
        <Modal
          open={isVelocityModalOpen}
          onClose={() => setIsVelocityModalOpen(false)}
          title="Stock Velocity & Safety Threshold Metrics"
          size="lg"
        >
          <div className="space-y-4 text-xs text-surface-700 dark:text-surface-300">
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 space-y-2">
              <h3 className="font-bold text-sm text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary-600" />
                Inventory Velocity Standard Categories
              </h3>
              <p className="text-surface-500">
                TrackFlow automatically categorizes inventory velocity based on order history and sales frequency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-success-200 dark:border-success-800 bg-success-50/20 dark:bg-success-950/20 space-y-1">
                <p className="font-bold text-success-700 dark:text-success-400">⚡ Fast Movers (&lt; 30 Days)</p>
                <p className="text-[11px] text-surface-500">High turnover inventory. Requires automatic reorder points & buffer safety stock.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20 space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-400">⚠️ Slow Movers (45–90 Days)</p>
                <p className="text-[11px] text-surface-500">Inventory with declining sales. Suggested supplier returns or reallocations.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20 space-y-1">
                <p className="font-bold text-rose-700 dark:text-rose-400">☠️ Dead Stock (&gt; 180 Days)</p>
                <p className="text-[11px] text-surface-500">Capital tied up in dormant parts. Recommend clearance discount or scrap liquidation.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsVelocityModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
