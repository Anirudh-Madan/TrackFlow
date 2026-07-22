import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Loader2, AlertCircle, Lock, Calendar, Hash } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

const STATUS_COLORS = {
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  DRAFT:     'bg-slate-50 text-slate-600 border-slate-200',
  RETURNED:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

export default function PublicPOView() {
  const { token }  = useParams()
  const [po,      setPo]      = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/purchase-orders/public/${token}`)
      .then(r => { if (r.data.success) setPo(r.data.data); else setError('PO not found') })
      .catch(() => setError('Purchase order not found or link has expired'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-900">{error}</h2>
      </div>
    </div>
  )

  const vendor = po.vendor?.company_name || po.vendor_name || '—'
  const date = new Date(po.po_date).toLocaleDateString('en-IN', { dateStyle: 'long' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 flex items-center justify-between">
            <div className="text-white">
              <p className="text-xs font-medium opacity-75">PURCHASE ORDER</p>
              <h1 className="text-xl font-bold mt-0.5 font-mono">{po.po_number}</h1>
            </div>
            <ShoppingBag className="h-8 w-8 text-white/70" />
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[po.status] || STATUS_COLORS.SUBMITTED}`}>
                {po.status}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar className="h-4 w-4" /> {date}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Vendor / Supplier</p>
                <p className="font-medium text-slate-800 mt-0.5">{vendor}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Bill Number</p>
                <p className="font-semibold text-indigo-700 mt-0.5 flex items-center gap-1">
                  {po.bill_number ? <><Lock className="h-3.5 w-3.5" />{po.bill_number}</> : '—'}
                </p>
              </div>
              {po.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Notes</p>
                  <p className="text-slate-700 mt-0.5">{po.notes}</p>
                </div>
              )}
            </div>

            {po.is_returned && (
              <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm">
                <p className="font-semibold text-yellow-800 mb-0.5">Return Reason</p>
                <p className="text-yellow-700">{po.return_reason}</p>
              </div>
            )}

            {/* Items table */}
            {(po.items || []).length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Part No</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {po.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-mono text-xs text-indigo-600">{item.part_number || item.product?.sku || '—'}</td>
                        <td className="px-4 py-2.5">{item.description || item.product?.name || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">₹{parseFloat(item.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 font-semibold text-right text-slate-600">Total</td>
                      <td className="px-4 py-2.5 text-right font-bold text-indigo-700">₹{parseFloat(po.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">This is a digitally generated purchase order from TrackFlow.</p>
      </div>
    </div>
  )
}
