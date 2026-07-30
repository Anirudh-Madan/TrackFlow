import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Users, Search, ArrowLeft, FileSpreadsheet, Download, Loader2,
  AlertTriangle, RefreshCcw, DollarSign, ShoppingCart, Package,
  TrendingUp, Truck, FileText, Calendar, Filter
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { getSalesmanReport, getSalespersonDetail } from '../../../api/endpoints/reports.api'
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
    maximumFractionDigits: 2
  }).format(Math.abs(v))
  return isNeg ? `-${formatted}` : formatted
}

const fNum = (v) => new Intl.NumberFormat('en-IN').format(v ?? 0)
const fPct = (v) => `${(v ?? 0) >= 0 ? '+' : ''}${(v ?? 0).toFixed(2)}%`

const formatDateDisplay = (dStr) => {
  if (!dStr) return ''
  const d = new Date(dStr)
  if (isNaN(d.getTime())) return dStr
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const SELECT_CLS = "input-base text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"

export default function SalesmanReportPage() {
  const { id: routeSalesmanId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Dates
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || firstOfMonth)
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || today)

  // Data states
  const [salesmanData, setSalesmanData] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')

  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 1. Fetch Salesman Summary List
  const fetchSalesmenList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await getSalesmanReport({ startDate, endDate })
      if (res?.success) {
        setSalesmanData(res.data || [])
      } else {
        toast.error(res?.error || 'Failed to load salesmen list')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load salesmen report')
    } finally {
      setLoadingList(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchSalesmenList()
  }, [fetchSalesmenList])

  // 2. Fetch Detail if route has salesperson ID
  const fetchDetail = useCallback(async (smId) => {
    setDetailLoading(true)
    try {
      const smObj = salesmanData.find(s => String(s.id) === String(smId))
      const res = await getSalespersonDetail({
        salesManagerId: smId,
        salesmanName: smObj?.name || '',
        startDate,
        endDate
      })
      if (res?.success) {
        setDetailData(res.data)
      } else {
        toast.error(res?.error || 'Failed to load detailed salesperson report')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error loading detailed salesperson report')
    } finally {
      setDetailLoading(false)
    }
  }, [salesmanData, startDate, endDate])

  useEffect(() => {
    if (routeSalesmanId) {
      fetchDetail(routeSalesmanId)
    } else {
      setDetailData(null)
    }
  }, [routeSalesmanId, fetchDetail])

  // Export Excel handler
  const handleExportExcel = () => {
    if (!detailData) return
    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary KPIs
    const kpiRows = [
      { KPI: 'Salesperson Name', Value: detailData.salesman?.name || '—' },
      { KPI: 'Period', Value: `${detailData.dateRange?.startDate} to ${detailData.dateRange?.endDate}` },
      { KPI: 'Total Revenue (INR)', Value: detailData.kpis?.revenue || 0 },
      { KPI: 'Challans Issued', Value: detailData.kpis?.challans || 0 },
      { KPI: 'Units Sold', Value: detailData.kpis?.unitsSold || 0 },
      { KPI: 'Total Profit (INR)', Value: detailData.kpis?.totalProfit || 0 },
      { KPI: 'Margin %', Value: detailData.kpis?.marginPercent || 0 }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'Summary KPIs')

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

    // Sheet 3: Customer Breakdown
    if (detailData.customerBreakdown?.length) {
      const wsCust = XLSX.utils.json_to_sheet(detailData.customerBreakdown.map(c => ({
        'Customer': c.customer,
        'Party Name': c.partyName,
        'Orders': c.orders,
        'Revenue (INR)': c.revenue
      })))
      XLSX.utils.book_append_sheet(wb, wsCust, 'Customer Breakdown')
    }

    // Sheet 4: Sold Below DL
    if (detailData.belowDlItems?.length) {
      const wsBelow = XLSX.utils.json_to_sheet(detailData.belowDlItems.map(b => ({
        'Part SKU': b.part,
        'Challan #': b.challan,
        'DL Price (INR)': b.dl,
        'Sold At (INR)': b.soldAt,
        'Loss / Unit (INR)': b.lossPerUnit,
        'Quantity': b.qty,
        'Total Loss (INR)': b.totalLoss
      })))
      XLSX.utils.book_append_sheet(wb, wsBelow, 'Sold Below DL')
    }

    // Sheet 5: All Challans
    if (detailData.allChallans?.length) {
      const wsChallans = XLSX.utils.json_to_sheet(detailData.allChallans.map(ch => ({
        'Challan #': ch.challan,
        'Date': ch.date,
        'Customer': ch.customer,
        'Party Name': ch.partyName,
        'Supplier': ch.supplier,
        'Bill No': ch.billNo,
        'Revenue (INR)': ch.revenue,
        'Profit (INR)': ch.profit,
        'Margin %': ch.marginPercent
      })))
      XLSX.utils.book_append_sheet(wb, wsChallans, 'All Challans')
    }

    const filename = `${detailData.salesman?.name || 'Salesman'}_Report_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const filteredSalesmen = salesmanData.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in">
      {/* ── IF DETAILED REPORT ROUTE (/admin/reports/salesman/:id) ── */}
      {routeSalesmanId ? (
        <div className="space-y-6 animate-in">
          {/* Spacious Single Header Card */}
          <Card padding={false} className="p-6 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm rounded-2xl space-y-6">
            {/* Top Navigation Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-surface-500 font-medium">
                <Link to="/admin/reports" className="hover:text-primary-600">Reports</Link>
                <span>/</span>
                <Link to="/admin/reports/salesman" className="hover:text-primary-600">Salesman Reports</Link>
                <span>/</span>
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{detailData?.salesman?.name || 'Detailed Report'}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/admin/reports/salesman')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Salesmen List
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

            {/* Title & Period Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-bold">
                    👤
                  </span>
                  {detailData?.salesman?.name || 'Salesperson Detailed Report'}
                </h1>
                <p className="text-xs text-surface-500 font-mono flex items-center gap-2 pt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-surface-400" />
                  <span>Period: {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)}</span>
                </p>
              </div>

              {/* Salesman Switcher Dropdown */}
              {salesmanData.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-surface-500 whitespace-nowrap">Switch Salesperson:</span>
                  <select
                    value={routeSalesmanId}
                    onChange={(e) => navigate(`/admin/reports/salesman/${e.target.value}`)}
                    className={cn(SELECT_CLS, "text-xs font-semibold bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 py-2 rounded-xl text-surface-900 dark:text-surface-100 shadow-sm min-w-[220px]")}
                  >
                    {salesmanData.map(sm => (
                      <option key={sm.id} value={sm.id}>
                        👤 {sm.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date Range Filter Bar */}
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

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date()
                    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
                    setEndDate(now.toISOString().slice(0, 10))
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  This Month
                </button>
              </div>
            </div>
          </Card>

          {detailLoading ? (
            <div className="py-20 text-center text-surface-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
              <p className="text-sm font-medium">Fetching detailed performance analytics…</p>
            </div>
          ) : detailData ? (
            <>
              {/* ── 4 KPI SUMMARY CARDS ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Sales Revenue</span>
                    <div className="p-2 rounded-xl bg-success-50 dark:bg-success-950/40 text-success-600 dark:text-success-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
                    {fINR(detailData.kpis?.revenue)}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">Invoiced grand total</p>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Challans Issued</span>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
                    {fNum(detailData.kpis?.challans)}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">Fulfillments processed</p>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Units Sold</span>
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      <Package className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">
                    {fNum(detailData.kpis?.unitsSold)}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">Total quantity shipped</p>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Gross Margin %</span>
                    <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold mt-2 font-mono",
                    (detailData.kpis?.marginPercent || 0) >= 0 ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"
                  )}>
                    {fPct(detailData.kpis?.marginPercent)}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    Est. Profit: {fINR(detailData.kpis?.totalProfit)}
                  </p>
                </Card>
              </div>

              {/* ── 2 SIDE-BY-SIDE BREAKDOWN TABLES ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Top Parts by Revenue */}
                <Card padding={false} className="overflow-hidden">
                  <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
                    <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-600" />
                      Top Parts by Revenue
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                          <th className="px-5 py-3">PART SKU / NAME</th>
                          <th className="px-5 py-3 text-right">REVENUE</th>
                          <th className="px-5 py-3 text-right">MARGIN%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                        {detailData.topParts?.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="px-5 py-8 text-center text-surface-400">No parts recorded for this period.</td>
                          </tr>
                        ) : (
                          detailData.topParts?.map((tp, idx) => (
                            <tr key={idx} className="table-row-hover">
                              <td className="px-5 py-3 font-mono font-bold text-primary-700 dark:text-primary-300">
                                {tp.part}
                                <p className="text-[11px] font-normal text-surface-500 font-sans">{tp.description}</p>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-surface-900 dark:text-surface-100 whitespace-nowrap">
                                {fINR(tp.revenue)}
                              </td>
                              <td className={cn(
                                "px-5 py-3 text-right font-mono font-bold whitespace-nowrap",
                                tp.marginPercent >= 0 ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"
                              )}>
                                {fPct(tp.marginPercent)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Right: Customer Breakdown */}
                <Card padding={false} className="overflow-hidden">
                  <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
                    <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      Customer Breakdown
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                          <th className="px-5 py-3">CUSTOMER / PARTY</th>
                          <th className="px-5 py-3 text-center">ORDERS</th>
                          <th className="px-5 py-3 text-right">REVENUE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                        {detailData.customerBreakdown?.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="px-5 py-8 text-center text-surface-400">No customer records found.</td>
                          </tr>
                        ) : (
                          detailData.customerBreakdown?.map((c, idx) => (
                            <tr key={idx} className="table-row-hover">
                              <td className="px-5 py-3 font-bold text-surface-900 dark:text-surface-100">
                                {c.customer}
                                {c.partyName && c.partyName !== c.customer && (
                                  <p className="text-[11px] font-normal text-surface-500">{c.partyName}</p>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center font-mono font-bold text-surface-800 dark:text-surface-200">
                                {c.orders}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-success-600 dark:text-success-400 whitespace-nowrap">
                                {fINR(c.revenue)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* ── AUDIT TABLE 1: SOLD BELOW DL PRICE ── */}
              <Card padding={false} className="overflow-hidden border-danger-200 dark:border-danger-900/50">
                <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-danger-50/50 dark:bg-danger-950/30 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-danger-700 dark:text-danger-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-danger-500" />
                    Sold Below DL Price ({detailData.belowDlItems?.length || 0} Items)
                  </h3>
                  {detailData.belowDlItems?.length > 0 && (
                    <Badge variant="danger">
                      {fINR(detailData.belowDlItems.reduce((s, i) => s + (i.totalLoss || 0), 0))} Loss
                    </Badge>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                        <th className="px-5 py-3">PART SKU / NAME</th>
                        <th className="px-5 py-3">CHALLAN #</th>
                        <th className="px-5 py-3 text-right">DL PRICE</th>
                        <th className="px-5 py-3 text-right">SOLD AT</th>
                        <th className="px-5 py-3 text-right">LOSS/UNIT</th>
                        <th className="px-5 py-3 text-center">QTY</th>
                        <th className="px-5 py-3 text-right">TOTAL LOSS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                      {detailData.belowDlItems?.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-5 py-8 text-center text-surface-400">No items sold below DL price by this salesperson in this period.</td>
                        </tr>
                      ) : (
                        detailData.belowDlItems?.map((b, idx) => (
                          <tr key={idx} className="table-row-hover bg-danger-50/20 dark:bg-danger-950/10">
                            <td className="px-5 py-3 font-mono font-bold text-primary-700 dark:text-primary-300">
                              {b.part}
                              <p className="text-[11px] font-normal text-surface-500 font-sans">{b.description}</p>
                            </td>
                            <td className="px-5 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {b.challan}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-surface-600 dark:text-surface-400 whitespace-nowrap">
                              {fINR(b.dl)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-surface-900 dark:text-surface-100 whitespace-nowrap">
                              {fINR(b.soldAt)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-danger-600 dark:text-danger-400 whitespace-nowrap">
                              {fINR(b.lossPerUnit)}
                            </td>
                            <td className="px-5 py-3 text-center font-mono font-bold text-surface-800 dark:text-surface-200">
                              {b.qty}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-extrabold text-danger-600 dark:text-danger-400 text-sm whitespace-nowrap">
                              {fINR(b.totalLoss)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* ── AUDIT TABLE 2: ALL CHALLANS IN PERIOD ── */}
              <Card padding={false} className="overflow-hidden">
                <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-surface-900 dark:text-surface-50 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-600" />
                    All Challans in Period ({detailData.allChallans?.length || 0})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                        <th className="px-5 py-3">CHALLAN #</th>
                        <th className="px-5 py-3">DATE</th>
                        <th className="px-5 py-3">CUSTOMER</th>
                        <th className="px-5 py-3">SUPPLIER</th>
                        <th className="px-5 py-3">BILL NO</th>
                        <th className="px-5 py-3 text-right">REVENUE</th>
                        <th className="px-5 py-3 text-right">PROFIT</th>
                        <th className="px-5 py-3 text-right">MARGIN%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                      {detailData.allChallans?.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-5 py-8 text-center text-surface-400">No challans generated for this salesperson in this period.</td>
                        </tr>
                      ) : (
                        detailData.allChallans?.map((c, idx) => (
                          <tr key={idx} className="table-row-hover">
                            <td className="px-5 py-3 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {c.challan}
                            </td>
                            <td className="px-5 py-3 text-surface-600 dark:text-surface-400 font-mono text-[11px] whitespace-nowrap">
                              {formatDateDisplay(c.date)}
                            </td>
                            <td className="px-5 py-3">
                              <p className="font-bold text-surface-900 dark:text-surface-100">{c.customer}</p>
                              {c.partyName && c.partyName !== c.customer && (
                                <p className="text-[10px] text-surface-400">{c.partyName}</p>
                              )}
                            </td>
                            <td className="px-5 py-3 font-semibold text-surface-700 dark:text-surface-300 text-[11px]">
                              {c.supplier}
                            </td>
                            <td className="px-5 py-3 font-mono text-surface-600 dark:text-surface-400 text-[11px]">
                              {c.billNo}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-surface-900 dark:text-surface-100 whitespace-nowrap">
                              {fINR(c.revenue)}
                            </td>
                            <td className={cn(
                              "px-5 py-3 text-right font-mono font-bold whitespace-nowrap",
                              c.profit >= 0 ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"
                            )}>
                              {fINR(c.profit)}
                            </td>
                            <td className={cn(
                              "px-5 py-3 text-right font-mono font-bold whitespace-nowrap",
                              c.marginPercent >= 0 ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"
                            )}>
                              {fPct(c.marginPercent)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center space-y-3 border-danger-200 dark:border-danger-900/50">
              <AlertTriangle className="h-8 w-8 text-danger-500 mx-auto" />
              <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Could not load salesperson report</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto">
                Please verify your backend server process (<code className="font-mono bg-surface-100 dark:bg-surface-800 px-1 py-0.5 rounded">node server.js</code>) is active and reachable.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fetchDetail(routeSalesmanId)}
              >
                <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Retry Loading Report
              </Button>
            </Card>
          )}
        </div>
      ) : (
        /* ── IF STANDALONE SUMMARY LIST PAGE (/admin/reports/salesman) ── */
        <div className="space-y-4">
          <Card padding={false} className="p-4 bg-white dark:bg-surface-900 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <h2 className="font-bold text-sm text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Sales Manager Performance Breakdown ({filteredSalesmen.length})
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Quick Select Salesperson Dropdown */}
              {salesmanData.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) navigate(`/admin/reports/salesman/${e.target.value}`)
                  }}
                  defaultValue=""
                  className={cn(SELECT_CLS, "w-full sm:w-60")}
                >
                  <option value="" disabled>-- Select Salesperson Report --</option>
                  {salesmanData.map(sm => (
                    <option key={sm.id} value={sm.id}>
                      📊 {sm.name} ({fINR(sm.order_value)})
                    </option>
                  ))}
                </select>
              )}

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search salesman name…"
                  className="input-base pl-10 text-xs w-full"
                />
              </div>
            </div>
          </Card>

          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-center w-12">#</th>
                    <th className="px-5 py-3">SALES MANAGER</th>
                    <th className="px-5 py-3 text-center">TOTAL ORDERS</th>
                    <th className="px-5 py-3 text-center">ITEMS SOLD</th>
                    <th className="px-5 py-3 text-center">CHALLANS ISSUED</th>
                    <th className="px-5 py-3 text-right">TOTAL INVOICED REVENUE</th>
                    <th className="px-5 py-3 text-right">AVG ORDER VALUE</th>
                    <th className="px-5 py-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                  {loadingList ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-surface-400">Loading salesman report…</td>
                    </tr>
                  ) : filteredSalesmen.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-surface-400">No sales manager records found.</td>
                    </tr>
                  ) : (
                    filteredSalesmen.map((sm, idx) => {
                      const avgValue = sm.orders > 0 ? sm.order_value / sm.orders : 0
                      return (
                        <tr
                          key={sm.id || idx}
                          onClick={() => navigate(`/admin/reports/salesman/${sm.id}`)}
                          className="table-row-hover cursor-pointer"
                        >
                          <td className="px-4 py-3 text-center font-mono font-bold text-surface-400">
                            #{idx + 1}
                          </td>
                          <td className="px-5 py-3 font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-xs font-bold flex items-center justify-center">
                              {sm.name.charAt(0)}
                            </span>
                            <div>
                              <p className="font-bold">{sm.name}</p>
                              <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold hover:underline">Click to view detailed report →</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-bold text-surface-800 dark:text-surface-200">
                            {sm.orders}
                          </td>
                          <td className="px-5 py-3 text-center font-mono text-surface-600 dark:text-surface-300">
                            {sm.items_sold}
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-bold text-surface-800 dark:text-surface-200">
                            {sm.challans}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-extrabold text-success-600 dark:text-success-400 text-sm whitespace-nowrap">
                            {fINR(sm.order_value)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-surface-700 dark:text-surface-300 whitespace-nowrap">
                            {fINR(avgValue)}
                          </td>
                          <td className="px-5 py-3 text-center whitespace-nowrap">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/admin/reports/salesman/${sm.id}`)
                              }}
                            >
                              View Detailed Report
                            </Button>
                          </td>
                        </tr>
                      )
                    })
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
