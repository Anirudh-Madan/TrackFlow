import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, Loader2, AlertCircle, CheckCircle, RotateCcw, Lock, Calendar } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

const STATUS_COLORS = {
  active:   'bg-green-50 text-green-700 border-green-200',
  returned: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  cancelled:'bg-red-50 text-red-600 border-red-200',
}

export default function PublicChallanView() {
  const { token } = useParams()
  const [challan, setChallan] = useState(null)
  const [loading, setLoading]  = useState(true)
  const [error,   setError]    = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/challans/public/${token}`)
      .then(r => { if (r.data.success) setChallan(r.data.data); else setError('Challan not found') })
      .catch(() => setError('Challan not found or link has expired'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-900">{error}</h2>
        <p className="text-sm text-gray-500">The link may be invalid or has been removed.</p>
      </div>
    </div>
  )

  const partyName  = challan.party_name || challan.party?.company_name || '—'
  const date = new Date(challan.generated_at || challan.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Brand bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
            <div className="text-white">
              <p className="text-xs font-medium opacity-75">DELIVERY CHALLAN</p>
              <h1 className="text-xl font-bold mt-0.5 font-mono">{challan.challan_number}</h1>
            </div>
            <FileText className="h-8 w-8 text-white/70" />
          </div>

          <div className="p-6 space-y-6">
            {/* Status + Date */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[challan.status] || STATUS_COLORS.active}`}>
                {challan.status === 'returned' ? <RotateCcw className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                {challan.status?.charAt(0).toUpperCase() + challan.status?.slice(1)}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar className="h-4 w-4" /> {date}
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Party / Customer</p>
                <p className="font-medium text-slate-800 mt-0.5">{partyName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Supplier</p>
                <p className="font-medium text-slate-800 mt-0.5">{challan.supplier || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Bill Number</p>
                <p className="font-semibold text-blue-700 mt-0.5 flex items-center gap-1">
                  {challan.bill_number ? <><Lock className="h-3.5 w-3.5" />{challan.bill_number}</> : '—'}
                </p>
              </div>
              {challan.notes && (
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Notes</p>
                  <p className="text-slate-700 mt-0.5">{challan.notes}</p>
                </div>
              )}
            </div>

            {/* Return reason */}
            {challan.is_returned && (
              <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm">
                <p className="font-semibold text-yellow-800 mb-0.5">Return Reason</p>
                <p className="text-yellow-700">{challan.return_reason}</p>
              </div>
            )}

            {/* Grand total */}
            {challan.grand_total && (
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Grand Total</p>
                  <p className="text-2xl font-bold text-blue-700">₹{parseFloat(challan.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">This is a digitally generated delivery challan from TrackFlow. For queries, contact the issuing company.</p>
      </div>
    </div>
  )
}
