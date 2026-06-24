import { useMemo, useState } from 'react'
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'

const INITIAL_PAYMENTS = [
  {
    id: 'PAY-001',
    customer_id: 'CUST-1001',
    customer_name: 'Verma Enterprises Pvt Ltd',
    payment_date: '2026-06-22',
    mode: 'UPI',
    reference_number: 'UPI-789456',
    status: 'received',
    received_by: 'Rajan Kumar',
    remarks: 'Advance payment against June dispatch.',
    amount: 18000,
  },
  {
    id: 'PAY-002',
    customer_id: 'CUST-1002',
    customer_name: 'Singh Traders',
    payment_date: '2026-06-21',
    mode: 'RTGS',
    reference_number: 'RTGS-442118',
    status: 'pending',
    received_by: 'Mohan Singh',
    remarks: 'Awaiting bank clearance.',
    amount: 12500,
  },
  {
    id: 'PAY-003',
    customer_id: 'CUST-1003',
    customer_name: 'Gupta & Sons Hardware',
    payment_date: '2026-06-20',
    mode: 'CASH',
    reference_number: 'CASH-001',
    status: 'received',
    received_by: 'Priya Sharma',
    remarks: 'Cash received at branch office.',
    amount: 9500,
  },
]

const INITIAL_OUTSTANDINGS = [
  {
    customer_id: 'CUST-1001',
    customer_name: 'Verma Enterprises Pvt Ltd',
    total_invoiced: 45200,
    total_paid: 18000,
    balance: 27200,
  },
  {
    customer_id: 'CUST-1002',
    customer_name: 'Singh Traders',
    total_invoiced: 28900,
    total_paid: 12500,
    balance: 16400,
  },
  {
    customer_id: 'CUST-1003',
    customer_name: 'Gupta & Sons Hardware',
    total_invoiced: 18500,
    total_paid: 9500,
    balance: 9000,
  },
]

