import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, X, Loader2, ArrowLeft, Package,
  TrendingDown, TrendingUp, RefreshCcw, Filter, AlertCircle, ChevronRight, Tag
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getPartHistory, getPartSuggestions } from '../../../api/endpoints/reports.api'

// Helper date formatter DD-MM-YYYY
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

export default function PartHistoryPage() {
  const { sku } = useParams()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState(sku || '')
  const [loading, setLoading] = useState(false)
  const [partData, setPartData] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [totalFound, setTotalFound] = useState(0)

  // Recommendations / Autocomplete States
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef(null)

  // Fetch Part History
  const fetchHistory = useCallback(async (query) => {
    setLoading(true)
    setShowSuggestions(false)
    try {
      const res = await getPartHistory({ partNumber: query })
      if (res.success && res.data) {
        setPartData(res.data.part)
        setTransactions(res.data.transactions || [])
        setTotalFound(res.data.totalFound || 0)
      } else {
        toast.error(res.error || 'Failed to load part history')
      }
    } catch (err) {
      console.error('[PartHistory] fetch error:', err?.response?.data || err?.message || err)
      const errMsg = err?.response?.data?.error || err?.message || 'Error fetching part transaction history'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch Recommendations from Full Catalog / Price List
  const fetchSuggestions = useCallback(async (query) => {
    setSuggestionsLoading(true)
    try {
      const res = await getPartSuggestions({ q: query })
      if (res.success && res.data) {
        setSuggestions(res.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  // Live input change handler
  const handleInputChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    setShowSuggestions(true)
    fetchSuggestions(val)
  }

  // Handle focus on search field
  const handleInputFocus = () => {
    setShowSuggestions(true)
    fetchSuggestions(searchQuery)
  }

  // Select suggestion item
  const handleSelectSuggestion = (item) => {
    setSearchQuery(item.sku)
    setShowSuggestions(false)
    fetchHistory(item.sku)
  }

  // Initial Fetch & Outside Click Listener
  useEffect(() => {
    if (searchQuery) {
      fetchHistory(searchQuery)
    }

    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) {
      return toast.error('Please enter a part number')
    }
    fetchHistory(searchQuery.trim())
  }

  const handleClear = () => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setPartData(null)
    setTransactions([])
    setTotalFound(0)
  }

  return (
    <div className="animate-in space-y-6">
      {/* ── 1. PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
            ADMIN · OPERATIONS
          </p>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Part Transaction History
          </h1>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/admin/products')}
        >
          Back to Products
        </Button>
      </div>

      {/* ── 2. SEARCH PART NUMBER CARD WITH RECOMMENDATIONS ─────────────────── */}
      <Card className="p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-surface-600 dark:text-surface-400">
            Search Part Number
          </label>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input Container with Recommendations Dropdown */}
            <div ref={searchContainerRef} className="relative flex-1 min-w-[280px]">
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder=""
                className="input-base w-full py-2.5 pl-3.5 pr-9 text-sm font-mono font-semibold"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* ── LIVE RECOMMENDATIONS DROPDOWN ──────────────────────────────── */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-xl overflow-hidden animate-in">
                  <div className="px-3.5 py-2 bg-surface-50 dark:bg-surface-800/80 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
                    <span>Recommendations (Price List & Catalog)</span>
                    {suggestionsLoading && <Loader2 className="h-3 w-3 animate-spin text-primary-500" />}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-700">
                    {suggestions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-surface-400">
                        No matching parts in catalog.
                      </div>
                    ) : (
                      suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full px-4 py-2.5 text-left hover:bg-primary-50/70 dark:hover:bg-primary-950/40 transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-surface-900 dark:text-surface-50 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                {item.sku}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                                {item.supplier || 'Catalog Item'}
                              </span>
                            </div>
                            <p className="text-xs text-surface-500 truncate uppercase mt-0.5">
                              {item.name}
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className={cn(
                              'text-xs font-mono font-semibold px-2 py-0.5 rounded',
                              item.stock > 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400'
                            )}>
                              {item.stock} {item.stock === 1 ? 'unit' : 'units'}
                            </span>
                            <ChevronRight className="h-4 w-4 text-surface-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Search}
              loading={loading}
              className="px-6"
            >
              Search
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>


      {/* ── 3. PART DETAILS HEADER CARD ─────────────────────────────────────── */}
      {partData && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Part Number */}
            <div>
              <p className="text-xs text-surface-400 font-medium">Part Number</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-bold text-surface-900 dark:text-surface-50 font-mono tracking-tight">
                  {partData.sku}
                </span>
              </div>
              <div className="mt-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
                  {partData.brand || 'FG-I'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs text-surface-400 font-medium">Description</p>
              <p className="mt-1 text-sm font-semibold text-surface-800 dark:text-surface-200 uppercase tracking-wide">
                {partData.name}
              </p>
            </div>

            {/* Supplier */}
            <div>
              <p className="text-xs text-surface-400 font-medium">Supplier</p>
              <p className="mt-1 text-sm font-semibold text-surface-800 dark:text-surface-200 uppercase">
                {partData.supplier}
              </p>
            </div>

            {/* Current Stock */}
            <div>
              <p className="text-xs text-surface-400 font-medium">Current Stock</p>
              <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                {partData.currentStock} <span className="text-xs font-medium text-surface-500">units</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── 4. TRANSACTIONS TABLE CARD ──────────────────────────────────────── */}
      {loading ? (
        <Card className="py-20 text-center text-surface-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary-500" />
          <p className="text-sm font-medium">Loading transaction history...</p>
        </Card>
      ) : partData ? (
        <Card padding={false} className="overflow-hidden">
          {/* Table Header / Subtitle & Legend */}
          <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-surface-900 dark:text-surface-50">
              {totalFound} {totalFound === 1 ? 'transaction' : 'transactions'} found
            </h2>

            {/* Legend Indicators */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                <span className="text-surface-700 dark:text-surface-300">Purchase</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger-500" />
                <span className="text-surface-700 dark:text-surface-300">Challan / Sale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-surface-700 dark:text-surface-300">Return</span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">DATE</th>
                  <th className="px-5 py-3.5">TYPE</th>
                  <th className="px-5 py-3.5">REFERENCE</th>
                  <th className="px-5 py-3.5">PARTY / SUPPLIER</th>
                  <th className="px-5 py-3.5">SALESMAN</th>
                  <th className="px-5 py-3.5 text-right">QTY CHANGE</th>
                  <th className="px-5 py-3.5 text-right">STOCK BEFORE</th>
                  <th className="px-5 py-3.5 text-right">STOCK AFTER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300 text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-surface-400">
                      No transaction logs recorded for this part yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isChallan = tx.type === 'Challan' || tx.type === 'Sale'
                    const isPurchase = tx.type === 'Purchase Order' || tx.type === 'PO' || tx.type === 'Inward' || tx.type === 'Purchase'
                    const isReturn = tx.type === 'Return' || tx.type === 'Adjustment'

                    return (
                      <tr key={tx.id} className="table-row-hover">
                        {/* DATE */}
                        <td className="px-5 py-3.5 font-mono text-surface-600 dark:text-surface-300 whitespace-nowrap">
                          {formatDateDisplay(tx.date)}
                        </td>

                        {/* TYPE */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <span className={cn(
                              'h-2 w-2 rounded-full',
                              isChallan && 'bg-danger-500',
                              isPurchase && 'bg-primary-500',
                              isReturn && 'bg-amber-500'
                            )} />
                            <span className={cn(
                              isChallan && 'text-danger-600 dark:text-danger-400',
                              isPurchase && 'text-primary-600 dark:text-primary-400',
                              isReturn && 'text-amber-600 dark:text-amber-400'
                            )}>
                              {isPurchase ? 'Purchase' : tx.type}
                            </span>
                          </span>
                        </td>

                        {/* REFERENCE */}
                        <td className="px-5 py-3.5 font-mono font-semibold text-surface-900 dark:text-surface-50 whitespace-nowrap">
                          {tx.reference}
                        </td>

                        {/* PARTY */}
                        <td className="px-5 py-3.5 font-medium text-surface-800 dark:text-surface-200">
                          {tx.party}
                        </td>

                        {/* SALESMAN */}
                        <td className="px-5 py-3.5 text-surface-600 dark:text-surface-400">
                          {tx.salesman}
                        </td>

                        {/* QTY CHANGE */}
                        <td className={cn(
                          'px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap',
                          tx.qtyChange < 0 ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400'
                        )}>
                          {tx.qtyChange > 0 ? `+${tx.qtyChange}` : tx.qtyChange}
                        </td>

                        {/* STOCK BEFORE */}
                        <td className="px-5 py-3.5 text-right font-mono font-medium text-surface-600 dark:text-surface-400">
                          {tx.stockBefore}
                        </td>

                        {/* STOCK AFTER */}
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-surface-900 dark:text-surface-50">
                          {tx.stockAfter}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="py-16 text-center text-surface-400">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 text-surface-300 dark:text-surface-600" />
          <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
            No Part Found
          </p>
          <p className="text-xs text-surface-500 mt-1">
            Try searching for a different part number or select a sample search above.
          </p>
        </Card>
      )}
    </div>
  )
}
