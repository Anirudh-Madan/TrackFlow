import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, ArrowLeft, Save, Search, AlertTriangle, CheckCircle2,
  Package, Clock, RefreshCw, ShieldAlert, Layers
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import TablePagination from '../../../components/data/TablePagination'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getVelocityMinStock, updateMinStock } from '../../../api/endpoints/reports.api'

const SELECT_CLS = `input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`

export default function VelocityMinStockPage() {
  const navigate = useNavigate()

  const [supplierFilter, setSupplierFilter] = useState('all')
  const [statusFilter, setStatusFilter]     = useState('all') // 'all' | 'below_min' | 'no_min_set' | 'overstocked'
  const [search, setSearch]                 = useState('')
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)

  // Local state for user edits to min stock levels: { [productId]: number }
  const [minStockEdits, setMinStockEdits]   = useState({})

  const [data, setData] = useState({
    systemMonths: 1.2,
    startDate: '2026-06-22',
    suppliers: [],
    parts: [],
    totalParts: 0,
  })

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getVelocityMinStock({
        supplier: supplierFilter,
        status: statusFilter,
        search,
      })
      if (res?.success) {
        setData(res.data || {})
      } else {
        toast.error('Failed to load velocity & min stock metrics')
      }
    } catch (err) {
      console.error('Error fetching velocity & min stock data:', err)
      toast.error('Failed to load velocity & min stock metrics')
    } finally {
      setLoading(false)
    }
  }, [supplierFilter, statusFilter, search])

  useEffect(() => {
    fetchData()
    setPage(1)
  }, [fetchData])

  // Handle Input Change for Min Stock Level
  const handleMinStockChange = (productId, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0)
    setMinStockEdits(prev => ({
      ...prev,
      [productId]: num,
    }))
  }

  // Save Min Stock Levels to backend
  const handleSaveMinStock = async () => {
    const editKeys = Object.keys(minStockEdits)
    if (editKeys.length === 0) {
      toast.error('No changes to save')
      return
    }

    setSaving(true)
    try {
      const updates = editKeys.map(id => ({
        id: Number(id),
        minStock: minStockEdits[id],
      }))

      const res = await updateMinStock({ updates })
      if (res?.success) {
        toast.success(res.message || `Saved min stock levels for ${updates.length} parts`)
        setMinStockEdits({})
        fetchData()
      } else {
        toast.error(res?.error || 'Failed to save min stock levels')
      }
    } catch (err) {
      console.error('Error updating min stock:', err)
      toast.error('Failed to save min stock levels')
    } finally {
      setSaving(false)
    }
  }

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil((data.parts?.length || 0) / pageSize))
  const paginatedParts = useMemo(() => {
    const start = (page - 1) * pageSize
    return (data.parts || []).slice(start, start + pageSize)
  }, [data.parts, page, pageSize])

  const hasUnsavedEdits = Object.keys(minStockEdits).length > 0

  return (
    <div className="space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-surface-400">
            Admin · Inventory
          </p>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary-600" />
            Velocity & Min Stock
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Based on {data.systemMonths || 1.2} months of system data (since {data.startDate || '22-06-2026'}). Set your own minimum stock levels — system will flag when stock drops below.
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/admin/stock-movement')}
            className="text-xs"
          >
            ← Stock Movement
          </Button>
        </div>
      </div>

      {/* ── FILTER CONTROL BAR ────────────────────────────────────────────── */}
      <Card padding={false} className="p-4 bg-white dark:bg-surface-900 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Supplier Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider shrink-0">Supplier:</span>
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className={cn(SELECT_CLS, 'text-xs py-2 w-44 bg-white dark:bg-surface-800 font-medium')}
            >
              <option value="all">All Suppliers</option>
              {data.suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold transition-all',
                statusFilter === 'all'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
              )}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('below_min')}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border',
                statusFilter === 'below_min'
                  ? 'bg-danger-600 text-white border-danger-600 shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-50'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-danger-500" />
              Below Min Stock
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('no_min_set')}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border',
                statusFilter === 'no_min_set'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-50'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              No Min Set
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('overstocked')}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border',
                statusFilter === 'overstocked'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-50'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Overstocked
            </button>

            {(supplierFilter !== 'all' || statusFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setSupplierFilter('all')
                  setStatusFilter('all')
                  setSearch('')
                }}
                className="text-xs font-semibold text-danger-600 hover:text-danger-700 dark:text-danger-400 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-950/40 ml-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
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

      {/* ── TABLE CARD ────────────────────────────────────────────────────── */}
      <Card padding={false} className="overflow-hidden">
        {/* Table Subtitle & Save Action Bar */}
        <div className="px-6 py-3.5 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-semibold text-surface-600 dark:text-surface-300">
            <span className="font-bold text-surface-900 dark:text-surface-50">{data.totalParts || 0} parts</span> — 2-month suggestion = avg monthly × 2
          </p>

          <Button
            variant="warning"
            icon={Save}
            onClick={handleSaveMinStock}
            loading={saving}
            disabled={!hasUnsavedEdits}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold"
          >
            Save Min Stock Levels {hasUnsavedEdits && `(${Object.keys(minStockEdits).length})`}
          </Button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-5 py-3">PART NUMBER</th>
                <th className="px-5 py-3">DESCRIPTION</th>
                <th className="px-5 py-3">PLANNER</th>
                <th className="px-5 py-3 text-center">CURRENT STOCK</th>
                <th className="px-5 py-3 text-center">TOTAL SOLD</th>
                <th className="px-5 py-3 text-center">AVG/MONTH</th>
                <th className="px-5 py-3 text-center">2-MONTH NEED</th>
                <th className="px-5 py-3 text-center">MIN STOCK <span className="text-[10px] text-surface-400 font-normal uppercase">(SET YOURS)</span></th>
                <th className="px-5 py-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-surface-400">
                    Loading velocity & min stock metrics…
                  </td>
                </tr>
              ) : paginatedParts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-surface-400">
                    No parts matching current velocity & min stock filters.
                  </td>
                </tr>
              ) : (
                paginatedParts.map((p, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx + 1
                  const currentEditVal = minStockEdits[p.id] != null ? minStockEdits[p.id] : p.minStock

                  return (
                    <tr key={p.id} className="table-row-hover">
                      {/* # Index */}
                      <td className="px-4 py-3 text-center font-mono text-surface-400 font-medium">
                        {globalIdx}
                      </td>

                      {/* Part Number */}
                      <td className="px-5 py-3 font-mono font-bold text-primary-700 dark:text-primary-300 whitespace-nowrap">
                        {p.partNumber}
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3 font-medium text-surface-900 dark:text-surface-100">
                        {p.description}
                      </td>

                      {/* Planner */}
                      <td className="px-5 py-3 font-mono text-surface-500 font-semibold">
                        {p.planner}
                      </td>

                      {/* Current Stock */}
                      <td className="px-5 py-3 text-center font-mono font-extrabold text-surface-900 dark:text-surface-50 text-sm">
                        {p.currentStock}
                      </td>

                      {/* Total Sold */}
                      <td className="px-5 py-3 text-center font-mono font-medium text-surface-600 dark:text-surface-300">
                        {p.totalSold}
                      </td>

                      {/* Avg / Month */}
                      <td className="px-5 py-3 text-center font-mono font-medium text-surface-600 dark:text-surface-300">
                        {p.avgMonthly.toFixed(1)}
                      </td>

                      {/* 2-Month Need (Highlighted in Red) */}
                      <td className="px-5 py-3 text-center font-mono font-extrabold text-danger-600 dark:text-danger-400 text-sm">
                        {p.twoMonthNeed}
                      </td>

                      {/* Min Stock (Editable Input Box) */}
                      <td className="px-5 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={currentEditVal}
                          onChange={e => handleMinStockChange(p.id, e.target.value)}
                          className={cn(
                            'w-20 px-2 py-1 text-center font-mono text-xs font-bold rounded border bg-white dark:bg-surface-900 transition-colors',
                            minStockEdits[p.id] != null
                              ? 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/40'
                              : 'border-surface-300 dark:border-surface-600 text-surface-800 dark:text-surface-200'
                          )}
                        />
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        {p.statusKey === 'below_min' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                            ⚠️ Below 2-mo
                          </span>
                        ) : p.statusKey === 'no_min_set' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800 inline-flex items-center gap-1">
                            ⚪ No Min Set
                          </span>
                        ) : p.statusKey === 'overstocked' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 inline-flex items-center gap-1">
                            📦 Overstocked
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border border-success-300 dark:border-success-800 inline-flex items-center gap-1">
                            ✓ OK
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
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
    </div>
  )
}
