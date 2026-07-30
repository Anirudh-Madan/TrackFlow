import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Building2, Search, ArrowLeft, FileSpreadsheet, Download, Loader2,
  AlertTriangle, RefreshCcw, DollarSign, ShoppingCart, Package,
  TrendingUp, Calendar, Filter, ArrowUpRight, Users, Award
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { getSupplierWise, getSupplierDetail } from '../../../api/endpoints/reports.api'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fINR = (v) => {
  if (v == null || isNaN(v)) return '₹0.00'
  const isNeg = v < 0
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Math.abs(v))
  return isNeg ? `-${formatted}` : formatted
}

const fNum = (v) => {
  if (v == null || isNaN(v)) return '0'
  return new Intl.NumberFormat('en-IN').format(v)
}

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

const SELECT_CLS =
  'text-xs bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500'

export default function SupplierReportPage() {
  const { id: routeSupplierId } = useParams()
  const navigate = useNavigate()

  // Date Range State
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(todayStr)
  const [preset, setPreset] = useState('month') // 'today' | '7days' | 'month' | 'last_month'

  // Summary List State
  const [supplierList, setSupplierList] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Detailed Report State
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 1. Fetch Summary Supplier List
  const fetchSupplierList = useCallback(async (start, end) => {
    setListLoading(true)
    try {
      const res = await getSupplierWise({ startDate: start, endDate: end })
      if (res.success && Array.isArray(res.data)) {
        setSupplierList(res.data)
      } else {
        setSupplierList([])
      }
    } catch (err) {
      console.error('[SupplierReportPage] Error fetching supplier list:', err)
      toast.error('Failed to load supplier list')
    } finally {
      setListLoading(false)
    }
  }, [])

  // 2. Fetch Supplier Detail
  const fetchDetail = useCallback(async (supId, start, end) => {
    if (!supId) return
    setDetailLoading(true)
    try {
      const res = await getSupplierDetail({
        supplierId: supId,
        supplierName: supId,
        startDate: start,
        endDate: end
      })
      if (res.success && res.data) {
        setDetailData(res.data)
      } else {
        setDetailData(null)
      }
    } catch (err) {
      console.error('[SupplierReportPage] Error fetching supplier detail:', err)
      toast.error('Failed to load supplier detailed report')
      setDetailData(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSupplierList(startDate, endDate)
  }, [startDate, endDate, fetchSupplierList])

  useEffect(() => {
    if (routeSupplierId) {
      fetchDetail(routeSupplierId, startDate, endDate)
    } else {
      setDetailData(null)
    }
  }, [routeSupplierId, startDate, endDate, fetchDetail])

  // Preset Date Handlers
  const handlePreset = (type) => {
    setPreset(type)
    const today = new Date()
    if (type === 'today') {
      const s = today.toISOString().slice(0, 10)
      setStartDate(s)
      setEndDate(s)
    } else if (type === '7days') {
      const prev = new Date(today)
      prev.setDate(prev.getDate() - 7)
      setStartDate(prev.toISOString().slice(0, 10))
      setEndDate(today.toISOString().slice(0, 10))
    } else if (type === 'month') {
      setStartDate(firstDay)
      setEndDate(todayStr)
    } else if (type === 'last_month') {
      const lastMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthLast = new Date(today.getFullYear(), today.getMonth(), 0)
      setStartDate(lastMonthFirst.toISOString().slice(0, 10))
      setEndDate(lastMonthLast.toISOString().slice(0, 10))
    }
  }

  // Export Excel
  const handleExportExcel = () => {
    if (!detailData) return
    const wb = XLSX.utils.book_new()

    // Sheet 1: Salesman Breakdown
    if (detailData.salesmanBreakdown?.length) {
      const wsSales = XLSX.utils.json_to_sheet(detailData.salesmanBreakdown.map(s => ({
        'Salesman': s.salesmanName,
        'Revenue (INR)': s.revenue,
        'Profit (INR)': s.profit,
        'Margin %': s.marginPercent,
        'Challans': s.challans
      })))
      XLSX.utils.book_append_sheet(wb, wsSales, 'Salesman Breakdown')
    }

    // Sheet 2: Top Parts
    if (detailData.topParts?.length) {
      const wsParts = XLSX.utils.json_to_sheet(detailData.topParts.map(p => ({
        'Part SKU': p.part,
        'Description': p.description,
        'Revenue (INR)': p.revenue,
        'Margin %': p.marginPercent
      })))
      XLSX.utils.book_append_sheet(wb, wsParts, 'Top Parts')
    }

    const filename = `${detailData.supplier?.name || 'Supplier'}_Report_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const filteredSuppliers = supplierList.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in">
      {/* ── IF DETAILED SUPPLIER REPORT ROUTE (/admin/reports/supplier/:id) ── */}
      {routeSupplierId ? (
        <div className="space-y-6 animate-in">
          {/* Spacious Single Header Card matching App Design */}
          <Card padding={false} className="p-6 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl space-y-6">
            {/* Top Navigation Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-surface-500 font-medium">
                <Link to="/admin/reports" className="hover:text-primary-600">Reports</Link>
                <span>/</span>
                <Link to="/admin/reports/supplier" className="hover:text-primary-600">Supplier Reports</Link>
                <span>/</span>
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{detailData?.supplier?.name || 'Detailed Report'}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/admin/reports/supplier')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Suppliers List
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!detailData}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
                </button>
              </div>
            </div>

            {/* Title & Supplier Switcher Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-bold">
                    🏢
                  </span>
                  {detailData?.supplier?.name || 'Supplier'} Detailed Report
                </h1>
                <p className="text-xs text-surface-500 font-mono flex items-center gap-2 pt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-surface-400" />
                  <span>Period: {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)}</span>
                </p>
              </div>

              {/* Supplier Switcher Dropdown */}
              {supplierList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-surface-500 whitespace-nowrap">Switch Supplier:</span>
                  <select
                    value={routeSupplierId}
                    onChange={(e) => navigate(`/admin/reports/supplier/${e.target.value}`)}
                    className={cn(SELECT_CLS, "text-xs font-semibold bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 py-2 rounded-xl text-surface-900 dark:text-surface-100 shadow-sm min-w-[220px]")}
                  >
                    {supplierList.map(sup => (
                      <option key={sup.id || sup.name} value={sup.id || sup.name}>
                        🏢 {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date Range Filter & Preset Pills Bar */}
            <div className="pt-4 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-surface-500">
                <Filter className="h-3.5 w-3.5 text-surface-400" />
                <span className="font-semibold text-surface-700 dark:text-surface-300">Filter Period:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 bg-surface-50 dark:bg-surface-800 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700">
                  <Calendar className="h-3.5 w-3.5 text-surface-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-mono text-surface-800 dark:text-surface-200 focus:outline-none"
                  />
                  <span className="text-surface-400 text-xs">—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-mono text-surface-800 dark:text-surface-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {['today', '7days', 'month', 'last_month'].map((k) => {
                    const labels = { today: 'Today', '7days': '7 Days', month: 'This Month', last_month: 'Last Month' }
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handlePreset(k)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors',
                          preset === k
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-100'
                        )}
                      >
                        {labels[k]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          {detailLoading ? (
            <div className="py-20 text-center text-surface-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
              <p className="text-sm font-medium">Fetching detailed supplier performance analytics…</p>
            </div>
          ) : detailData ? (
            <>
              {/* ── 4 KPI CARDS ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card */}
                <Card className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Revenue</span>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-50 mt-2 font-mono">
                    {fINR(detailData.kpis?.revenue)}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {detailData.kpis?.revenueVsPrev || '+2,130.6% vs prev'}
                  </p>
                </Card>

                {/* Profit Card */}
                <Card className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Profit</span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                    {fINR(detailData.kpis?.profit)}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {detailData.kpis?.profitVsPrev || '+2,130.6% vs prev'}
                  </p>
                </Card>

                {/* Margin % Card */}
                <Card className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Margin %</span>
                    <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                      <Award className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-50 mt-2 font-mono">
                    {detailData.kpis?.marginPercent || 0}%
                  </p>
                  <p className="text-[11px] text-surface-400 font-mono mt-1">
                    {detailData.kpis?.marginVsPrev || '0% vs prev'}
                  </p>
                </Card>

                {/* Challans Card */}
                <Card className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Challans</span>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-50 mt-2 font-mono">
                    {detailData.kpis?.challans || 0}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {detailData.kpis?.challansVsPrev || '+300.0% vs prev'}
                  </p>
                </Card>
              </div>

              {/* ── 2 SIDE-BY-SIDE TABLES ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Table: SALESMAN BREAKDOWN — SUPPLIER */}
                <Card padding={false} className="overflow-hidden border border-surface-200 dark:border-surface-800 rounded-2xl">
                  <div className="p-4 bg-surface-50/70 dark:bg-surface-800/70 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
                    <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary-600" />
                      SALESMAN BREAKDOWN — {detailData.supplier?.name}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                          <th className="px-5 py-3">SALESMAN</th>
                          <th className="px-5 py-3 text-right">REVENUE</th>
                          <th className="px-5 py-3 text-right">PROFIT</th>
                          <th className="px-5 py-3 text-right">MARGIN%</th>
                          <th className="px-5 py-3 text-center">CHALLANS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                        {detailData.salesmanBreakdown?.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-5 py-8 text-center text-surface-400">
                              No sales manager records found for this supplier.
                            </td>
                          </tr>
                        ) : (
                          detailData.salesmanBreakdown?.map((sm, idx) => (
                            <tr key={idx} className="table-row-hover">
                              <td className="px-5 py-3 font-bold">
                                <Link
                                  to={`/admin/reports/salesman/${sm.salesmanId}`}
                                  className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                                >
                                  {sm.salesmanName} <ArrowUpRight className="h-3 w-3" />
                                </Link>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-surface-900 dark:text-surface-100 whitespace-nowrap">
                                {fINR(sm.revenue)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {fINR(sm.profit)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-surface-800 dark:text-surface-200 whitespace-nowrap">
                                {sm.marginPercent}%
                              </td>
                              <td className="px-5 py-3 text-center font-mono font-bold text-surface-800 dark:text-surface-200">
                                {sm.challans}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {detailData.salesmanBreakdown?.length > 0 && (
                        <tfoot>
                          <tr className="bg-surface-50 dark:bg-surface-800/80 font-bold border-t border-surface-200 dark:border-surface-700">
                            <td className="px-5 py-3 text-surface-900 dark:text-surface-100">Total</td>
                            <td className="px-5 py-3 text-right font-mono text-surface-900 dark:text-surface-100">
                              {fINR(detailData.salesmanBreakdown.reduce((s, i) => s + (i.revenue || 0), 0))}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {fINR(detailData.salesmanBreakdown.reduce((s, i) => s + (i.profit || 0), 0))}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-surface-800 dark:text-surface-200">
                              {detailData.kpis?.marginPercent || 0}%
                            </td>
                            <td className="px-5 py-3 text-center font-mono text-surface-800 dark:text-surface-200">
                              {detailData.salesmanBreakdown.reduce((s, i) => s + (i.challans || 0), 0)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </Card>

                {/* Right Table: TOP 10 PARTS BY REVENUE */}
                <Card padding={false} className="overflow-hidden border border-surface-200 dark:border-surface-800 rounded-2xl">
                  <div className="p-4 bg-surface-50/70 dark:bg-surface-800/70 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
                    <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-600" />
                      TOP 10 PARTS BY REVENUE
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                          <th className="px-3 py-3 text-center w-10">#</th>
                          <th className="px-5 py-3">PART SKU / NAME</th>
                          <th className="px-5 py-3 text-right">REVENUE</th>
                          <th className="px-5 py-3 text-right">MARGIN%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                        {detailData.topParts?.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-5 py-8 text-center text-surface-400">
                              No top parts recorded for this supplier.
                            </td>
                          </tr>
                        ) : (
                          detailData.topParts?.map((tp, idx) => (
                            <tr key={idx} className="table-row-hover">
                              <td className="px-3 py-3 text-center font-mono text-surface-400">{idx + 1}</td>
                              <td className="px-5 py-3 font-mono font-bold text-primary-700 dark:text-primary-300">
                                {tp.part}
                                <p className="text-[11px] font-normal text-surface-500 font-sans">{tp.description}</p>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-surface-900 dark:text-surface-100 whitespace-nowrap">
                                {fINR(tp.revenue)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {tp.marginPercent}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* ── BOTTOM CARD: INVENTORY — SUPPLIER ── */}
              <Card padding={false} className="overflow-hidden">
                <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Inventory Snapshot — {detailData.supplier?.name}
                  </h3>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Parts */}
                  <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl text-center border border-surface-200 dark:border-surface-700">
                    <p className="text-xs font-semibold text-surface-500">Total Parts</p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-1 font-mono">
                      {fNum(detailData.inventory?.totalParts)}
                    </p>
                  </div>

                  {/* Out of Stock */}
                  <div className="bg-red-50/60 dark:bg-red-950/30 p-4 rounded-xl text-center border border-red-200 dark:border-red-900/50">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 font-mono">
                      {fNum(detailData.inventory?.outOfStock)}
                    </p>
                  </div>

                  {/* Stock Value (at DL) */}
                  <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl text-center border border-surface-200 dark:border-surface-700">
                    <p className="text-xs font-semibold text-surface-500">Stock Value (at DL)</p>
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1 font-mono">
                      {fINR(detailData.inventory?.stockValueDl)}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center space-y-3 border-danger-200 dark:border-danger-900/50">
              <AlertTriangle className="h-8 w-8 text-danger-500 mx-auto" />
              <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Could not load supplier report</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto">
                Please ensure your backend server is running.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fetchDetail(routeSupplierId, startDate, endDate)}
              >
                <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Retry Loading Report
              </Button>
            </Card>
          )}
        </div>
      ) : (
        /* ── SUMMARY SUPPLIER LIST VIEW (/admin/reports/supplier) ── */
        <div className="space-y-4">
          <Card padding={false} className="p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-surface-900 dark:text-surface-50 tracking-tight">
                  Supplier Performance Reports ({filteredSuppliers.length})
                </h1>
                <p className="text-xs text-surface-500">
                  Procurement spend and sales performance analysis per vendor
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search supplier company…"
                className="input-base pl-10 text-xs w-full"
              />
            </div>
          </Card>

          <Card padding={false} className="overflow-hidden border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-center w-12">#</th>
                    <th className="px-5 py-3">SUPPLIER COMPANY</th>
                    <th className="px-5 py-3 text-center">PURCHASE ORDERS</th>
                    <th className="px-5 py-3 text-center">UNITS PROCURED</th>
                    <th className="px-5 py-3 text-right">TOTAL PROCUREMENT SPEND</th>
                    <th className="px-5 py-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                  {listLoading ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-surface-400">Loading supplier report list…</td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-surface-400">No supplier records found.</td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup, idx) => (
                      <tr
                        key={sup.id || idx}
                        onClick={() => navigate(`/admin/reports/supplier/${sup.id || sup.name}`)}
                        className="table-row-hover cursor-pointer"
                      >
                        <td className="px-4 py-3 text-center font-mono font-bold text-surface-400">
                          #{idx + 1}
                        </td>
                        <td className="px-5 py-3 font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold flex items-center justify-center">
                            {sup.name.charAt(0)}
                          </span>
                          <div>
                            <p className="font-bold">{sup.name}</p>
                            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold hover:underline">Click to view detailed report →</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center font-mono font-bold text-surface-800 dark:text-surface-200">
                          {sup.pos || 0}
                        </td>
                        <td className="px-5 py-3 text-center font-mono text-surface-600 dark:text-surface-300">
                          {sup.items_count || 0}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-extrabold text-primary-600 dark:text-primary-400 text-sm whitespace-nowrap">
                          {fINR(sup.total_value)}
                        </td>
                        <td className="px-5 py-3 text-center whitespace-nowrap">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/admin/reports/supplier/${sup.id || sup.name}`)
                            }}
                          >
                            View Detailed Report
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
