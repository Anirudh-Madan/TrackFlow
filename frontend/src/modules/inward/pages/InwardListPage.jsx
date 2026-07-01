import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getInwards } from '../../../api/endpoints/inward.api'
import { Plus, Search, Calendar, FileText, FileDown, ArrowUpRight, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InwardListPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadInwards() {
      try {
        const res = await getInwards({ search });
        if (res.success) {
          setEntries(res.data);
        }
      } catch (error) {
        toast.error('Failed to load inward entries list');
      } finally {
        setLoading(false);
      }
    }
    loadInwards();
  }, [search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Inward Goods Receipts</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">List of supplier receipts, purchase invoice reference logs, and physical stock arrivals.</p>
        </div>
        <Link
          to="/im/inward/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-sm transition-all shadow-primary-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Inward Entry
        </Link>
      </div>

      {/* Filter and Search Action bar */}
      <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by entry #, supplier, bill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm pl-9 pr-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="text-xs text-surface-500 font-medium">
          Showing {entries.length} receipt log(s)
        </div>
      </div>

      {/* Inward History Table */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-surface-400">
            <FileDown className="w-12 h-12 text-surface-300 dark:text-surface-700 mb-3" />
            <p className="text-base font-semibold">No Receipts Logged</p>
            <p className="text-xs max-w-sm mt-1">Record supplier shipments to update quantities on hand and resolve pending reorder requests.</p>
            <Link to="/im/inward/new" className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-500">
              Create First Receipt &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Entry Number</th>
                  <th className="px-6 py-3.5">Supplier Name</th>
                  <th className="px-6 py-3.5">Bill / Invoice Reference</th>
                  <th className="px-6 py-3.5">Total Items</th>
                  <th className="px-6 py-3.5">Received By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-surface-900 dark:text-surface-50">{e.entry_number}</span>
                      <div className="text-[10px] text-surface-400 font-mono mt-0.5">
                        {new Date(e.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-surface-800 dark:text-surface-200">{e.supplier_name}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-surface-900 dark:text-surface-100">{e.bill_number}</div>
                      <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(e.bill_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300">
                        {e.items?.length || 0} Products
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">{e.receiver?.name || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/im/inward/${e.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-50 rounded-lg transition-colors border border-surface-200 dark:border-surface-800"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Receipt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
