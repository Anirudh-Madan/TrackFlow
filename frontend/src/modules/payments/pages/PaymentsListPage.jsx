import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CreditCard, Calendar, CalendarDays, CheckCircle2, Clock3,
  FileText, Search, TrendingDown, TrendingUp, Wallet, Plus,
  AlertTriangle, Filter, Loader2, ArrowUpRight, ArrowDownRight,
  Printer, X, User, Building2, ChevronRight, Eye, ShieldAlert,
  Edit3, History, FileEdit
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Card from '../../../components/ui/Card'
import TablePagination from '../../../components/data/TablePagination'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import {
  getPayments, createPayment, updatePayment, getPaymentEditHistory, getDaywiseOutstandings, getPartyLedger
} from '../../../api/endpoints/payments.api'
import { getCustomers } from '../../../api/endpoints/parties.api'

function fmt(val) {
  if (val == null || val === '') return '₹0'
  const n = Number(val)
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

const MODES = ['UPI', 'RTGS', 'CASH', 'CHEQUE', 'CARD', 'WALLET']

const STATUS_CONFIG = {
  received: { label: 'Received', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400', icon: CheckCircle2 },
  pending:  { label: 'Pending',  color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400', icon: Clock3 },
  failed:   { label: 'Failed',   color: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400', icon: TrendingDown },
}

export default function PaymentsListPage() {
  const { user } = useAuthStore()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState('outstandings') // 'outstandings' | 'payments'
  const [loading, setLoading]     = useState(true)

  // API Data States
  const [outstandings, setOutstandings]   = useState([])
  const [daywiseAccounts, setDaywiseAccounts] = useState([])
  const [summary, setSummary]             = useState({})
  const [paymentsLog, setPaymentsLog]     = useState([])

  // Customers list for dropdowns
  const [customers, setCustomers] = useState([])

  // Filters
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'OUTSTANDING' | 'CREDIT_BREACH' | 'CLEARED'
  const [dateFilter, setDateFilter]     = useState('all')

  // Pagination
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [search, statusFilter])

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState('')
  const [paymentForm, setPaymentForm] = useState({
    customer_id: '',
    customer_name: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    mode: 'UPI',
    reference_number: '',
    remarks: '',
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Edit Payment Modal State
  const [editPaymentModalData, setEditPaymentModalData] = useState(null)
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    payment_date: '',
    mode: 'UPI',
    reference_number: '',
    status: 'received',
    remarks: '',
    edit_reason: '',
  })
  const [submittingEditPayment, setSubmittingEditPayment] = useState(false)

  // Record Payment calculation
  const selectedCustObj = useMemo(() => {
    return outstandings.find(c => String(c.id) === String(paymentForm.customer_id))
  }, [outstandings, paymentForm.customer_id])

  const currentBal = selectedCustObj?.balance || 0
  const recordAmt = Number(paymentForm.amount || 0)
  const remainingBalAfterRecord = Math.max(0, currentBal - recordAmt)
  const isRecordPartial = currentBal > 0 && recordAmt < currentBal
  const isRecordCompleted = currentBal > 0 && recordAmt >= currentBal

  // Edit Payment calculation
  const editCustObj = useMemo(() => {
    return outstandings.find(c => String(c.id) === String(editPaymentModalData?.customer_id))
  }, [outstandings, editPaymentModalData])

  const editPrevAmt = Number(editPaymentModalData?.amount || 0)
  const editNetBalBefore = (editCustObj?.balance || 0) + editPrevAmt
  const editAmt = Number(editPaymentForm.amount || 0)
  const editRemainingBal = Math.max(0, editNetBalBefore - editAmt)
  const isEditPartial = editRemainingBal > 0
  const isEditCompleted = editNetBalBefore > 0 && editAmt >= editNetBalBefore

  // Payment Edit History Modal
  const [historyModalData, setHistoryModalData] = useState(null)
  const [historyLogs, setHistoryLogs] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const handleOpenEditPayment = (payment) => {
    setEditPaymentModalData(payment)
    setEditPaymentForm({
      amount: payment.amount || '',
      payment_date: payment.payment_date || new Date().toISOString().slice(0, 10),
      mode: payment.mode || 'UPI',
      reference_number: payment.reference_number || '',
      status: payment.status || 'received',
      remarks: payment.remarks || '',
      edit_reason: '',
    })
  }

  const handleSaveEditPayment = async (e) => {
    e.preventDefault()
    if (!editPaymentForm.edit_reason.trim()) {
      toast.error('Please provide a reason for editing this payment record')
      return
    }
    setSubmittingEditPayment(true)
    try {
      const res = await updatePayment(editPaymentModalData.id, editPaymentForm)
      if (res?.success) {
        toast.success('Payment record updated successfully')
        setEditPaymentModalData(null)
        fetchData()
      } else {
        toast.error(res?.error || 'Failed to update payment record')
      }
    } catch (err) {
      toast.error(err.message || 'Error updating payment')
    } finally {
      setSubmittingEditPayment(false)
    }
  }

  const handleOpenHistoryModal = async (payment) => {
    setHistoryModalData(payment)
    setLoadingHistory(true)
    try {
      const res = await getPaymentEditHistory(payment.id)
      if (res?.success) {
        setHistoryLogs(res.data || [])
      } else {
        setHistoryLogs(payment.editLogs || [])
      }
    } catch (err) {
      setHistoryLogs(payment.editLogs || [])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Customer Ledger Modal
  const [ledgerModalData, setLedgerModalData] = useState(null)
  const [loadingLedger, setLoadingLedger]     = useState(false)

  // Fetch Outstandings Data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDaywiseOutstandings()
      if (res?.success) {
        setOutstandings(res.data?.outstandings || [])
        setDaywiseAccounts(res.data?.daywiseAccounts || [])
        setSummary(res.data?.summary || {})
      }
      const payRes = await getPayments()
      if (payRes?.success) {
        setPaymentsLog(payRes.data || [])
      }
    } catch (err) {
      console.error('Failed to load payment accounts:', err)
      toast.error('Failed to load daywise outstanding accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    getCustomers().then(r => { if (r?.success) setCustomers(r.data || []) }).catch(() => {})
  }, [fetchData])

  // Handle location state trigger
  useEffect(() => {
    if (location.state?.openNewPayment) {
      if (location.state.partyId) {
        setSelectedCustomerForPayment(String(location.state.partyId))
        setPaymentForm(f => ({ ...f, customer_id: String(location.state.partyId) }))
      }
      setIsRecordPaymentOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // Open Record Payment Modal for specific customer
  const handleOpenPaymentForCustomer = (cust) => {
    setPaymentForm({
      customer_id: String(cust.id),
      customer_name: cust.company_name,
      amount: cust.balance > 0 ? String(cust.balance) : '',
      payment_date: new Date().toISOString().slice(0, 10),
      mode: 'UPI',
      reference_number: '',
      remarks: '',
    })
    setIsRecordPaymentOpen(true)
  }

  // Handle Record Payment Submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    setSubmittingPayment(true)
    try {
      const res = await createPayment({
        customer_id: paymentForm.customer_id || undefined,
        customer_name: paymentForm.customer_name || undefined,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        mode: paymentForm.mode,
        reference_number: paymentForm.reference_number?.trim() || undefined,
        remarks: paymentForm.remarks?.trim() || undefined,
      })

      if (res?.success) {
        toast.success(`Payment of ${fmt(paymentForm.amount)} recorded successfully!`)
        setIsRecordPaymentOpen(false)
        fetchData()
      } else {
        toast.error(res?.error || 'Failed to record payment')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Payment recording failed')
    } finally {
      setSubmittingPayment(false)
    }
  }

  // View Customer Ledger
  const handleViewLedger = async (customerId) => {
    setLoadingLedger(true)
    try {
      const res = await getPartyLedger(customerId)
      if (res?.success) {
        setLedgerModalData(res.data)
      } else {
        toast.error(res?.error || 'Failed to load ledger')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load customer ledger')
    } finally {
      setLoadingLedger(false)
    }
  }

  // Filtered Outstandings List
  const filteredOutstandings = useMemo(() => {
    return outstandings.filter(c => {
      const q = search.toLowerCase()
      const matchSearch =
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.gst || '').toLowerCase().includes(q) ||
        (c.sales_manager_name || '').toLowerCase().includes(q)

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'OUTSTANDING' && c.balance > 0) ||
        (statusFilter === 'CREDIT_BREACH' && c.is_breached) ||
        (statusFilter === 'CLEARED' && c.balance <= 0)

      return matchSearch && matchStatus
    })
  }, [outstandings, search, statusFilter])

  // Print Customer Ledger Statement
  const handlePrintLedger = (data) => {
    if (!data) return
    const cust = data.customer
    const ledger = data.ledger || []
    const summary = data.summary || {}

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Ledger — ${cust?.company_name}</title>
        <style>
          body { font-family: sans-serif; font-size: 12px; padding: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-b: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #1e3a8a; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .text-right { text-align: right; }
          .font-mono { font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><div class="title">STATEMENT OF ACCOUNT</div><div>TrackFlow Enterprise</div></div>
          <div style="text-align:right"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
        <div class="grid">
          <div><strong>Customer:</strong> ${cust?.company_name}<br/><span style="font-size:10px;color:#64748b">GST: ${cust?.gst || '—'}</span></div>
          <div><strong>Sales Manager:</strong> ${cust?.sales_manager_name}<br/><strong>Credit Limit:</strong> ₹${cust?.credit_limit?.toLocaleString('en-IN')}</div>
          <div><strong>Net Outstanding:</strong> <span style="font-size:16px;color:#dc2626">₹${summary?.currentBalance?.toLocaleString('en-IN')}</span></div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Reference</th><th class="text-right">Debit (Inv)</th><th class="text-right">Credit (Paid)</th><th class="text-right">Balance</th></tr>
          </thead>
          <tbody>
            ${ledger.map(l => `
              <tr>
                <td>${formatDateDisplay(l.date)}</td>
                <td><strong>${l.type}</strong></td>
                <td>${l.reference}</td>
                <td class="text-right font-mono">${l.debit ? '₹' + l.debit.toLocaleString('en-IN') : '—'}</td>
                <td class="text-right font-mono">${l.credit ? '₹' + l.credit.toLocaleString('en-IN') : '—'}</td>
                <td class="text-right font-mono" style="font-weight:bold">${'₹' + l.runningBalance.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  return (
    <div className="animate-in space-y-6">
      {/* ── 1. PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
              Customer Accounts & Daywise Outstandings
            </h1>
            <p className="text-xs text-surface-400 mt-0.5">
              Track daywise outstanding balances, credit breaches, and payment collections
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setPaymentForm({
              customer_id: '',
              customer_name: '',
              amount: '',
              payment_date: new Date().toISOString().slice(0, 10),
              mode: 'UPI',
              reference_number: '',
              remarks: '',
            })
            setIsRecordPaymentOpen(true)
          }}
          id="record-payment-btn"
        >
          Record Payment
        </Button>
      </div>

      {/* ── 2. SUMMARY KPI CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-danger-600 dark:text-danger-400 mt-2">
            {fmt(summary.totalOutstanding)}
          </p>
          <p className="text-[11px] text-surface-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-surface-700 dark:text-surface-300">{summary.activeDebtorsCount || 0}</span> active customer account(s)
          </p>
        </Card>

        {/* Today's Collections */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Today's Collections</span>
            <div className="p-2 rounded-xl bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-success-600 dark:text-success-400 mt-2">
            {fmt(summary.todayCollected)}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">
            Collected on {formatDateDisplay(new Date().toISOString().slice(0, 10))}
          </p>
        </Card>

        {/* Active Debtors */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Active Debtors</span>
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-surface-900 dark:text-surface-50 mt-2">
            {summary.activeDebtorsCount || 0} / {summary.totalCustomers || 0}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">
            Customers with pending balance
          </p>
        </Card>

        {/* Credit Breaches */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Credit Breaches</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {summary.breachedCount || 0}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">
            Exceeding assigned credit limit
          </p>
        </Card>
      </div>

      {/* ── 3. TABS NAVIGATION ────────────────────────────────────────────── */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('outstandings')}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'outstandings'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="tab-outstandings-btn"
        >
          <CalendarDays className="h-4 w-4" />
          Daywise Accounts & Outstandings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'payments'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="tab-payments-btn"
        >
          <Wallet className="h-4 w-4" />
          Payments Log ({paymentsLog.length})
        </button>
      </div>

      {/* ── 4. TAB CONTENT ────────────────────────────────────────────────── */}
      {loading ? (
        <Card className="py-20 text-center text-surface-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary-500" />
          <p className="text-sm font-medium">Loading financial accounts...</p>
        </Card>
      ) : activeTab === 'outstandings' ? (
        <div className="space-y-6">

          {/* ── DAYWISE ACCOUNTS BREAKDOWN TABLE ───────────────────────────── */}
          <Card padding={false} className="overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary-600" />
                  Daywise Financial Summary & Cash Flow
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">Day-by-day account of sales invoiced vs payments collected</p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-semibold uppercase tracking-wider">
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Invoiced (Sales)</th>
                    <th className="px-5 py-3 text-right">Collected (Paid)</th>
                    <th className="px-5 py-3 text-right">Daily Net Balance</th>
                    <th className="px-5 py-3 text-right">Total Outstanding</th>
                    <th className="px-5 py-3 text-center">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                  {daywiseAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-center text-surface-400 italic">No daywise transaction records found.</td>
                    </tr>
                  ) : daywiseAccounts.map(d => (
                    <tr key={d.date} className="hover:bg-surface-50/60 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-5 py-2.5 font-mono font-medium text-surface-900 dark:text-surface-100 whitespace-nowrap">
                        {formatDateDisplay(d.date)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-danger-600 dark:text-danger-400">
                        {d.invoiced > 0 ? `+${fmt(d.invoiced)}` : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-success-600 dark:text-success-400">
                        {d.collected > 0 ? `-${fmt(d.collected)}` : '—'}
                      </td>
                      <td className={cn(
                        'px-5 py-2.5 text-right font-mono font-bold',
                        d.netChange > 0 ? 'text-danger-600 dark:text-danger-400' : d.netChange < 0 ? 'text-success-600 dark:text-success-400' : 'text-surface-400'
                      )}>
                        {d.netChange > 0 ? `+${fmt(d.netChange)}` : d.netChange < 0 ? `-${fmt(Math.abs(d.netChange))}` : '₹0'}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-bold text-surface-900 dark:text-surface-50">
                        {fmt(d.runningOutstanding)}
                      </td>
                      <td className="px-5 py-2.5 text-center text-[11px] text-surface-400 whitespace-nowrap">
                        {d.ordersCount} orders · {d.paymentsCount} payments
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── CUSTOMER OUTSTANDINGS TABLE ────────────────────────────────── */}
          <Card padding={false} className="overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search customer, GST, or Sales Manager…"
                  className="input-base pl-10 text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider shrink-0">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="input-base text-xs py-2 bg-white dark:bg-surface-900"
                >
                  <option value="all">All Statuses ({outstandings.length})</option>
                  <option value="OUTSTANDING">Has Balance</option>
                  <option value="CREDIT_BREACH">Credit Breach ⚠️</option>
                  <option value="CLEARED">Cleared / Zero Balance</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3">CUSTOMER / GST</th>
                    <th className="px-5 py-3">SALES MANAGER</th>
                    <th className="px-5 py-3 text-right">CREDIT LIMIT</th>
                    <th className="px-5 py-3 text-right">TOTAL INVOICED</th>
                    <th className="px-5 py-3 text-right">TOTAL PAID</th>
                    <th className="px-5 py-3 text-right">NET BALANCE</th>
                    <th className="px-5 py-3 text-center">STATUS</th>
                    <th className="px-5 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                  {filteredOutstandings.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-surface-400">
                        No customer outstanding accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredOutstandings.map(c => (
                      <tr key={c.id} className="table-row-hover">
                        {/* CUSTOMER */}
                        <td className="px-5 py-3 font-medium text-surface-900 dark:text-surface-100">
                          <p className="font-semibold text-sm">{c.company_name}</p>
                          {c.gst && <p className="text-[11px] text-surface-400 font-mono">{c.gst}</p>}
                        </td>

                        {/* SALES MANAGER */}
                        <td className="px-5 py-3 text-surface-600 dark:text-surface-300 font-medium">
                          {c.sales_manager_name}
                        </td>

                        {/* CREDIT LIMIT */}
                        <td className="px-5 py-3 text-right font-mono text-surface-600 dark:text-surface-400">
                          {c.credit_limit > 0 ? fmt(c.credit_limit) : '—'}
                        </td>

                        {/* TOTAL INVOICED */}
                        <td className="px-5 py-3 text-right font-mono font-medium text-surface-800 dark:text-surface-200">
                          {fmt(c.total_invoiced)}
                        </td>

                        {/* TOTAL PAID */}
                        <td className="px-5 py-3 text-right font-mono font-semibold text-success-600 dark:text-success-400">
                          {fmt(c.total_paid)}
                        </td>

                        {/* NET BALANCE */}
                        <td className={cn(
                          'px-5 py-3 text-right font-mono font-bold text-sm',
                          c.balance > 0 ? (c.is_breached ? 'text-danger-600 dark:text-danger-400' : 'text-primary-600 dark:text-primary-400') : 'text-success-600 dark:text-success-400'
                        )}>
                          {fmt(c.balance)}
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-3 text-center whitespace-nowrap">
                          {c.balance <= 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800">
                              CLEARED
                            </span>
                          ) : c.is_breached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-800">
                              ⚠️ BREACH
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              OUTSTANDING
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewLedger(c.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-xs font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors flex items-center gap-1"
                              title="View Daywise Account Ledger"
                            >
                              <FileText className="h-3.5 w-3.5 text-primary-500" />
                              Ledger
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPaymentForCustomer(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                              title="Edit / Record Partial or Full Payment"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* ── PAYMENTS LOG TAB ────────────────────────────────────────────── */
        <Card padding={false} className="overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary-600" />
              Recorded Payments Log
            </h3>
            <span className="text-xs text-surface-400">{paymentsLog.length} total entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-[11px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">PAYMENT ID</th>
                  <th className="px-5 py-3.5">DATE</th>
                  <th className="px-5 py-3.5">CUSTOMER</th>
                  <th className="px-5 py-3.5">MODE</th>
                  <th className="px-5 py-3.5">REF NUMBER</th>
                  <th className="px-5 py-3.5">RECEIVED BY</th>
                  <th className="px-5 py-3.5 text-right">AMOUNT</th>
                  <th className="px-5 py-3.5 text-center">STATUS</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                {paymentsLog.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-5 py-12 text-center text-surface-400">
                      No payment records logged yet.
                    </td>
                  </tr>
                ) : (
                  paymentsLog.map(p => {
                    const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.received
                    const hasEditHistory = (p.editLogs && p.editLogs.length > 0) || p.edit_count > 0

                    return (
                      <tr key={p.id} className="table-row-hover">
                        <td className="px-5 py-3.5 font-mono font-bold text-primary-700 dark:text-primary-300">
                          {p.payment_number || `PAY-${p.id}`}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-surface-600 dark:text-surface-300">
                          {formatDateDisplay(p.payment_date)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-surface-900 dark:text-surface-100">
                          {p.customer_name || p.customer?.company_name || '—'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 font-bold">
                            {p.mode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-surface-600 dark:text-surface-400">
                          {p.reference_number || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-surface-600 dark:text-surface-300 font-medium">
                          {p.received_by || 'Admin'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-success-600 dark:text-success-400 text-sm">
                          {fmt(p.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border', statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasEditHistory && (
                              <button
                                type="button"
                                onClick={() => handleOpenHistoryModal(p)}
                                className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1 hover:bg-amber-100 transition-colors"
                                title="View Edit History"
                              >
                                <History className="h-3 w-3" />
                                History ({p.editLogs?.length || 1})
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayment(p)}
                              className="px-2.5 py-1 rounded border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-xs font-semibold flex items-center gap-1 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── 5. RECORD PAYMENT MODAL ────────────────────────────────────────── */}
      <Modal
        open={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title="Record Customer Payment"
        size="md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="label-base">Customer / Party <span className="text-danger-500">*</span></label>
            <select
              required
              value={paymentForm.customer_id}
              onChange={e => {
                const cid = e.target.value
                const cust = customers.find(c => String(c.id) === String(cid))
                const custObj = outstandings.find(c => String(c.id) === String(cid))
                const bal = custObj?.balance || 0
                setPaymentForm(f => ({
                  ...f,
                  customer_id: cid,
                  customer_name: cust ? cust.company_name : f.customer_name,
                  amount: bal > 0 ? String(bal) : f.amount,
                }))
              }}
              className="input-base text-sm font-medium bg-white dark:bg-surface-900"
            >
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.gst || 'No GST'})
                </option>
              ))}
            </select>
          </div>

          {/* Live Outstanding Calculation & Payment Classification Card */}
          {selectedCustObj && (
            <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-surface-600 dark:text-surface-300">Account Summary</span>
                {isRecordCompleted ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success-50 dark:bg-success-900/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800">
                    ✓ FULL SETTLEMENT
                  </span>
                ) : isRecordPartial ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    PARTIAL PAYMENT
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300">
                    PAYMENT RECEIPT
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-surface-200/60 dark:border-surface-700/60 font-mono">
                <div>
                  <p className="text-[10px] text-surface-400 font-sans uppercase">Current Outstanding</p>
                  <p className="font-bold text-danger-600 dark:text-danger-400">{fmt(currentBal)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-surface-400 font-sans uppercase">Paying Now</p>
                  <p className="font-bold text-success-600 dark:text-success-400">{fmt(recordAmt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-surface-400 font-sans uppercase">New Balance After</p>
                  <p className={cn('font-bold', remainingBalAfterRecord > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-success-600 dark:text-success-400')}>
                    {fmt(remainingBalAfterRecord)}
                  </p>
                </div>
              </div>

              {/* Quick Preset Pills */}
              {currentBal > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-surface-400 font-semibold uppercase">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(f => ({ ...f, amount: String(currentBal) }))}
                    className="px-2 py-0.5 rounded bg-surface-200 dark:bg-surface-700 hover:bg-primary-100 hover:text-primary-700 text-[10px] font-bold transition-colors"
                  >
                    Full ({fmt(currentBal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(f => ({ ...f, amount: String(Math.round(currentBal * 0.5)) }))}
                    className="px-2 py-0.5 rounded bg-surface-200 dark:bg-surface-700 hover:bg-amber-100 hover:text-amber-700 text-[10px] font-bold transition-colors"
                  >
                    50% ({fmt(Math.round(currentBal * 0.5))})
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="label-base">Payment Amount (₹) <span className="text-danger-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold">₹</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 25000"
                  className="input-base pl-8 font-mono text-sm font-bold"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="label-base">Payment Date <span className="text-danger-500">*</span></label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                className="input-base text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Mode */}
            <div>
              <label className="label-base">Payment Mode <span className="text-danger-500">*</span></label>
              <select
                value={paymentForm.mode}
                onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))}
                className="input-base text-sm bg-white dark:bg-surface-900 font-semibold"
              >
                {MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="label-base">Reference / UTR No.</label>
              <input
                type="text"
                value={paymentForm.reference_number}
                onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                placeholder="e.g. UPI-789456 or Cheque #"
                className="input-base text-sm font-mono"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="label-base">Remarks / Notes</label>
            <textarea
              rows={2}
              value={paymentForm.remarks}
              onChange={e => setPaymentForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="e.g. Advance / Partial payment received against invoice balance."
              className="input-base text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
            <Button type="button" variant="secondary" onClick={() => setIsRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingPayment}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT PAYMENT RECORD MODAL ──────────────────────────────── */}
      {editPaymentModalData && (
        <Modal
          open={!!editPaymentModalData}
          onClose={() => setEditPaymentModalData(null)}
          title={`Edit Payment Record — ${editPaymentModalData.payment_number || `PAY-${editPaymentModalData.id}`}`}
          size="md"
        >
          <form onSubmit={handleSaveEditPayment} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-surface-900 dark:text-surface-100">
                  {editPaymentModalData.customer_name || editPaymentModalData.customer?.company_name}
                </span>
                {isEditCompleted ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success-50 dark:bg-success-900/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800">
                    ✓ FULL SETTLEMENT
                  </span>
                ) : isEditPartial ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    PARTIAL PAYMENT
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-surface-200/60 dark:border-surface-700/60 font-mono">
                <div>
                  <p className="text-[10px] text-surface-400 font-sans uppercase">Previous Payment</p>
                  <p className="font-bold text-surface-700 dark:text-surface-300">{fmt(editPrevAmt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-surface-400 font-sans uppercase">Updated Amount</p>
                  <p className="font-bold text-primary-600 dark:text-primary-400">{fmt(editAmt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-surface-400 font-sans uppercase">Remaining Balance</p>
                  <p className={cn('font-bold', editRemainingBal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-success-600 dark:text-success-400')}>
                    {fmt(editRemainingBal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="label-base">Payment Amount (₹) <span className="text-danger-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={editPaymentForm.amount}
                    onChange={e => setEditPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="input-base pl-8 font-mono text-sm font-bold"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="label-base">Payment Date <span className="text-danger-500">*</span></label>
                <input
                  type="date"
                  required
                  value={editPaymentForm.payment_date}
                  onChange={e => setEditPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="input-base text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Mode */}
              <div>
                <label className="label-base">Payment Mode <span className="text-danger-500">*</span></label>
                <select
                  value={editPaymentForm.mode}
                  onChange={e => setEditPaymentForm(f => ({ ...f, mode: e.target.value }))}
                  className="input-base text-sm bg-white dark:bg-surface-900 font-semibold"
                >
                  {MODES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="label-base">Status <span className="text-danger-500">*</span></label>
                <select
                  value={editPaymentForm.status}
                  onChange={e => setEditPaymentForm(f => ({ ...f, status: e.target.value }))}
                  className="input-base text-sm bg-white dark:bg-surface-900 font-semibold"
                >
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-base">Reference / UTR Number</label>
              <input
                type="text"
                value={editPaymentForm.reference_number}
                onChange={e => setEditPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                className="input-base text-sm font-mono"
              />
            </div>

            {/* Mandatory Reason for Edit */}
            <div>
              <label className="label-base">Reason for Edit <span className="text-danger-500">*</span></label>
              <input
                type="text"
                required
                value={editPaymentForm.edit_reason}
                onChange={e => setEditPaymentForm(f => ({ ...f, edit_reason: e.target.value }))}
                placeholder="e.g. Corrected partial payment amount per receipt"
                className="input-base text-xs"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="label-base">Remarks / Notes</label>
              <textarea
                rows={2}
                value={editPaymentForm.remarks}
                onChange={e => setEditPaymentForm(f => ({ ...f, remarks: e.target.value }))}
                className="input-base text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              <Button type="button" variant="secondary" onClick={() => setEditPaymentModalData(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingEditPayment}>
                Update Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── PAYMENT EDIT HISTORY MODAL ───────────────────────── */}
      {historyModalData && (
        <Modal
          open={!!historyModalData}
          onClose={() => setHistoryModalData(null)}
          title={`Edit History — ${historyModalData.payment_number || `PAY-${historyModalData.id}`}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-surface-900 dark:text-surface-50">{historyModalData.customer_name || historyModalData.customer?.company_name}</p>
                <p className="text-surface-400 font-mono">Current Amount: <strong className="text-success-600 dark:text-success-400">{fmt(historyModalData.amount)}</strong></p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-bold text-[11px]">
                {historyLogs.length} Edit {historyLogs.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-surface-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                Loading audit trail history…
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="py-8 text-center text-surface-400 text-xs italic">
                No edit history logged for this payment entry.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {historyLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary-500" />
                        {log.edited_by || 'Admin'}
                      </span>
                      <span className="text-[11px] text-surface-400 font-mono">
                        {formatDateDisplay(log.created_at || log.createdAt)}
                      </span>
                    </div>

                    <p className="text-surface-700 dark:text-surface-300 font-medium bg-surface-50 dark:bg-surface-800 p-2 rounded-lg border border-surface-100 dark:border-surface-700">
                      Reason: <span className="italic">{log.edit_reason}</span>
                    </p>

                    {(log.previous_amount != null || log.new_amount != null) && (
                      <div className="flex items-center gap-3 text-xs font-mono pt-1">
                        <span className="text-surface-500 line-through">Previous: {fmt(log.previous_amount)}</span>
                        <span className="text-surface-400">→</span>
                        <span className="text-success-600 dark:text-success-400 font-bold">New: {fmt(log.new_amount)}</span>
                      </div>
                    )}

                    {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                      <div className="pt-1.5 border-t border-surface-100 dark:border-surface-800 text-[11px] space-y-1">
                        <p className="font-semibold text-surface-400 uppercase tracking-wider">Field Modifications:</p>
                        {Object.entries(log.changed_fields).map(([k, v]) => (
                          <p key={k} className="font-mono text-surface-600 dark:text-surface-300">
                            • <strong className="capitalize">{k.replace('_', ' ')}</strong>: <span className="line-through text-danger-500">{String(v.from)}</span> → <span className="text-success-600 dark:text-success-400">{String(v.to)}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setHistoryModalData(null)}>
                Close History
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 6. CUSTOMER DAYWISE LEDGER MODAL ──────────────────────────────── */}
      {ledgerModalData && (
        <Modal
          open={!!ledgerModalData}
          onClose={() => setLedgerModalData(null)}
          title={`Statement of Account — ${ledgerModalData.customer?.company_name}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Customer Summary Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <div>
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Customer / Sales Manager</p>
                <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{ledgerModalData.customer?.company_name}</p>
                <p className="text-xs text-surface-400">SM: {ledgerModalData.customer?.sales_manager_name}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Credit Limit</p>
                <p className="text-sm font-bold font-mono text-surface-800 dark:text-surface-200">
                  {fmt(ledgerModalData.customer?.credit_limit)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Net Outstanding Balance</p>
                <p className="text-lg font-bold font-mono text-danger-600 dark:text-danger-400">
                  {fmt(ledgerModalData.summary?.currentBalance)}
                </p>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-semibold uppercase tracking-wider">
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Reference / Description</th>
                    <th className="px-4 py-2.5 text-right">Debit (Invoiced)</th>
                    <th className="px-4 py-2.5 text-right">Credit (Paid)</th>
                    <th className="px-4 py-2.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-surface-700 dark:text-surface-300">
                  {(ledgerModalData.ledger || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-surface-400 italic">No ledger activity recorded for this customer.</td>
                    </tr>
                  ) : (ledgerModalData.ledger || []).map(l => (
                    <tr key={l.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                      <td className="px-4 py-2.5 font-mono">{formatDateDisplay(l.date)}</td>
                      <td className="px-4 py-2.5 font-bold">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px]',
                          l.type === 'INVOICE' ? 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                        )}>
                          {l.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-mono font-semibold">{l.reference}</p>
                        <p className="text-[11px] text-surface-400">{l.remarks}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-danger-600 dark:text-danger-400 font-semibold">
                        {l.debit ? fmt(l.debit) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-success-600 dark:text-success-400 font-semibold">
                        {l.credit ? fmt(l.credit) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-surface-900 dark:text-surface-50">
                        {fmt(l.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="secondary"
                icon={Printer}
                onClick={() => handlePrintLedger(ledgerModalData)}
              >
                Print Statement
              </Button>
              <Button variant="secondary" onClick={() => setLedgerModalData(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