const STATUS_CONFIG = {
  received: { label: 'Received', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40', icon: Clock3 },
  failed: { label: 'Failed', color: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40', icon: TrendingDown },
}

const MODES = ['CASH', 'UPI', 'RTGS', 'CHEQUE', 'CARD', 'WALLET']

const EMPTY_PAYMENT = {
  id: '',
  customer_id: '',
  customer_name: '',
  payment_date: new Date().toISOString().slice(0, 10),
  mode: 'UPI',
  reference_number: '',
  status: 'received',
  received_by: '',
  remarks: '',
  amount: '',
}

export default function PaymentsListPage() {
  const [payments, setPayments] = useState(INITIAL_PAYMENTS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_PAYMENT)

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const haystack = `${payment.id} ${payment.customer_name} ${payment.customer_id} ${payment.reference_number} ${payment.received_by}`.toLowerCase()
      const matchesSearch = haystack.includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [payments, search, statusFilter])

  const summary = useMemo(() => ({
    total: payments.length,
    received: payments.filter((payment) => payment.status === 'received').length,
    pending: payments.filter((payment) => payment.status === 'pending').length,
    failed: payments.filter((payment) => payment.status === 'failed').length,
    totalCollected: payments.reduce((sum, payment) => sum + (payment.status === 'received' ? payment.amount : 0), 0),
  }), [payments])

  const openCreateModal = () => {
    setForm({ ...EMPTY_PAYMENT })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setForm({ ...EMPTY_PAYMENT })
  }

  const submitPayment = (event) => {
    event.preventDefault()

    if (!form.customer_name || !form.customer_id || !form.amount) {
      return
    }

    const payload = {
      ...form,
      id: `PAY-${String(payments.length + 1).padStart(3, '0')}`,
      amount: Number(form.amount),
    }

    setPayments((prev) => [payload, ...prev])
    closeModal()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">Payments & Finance</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Record payments and keep a live view of outstanding balances by customer.
          </p>
        </div>
        <Button icon={Banknote} onClick={openCreateModal} id="create-payment-btn">
          New Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Payments', value: summary.total, color: 'text-surface-900 dark:text-surface-50' },
          { label: 'Received', value: summary.received, color: 'text-success-600 dark:text-success-400' },
          { label: 'Pending', value: summary.pending, color: 'text-warning-600 dark:text-warning-400' },
          { label: 'Collected', value: `₹${summary.totalCollected.toLocaleString('en-IN')}`, color: 'text-primary-600 dark:text-primary-400' },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-surface-500 dark:text-surface-400">{item.label}</p>
            <p className={cn('mt-1 text-2xl font-semibold', item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-surface-200 bg-surface-50/60 p-4 dark:border-surface-700 dark:bg-surface-800/60 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, ref, or receiver"
              className="input-base w-full pl-9"
              id="payment-search"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'received', 'pending', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === status
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-surface-300 bg-white text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                )}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
            <thead className="bg-surface-50/70 dark:bg-surface-800/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Mode / Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 bg-white dark:divide-surface-700 dark:bg-surface-900">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-surface-500">
                    No payments match the current filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const StatusIcon = STATUS_CONFIG[payment.status]?.icon || Clock3
                  return (
                    <tr key={payment.id} className="hover:bg-surface-50/70 dark:hover:bg-surface-800/70">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{payment.id}</div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-surface-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {payment.payment_date}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-surface-900 dark:text-surface-50">{payment.customer_name}</div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-surface-500">
                          <FileText className="h-4 w-4 text-surface-400" />
                          {payment.customer_id}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <CreditCard className="h-4 w-4 text-surface-400" />
                          {payment.mode}
                        </div>
                        <div className="mt-1 text-sm text-surface-500">{payment.reference_number}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">₹{payment.amount.toLocaleString('en-IN')}</div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-surface-500">
                          <Wallet className="h-4 w-4 text-surface-400" />
                          {payment.received_by}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', STATUS_CONFIG[payment.status]?.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {STATUS_CONFIG[payment.status]?.label || payment.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Outstanding Balances</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Running summary of invoiced value, payments received, and remaining balance.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {INITIAL_OUTSTANDINGS.map((item) => (
            <div key={item.customer_id} className="rounded-2xl border border-surface-200 bg-surface-50/70 p-4 dark:border-surface-700 dark:bg-surface-800/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">{item.customer_name}</p>
                  <p className="text-xs text-surface-500">{item.customer_id}</p>
                </div>
                <div className="rounded-full bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-300">
                <div className="flex items-center justify-between">
                  <span>Total Invoiced</span>
                  <span className="font-semibold text-surface-900 dark:text-surface-50">₹{item.total_invoiced.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Paid</span>
                  <span className="font-semibold text-success-600 dark:text-success-400">₹{item.total_paid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Balance</span>
                  <span className="font-semibold text-warning-600 dark:text-warning-400">₹{item.balance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title="Record Payment"
        description="Capture a payment record with its mode, reference, status, and notes."
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal} id="payment-modal-cancel">
              Cancel
            </Button>
            <Button onClick={submitPayment} id="payment-modal-save">
              Save Payment
            </Button>
          </>
        )}
      >
        <form className="space-y-4" onSubmit={submitPayment}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Customer Name</span>
              <input className="input-base w-full" value={form.customer_name} onChange={(event) => setForm((prev) => ({ ...prev, customer_name: event.target.value }))} placeholder="Customer / Party" required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Customer ID</span>
              <input className="input-base w-full" value={form.customer_id} onChange={(event) => setForm((prev) => ({ ...prev, customer_id: event.target.value }))} placeholder="CUST-1004" required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Amount</span>
              <input type="number" min="0" className="input-base w-full" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="0" required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Payment Date</span>
              <input type="date" className="input-base w-full" value={form.payment_date} onChange={(event) => setForm((prev) => ({ ...prev, payment_date: event.target.value }))} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Mode</span>
              <select className="input-base w-full" value={form.mode} onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}>
                {MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Status</span>
              <select className="input-base w-full" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Reference Number</span>
              <input className="input-base w-full" value={form.reference_number} onChange={(event) => setForm((prev) => ({ ...prev, reference_number: event.target.value }))} placeholder="UPI-123456" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Received By</span>
              <input className="input-base w-full" value={form.received_by} onChange={(event) => setForm((prev) => ({ ...prev, received_by: event.target.value }))} placeholder="Collector name" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200 md:col-span-2">
              <span>Remarks</span>
              <textarea className="input-base min-h-[90px] w-full" value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Any notes for this payment" />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  )
}
