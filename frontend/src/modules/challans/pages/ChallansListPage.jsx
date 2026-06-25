import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, Download, Eye, Search, Filter, ChevronDown,
  Package, MapPin, User, Calendar, CheckCircle, Clock, AlertCircle,
  X, Printer, ArrowUpRight, Loader2
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getChallans } from '../../../api/endpoints/challans.api'

const STATUS_CONFIG = {
  delivered:  { label: 'Delivered',  color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40', icon: ArrowUpRight },
  pending:    { label: 'Pending',    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40', icon: Clock },
  cancelled:  { label: 'Cancelled',  color: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40', icon: X },
}

// ─── PDF Utility ─────────────────────────────────────────────────────────────
function getChallanHTML(challan) {
  const now = new Date().toLocaleString('en-IN')
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Delivery Challan — ${challan.id}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 24px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
        .logo { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
        .logo span { color: #1e293b; }
        .challan-title { text-align: right; }
        .challan-title h2 { margin: 0; font-size: 16px; color: #4f46e5; }
        .challan-title p { margin: 2px 0; color: #64748b; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .meta-box h4 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
        .meta-box p { margin: 3px 0; font-size: 12px; }
        .meta-box .label { color: #64748b; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead tr { background: #4f46e5; color: white; }
        th { padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .total-row td { font-weight: bold; background: #eef2ff; border-top: 2px solid #4f46e5; }
        .footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .sign-box { text-align: center; }
        .sign-box .line { border-bottom: 1px solid #334155; margin-bottom: 6px; height: 40px; }
        .sign-box p { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; }
        .badge.delivered { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
        .badge.in_transit { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
        .badge.pending { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .badge.cancelled { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .print-note { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">Track<span>Flow</span></div>
          <p style="margin:4px 0 0;color:#64748b;font-size:11px;">Enterprise Distribution Management</p>
        </div>
        <div class="challan-title">
          <h2>DELIVERY CHALLAN</h2>
          <p><strong>${challan.id}</strong></p>
          <p>Date: ${challan.date}</p>
          <p>Generated: ${now}</p>
          <p><span class="badge ${challan.status}">${STATUS_CONFIG[challan.status]?.label || challan.status}</span></p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-box">
          <h4>Party Details</h4>
          <p><strong>${challan.party_name}</strong></p>
          <p><span class="label">City:</span> ${challan.party_city}</p>
          <p><span class="label">Region:</span> ${challan.region}</p>
        </div>
        <div class="meta-box">
          <h4>Dispatch Info</h4>
          <p><span class="label">Order Ref:</span> <strong>${challan.order_ref}</strong></p>
          <p><span class="label">Dispatched By:</span> ${challan.dispatched_by}</p>
          <p><span class="label">Vehicle No:</span> ${challan.vehicle_no}</p>
          <p><span class="label">Driver:</span> ${challan.driver}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>SKU</th>
            <th>Item Name</th>
            <th>Quantity</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${challan.items.map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.sku}</td>
              <td>${item.name}</td>
              <td>${item.qty}</td>
              <td>${item.unit}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">Total</td>
            <td>${challan.total_qty}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <div class="sign-box">
          <div class="line"></div>
          <p>Prepared By</p>
        </div>
        <div class="sign-box">
          <div class="line"></div>
          <p>Checked By</p>
        </div>
        <div class="sign-box">
          <div class="line"></div>
          <p>Receiver's Signature</p>
        </div>
      </div>

      <p class="print-note">This is a computer-generated delivery challan. No signature required.</p>
    </body>
    </html>
  `
}

function generateChallanPDF(challan) {
  const html = getChallanHTML(challan)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Please allow popups for this site to download challan.'); return; }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function downloadChallanHTML(challan) {
  const html = getChallanHTML(challan)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `challan_${challan.id}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Challan HTML file downloaded!')
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChallansListPage() {
  const [challans, setChallans]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewChallan, setViewChallan] = useState(null)

  const fetchChallansList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getChallans()
      if (res.data?.success) {
        setChallans(res.data.data)
      } else {
        toast.error(res.data?.error || 'Failed to fetch challans')
      }
    } catch (err) {
      toast.error('Failed to load challans list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChallansList()
  }, [fetchChallansList])

  const formattedChallans = useMemo(() => {
    return challans.map(c => {
      const order = c.order || {}
      const party = order.party || {}
      const region = party.region || {}
      const salesManager = order.salesManager || {}
      const items = order.items || []

      const mappedItems = items.map(item => ({
        sku: item.product?.sku || 'N/A',
        name: item.product?.name || 'N/A',
        qty: item.quantity,
        unit: 'pcs'
      }))

      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)

      // Map status from order
      const dbStatus = (order.status || '').toLowerCase()
      let status = 'pending'
      if (dbStatus === 'dispatched') status = 'delivered'
      if (dbStatus === 'cancelled') status = 'cancelled'
      if (dbStatus === 'approved') status = 'in_transit'

      return {
        id: c.challan_number,
        dbId: c.id,
        order_ref: order.order_number || 'N/A',
        date: c.generated_at || c.created_at || new Date(),
        party_name: party.company_name || 'N/A',
        party_city: region.name || 'N/A',
        region: region.name || 'N/A',
        dispatched_by: salesManager.name || 'N/A',
        items: mappedItems,
        total_items: items.length,
        total_qty: totalQty,
        status,
        vehicle_no: '—',
        driver: '—',
      }
    })
  }, [challans])

  const downloadSampleChallanCSV = () => {
    const headers = [
      'Challan ID',
      'Order Ref',
      'Date',
      'Party Name',
      'Party City',
      'Region',
      'Dispatched By',
      'Vehicle No',
      'Driver',
      'SKU',
      'Item Name',
      'Quantity',
      'Unit'
    ]
    const sampleRows = [
      [
        'CHN-2406-0041',
        'ORD-2406-0098',
        '2026-06-22',
        'Verma Enterprises Pvt Ltd',
        'Lucknow',
        'North UP',
        'Rajan Kumar',
        'UP32 AK 4512',
        'Suresh Yadav',
        'SKU-1021',
        'Heavy Duty Pipe 2"',
        '120',
        'pcs'
      ],
      [
        'CHN-2406-0041',
        'ORD-2406-0098',
        '2026-06-22',
        'Verma Enterprises Pvt Ltd',
        'Lucknow',
        'North UP',
        'Rajan Kumar',
        'UP32 AK 4512',
        'Suresh Yadav',
        'SKU-1044',
        'Elbow Connector 90°',
        '80',
        'pcs'
      ]
    ]

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'sample_challan.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Sample challan CSV downloaded!')
  }

  const exportChallansCSV = () => {
    if (filtered.length === 0) {
      toast.error('No challans to export')
      return
    }

    const headers = [
      'Challan ID',
      'Order Ref',
      'Date',
      'Party Name',
      'Party City',
      'Region',
      'Dispatched By',
      'Vehicle No',
      'Driver',
      'SKU',
      'Item Name',
      'Quantity',
      'Unit'
    ]

    const rows = []
    filtered.forEach(c => {
      c.items.forEach(item => {
        rows.push([
          c.id,
          c.order_ref,
          c.date,
          c.party_name,
          c.party_city,
          c.region,
          c.dispatched_by,
          c.vehicle_no,
          c.driver,
          item.sku,
          item.name,
          String(item.qty),
          item.unit
        ])
      })
    })

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `challans_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Challans list exported successfully!')
  }

  const filtered = useMemo(() => {
    return formattedChallans.filter(c => {
      const matchSearch =
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.party_name.toLowerCase().includes(search.toLowerCase()) ||
        c.order_ref.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [formattedChallans, search, filterStatus])

  const stats = useMemo(() => {
    return {
      total:      formattedChallans.length,
      delivered:  formattedChallans.filter(c => c.status === 'delivered').length,
      in_transit: formattedChallans.filter(c => c.status === 'in_transit').length,
      pending:    formattedChallans.filter(c => c.status === 'pending').length,
    }
  }, [formattedChallans])

  return (
    <div className="animate-in space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Delivery Challans
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            View, search, and download all dispatch challans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={downloadSampleChallanCSV}
            id="download-sample-challan-btn"
          >
            Download Sample
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={exportChallansCSV}
            id="export-challans-btn"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Challans',  value: stats.total,      color: 'text-surface-900 dark:text-surface-50' },
          { label: 'Delivered',       value: stats.delivered,   color: 'text-success-600 dark:text-success-400' },
          { label: 'In Transit',      value: stats.in_transit,  color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Pending',         value: stats.pending,     color: 'text-warning-600 dark:text-warning-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search challan, party, order..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-1.5"
              id="challan-search"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            {['all', 'delivered', 'in_transit', 'pending', 'cancelled'].map(s => (
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
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-surface-500 font-medium shrink-0">
            {filtered.length} of {formattedChallans.length}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600 mb-3" />
            <p className="text-xs text-surface-500">Loading challans from database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No challans found</h3>
                <p className="text-xs text-surface-500 mt-1">Try adjusting your search or filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Challan ID</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Party</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5">Dispatched By</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                  {filtered.map(c => (
                    <tr key={c.id} className="table-row-hover">
                      <td className="px-5 py-4">
                        <div className="font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs">{c.id}</div>
                        <div className="text-xs text-surface-400 mt-0.5">{c.order_ref}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-surface-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50 text-sm">{c.party_name}</div>
                        <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {c.party_city} · {c.region}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-700 dark:text-surface-300">
                          <Package className="h-3.5 w-3.5 text-surface-400" />
                          {c.total_items} SKUs, {c.total_qty} units
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
                          <User className="h-3.5 w-3.5" /> {c.dispatched_by}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => setViewChallan(c)}
                            id={`view-challan-${c.dbId}`}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Download}
                            onClick={() => downloadChallanHTML(c)}
                            id={`download-html-${c.dbId}`}
                          >
                            Download
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Printer}
                            onClick={() => generateChallanPDF(c)}
                            id={`download-challan-${c.dbId}`}
                          >
                            Print
                          </Button>
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

      {/* View Detail Modal */}
      <Modal
        open={!!viewChallan}
        onClose={() => setViewChallan(null)}
        title={`Challan: ${viewChallan?.id}`}
        description={`Order Ref: ${viewChallan?.order_ref}`}
        size="lg"
      >
        {viewChallan && (
          <div className="space-y-5">
            {/* Status + Date */}
            <div className="flex items-center justify-between">
              <StatusBadge status={viewChallan.status} />
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(viewChallan.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </span>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Party Details</p>
                <p className="font-semibold text-surface-900 dark:text-surface-50">{viewChallan.party_name}</p>
                <p className="text-sm text-surface-500">{viewChallan.party_city}</p>
                <p className="text-xs text-surface-400 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {viewChallan.region}
                </p>
              </div>
              <div className="rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Dispatch Info</p>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  <span className="text-surface-400 text-xs">Dispatched By: </span>{viewChallan.dispatched_by}
                </p>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  <span className="text-surface-400 text-xs">Vehicle: </span>{viewChallan.vehicle_no}
                </p>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  <span className="text-surface-400 text-xs">Driver: </span>{viewChallan.driver}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">Dispatched Items</p>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-surface-50 dark:bg-surface-700/50">
                    <tr className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                    {viewChallan.items.map((item, i) => (
                      <tr key={item.sku} className="table-row-hover">
                        <td className="px-4 py-2.5 text-surface-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-primary-600 dark:text-primary-400">{item.sku}</td>
                        <td className="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-50">{item.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{item.qty}</td>
                        <td className="px-4 py-2.5 text-surface-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 dark:bg-surface-700/50 font-semibold text-sm">
                      <td colSpan={3} className="px-4 py-2.5 text-surface-600 dark:text-surface-300">Total</td>
                      <td className="px-4 py-2.5 text-right text-surface-900 dark:text-surface-50">{viewChallan.total_qty}</td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
              <Button variant="secondary" onClick={() => setViewChallan(null)} id="challan-modal-close">
                Close
              </Button>
              <Button variant="secondary" icon={Download} onClick={() => downloadChallanHTML(viewChallan)} id="challan-modal-download">
                Download HTML
              </Button>
              <Button icon={Printer} onClick={() => generateChallanPDF(viewChallan)} id="challan-modal-print">
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
