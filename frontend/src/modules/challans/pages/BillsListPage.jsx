import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, Download, Search, Filter, Calendar, MapPin, User, Package,
  CheckCircle, Clock, AlertCircle, Lock, Plus, ExternalLink, Eye, ArrowUpRight, Printer, History
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getChallans, setBillNumber } from '../../../api/endpoints/challans.api'
import TablePagination from '../../../components/data/TablePagination'
import { useAuthStore } from '../../../store/authStore'

function getBillHTML(challan) {
  const dateStr = new Date(challan.generated_at || challan.created_at || new Date()).toLocaleDateString('en-IN')
  const partyName = challan.party_name || challan.party?.company_name || '—'
  const supplier = challan.supplier || '—'
  const billNo = challan.bill_number ? challan.bill_number : 'Pending'
  const items = challan.order?.items || challan.items || []
  const grandTotal = parseFloat(challan.grand_total || items.reduce((s, i) => s + (parseFloat(i.quantity || i.qty || 1) * parseFloat(i.unit_price || i.price || i.selling_price || 0)), 0))

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bill — ${challan.challan_number || challan.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0f172a; background: #fff; }
        .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .company-info h1 { font-size: 24px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px 0; letter-spacing: -0.5px; }
        .company-info p { font-size: 14px; font-weight: 500; color: #334155; margin: 0; }
        .date-text { font-size: 14px; font-weight: 500; color: #334155; }
        .details-box { margin: 24px 0; font-size: 14px; line-height: 1.8; }
        .details-box strong { color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th { text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
        th.text-right { text-align: right; }
        td { padding: 14px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        td.font-mono { font-family: monospace; font-weight: 600; color: #1e3a8a; }
        td.text-right { text-align: right; }
        .total-container { text-align: right; margin-top: 24px; }
        .total-container h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        @media print {
          body { margin: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="company-info">
          <h1>SHREE RAMDEV MOTORS</h1>
          <p>Challan / Bill #${challan.challan_number || challan.id}</p>
        </div>
        <div class="date-text">Date: ${dateStr}</div>
      </div>

      <div class="details-box">
        <p><strong>Party / Customer:</strong> ${partyName}</p>
        <p><strong>Supplier:</strong> ${supplier}</p>
        <p><strong>Bill No:</strong> ${billNo}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>PART NO</th>
            <th>DESCRIPTION</th>
            <th class="text-right">QTY</th>
            <th class="text-right">UNIT PRICE</th>
            <th class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => {
            const partNo = i.part_number || i.sku || i.product?.sku || '—'
            const desc = i.description || i.name || i.product?.name || '—'
            const qty = parseFloat(i.quantity || i.qty || 1)
            const price = parseFloat(i.unit_price || i.price || i.selling_price || i.product?.dealer_landing_price || 0)
            const total = qty * price
            return `
              <tr>
                <td class="font-mono">${partNo}</td>
                <td>${desc}</td>
                <td class="text-right" style="font-weight: 600;">${qty}</td>
                <td class="text-right">₹${price.toFixed(2)}</td>
                <td class="text-right" style="font-weight: 700;">₹${total.toFixed(2)}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div class="total-container">
        <h2>Total: ₹${grandTotal.toFixed(2)}</h2>
      </div>
    </body>
    </html>
  `
}

function printBill(challan) {
  const html = getBillHTML(challan)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    toast.error('Popup blocked. Please allow popups to print.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

function downloadBillHTML(challan) {
  const html = getBillHTML(challan)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `challan_bill_${challan.challan_number || challan.id}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Challan / Bill HTML downloaded!')
}

export default function BillsListPage() {
  const { user } = useAuthStore()
  const roleName = typeof user?.role === 'object' ? user.role?.name : user?.role
  const isIM = roleName === 'inventory_manager'
  const isAdmin = roleName === 'admin'

  const [challans, setChallans]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'billed' | 'returned'
  const [page, setPage]               = useState(1)

  const [billModalTarget, setBillModalTarget] = useState(null)
  const [billModalValue, setBillModalValue]   = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [viewBill, setViewBill]               = useState(null)

  const fetchBillsList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getChallans()
      if (res?.success && Array.isArray(res?.data)) {
        setChallans(res.data)
      } else {
        toast.error(res?.error || 'Failed to fetch bills list')
      }
    } catch (err) {
      toast.error('Failed to load bills list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBillsList()
  }, [fetchBillsList])

  useEffect(() => {
    setPage(1)
  }, [search, filterStatus])

  const handleSaveBillNumber = async (e) => {
    e.preventDefault()
    if (!billModalTarget || !billModalValue.trim()) {
      toast.error('Please enter a bill number')
      return
    }
    setSubmitting(true)
    try {
      const res = await setBillNumber(billModalTarget.id, { bill_number: billModalValue.trim() })
      if (res.success) {
        toast.success(`Bill number saved as #${billModalValue.trim()}!`)
        setBillModalTarget(null)
        setBillModalValue('')
        fetchBillsList()
      } else {
        toast.error(res.error || 'Failed to set bill number')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set bill number')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredBills = useMemo(() => {
    return challans.filter(c => {
      const billNo = c.bill_number || ''
      const challanNo = c.challan_number || ''
      const partyName = c.party_name || c.party?.company_name || ''
      const orderRef = c.order?.order_number || ''
      const isReturned = c.is_returned || c.status === 'returned'

      const matchSearch =
        challanNo.toLowerCase().includes(search.toLowerCase()) ||
        billNo.toLowerCase().includes(search.toLowerCase()) ||
        partyName.toLowerCase().includes(search.toLowerCase()) ||
        orderRef.toLowerCase().includes(search.toLowerCase())

      const hasBill = !!billNo.trim()
      let matchStatus = true
      if (filterStatus === 'pending') matchStatus = !hasBill && !isReturned
      if (filterStatus === 'billed') matchStatus = hasBill && !isReturned
      if (filterStatus === 'returned') matchStatus = isReturned

      return matchSearch && matchStatus
    })
  }, [challans, search, filterStatus])

  const stats = useMemo(() => {
    const total = challans.length
    const pending = challans.filter(c => !c.bill_number && !c.is_returned && c.status !== 'returned').length
    const billed = challans.filter(c => !!c.bill_number && !c.is_returned && c.status !== 'returned').length
    const returned = challans.filter(c => c.is_returned || c.status === 'returned').length
    const totalValue = challans.reduce((sum, c) => sum + parseFloat(c.grand_total || 0), 0)
    return { total, pending, billed, returned, totalValue }
  }, [challans])

  const pageSize = 20
  const paginatedBills = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredBills.slice(start, start + pageSize)
  }, [filteredBills, page])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0)
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Total Bills</span>
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-2 font-mono">{stats.total}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Pending Bill Number</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 font-mono">{stats.pending}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Billed / Saved</span>
            <div className="p-2 rounded-xl bg-success-50 dark:bg-success-950/40 text-success-600 dark:text-success-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400 mt-2 font-mono">{stats.billed}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Returned Bills</span>
            <div className="p-2 rounded-xl bg-danger-50 dark:bg-danger-950/40 text-danger-600 dark:text-danger-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-danger-600 dark:text-danger-400 mt-2 font-mono">{stats.returned}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Challan, Bill No, or Customer…"
            className="input-base pl-10 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'pending', 'billed', 'returned'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all',
                filterStatus === st
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
              )}
            >
              {st === 'all' ? 'All Bills' : st === 'pending' ? 'Pending Bill Number' : st === 'billed' ? 'Billed' : 'Returned (Permanent)'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-surface-400">Loading bills...</div>
        ) : paginatedBills.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="h-10 w-10 text-surface-300 mx-auto" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No bills found</h3>
            <p className="text-xs text-surface-500">Approved challans will automatically appear here for bill number assignment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">CHALLAN NO / REF</th>
                  <th className="px-5 py-3.5">DATE</th>
                  <th className="px-5 py-3.5">CUSTOMER / PARTY</th>
                  <th className="px-5 py-3.5">SUPPLIER</th>
                  <th className="px-5 py-3.5 text-right">TOTAL AMOUNT</th>
                  <th className="px-5 py-3.5 text-center">BILL STATUS</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm">
                {paginatedBills.map(c => {
                  const hasBill = !!c.bill_number?.trim()
                  const isReturned = c.is_returned || c.status === 'returned'
                  const partyName = c.party_name || c.party?.company_name || '—'
                  const rawDate = c.generated_at || c.created_at || c.createdAt
                  const dateFormatted = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

                  return (
                    <tr key={c.id} className="table-row-hover">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-surface-900 dark:text-surface-50 text-xs flex items-center gap-1.5 flex-wrap">
                          <span>{c.challan_number}</span>
                          {hasBill && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold font-mono text-xs border border-indigo-100/80 dark:border-indigo-900/40">
                              <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                              <span>{c.bill_number}</span>
                            </span>
                          )}
                        </div>
                        {c.order?.order_number && (
                          <div className="text-xs text-surface-400 mt-0.5 font-mono">{c.order.order_number}</div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-surface-600 dark:text-surface-400 whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">
                        {partyName}
                      </td>

                      <td className="px-5 py-4 text-xs text-surface-600 dark:text-surface-400">
                        {c.supplier || '—'}
                      </td>

                      <td className="px-5 py-4 text-right font-mono font-bold text-surface-900 dark:text-surface-50">
                        {formatCurrency(c.grand_total)}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {isReturned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-800">
                            <AlertCircle className="h-3.5 w-3.5" /> Returned (Non-Deleteable)
                          </span>
                        ) : hasBill ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800">
                            <CheckCircle className="h-3.5 w-3.5" /> Billed (#{c.bill_number})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3.5 w-3.5" /> Pending Bill Number
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={Eye}
                            onClick={() => setViewBill(c)}
                            title="View Bill Details"
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={Download}
                            onClick={() => downloadBillHTML(c)}
                            title="Download Challan / Bill"
                          >
                            Download
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={Printer}
                            onClick={() => printBill(c)}
                            title="Print Bill"
                          >
                            Print
                          </Button>
                          {!isReturned && (
                            isIM ? (
                              <Button
                                variant={hasBill ? 'secondary' : 'primary'}
                                size="xs"
                                icon={FileText}
                                onClick={() => { setBillModalTarget(c); setBillModalValue(c.bill_number || ''); }}
                              >
                                {hasBill ? 'Edit Bill No' : 'Write Bill No'}
                              </Button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-500 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded border border-surface-200 dark:border-surface-700">
                                <Lock className="h-3 w-3 text-amber-500" /> Non-Editable (IM Only)
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          currentPage={page}
          totalItems={filteredBills.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* View Bill Printable Modal */}
      <Modal open={!!viewBill} onClose={() => setViewBill(null)} title="Bill Details & Print Preview" size="lg">
        {viewBill && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-50 shadow-xs space-y-6">
              {/* Header section matching PO image */}
              <div className="flex justify-between items-start border-b border-surface-200 dark:border-surface-700 pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-primary-900 dark:text-primary-400 tracking-tight">SHREE RAMDEV MOTORS</h1>
                  <p className="text-sm font-medium text-surface-600 dark:text-surface-300 mt-1 font-mono">
                    Challan / Bill #{viewBill.challan_number || viewBill.id}
                  </p>
                </div>
                <div className="text-right text-xs font-semibold text-surface-600 dark:text-surface-400">
                  Date: {new Date(viewBill.generated_at || viewBill.created_at || new Date()).toLocaleDateString('en-IN')}
                </div>
              </div>

              {/* Vendor / Customer Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Customer / Party:</span>
                  <span className="text-sm font-semibold">{viewBill.party_name || viewBill.party?.company_name || '—'}</span>
                </div>
                <div>
                  <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Bill Number:</span>
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-300 font-mono">
                    {viewBill.bill_number ? `#${viewBill.bill_number}` : 'Pending (IM Entry)'}
                  </span>
                </div>
                {viewBill.supplier && (
                  <div>
                    <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Supplier:</span>
                    <span>{viewBill.supplier}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-50 dark:bg-surface-800 text-[11px] font-bold text-surface-500 uppercase tracking-wider border-b border-surface-200 dark:border-surface-700">
                    <tr>
                      <th className="px-4 py-3">PART NO</th>
                      <th className="px-4 py-3">DESCRIPTION</th>
                      <th className="px-4 py-3 text-right">QTY</th>
                      <th className="px-4 py-3 text-right">UNIT PRICE</th>
                      <th className="px-4 py-3 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {(viewBill.order?.items || viewBill.items || []).map((item, idx) => {
                      const qty = parseFloat(item.quantity || item.qty || 1)
                      const price = parseFloat(item.unit_price || item.price || item.selling_price || item.product?.dealer_landing_price || 0)
                      const itemTotal = qty * price
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-mono font-semibold text-primary-700 dark:text-primary-400">
                            {item.part_number || item.sku || item.product?.sku || '—'}
                          </td>
                          <td className="px-4 py-3">{item.description || item.name || item.product?.name || '—'}</td>
                          <td className="px-4 py-3 text-right font-bold">{qty}</td>
                          <td className="px-4 py-3 text-right">₹{price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-extrabold">₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Edit History Section ── */}
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-primary-600" />
                    Edit History & Reasons
                  </h4>
                  <span className="text-xs text-surface-400">
                    {(viewBill.editHistory || viewBill.edit_history || []).length} record(s)
                  </span>
                </div>

                {(viewBill.editHistory || viewBill.edit_history) && (viewBill.editHistory || viewBill.edit_history).length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {(viewBill.editHistory || viewBill.edit_history).map((log, idx) => (
                      <div key={log.id || idx} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 space-y-1 text-xs">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-surface-900 dark:text-surface-100 font-semibold">{log.editor?.name || log.user?.name || 'Admin'}</span>
                          <span className="text-surface-400 text-[11px]">{new Date(log.created_at || log.timestamp).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-surface-700 dark:text-surface-300">
                          <span className="text-surface-400">Reason: </span>
                          <span className="font-semibold text-primary-700 dark:text-primary-300">{log.edit_reason || log.reason || '—'}</span>
                        </div>
                        {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                          <div className="text-[11px] text-surface-500 pt-1 border-t border-surface-200/50 dark:border-surface-700/50">
                            {Object.entries(log.changed_fields).map(([k, v]) => (
                              <div key={k} className="font-mono flex items-center gap-1.5">
                                <span className="capitalize text-surface-400">{k.replace('_', ' ')}:</span>
                                <span className="line-through text-surface-400">{typeof v === 'object' ? String(v?.from ?? 'none') : 'none'}</span>
                                <span>➔</span>
                                <span className="text-success-600 font-semibold">{typeof v === 'object' ? String(v?.to ?? '') : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-xs text-surface-400 text-center italic">
                    No edit history recorded for this bill.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-surface-400">Digitally generated bill from TrackFlow</span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setViewBill(null)}>Close</Button>
                <Button type="button" variant="secondary" icon={Download} onClick={() => downloadBillHTML(viewBill)}>Download</Button>
                <Button type="button" variant="primary" icon={Printer} onClick={() => printBill(viewBill)}>Print Bill</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Write / Enter Bill Number Modal */}
      <Modal open={!!billModalTarget} onClose={() => setBillModalTarget(null)} title="Write / Enter Bill Number" size="md">
        {billModalTarget && (
          <form onSubmit={handleSaveBillNumber} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/30 text-xs text-primary-800 dark:text-primary-300">
              <p className="font-semibold mb-1">Challan Approved → Bill Number Entry</p>
              <p className="text-surface-600 dark:text-surface-400">
                Enter the official bill number for <strong>{billModalTarget.challan_number}</strong>. This will sync across Orders, Reports, and Invoices.
              </p>
            </div>

            <div>
              <label className="label-base">Bill Number <span className="text-danger-500">*</span></label>
              <input
                type="text"
                required
                value={billModalValue}
                onChange={e => setBillModalValue(e.target.value)}
                className="input-base font-mono text-sm"
                placeholder="e.g. INV-2026-001 or BOSCH-BILL-901"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setBillModalTarget(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={submitting}>Save Bill Number</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
