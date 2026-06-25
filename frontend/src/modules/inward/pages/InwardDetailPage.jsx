import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getInwardDetails } from '../../../api/endpoints/inward.api'
import { ArrowLeft, Calendar, FileText, Package, User, Warehouse } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InwardDetailPage() {
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInwardDetails() {
      try {
        const res = await getInwardDetails(id);
        if (res.data?.success) {
          setEntry(res.data.data);
        } else {
          toast.error('Inward receipt details not found');
        }
      } catch (error) {
        toast.error('Failed to load inward entry details');
      } finally {
        setLoading(false);
      }
    }
    loadInwardDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="text-center p-12 space-y-4">
        <p className="text-surface-500">Inward receipt log not found.</p>
        <Link to="/im/inward" className="text-primary-600 font-semibold hover:text-primary-500">
          Back to List
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/im/inward" className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Goods Receipt Details</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 font-mono">Entry number: {entry.entry_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left main metadata */}
        <div className="md:col-span-2 space-y-6">
          {/* Items Receipt Table */}
          <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-surface-50/50 dark:bg-surface-800/10">
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-600" />
                Line Items Received
              </h2>
              <span className="text-xs font-semibold text-surface-500">
                {entry.items?.length || 0} Products
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/30 text-[11px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3 text-right">Quantity Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                  {entry.items?.map(item => (
                    <tr key={item.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/10 transition-colors">
                      <td className="px-6 py-4 font-semibold text-surface-800 dark:text-surface-200">{item.product?.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-surface-500">{item.product?.sku}</td>
                      <td className="px-6 py-4 text-right font-semibold text-surface-900 dark:text-surface-50">
                        {item.quantity_received.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-surface-400 tracking-wider uppercase">Remarks & Notes</h3>
              <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}
        </div>

        {/* Right metadata sidebar card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-surface-400 tracking-wider uppercase">Receipt Details</h3>
            
            <div className="space-y-3.5">
              {/* Supplier */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Supplier</span>
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">{entry.supplier_name}</p>
              </div>

              {/* Bill Number */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Invoice / Bill Ref</span>
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">{entry.bill_number}</p>
              </div>

              {/* Bill Date */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Bill Date</span>
                <div className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-surface-400" />
                  {new Date(entry.bill_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
              </div>

              {/* Received By */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Received By</span>
                <div className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-1.5 mt-0.5">
                  <User className="w-4 h-4 text-surface-400" />
                  {entry.receiver?.name || '—'}
                </div>
              </div>

              {/* Log Time */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Transaction Time</span>
                <div className="text-sm text-surface-500 font-mono">
                  {new Date(entry.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
