import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Users, Truck, Calendar, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Search, AlertTriangle, FileText, History,
  Sparkles, Loader2, X, ArrowUpRight, Package, Filter, RefreshCcw,
  DollarSign, ShoppingCart, Archive
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import {
  getSalesReport, getBelowDlReport, getActivityLog, getAiInsight
} from '../../../api/endpoints/reports.api'
import { useAuthStore } from '../../../store/authStore'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDateLocal = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return dateStr
}

const getPresetDates = (key) => {
  const today = new Date()
  const endDate = formatDateLocal(today)
  let startDate = endDate

  if (key === 'today') {
    startDate = endDate
  } else if (key === '7days') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    startDate = formatDateLocal(d)
  } else if (key === 'thisMonth') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1)
    startDate = formatDateLocal(d)
  } else if (key === 'lastMonth') {
    const startLast = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endLast = new Date(today.getFullYear(), today.getMonth(), 0)
    return {
      startDate: formatDateLocal(startLast),
      endDate: formatDateLocal(endLast)
    }
  }
  return { startDate, endDate }
}

const fINR = (v) => {
  const val = parseFloat(v || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(val)
}

const fNum = (v) => new Intl.NumberFormat('en-IN').format(v ?? 0)

const fPct = (v) => {
  const val = parseFloat(v || 0)
  return `${val.toFixed(1)}%`
}

function TrendTag({ pct }) {
  if (pct == null) return null
  const up = pct >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-semibold',
      up ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
    )}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{fPct(pct)} vs prev
    </span>
  )
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin'

  // Date states
  const [preset, setPreset] = useState('thisMonth')
  const initialDates = getPresetDates('thisMonth')
  const [startDate, setStartDate] = useState(initialDates.startDate)
  const [endDate, setEndDate] = useState(initialDates.endDate)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStart, setCustomStart] = useState(initialDates.startDate)
  const [customEnd, setCustomEnd] = useState(initialDates.endDate)

  // Data states
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState(null)
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  const [selectedSupplier, setSelectedSupplier] = useState(null)

  // Collapsible & Modal states
  const [fullDetailOpen, setFullDetailOpen] = useState(false)
  const [showBelowDlModal, setShowBelowDlModal] = useState(false)
  const [belowDlFullList, setBelowDlFullList] = useState([])
  const [belowDlLoading, setBelowDlLoading] = useState(false)
  const [activityLogs, setActivityLogs] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  // AI Insight states
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // ── Fetch Sales Report Data ────────────────────────────────────────────────
  const fetchReport = useCallback(async (s, e) => {
    setLoading(true)
    setAiInsight('')
    try {
      const res = await getSalesReport({ startDate: s, endDate: e })
      if (res.success) {
        setReportData(res.data)
      } else {
        toast.error('Failed to fetch sales report data')
      }
    } catch (err) {
      toast.error('Error loading reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport(startDate, endDate)
  }, [startDate, endDate, fetchReport])

  // Preset switch
  const handlePresetChange = (key) => {
    setPreset(key)
    setShowCustomPicker(false)
    const dates = getPresetDates(key)
    setStartDate(dates.startDate)
    setEndDate(dates.endDate)
  }

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) return toast.error('Select both start and end dates')
    if (customStart > customEnd) return toast.error('Start date cannot be after end date')
    setPreset('custom')
    setStartDate(customStart)
    setEndDate(customEnd)
    setShowCustomPicker(false)
  }

  // Fetch Full Below DL Report for Modal
  const fetchFullBelowDl = async () => {
    setShowBelowDlModal(true)
    setBelowDlLoading(true)
    try {
      const res = await getBelowDlReport({ startDate, endDate })
      if (res.success) {
        setBelowDlFullList(res.data || [])
      }
    } catch (err) {
      toast.error('Failed to fetch full below DL report')
    } finally {
      setBelowDlLoading(false)
    }
  }

  // Fetch Activity Log when collapsible tab opens
  const fetchActivity = async () => {
    if (activityLogs.length > 0) return
    setActivityLoading(true)
    try {
      const res = await getActivityLog({ startDate, endDate })
      if (res.success) {
        setActivityLogs(res.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActivityLoading(false)
    }
  }

  // AI Insights Trigger
  const handleAIInsight = async () => {
    if (!reportData) return toast.error('No report data available')
    if (!isAdmin) return toast.error('AI insights are admin-only')
    setAiLoading(true)
    try {
      const res = await getAiInsight({ reportType: 'salesman', data: reportData })
      if (res.success) setAiInsight(res.insight)
      else toast.error(res.error || 'AI insight generation failed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI insight failed. Check GEMINI_API_KEY')
    } finally {
      setAiLoading(false)
    }
  }

  // Extracted Data Fields from Report API
  const kpis = reportData?.kpis || {
    revenue: { value: 0, change: 0 },
    profit: { value: 0, change: 0 },
    margin: { value: 0, change: 0 },
    challans: { value: 0, change: 0 }
  }

  let salesmanList = reportData?.salesmanPerformance || []
  if (selectedSalesman) {
    salesmanList = salesmanList.filter(s => s.name?.toLowerCase() === selectedSalesman.toLowerCase())
  }

  let supplierList = reportData?.supplierBreakdown || []
  if (selectedSupplier) {
    supplierList = supplierList.filter(s => s.name?.toLowerCase() === selectedSupplier.toLowerCase())
  }

  const topParts = reportData?.topPartsByRevenue || []
  const belowDlSummary = reportData?.belowDlSummary || { totalCount: 0, topTransactions: [] }
  const inventorySnapshot = reportData?.inventorySnapshot || { stockValue: 0, outOfStock: 0, lowStock: 0 }
  const lowestSelling = reportData?.lowestSellingParts || []

  // Dynamic filter lists for bottom buttons
  const suppliersButtons = reportData?.allSuppliers?.length > 0
    ? reportData.allSuppliers
    : ['CCC', 'CUMMINS 2S', 'MERITOR', 'ZF']

  const salesmanButtons = reportData?.allSalesmen?.length > 0
    ? reportData.allSalesmen
    : salesmanList.map(s => ({ id: s.id, name: s.name }))

  // Calculated totals for salesman table
  const totalSalesmanRevenue = salesmanList.reduce((acc, r) => acc + parseFloat(r.revenue || 0), 0)
  const totalSalesmanProfit = salesmanList.reduce((acc, r) => acc + (parseFloat(r.revenue || 0) * (parseFloat(r.marginPercent || 0) / 100)), 0)
  const totalSalesmanMargin = totalSalesmanRevenue > 0 ? (totalSalesmanProfit / totalSalesmanRevenue) * 100 : 0
  const totalSalesmanChallans = salesmanList.reduce((acc, r) => acc + parseInt(r.challans || 0, 10), 0)

  return (
    <div className="animate-in space-y-6">
      {/* ── 1. HEADER & DATE FILTER BAR ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
            ADMIN · REPORTS
          </p>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm font-mono text-surface-500 dark:text-surface-400 mt-0.5">
            {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)}
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: '7 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handlePresetChange(btn.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                preset === btn.id
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
              )}
            >
              {btn.label}
            </button>
          ))}

          {/* Custom Date Picker Button */}
          <button
            onClick={() => setShowCustomPicker(prev => !prev)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
              showCustomPicker || preset === 'custom'
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
            )}
            title="Custom Date Range"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>

          {/* Refresh & AI Buttons */}
          <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={() => fetchReport(startDate, endDate)}>
            Refresh
          </Button>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={handleAIInsight}
              loading={aiLoading}
            >
              AI Insight
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Picker Dropdown */}
      {showCustomPicker && (
        <Card className="p-4 bg-surface-50 dark:bg-surface-800/50 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-300">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="input-base w-36 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-300">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="input-base w-36 py-1 text-xs"
            />
          </div>
          <Button size="sm" onClick={handleApplyCustomDate}>
            Apply
          </Button>
        </Card>
      )}

      {/* Active Filter Indicator Banner */}
      {(selectedSalesman || selectedSupplier) && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-xs">
          <div className="flex items-center gap-2 text-primary-900 dark:text-primary-200 font-medium">
            <Filter className="h-4 w-4 text-primary-600" />
            <span>
              Filtered view:{' '}
              {selectedSalesman && <strong className="ml-1 font-bold">Salesman: {selectedSalesman}</strong>}
              {selectedSupplier && <strong className="ml-1 font-bold">Supplier: {selectedSupplier}</strong>}
            </span>
          </div>
          <button
            onClick={() => { setSelectedSalesman(null); setSelectedSupplier(null) }}
            className="text-primary-700 dark:text-primary-300 hover:underline font-semibold flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Clear Filters
          </button>
        </div>
      )}

      {/* AI Insight Box */}
      {aiInsight && (
        <Card className="p-5 border-l-4 border-violet-500 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-2 text-violet-600 dark:text-violet-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
                Gemini AI Executive Insight
              </p>
              <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                {aiInsight}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── 2. TOP 4 KPI CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-surface-500">Revenue</p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                {fINR(kpis.revenue.value)}
              </p>
              <div className="mt-1">
                <TrendTag pct={kpis.revenue.change} />
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary-600 bg-primary-50 dark:bg-primary-900/20">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-surface-500">Gross Profit</p>
              <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400 tracking-tight">
                {fINR(kpis.profit.value)}
              </p>
              <div className="mt-1">
                <TrendTag pct={kpis.profit.change} />
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-success-600 bg-success-50 dark:bg-success-900/20">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
        </Card>

        {/* Margin % */}
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-surface-500">Margin %</p>
              <p className="mt-1 text-2xl font-bold text-warning-600 dark:text-warning-400 tracking-tight">
                {fPct(kpis.margin.value)}
              </p>
              <div className="mt-1">
                <TrendTag pct={kpis.margin.change} />
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-warning-600 bg-warning-50 dark:bg-warning-900/20">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
          </div>
        </Card>

        {/* Challans */}
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-surface-500">Challans</p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                {fNum(kpis.challans.value)}
              </p>
              <div className="mt-1">
                <TrendTag pct={kpis.challans.change} />
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-surface-400">
          <Loader2 className="h-7 w-7 animate-spin mr-3 text-primary-500" />
          <span>Loading sales report data…</span>
        </div>
      ) : (
        <>
          {/* ── 3. ROW 1 (Salesman Performance & Supplier Breakdown + Inventory) ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Salesman Performance Card */}
            <Card padding={false} className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary-500" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      SALESMAN PERFORMANCE
                    </h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                        <th className="px-5 py-3">SALESMAN</th>
                        <th className="px-5 py-3 text-right">REVENUE</th>
                        <th className="px-5 py-3 text-right">MARGIN%</th>
                        <th className="px-5 py-3 text-right">CHALLANS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                      {salesmanList.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-surface-400">
                            No salesman data for this period.
                          </td>
                        </tr>
                      ) : (
                        salesmanList.map((row) => {
                          const isNegative = parseFloat(row.marginPercent || 0) < 0
                          return (
                            <tr key={row.id || row.name} className="table-row-hover">
                              <td className="px-5 py-3.5 font-semibold text-surface-900 dark:text-surface-50">
                                <button
                                  onClick={() => setSelectedSalesman(selectedSalesman === row.name ? null : row.name)}
                                  className="flex items-center gap-1 hover:text-primary-600 transition-colors text-left"
                                >
                                  <span>{row.name}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5 text-primary-500 shrink-0" />
                                </button>
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono font-semibold">
                                {fINR(row.revenue)}
                              </td>
                              <td className={cn(
                                'px-5 py-3.5 text-right font-mono font-semibold',
                                isNegative ? 'text-danger-600 dark:text-danger-400' : 'text-surface-900 dark:text-surface-100'
                              )}>
                                {fPct(row.marginPercent)}
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono">
                                {fNum(row.challans)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Footer Row */}
              {salesmanList.length > 0 && (
                <div className="border-t-2 border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 px-5 py-3 flex items-center justify-between text-xs font-bold text-surface-900 dark:text-surface-50 font-mono">
                  <div className="w-1/4 uppercase tracking-wider font-black">Total</div>
                  <div className="w-1/4 text-right text-primary-600 dark:text-primary-400">{fINR(totalSalesmanRevenue)}</div>
                  <div className="w-1/4 text-right">{fPct(totalSalesmanMargin)}</div>
                  <div className="w-1/4 text-right">{fNum(totalSalesmanChallans)}</div>
                </div>
              )}
            </Card>

            {/* Supplier Breakdown Card */}
            <Card padding={false} className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary-500" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      SUPPLIER BREAKDOWN
                    </h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                        <th className="px-5 py-3">SUPPLIER</th>
                        <th className="px-5 py-3 text-right">REVENUE</th>
                        <th className="px-5 py-3 text-right">MARGIN%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                      {supplierList.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-5 py-8 text-center text-surface-400">
                            No supplier breakdown available.
                          </td>
                        </tr>
                      ) : (
                        supplierList.map((row, idx) => {
                          const isNegative = parseFloat(row.marginPercent || 0) < 0
                          return (
                            <tr key={idx} className="table-row-hover">
                              <td className="px-5 py-3.5 font-semibold text-surface-900 dark:text-surface-50">
                                <button
                                  onClick={() => setSelectedSupplier(selectedSupplier === row.name ? null : row.name)}
                                  className="hover:text-primary-600 transition-colors text-left"
                                >
                                  {row.name}
                                </button>
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono font-semibold">
                                {fINR(row.revenue)}
                              </td>
                              <td className={cn(
                                'px-5 py-3.5 text-right font-mono font-semibold',
                                isNegative ? 'text-danger-600 dark:text-danger-400' : 'text-surface-900 dark:text-surface-100'
                              )}>
                                {fPct(row.marginPercent)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* INVENTORY SNAPSHOT Section */}
              <div className="border-t border-surface-200 dark:border-surface-700 p-4 bg-surface-50/50 dark:bg-surface-800/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
                  INVENTORY SNAPSHOT
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-bold text-surface-900 dark:text-surface-50 font-mono">
                      {fINR(inventorySnapshot.stockValue)}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">Stock Value</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-danger-600 dark:text-danger-400 font-mono">
                      {fNum(inventorySnapshot.outOfStock)}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">Out of Stock</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-warning-600 dark:text-warning-400 font-mono">
                      {fNum(inventorySnapshot.lowStock)}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">Low Stock</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── 4. ROW 2 (Top 5 Parts & Below DL Transactions) ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top 5 Parts by Revenue */}
            <Card padding={false} className="overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-success-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    TOP 5 PARTS BY REVENUE
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-4 py-3 w-8">#</th>
                      <th className="px-5 py-3">PART</th>
                      <th className="px-5 py-3 text-right">REVENUE</th>
                      <th className="px-5 py-3 text-right">MARGIN%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                    {topParts.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-8 text-center text-surface-400">
                          No parts sales recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      topParts.map((part, index) => {
                        const isNegative = parseFloat(part.marginPercent || 0) < 0
                        return (
                          <tr key={part.id || index} className="table-row-hover">
                            <td className="px-4 py-3.5 text-surface-400 font-mono text-xs font-semibold">
                              {index + 1}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-surface-900 dark:text-surface-50 font-mono text-xs">
                                {part.sku}
                              </div>
                              <div className="text-xs text-surface-400 uppercase tracking-wide truncate max-w-[200px]">
                                {part.name}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-surface-900 dark:text-surface-50">
                              {fINR(part.revenue)}
                            </td>
                            <td className={cn(
                              'px-5 py-3.5 text-right font-mono font-semibold',
                              isNegative ? 'text-danger-600 dark:text-danger-400' : 'text-surface-900 dark:text-surface-100'
                            )}>
                              {fPct(part.marginPercent)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* BELOW DL TRANSACTIONS Card */}
            <Card padding={false} className="overflow-hidden border-l-4 border-l-danger-500 flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-danger-50/20 dark:bg-danger-950/20">
                  <div className="flex items-center gap-1.5 text-danger-600 dark:text-danger-400 font-semibold text-xs uppercase tracking-wider">
                    <X className="h-4 w-4" />
                    <span>BELOW DL TRANSACTIONS</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-danger-600 dark:text-danger-400 font-mono tracking-tight">
                      {fNum(belowDlSummary.totalCount)}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    transactions sold below cost price in this period
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                        <th className="px-5 py-3">PART</th>
                        <th className="px-5 py-3">SALESMAN</th>
                        <th className="px-5 py-3 text-right">LOSS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                      {belowDlSummary.topTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-5 py-8 text-center text-success-600 dark:text-success-400 font-medium">
                            ✓ No transactions sold below dealer price.
                          </td>
                        </tr>
                      ) : (
                        belowDlSummary.topTransactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className="table-row-hover">
                            <td className="px-5 py-3 font-semibold font-mono text-surface-900 dark:text-surface-50 text-xs">
                              {tx.partSku}
                            </td>
                            <td className="px-5 py-3 text-xs">
                              {tx.salesmanName}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-danger-600 dark:text-danger-400 text-xs">
                              -{fINR(tx.loss)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {belowDlSummary.totalCount > 0 && (
                <div className="px-5 py-3 bg-surface-50/50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700 text-xs">
                  <button
                    onClick={fetchFullBelowDl}
                    className="text-surface-500 hover:text-danger-600 dark:hover:text-danger-400 font-semibold transition-colors"
                  >
                    ... and {Math.max(0, belowDlSummary.totalCount - 5)} more
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* ── 5. FULL DETAIL VIEW COLLAPSIBLE SECTION ──────────────────────────── */}
          <div className="space-y-4">
            <button
              onClick={() => {
                const next = !fullDetailOpen
                setFullDetailOpen(next)
                if (next) fetchActivity()
              }}
              className="w-full card p-4 hover:bg-surface-50 dark:hover:bg-surface-800/80 transition-all flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                  Full Detail View
                </span>
                <span className="text-xs text-surface-500">
                  (Sales Trend, Margin Analysis, Top Parts, Slow Movers, Inventory Health)
                </span>
              </div>
              {fullDetailOpen ? (
                <ChevronUp className="h-4 w-4 text-surface-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-surface-400" />
              )}
            </button>

            {fullDetailOpen && (
              <Card className="p-6 space-y-6 animate-in">
                {/* Slow Movers */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="h-4 w-4 text-warning-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      Slow Movers & Dead Stock
                    </h3>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                          <th className="px-5 py-3">PART SKU</th>
                          <th className="px-5 py-3">NAME</th>
                          <th className="px-5 py-3 text-right">UNITS SOLD</th>
                          <th className="px-5 py-3 text-right">AVAILABLE STOCK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                        {lowestSelling.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-5 py-6 text-center text-surface-400">
                              No slow movers data.
                            </td>
                          </tr>
                        ) : (
                          lowestSelling.map((p, idx) => (
                            <tr key={p.id || idx} className="table-row-hover">
                              <td className="px-5 py-3 font-mono font-semibold text-surface-900 dark:text-surface-50 text-xs">
                                {p.sku}
                              </td>
                              <td className="px-5 py-3 text-xs">
                                {p.name}
                              </td>
                              <td className="px-5 py-3 text-right font-mono text-xs">
                                <span className={cn(
                                  'px-2 py-0.5 rounded font-semibold',
                                  p.quantitySold === 0 ? 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400' : 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                                )}>
                                  {fNum(p.quantitySold)} {p.quantitySold === 0 ? '(dead stock)' : 'units'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-semibold text-xs">
                                {fNum(p.availableStock)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* System Activity Logs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-primary-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      Recent System Activity Logs
                    </h3>
                  </div>
                  {activityLoading ? (
                    <div className="py-6 text-center text-xs text-surface-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-primary-500" /> Loading activity logs...
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                            <th className="px-5 py-3">USER</th>
                            <th className="px-5 py-3">ROLE</th>
                            <th className="px-5 py-3">ACTION</th>
                            <th className="px-5 py-3">MODULE</th>
                            <th className="px-5 py-3">TIME</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-xs text-surface-700 dark:text-surface-300">
                          {activityLogs.slice(0, 5).map((log, idx) => (
                            <tr key={log.id || idx} className="table-row-hover">
                              <td className="px-5 py-2.5 font-semibold text-surface-900 dark:text-surface-50">{log.actor_name || '—'}</td>
                              <td className="px-5 py-2.5 capitalize text-surface-500">{log.actor_role || '—'}</td>
                              <td className="px-5 py-2.5 font-mono">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300">
                                  {log.action_type}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 capitalize text-surface-600 dark:text-surface-400">{log.module || '—'}</td>
                              <td className="px-5 py-2.5 text-surface-400 font-mono">
                                {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* ── 6. QUICK LINKS / SUB-REPORT NAVIGATION SECTION ───────────────────── */}
          <Card className="p-6 space-y-5">
            {/* SUPPLIER REPORTS */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2.5">
                SUPPLIER REPORTS
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {suppliersButtons.map((sup) => {
                  const sName = typeof sup === 'object' ? sup.name : sup
                  const isSelected = selectedSupplier?.toLowerCase() === sName?.toLowerCase()
                  return (
                    <button
                      key={sName}
                      onClick={() => setSelectedSupplier(isSelected ? null : sName)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
                        isSelected
                          ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                          : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
                      )}
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-primary-500" />
                      <span>{sName}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SALESMAN REPORTS */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2.5">
                SALESMAN REPORTS
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {salesmanButtons.map((sm) => {
                  const smName = typeof sm === 'object' ? sm.name : sm
                  const isSelected = selectedSalesman?.toLowerCase() === smName?.toLowerCase()
                  return (
                    <button
                      key={smName}
                      onClick={() => setSelectedSalesman(isSelected ? null : smName)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
                        isSelected
                          ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                          : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
                      )}
                    >
                      <Users className="h-3.5 w-3.5 text-primary-500" />
                      <span>{smName}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* OTHER */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2.5">
                OTHER
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate('/admin/part-history')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600 flex items-center gap-1.5 transition-all"
                >
                  <Search className="h-3.5 w-3.5 text-primary-500" />
                  <span>Part History</span>
                </button>

                <button
                  onClick={() => navigate('/admin/reports/stock')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600 flex items-center gap-1.5 transition-all"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-warning-500" />
                  <span>Stock Alerts</span>
                </button>

                <button
                  onClick={() => navigate('/admin/activity-logs')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600 flex items-center gap-1.5 transition-all"
                >
                  <FileText className="h-3.5 w-3.5 text-primary-500" />
                  <span>Activity Log</span>
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── 7. FULL BELOW DL TRANSACTIONS MODAL ──────────────────────────────── */}
      {showBelowDlModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden animate-in">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between bg-surface-50/50 dark:bg-surface-800/50">
              <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400 font-semibold text-sm">
                <X className="h-4 w-4" />
                <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Below Dealer Landing (DL) Transactions</h3>
              </div>
              <button
                onClick={() => setShowBelowDlModal(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {belowDlLoading ? (
                <div className="py-12 text-center text-xs text-surface-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-500" /> Loading full below DL report...
                </div>
              ) : belowDlFullList.length === 0 ? (
                <p className="py-8 text-center text-xs text-surface-400">No below DL transactions found.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                        <th className="px-4 py-3">PART SKU</th>
                        <th className="px-4 py-3">PART NAME</th>
                        <th className="px-4 py-3">CHALLAN / ORDER</th>
                        <th className="px-4 py-3">SALESMAN</th>
                        <th className="px-4 py-3 text-right">DL PRICE</th>
                        <th className="px-4 py-3 text-right">SOLD PRICE</th>
                        <th className="px-4 py-3 text-right">TOTAL LOSS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-xs text-surface-700 dark:text-surface-300">
                      {belowDlFullList.map((item, idx) => (
                        <tr key={item.id || idx} className="table-row-hover">
                          <td className="px-4 py-3 font-mono font-semibold text-surface-900 dark:text-surface-50">
                            {item.partNumber}
                          </td>
                          <td className="px-4 py-3 text-surface-600 dark:text-surface-300">
                            {item.partName}
                          </td>
                          <td className="px-4 py-3 font-mono text-surface-500">
                            {item.challanNumber}
                          </td>
                          <td className="px-4 py-3">
                            {item.salesmanName}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {fINR(item.dlPrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-warning-600">
                            {fINR(item.smPrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-danger-600 dark:text-danger-400">
                            {fINR(item.totalLoss)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowBelowDlModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

