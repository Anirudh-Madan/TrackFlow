import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import {
  Wallet, Building2, Search, ChevronDown, IndianRupee, CreditCard,
  Smartphone, Banknote, CheckCircle2, Loader2, ArrowLeft, Info, AlertCircle,
  FileText,
} from 'lucide-react'
import { getCustomers } from '../../../api/endpoints/parties.api'
import { createPayment, getPartyOutstanding } from '../../../api/endpoints/payments.api'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'

const PAYMENT_MODES = [
  { value: 'CASH',   label: 'Cash',   icon: Banknote },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText },
  { value: 'UPI',    label: 'UPI',    icon: Smartphone },
  { value: 'RTGS',   label: 'RTGS',   icon: CreditCard },
  { value: 'NEFT',   label: 'NEFT',   icon: CreditCard },
]

function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function PartySelector({ parties, value, onChange, loading }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    parties.filter(p => (p.company_name || '').toLowerCase().includes(search.toLowerCase())),
    [parties, search]
  )
  const selected = parties.find(p => p.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all',
          'bg-white dark:bg-surface-900 focus:outline-none',
          open
            ? 'border-primary-400 ring-2 ring-primary-500/20'
            : 'border-surface-300 dark:border-surface-700 hover:border-surface-400',
          loading && 'opacity-60 cursor-not-allowed'
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-surface-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading parties…</span>
          </div>
        ) : selected ? (
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{selected.company_name}</p>
            <p className="text-xs text-surface-400 mt-0.5">
              Credit limit: {formatCurrency(selected.credit_limit)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-surface-400">Select a party to view outstanding…</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-surface-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800">
              <Search className="h-3.5 w-3.5 text-surface-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search parties…"
                className="bg-transparent text-sm outline-none w-full text-surface-900 dark:text-surface-100 placeholder-surface-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-surface-400 text-center">No parties found</p>
            ) : filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch('') }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
                  'hover:bg-surface-50 dark:hover:bg-surface-800',
                  value === p.id && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{p.company_name}</p>
                  <p className="text-xs text-surface-400">Outstanding: {formatCurrency(p.outstanding_balance || 0)}</p>
                </div>
                {value === p.id && <CheckCircle2 className="h-4 w-4 text-primary-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaymentNewPage({ isModal = false, onClose, onSuccess, preselectedPartyId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

  const [parties, setParties]           = useState([])
  const [loadingParties, setLoadingParties] = useState(true)
  const [selectedParty, setSelectedParty]   = useState(null)
  const [outstanding, setOutstanding]       = useState(null)
  const [loadingOutstanding, setLoadingOutstanding] = useState(false)

  const [amount, setAmount]         = useState('')
  const [mode, setMode]             = useState('CASH')
  const [reference, setReference]   = useState('')
  const [remarks, setRemarks]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoadingParties(true)
      try {
        const res = await getCustomers()
        let loadedParties = []
        if (res?.success) {
          loadedParties = res.data ?? []
          setParties(loadedParties)
        }
        
        // Auto-select party if provided
        const partyId = preselectedPartyId || location.state?.partyId
        if (partyId && loadedParties.some(p => p.id === partyId)) {
          setSelectedParty(partyId)
          // load outstanding
          setLoadingOutstanding(true)
          getPartyOutstanding(partyId).then(outRes => {
            if (outRes?.success) setOutstanding(outRes.data)
          }).catch(() => {
            const party = loadedParties.find(p => p.id === partyId)
            if (party) setOutstanding({ outstanding_balance: party.outstanding_balance || 0, credit_limit: party.credit_limit || 0 })
          }).finally(() => setLoadingOutstanding(false))
        }
      } catch {
        toast.error('Failed to load parties')
      } finally {
        setLoadingParties(false)
      }
    }
    load()
  }, [preselectedPartyId, location.state])

  const handlePartyChange = useCallback(async (partyId) => {
    setSelectedParty(partyId)
    setOutstanding(null)
    setLoadingOutstanding(true)
    try {
      const res = await getPartyOutstanding(partyId)
      if (res?.success) setOutstanding(res.data)
    } catch {
      // Outstanding may not exist yet — show from party data
      const party = parties.find(p => p.id === partyId)
      if (party) setOutstanding({ outstanding_balance: party.outstanding_balance || 0, credit_limit: party.credit_limit || 0 })
    } finally {
      setLoadingOutstanding(false)
    }
  }, [parties])

  const partyInfo = parties.find(p => p.id === selectedParty)

  const handleSubmit = async () => {
    if (!selectedParty) return toast.error('Please select a party')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    if (!mode) return toast.error('Select a payment mode')

    setSubmitting(true)
    try {
      const res = await createPayment({
        party_id:         selectedParty,
        amount:           amt,
        payment_mode:     mode,
        reference_number: reference,
        remarks,
      })

      if (res?.success) {
        toast.success('Payment recorded successfully!')
        if (onSuccess) {
          onSuccess(res.data || {
            party_id:         selectedParty,
            amount:           amt,
            payment_mode:     mode,
            reference_number: reference,
            remarks,
            party:            partyInfo,
            payment_date:     new Date().toISOString().slice(0, 10),
            received_by:      user?.name || 'Sales Manager',
          })
        } else {
          navigate('/sm/payments')
        }
      } else {
        toast.error(res?.error || 'Failed to record payment')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const balanceAfter = outstanding ? (outstanding.outstanding_balance || 0) - (parseFloat(amount) || 0) : null

  return (
    <div className={cn("max-w-2xl mx-auto space-y-6", isModal && "p-1")}>
      {/* Header */}
      {!isModal && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">Log Payment</h1>
            <p className="text-xs text-surface-400 mt-0.5">Record a payment received from a party</p>
          </div>
        </div>
      )}

      {/* Step 1 — Party */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">1</span>
          </div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Select Party</h2>
        </div>

        <PartySelector
          parties={parties}
          value={selectedParty}
          onChange={handlePartyChange}
          loading={loadingParties}
        />

        {/* Outstanding balance display */}
        {selectedParty && (
          <div className="grid grid-cols-2 gap-3">
            {loadingOutstanding ? (
              <div className="col-span-2 h-16 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ) : outstanding ? (
              <>
                <div className="p-3 rounded-xl border border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <p className="text-xs text-surface-400 mb-1">Outstanding Balance</p>
                  <p className={cn(
                    'text-lg font-bold tabular-nums',
                    (outstanding.outstanding_balance || 0) > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400'
                  )}>
                    {formatCurrency(outstanding.outstanding_balance || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <p className="text-xs text-surface-400 mb-1">Credit Limit</p>
                  <p className="text-lg font-bold tabular-nums text-surface-700 dark:text-surface-300">
                    {formatCurrency(outstanding.credit_limit || partyInfo?.credit_limit || 0)}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Step 2 — Amount & Mode */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">2</span>
          </div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Payment Details</h2>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1.5">Amount *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 font-medium">₹</span>
            <input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-lg font-bold text-surface-900 dark:text-surface-100 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 tabular-nums"
            />
          </div>
          {balanceAfter !== null && parseFloat(amount) > 0 && (
            <p className="text-xs mt-1.5 text-surface-400">
              Balance after payment: <span className={cn('font-semibold', balanceAfter > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400')}>{formatCurrency(balanceAfter)}</span>
            </p>
          )}
        </div>

        {/* Payment mode */}
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1.5">Payment Mode *</label>
          <div className="grid grid-cols-5 gap-2">
            {PAYMENT_MODES.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all',
                    mode === m.value
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reference number */}
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1.5">
            Reference Number {mode !== 'CASH' && <span className="text-danger-500">*</span>}
          </label>
          <input
            id="payment-reference"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder={mode === 'CASH' ? 'Optional for cash' : 'Cheque no. / UTR / Reference…'}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1.5">Remarks (optional)</label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            placeholder="Additional notes about this payment…"
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
          />
        </div>
      </div>

      {/* Summary & Submit */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
        <div className="flex items-center gap-2 mb-3 text-xs text-surface-400">
          <Info className="h-3.5 w-3.5" />
          Payment will be recorded and outstanding balance updated immediately.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose || (() => navigate(-1))}
            className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-payment-btn"
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedParty || !amount}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md shadow-primary-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {submitting ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
