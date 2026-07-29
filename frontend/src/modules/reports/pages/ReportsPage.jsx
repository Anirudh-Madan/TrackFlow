import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  BarChart3, Users, Truck, Calendar, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Search, AlertTriangle, FileText, History,
  Sparkles, Loader2, X, ArrowUpRight, Package, Filter, RefreshCcw,
  DollarSign, ShoppingCart, Archive, Award, Building2, UserCheck,
  CheckCircle2, Download, ArrowRight, Layers, ArrowLeft, FileSpreadsheet
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Modal from '../../../components/ui/Modal'
import TablePagination from '../../../components/data/TablePagination'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import {
  getSalesReport, getBelowDlReport, getActivityLog, getAiInsight,
  getSalesmanWise, getPartyWise, getSupplierWise, getSalespersonDetail
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
const fPct = (v) => `${parseFloat(v || 0).toFixed(1)}%`

const SELECT_CLS = `input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`

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

  // Tab State: 'overview' | 'salesman' | 'supplier' | 'party' | 'below_dl'
  const [activeTab, setActiveTab] = useState('overview')

  // Date States
  const [preset, setPreset] = useState('thisMonth')
  const initialDates = getPresetDates('thisMonth')
  const [startDate, setStartDate] = useState(initialDates.startDate)
  const [endDate, setEndDate] = useState(initialDates.endDate)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStart, setCustomStart] = useState(initialDates.startDate)
  const [customEnd, setCustomEnd] = useState(initialDates.endDate)

  // Search Filter
  const [search, setSearch] = useState('')

  // Report Data States
  const [loading, setLoading]                 = useState(true)
  const [overviewData, setOverviewData]       = useState(null)
  const [salesmanData, setSalesmanData]       = useState([])
  const [supplierData, setSupplierData]       = useState([])
  const [partyData, setPartyData]             = useState([])
  const [belowDlList, setBelowDlList]         = useState([])

  // Selected Salesperson for Detailed Report View
  const [selectedSalesman, setSelectedSalesman]   = useState(null)
  const [salesmanDetailData, setSalesmanDetailData] = useState(null)
  const [detailLoading, setDetailLoading]         = useState(false)

  // AI Insight States
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Pagination for sub-tables
  const [page, setPage] = useState(1)
  const pageSize = 15

  const fetchSalesmanDetail = useCallback(async (smId, smName, s, e) => {
    setDetailLoading(true)
    try {
      const res = await getSalespersonDetail({
        salesManagerId: smId,
        salesmanName: smName,
        startDate: s,
        endDate: e
      })
      if (res?.success) {
        setSalesmanDetailData(res.data)
      } else {
        toast.error('Failed to load salesman detailed report')
      }
    } catch (err) {
      console.error('Error fetching salesman detail:', err)
      toast.error('Error loading salesman detailed report')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSalesman) {
      fetchSalesmanDetail(selectedSalesman.id, selectedSalesman.name, startDate, endDate)
    }
  }, [selectedSalesman, startDate, endDate, fetchSalesmanDetail])

  const handleExportExcel = (data) => {
    if (!data) return toast.error('No report data to export')
    try {
      const wb = XLSX.utils.book_new()

      // 1. KPI Summary Sheet
      const summaryRows = [
        ['SALESPERSON REPORT', data.salesman?.name || 'ALL'],
        ['Reporting Period', `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`],
        [],
        ['Metric', 'Value'],
        ['Total Sales Revenue', data.kpis?.revenue || 0],
        ['Challans Issued', data.kpis?.challans || 0],
        ['Units Sold', data.kpis?.unitsSold || 0],
        ['Gross Margin %', `${data.kpis?.marginPercent || 0}%`],
        ['Est. Total Profit', data.kpis?.totalProfit || 0]
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

      // 2. Top Parts Sheet
      if (data.topParts?.length > 0) {
        const topPartsData = data.topParts.map(p => ({
          'Part SKU': p.part,
          'Description': p.description,
          'Revenue (INR)': p.revenue,
          'Margin %': `${p.marginPercent}%`
        }))
        const wsTopParts = XLSX.utils.json_to_sheet(topPartsData)
        XLSX.utils.book_append_sheet(wb, wsTopParts, 'Top Parts')
      }

      // 3. Customer Breakdown Sheet
      if (data.customerBreakdown?.length > 0) {
        const custData = data.customerBreakdown.map(c => ({
          'Customer Name': c.customer,
          'Party Company': c.partyName,
          'Orders': c.orders,
          'Revenue (INR)': c.revenue
        }))
        const wsCust = XLSX.utils.json_to_sheet(custData)
        XLSX.utils.book_append_sheet(wb, wsCust, 'Customer Breakdown')
      }

      // 4. Sold Below DL Price Sheet
      if (data.belowDlItems?.length > 0) {
        const bdlData = data.belowDlItems.map(b => ({
          'Part SKU': b.part,
          'Description': b.description,
          'Challan #': b.challan,
          'DL Price (INR)': b.dl,
          'Sold At (INR)': b.soldAt,
          'Loss/Unit (INR)': b.lossPerUnit,
          'Quantity': b.qty,
          'Total Loss (INR)': b.totalLoss
        }))
        const wsBdl = XLSX.utils.json_to_sheet(bdlData)
        XLSX.utils.book_append_sheet(wb, wsBdl, 'Sold Below DL')
      }

      // 5. All Challans Sheet
      if (data.allChallans?.length > 0) {
        const challanData = data.allChallans.map(c => ({
          'Challan #': c.challan,
          'Date': formatDateDisplay(c.date),
          'Customer': c.customer,
          'Party Company': c.partyName,
          'Supplier': c.supplier,
          'Bill No': c.billNo,
          'Revenue (INR)': c.revenue,
          'Profit (INR)': c.profit,
          'Margin %': `${c.marginPercent}%`
        }))
        const wsChallans = XLSX.utils.json_to_sheet(challanData)
        XLSX.utils.book_append_sheet(wb, wsChallans, 'All Challans')
      }

      const fileName = `Salesperson_Report_${data.salesman?.name || 'Detailed'}_${startDate}_${endDate}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success(`Exported ${fileName}`)
    } catch (err) {
      console.error('Export Excel error:', err)
      toast.error('Failed to generate Excel file')
    }
  }

  // ── Fetch All Report Data ──────────────────────────────────────────────────
  const fetchAllReports = useCallback(async (s, e) => {
    setLoading(true)
    setAiInsight('')
    setPage(1)
    try {
      const [ovRes, smRes, supRes, partyRes, bdlRes] = await Promise.all([
        getSalesReport({ startDate: s, endDate: e }),
        getSalesmanWise({ startDate: s, endDate: e }),
        getSupplierWise({ startDate: s, endDate: e }),
        getPartyWise({ startDate: s, endDate: e }),
        getBelowDlReport({ startDate: s, endDate: e }),
      ])

      if (ovRes?.success) setOverviewData(ovRes.data)
      if (smRes?.success) setSalesmanData(smRes.data || [])
      if (supRes?.success) setSupplierData(supRes.data || [])
      if (partyRes?.success) setPartyData(partyRes.data || [])
      if (bdlRes?.success) setBelowDlList(bdlRes.data || [])

    } catch (err) {
      console.error('Error fetching reports:', err)
      toast.error('Failed to fetch analytics report data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllReports(startDate, endDate)
  }, [startDate, endDate, fetchAllReports])

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

  // AI Insights Trigger
  const handleAIInsight = async () => {
    if (!overviewData) return toast.error('No report data available')
    if (!isAdmin) return toast.error('AI insights are admin-only')
    setAiLoading(true)
    try {
      const res = await getAiInsight({ reportType: 'executive', data: overviewData })
      if (res?.success) setAiInsight(res.insight)
      else toast.error('Failed to generate AI insight')
    } catch (err) {
      toast.error('Error contacting AI service')
    } finally {
      setAiLoading(false)
    }
  }

  // Filtered lists based on search
  const filteredSalesmen = useMemo(() => {
    if (!search.trim()) return salesmanData
    const q = search.toLowerCase().trim()
    return salesmanData.filter(s => s.name?.toLowerCase().includes(q))
  }, [salesmanData, search])

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return supplierData
    const q = search.toLowerCase().trim()
    return supplierData.filter(s => s.name?.toLowerCase().includes(q))
  }, [supplierData, search])

  const filteredParties = useMemo(() => {
    if (!search.trim()) return partyData
    const q = search.toLowerCase().trim()
    return partyData.filter(p => p.name?.toLowerCase().includes(q))
  }, [partyData, search])

  const filteredBelowDl = useMemo(() => {
    if (!search.trim()) return belowDlList
    const q = search.toLowerCase().trim()
    return belowDlList.filter(b =>
      b.partNumber?.toLowerCase().includes(q) ||
      b.partName?.toLowerCase().includes(q) ||
      b.salesmanName?.toLowerCase().includes(q)
    )
  }, [belowDlList, search])

  const kpis = overviewData?.kpis || {}

  return (
    <div className="space-y-6">
      {/* ── HEADER & PRESET CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            Executive Reports & Intelligence
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Real-time analytics for revenue, salesman productivity, supplier spend, and customer accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-white dark:bg-surface-800 p-1 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
            {['today', '7days', 'thisMonth', 'lastMonth'].map((k) => {
              const labels = { today: 'Today', '7days': '7 Days', thisMonth: 'This Month', lastMonth: 'Last Month' }
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePresetChange(k)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    preset === k
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-700'
                  )}
                >
                  {labels[k]}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all',
                preset === 'custom'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-700'
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Custom
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <Card className="p-4 bg-primary-50/40 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-[11px] font-bold text-surface-600 dark:text-surface-400 uppercase">From Date</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="input-base text-xs bg-white dark:bg-surface-900 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-surface-600 dark:text-surface-400 uppercase">To Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="input-base text-xs bg-white dark:bg-surface-900 mt-1"
              />
            </div>
            <div className="pt-5">
              <Button variant="primary" onClick={handleApplyCustomDate} className="text-xs">
                Apply Date Range
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Date Range Badge */}
      <div className="flex items-center justify-between text-xs text-surface-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary-600" />
          Active Reporting Period: <strong className="text-surface-900 dark:text-surface-100 font-mono">{formatDateDisplay(startDate)}</strong> to <strong className="text-surface-900 dark:text-surface-100 font-mono">{formatDateDisplay(endDate)}</strong>
        </span>
        <button
          type="button"
          onClick={() => fetchAllReports(startDate, endDate)}
          className="hover:text-primary-600 flex items-center gap-1 font-semibold transition-colors"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh Data
        </button>
      </div>

      {/* ── EXECUTIVE OVERVIEW & INSIGHTS ──────────────────────────────────── */}
      <div className="space-y-6">
        {/* Executive KPI Cards (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Sales Revenue</span>
              <div className="p-2 rounded-xl bg-success-50 dark:bg-success-950/40 text-success-600 dark:text-success-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
              {fINR(kpis.totalRevenue)}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <TrendTag pct={kpis.revenueTrendPct} />
              <span className="text-[11px] text-surface-400">Prev: {fINR(kpis.prevTotalRevenue)}</span>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Gross Margin %</span>
              <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
              {fPct(kpis.grossMarginPercent)}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">Est. Gross Profit: {fINR(kpis.totalGrossProfit)}</p>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Fulfillments / Orders</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
              {fNum(kpis.totalOrders)}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">Total Orders Processed</p>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Units Sold</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
              {fNum(kpis.totalItemsSold)}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">Total Quantity Shipped</p>
          </Card>
        </div>

        {/* Quick Report Module Direct Navigation Links */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/reports/salesman')}
            className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-2 transition-all shadow-sm"
          >
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Salesman Reports Page →
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/reports/supplier')}
            className="px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-2 transition-all shadow-sm"
          >
            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Supplier Performance Reports Page →
          </button>
        </div>

        {/* Top Performers Grid (Salesmen, Suppliers, Products) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Top Sales Managers Card */}
          <Card padding={false} className="overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
              <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-600" />
                Top Sales Performers
              </h3>
              <button
                type="button"
                onClick={() => navigate('/admin/reports/salesman')}
                className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
              >
                View Salesmen ({salesmanData.length}) <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {salesmanData.slice(0, 5).map((sm, idx) => (
                <div
                  key={sm.id}
                  onClick={() => navigate(`/admin/reports/salesman/${sm.id}`)}
                  className="p-3.5 flex items-center justify-between hover:bg-surface-50/60 dark:hover:bg-surface-800/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono',
                      idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                      idx === 1 ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200' :
                      idx === 2 ? 'bg-amber-900/10 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                    )}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-surface-900 dark:text-surface-100">{sm.name}</p>
                      <p className="text-[11px] text-surface-400">{sm.orders} orders · {sm.items_sold} units</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-xs text-surface-900 dark:text-surface-100">{fINR(sm.order_value)}</p>
                    <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium">View Report →</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Suppliers Card */}
          <Card padding={false} className="overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
              <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Top Supplier Vendors
              </h3>
              <button
                type="button"
                onClick={() => navigate('/admin/reports/supplier')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                View Suppliers ({supplierData.length}) <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {supplierData.slice(0, 5).map((sup, idx) => (
                <div
                  key={sup.id || idx}
                  onClick={() => navigate(`/admin/reports/supplier/${sup.id || sup.name}`)}
                  className="p-3.5 flex items-center justify-between hover:bg-surface-50/60 dark:hover:bg-surface-800/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold font-mono flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-surface-900 dark:text-surface-100">{sup.name}</p>
                      <p className="text-[11px] text-surface-400">{sup.pos || 0} POs · {sup.items_count || 0} units</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-xs text-primary-600 dark:text-primary-400">{fINR(sup.total_value)}</p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">View Report →</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Products Card */}
          <Card padding={false} className="overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
              <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Top Selling Products
              </h3>
            </div>

            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {(overviewData?.topPartsByRevenue || []).map((p, idx) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-surface-50/60 dark:hover:bg-surface-800/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold font-mono flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-primary-700 dark:text-primary-300 font-mono">{p.sku}</p>
                      <p className="text-[11px] text-surface-500">{p.name}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-xs text-surface-900 dark:text-surface-100">{fINR(p.revenue)}</p>
                    <p className="text-[10px] text-surface-400">{p.quantitySold} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* AI Insights Card */}
      {aiInsight && (
        <Card className="p-5 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/30 dark:via-surface-900 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-900/50 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm mb-2">
            <Sparkles className="h-4 w-4" />
            AI Executive Intelligence Briefing
          </div>
          <div className="prose dark:prose-invert text-xs text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-line font-sans">
            {aiInsight}
          </div>
        </Card>
      )}
    </div>
  )
}
