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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; font-size: 13px; margin: 0; padding: 40px; color: #0f172a; }
        
        .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .company-info h1 { font-size: 22px; font-weight: 700; color: #1e3a8a; margin: 0 0 8px 0; letter-spacing: 0.5px; }
        .company-info p { font-size: 12px; color: #334155; margin: 4px 0; font-weight: 500; }
        
        .challan-meta { text-align: right; }
        .challan-number-box { border: 1.5px solid #1e293b; border-radius: 6px; padding: 6px 14px; display: inline-block; margin-bottom: 12px; }
        .challan-number-box span:first-child { font-weight: 700; font-size: 13px; color: #1e3a8a; margin-right: 6px; }
        .challan-number-box span:last-child { font-weight: 700; font-size: 15px; color: #0f172a; }
        .challan-date { font-size: 12px; color: #475569; font-weight: 500; }
        
        .divider { border-top: 1px solid #1e293b; border-bottom: 2px solid #1e293b; height: 3px; margin: 20px 0; }
        
        .title-section { text-align: center; margin: 24px 0 32px 0; }
        .title-section h2 { font-size: 14px; font-weight: 600; letter-spacing: 2.5px; color: #1e293b; margin: 0; }
        
        .customer-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .customer-block h4 { font-size: 10px; font-weight: 600; color: #64748b; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .customer-block p { font-size: 14px; font-weight: 500; color: #1e3a8a; margin: 0; }
        .customer-right { text-align: right; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { text-align: left; font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
        th.text-right { text-align: right; }
        th.text-center { text-align: center; }
        td { padding: 16px 0; font-size: 13px; color: #0f172a; }
        td.text-right { text-align: right; }
        td.text-center { text-align: center; }
        td.font-medium { font-weight: 500; color: #1e3a8a; }
        
        .summary-section { display: flex; justify-content: space-between; margin-bottom: 100px; }
        .salesman-block { font-size: 12px; color: #475569; }
        .salesman-block span { display: block; font-size: 15px; font-weight: 600; color: #1e3a8a; margin-top: 4px; }
        .total-block { text-align: right; font-size: 12px; color: #475569; }
        .total-block span { display: block; font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 4px; }
        
        .footer-sig { text-align: right; margin-top: 60px; }
        .footer-sig .line { border-top: 1px solid #0f172a; width: 220px; margin-left: auto; margin-bottom: 8px; }
        .footer-sig p { font-size: 11px; color: #475569; margin: 0; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="company-info">
          <h1>SHREE RAMDEV MOTORS</h1>
          <p>OLD POWER HOUSE ROAD, BIKANER</p>
          <p>GSTIN: 08ALDPD3168N1ZW</p>
        </div>
        <div class="challan-meta">
          <div class="challan-number-box">
            <span>No.</span><span>${challan.id.replace('CHN-', '')}</span>
          </div>
          <div class="challan-date">Date: ${new Date(challan.date).toLocaleDateString('en-IN').replace(/\//g, '-')}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="title-section">
        <h2>DELIVERY CHALLAN</h2>
      </div>

      <div class="customer-section">
        <div class="customer-block">
          <h4>CUSTOMER NAME</h4>
          <p>${challan.party_name}</p>
        </div>
        <div class="customer-block customer-right">
          <h4>CUSTOMER COMPANY</h4>
          <p>—</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>SR</th>
            <th>PART NUMBER</th>
            <th>DESCRIPTION</th>
            <th class="text-right">QTY</th>
            <th class="text-right">PRICE/UNIT</th>
            <th class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${challan.items.map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="font-medium">${item.sku}</td>
              <td>${item.name}</td>
              <td class="text-right font-medium">${item.qty}</td>
              <td class="text-right font-medium">₹${item.price.toFixed(2)}</td>
              <td class="text-right font-medium">₹${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="salesman-block">
          Salesman
          <span>${challan.dispatched_by}</span>
        </div>
        <div class="total-block">
          Total Amount
          <span>₹${challan.grand_total ? challan.grand_total.toFixed(2) : '0.00'}</span>
        </div>
      </div>

      <div class="footer-sig">
        <div class="line"></div>
        <p>Authorized Signature</p>
      </div>
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
      if (res.success) {
        setChallans(res.data)
      } else {
        toast.error(res.error || 'Failed to fetch challans')
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
        unit: 'pcs',
        price: parseFloat(item.sm_price || 0),
        total: parseFloat(item.line_total || 0)
      }))

      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)

      // Map status from order
      const dbStatus = (order.status || '').toLowerCase()
      let status = 'pending'
      if (dbStatus === 'dispatched') status = 'delivered'
      if (dbStatus === 'cancelled') status = 'cancelled'
      if (dbStatus === 'approved') status = 'in_transit'

      const uniqueSuppliers = Array.from(new Set(items.map(i => i.product?.supplier).filter(Boolean)))
      const supplierStr = uniqueSuppliers.length > 0 ? uniqueSuppliers.join(', ') : '—'

      return {
        id: c.challan_number,
        dbId: c.id,
        order_ref: order.order_number || 'N/A',
        date: c.generated_at || c.created_at || new Date(),
        party_name: party.company_name || 'N/A',
        party_city: region.name || 'N/A',
        region: region.name || 'N/A',
        dispatched_by: salesManager.name || 'N/A',
        supplier: supplierStr,
        items: mappedItems,
        total_items: items.length,
        total_qty: totalQty,
        grand_total: parseFloat(order.grand_total || 0),
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
      'Challan NO',
      'Order Ref',
      'Date',
      'CUSTOMER',
      'COMPANY',
      'Region',
      'Salesman',
      'Supplier',
      'Vehicle No',
      'Driver',
      'Part No',
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
          c.supplier,
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
              <table className="w-full min-w-[1000px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">CHALLAN NO</th>
                    <th className="px-5 py-3.5">DATE</th>
                    <th className="px-5 py-3.5">CUSTOMER</th>
                    <th className="px-5 py-3.5">COMPANY</th>
                    <th className="px-5 py-3.5">SALESMAN</th>
                    <th className="px-5 py-3.5">SUPPLIER</th>
                    <th className="px-5 py-3.5">ITEMS</th>
                    <th className="px-5 py-3.5 text-right">ACTIONS</th>
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
                        <div className="font-semibold text-surface-900 dark:text-surface-50 text-sm">—</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50 text-sm">{c.party_name}</div>
                        <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {c.party_city} · {c.region}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
                          <User className="h-3.5 w-3.5" /> {c.dispatched_by}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300">
                          {c.supplier}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-700 dark:text-surface-300">
                          <Package className="h-3.5 w-3.5 text-surface-400" />
                          {c.total_items} SKUs, {c.total_qty} units
                        </span>
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
              <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                <table className="w-full min-w-[600px] text-sm text-left border-collapse">
                  <thead className="bg-surface-50 dark:bg-surface-700/50">
                    <tr className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Part No</th>
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
