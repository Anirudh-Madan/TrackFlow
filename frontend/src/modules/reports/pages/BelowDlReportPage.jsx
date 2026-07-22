import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, AlertTriangle } from 'lucide-react'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getBelowDlReport } from '../../../api/endpoints/reports.api'
import { getUsers } from '../../../api/endpoints/users.api'
import TablePagination from '../../../components/data/TablePagination'

// ─── helpers ─────────────────────────────────────────────────────────────────
const fINR = (v) => {
  const isNeg = v < 0
  const s = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Math.abs(v))
  return isNeg ? `-${s}` : s
}
const fNum = (v) => new Intl.NumberFormat('en-IN').format(v ?? 0)

// ─── component ────────────────────────────────────────────────────────────────
export default function BelowDlReportPage() {
  const [items,     setItems]     = useState([])
  const [salesmen,  setSalesmen]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [salesMgrId, setSalesMgrId] = useState('')
  const [page, setPage]           = useState(1)

  useEffect(() => { setPage(1) }, [search, salesMgrId])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search)     params.searchPart   = search
      if (salesMgrId) params.salesManagerId = salesMgrId
      const res = await getBelowDlReport(params)
      if (res.success) setItems(res.data)
      else toast.error(res.error || 'Failed to load report')
    } catch (err) {
      toast.error(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [search, salesMgrId])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await getUsers()
        if (res.success) {
          setSalesmen(res.data.filter(u => u.role === 'sales_manager' || u.role?.name === 'sales_manager'))
        }
      } catch {}
    })()
  }, [])

  useEffect(() => { fetchReport() }, [fetchReport])

  const totalLoss = items.reduce((s, i) => s + (i.totalLoss ?? 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Transaction History</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Audit log of items sold below their Dealer Landing (DL) price.</p>
        </div>
        {/* Summary badge */}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-danger-200 dark:border-danger-900/50 bg-danger-50 dark:bg-danger-900/20">
            <AlertTriangle className="h-4 w-4 text-danger-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-danger-700 dark:text-danger-400 uppercase tracking-wide">
                {items.length} transactions below DL
              </p>
              <p className="text-xs font-mono font-bold text-danger-600 dark:text-danger-400">{fINR(totalLoss)} total leakage</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Filter toolbar (inside card, matches Users page pattern) */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search part / challan…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-9 py-1.5"
              />
            </div>
            {/* Salesman */}
            <select
              value={salesMgrId}
              onChange={e => setSalesMgrId(e.target.value)}
              className="input-base py-1.5 w-full sm:w-44"
            >
              <option value="">All Salesmen</option>
              {salesmen.map(sm => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
            </select>
            {(search || salesMgrId) && (
              <button
                onClick={() => { setSearch(''); setSalesMgrId('') }}
                className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors underline underline-offset-2 shrink-0"
              >Clear</button>
            )}
          </div>
          <div className="text-xs text-surface-500 font-medium shrink-0">
            {loading ? '…' : `${items.length} record${items.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Part</th>
                <th className="px-6 py-3.5">Challan</th>
                <th className="px-6 py-3.5">Salesman</th>
                <th className="px-6 py-3.5 text-right">DL Price</th>
                <th className="px-6 py-3.5 text-right">Sold At</th>
                <th className="px-6 py-3.5 text-right">Loss / Unit</th>
                <th className="px-6 py-3.5 text-right">Qty</th>
                <th className="px-6 py-3.5 text-right">Total Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-surface-400">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-500 mx-auto mb-2" />
                    Loading transactions…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">No records found</p>
                    <p className="text-xs text-surface-500 mt-1">No transactions sold below DL match your filters.</p>
                  </td>
                </tr>
              ) : items.slice((page - 1) * 50, page * 50).map(item => (
                <tr key={item.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-surface-900 dark:text-surface-50">{item.partNumber}</div>
                    <div className="text-xs text-surface-400 truncate max-w-[180px]" title={item.partName}>{item.partName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/orders?search=${item.challanNumber?.replace('#', '')}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline font-medium text-xs font-mono"
                    >
                      {item.challanNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium">{item.salesmanName}</td>
                  <td className="px-6 py-4 text-right font-mono">{fINR(item.dlPrice)}</td>
                  <td className="px-6 py-4 text-right font-mono">{fINR(item.smPrice)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-danger-600 dark:text-danger-400 font-semibold font-mono">{fINR(item.lossPerUnit)}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{fNum(item.quantity)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-danger-600 dark:text-danger-400 font-mono">{fINR(item.totalLoss)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={page}
          totalItems={items.length}
          pageSize={50}
          onPageChange={setPage}
        />

        {/* Footer total */}
        {!loading && items.length > 0 && (
          <div className="border-t-2 border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 px-6 py-4 flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-surface-500">Total Leakage</span>
            <span className="font-mono font-black text-danger-600 dark:text-danger-400">{fINR(totalLoss)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
