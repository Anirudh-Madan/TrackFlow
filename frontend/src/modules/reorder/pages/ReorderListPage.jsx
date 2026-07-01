import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AlertCircle, Clock, CheckCircle, Package, Search, Filter,
  Loader2, Check, ArrowRight, Download, FileText, User, Calendar
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getReorders, updateReorderStatus } from '../../../api/endpoints/reorder.api'

const REORDER_STATUS_CONFIG = {
  OPEN:     { label: 'Open',     color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40', icon: AlertCircle },
  ORDERED:  { label: 'Ordered',  color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40', icon: Clock },
  RECEIVED: { label: 'Received', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40', icon: CheckCircle },
}

function StatusBadge({ status }) {
  const cfg = REORDER_STATUS_CONFIG[status] || REORDER_STATUS_CONFIG.OPEN
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

export default function ReorderListPage() {
  const [reorders, setReorders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [submittingId, setSubmittingId] = useState(null)

  const fetchReorders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getReorders()
      if (res.success) {
        setReorders(res.data)
      } else {
        toast.error(res.error || 'Failed to fetch reorder flags')
      }
    } catch (err) {
      toast.error('Failed to load reorders list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReorders()
  }, [fetchReorders])

  const handleUpdateStatus = async (id, newStatus) => {
    setSubmittingId(id)
    try {
      const res = await updateReorderStatus(id, newStatus)
      if (res.success) {
        toast.success(`Reorder flag status updated to ${newStatus}`)
        // Refresh list
        fetchReorders()
      } else {
        toast.error(res.error || 'Failed to update reorder flag')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update reorder flag')
    } finally {
      setSubmittingId(null)
    }
  }

  const filteredReorders = useMemo(() => {
    return reorders.filter(r => {
      const matchSearch =
        (r.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.product?.sku || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.party?.company_name || '').toLowerCase().includes(search.toLowerCase())
      
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [reorders, search, filterStatus])

  const stats = useMemo(() => {
    return {
      total: reorders.length,
      open: reorders.filter(r => r.status === 'OPEN').length,
      ordered: reorders.filter(r => r.status === 'ORDERED').length,
      received: reorders.filter(r => r.status === 'RECEIVED').length,
    }
  }, [reorders])

  const exportCSV = () => {
    if (filteredReorders.length === 0) {
      toast.error('No reorders to export')
      return
    }

    const headers = [
      'Flag ID',
      'SKU',
      'Product Name',
      'Quantity Wanted',
      'Flagged By',
      'Customer Party',
      'Status',
      'Notes',
      'Created At',
      'Ordered At',
      'Received Inward No'
    ]

    const csvContent = [
      headers.join(','),
      ...filteredReorders.map(r => [
        r.id,
        `"${r.product?.sku || 'N/A'}"`,
        `"${(r.product?.name || '').replace(/"/g, '""')}"`,
        r.quantity_wanted,
        `"${r.flagger?.name || 'N/A'}"`,
        `"${r.party?.company_name || 'General Stock'}"`,
        r.status,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        r.created_at,
        r.ordered_at || '',
        r.receivedViaInward?.entry_number || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reorder_flags_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Reorders exported successfully!')
  }

  return (
    <div className="animate-in space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Reorder Tracking List
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Monitor open stock flags, mark items as ordered, and track inbound stock arrivals.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={exportCSV}
            id="export-reorders-btn"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Flagged', value: stats.total, color: 'text-surface-900 dark:text-surface-50' },
          { label: 'Open Flags', value: stats.open, color: 'text-warning-600 dark:text-warning-400' },
          { label: 'Ordered', value: stats.ordered, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Received & Closed', value: stats.received, color: 'text-success-600 dark:text-success-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product, SKU, party..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-1.5"
              id="reorder-search"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            {['all', 'OPEN', 'ORDERED', 'RECEIVED'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-colors border',
                  filterStatus === s
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
          <div className="text-xs text-surface-500 font-medium shrink-0">
            {filteredReorders.length} of {reorders.length}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600 mb-3" />
            <p className="text-xs text-surface-500">Loading reorder list...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredReorders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No reorder flags found</h3>
                <p className="text-xs text-surface-500 mt-1">Everything looks stocked or no flags match criteria.</p>
              </div>
            ) : (
              <table className="w-full min-w-[1000px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Product SKU</th>
                    <th className="px-5 py-3.5">Product Name</th>
                    <th className="px-5 py-3.5">Qty Wanted</th>
                    <th className="px-5 py-3.5">Flagged By / Party</th>
                    <th className="px-5 py-3.5">Date Info</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                  {filteredReorders.map(r => (
                    <tr key={r.id} className="table-row-hover">
                      <td className="px-5 py-4 font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs">
                        {r.product?.sku || 'N/A'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{r.product?.name || 'N/A'}</div>
                        {r.notes && (
                          <div className="text-xs text-surface-400 italic mt-0.5 max-w-xs truncate" title={r.notes}>
                            "{r.notes}"
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-100">
                        {r.quantity_wanted}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-400">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span>{r.flagger?.name || 'SM'}</span>
                        </div>
                        <div className="text-xs text-surface-400 mt-0.5">
                          {r.party?.company_name || 'General Stock'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-surface-500">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Flagged: {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          </div>
                          {r.ordered_at && (
                            <div className="text-primary-600 dark:text-primary-400">
                              Ordered: {new Date(r.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </div>
                          )}
                          {r.status === 'RECEIVED' && (
                            <div className="text-success-600 dark:text-success-400 font-medium">
                              Rec'd: {r.receivedViaInward?.entry_number || 'Inward Log'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === 'OPEN' && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={ArrowRight}
                              loading={submittingId === r.id}
                              onClick={() => handleUpdateStatus(r.id, 'ORDERED')}
                              id={`mark-ordered-${r.id}`}
                            >
                              Order Item
                            </Button>
                          )}
                          {r.status === 'ORDERED' && (
                            <Button
                              variant="success"
                              size="sm"
                              icon={Check}
                              loading={submittingId === r.id}
                              onClick={() => handleUpdateStatus(r.id, 'RECEIVED')}
                              id={`mark-received-${r.id}`}
                            >
                              Mark Received
                            </Button>
                          )}
                          {r.status === 'RECEIVED' && (
                            <span className="text-xs text-surface-400 italic">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
