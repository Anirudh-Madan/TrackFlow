import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer, bulkImportCustomers
} from '../../../api/endpoints/parties.api'
import { getRegions } from '../../../api/endpoints/regions.api'
import { getUsers } from '../../../api/endpoints/users.api'
import { useAuthStore } from '../../../store/authStore'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import {
  Plus, Search, User, MapPin, AlertCircle, Pencil, Trash2,
  ClipboardList, UserPlus, FileSpreadsheet, Upload, Download, CheckCircle2, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'
import TablePagination from '../../../components/data/TablePagination'

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const customerSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(150),
  gst: z.string().length(15, 'GST must be exactly 15 characters'),
  region_id: z.string().min(1, 'Region is required'),
  sales_manager_id: z.string().optional().or(z.literal('')),
  credit_limit: z.coerce.number().min(0, 'Credit limit must be positive'),
  remarks: z.string().optional().or(z.literal('')),
  credit_change_reason: z.string().optional().or(z.literal('')),
})

// ─── Customer Form ─────────────────────────────────────────────────────────────
function CustomerForm({ regions, salesManagers, isSM, currentUser, onSuccess, onCancel, editData = null }) {
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!editData

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: isEdit ? {
      company_name: editData.company_name || '',
      gst: editData.gst || '',
      region_id: editData.region_id ? String(editData.region_id) : '',
      sales_manager_id: editData.sales_manager_id ? String(editData.sales_manager_id) : '',
      credit_limit: parseFloat(editData.credit_limit) || 0,
      remarks: editData.remarks || '',
      credit_change_reason: '',
    } : {
      company_name: '',
      gst: '',
      region_id: '',
      sales_manager_id: isSM ? String(currentUser?.id) : '',
      credit_limit: 0,
      remarks: '',
      credit_change_reason: '',
    }
  })

  const onSubmit = async (data) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        region_id: parseInt(data.region_id),
        sales_manager_id: data.sales_manager_id
          ? parseInt(data.sales_manager_id)
          : (isSM ? currentUser?.id : null),
      }
      const res = isEdit
        ? await updateCustomer(editData.id, payload)
        : await createCustomer(payload)

      if (res.success) {
        toast.success(`Customer ${isEdit ? 'updated' : 'created'} successfully!`)
        reset()
        onSuccess()
      } else {
        setSubmitError(res.error || 'Operation failed')
      }
    } catch (err) {
      setSubmitError(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {submitError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200 dark:bg-danger-900/20 dark:border-danger-800">
          <AlertCircle className="h-4 w-4 text-danger-600 dark:text-danger-400 mt-0.5 shrink-0" />
          <p className="text-sm text-danger-700 dark:text-danger-300">{submitError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
            Company Name <span className="text-danger-500">*</span>
          </label>
          <Input {...register('company_name')} placeholder="e.g. Acme Industries Ltd." />
          {errors.company_name && <p className="text-xs text-danger-500 mt-1">{errors.company_name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
            GST Number <span className="text-danger-500">*</span>
          </label>
          <Input {...register('gst')} placeholder="15-character GST" className="font-mono uppercase" maxLength={15} />
          {errors.gst && <p className="text-xs text-danger-500 mt-1">{errors.gst.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
            Credit Limit (₹)
          </label>
          <Input {...register('credit_limit')} type="number" min={0} placeholder="0" />
          {errors.credit_limit && <p className="text-xs text-danger-500 mt-1">{errors.credit_limit.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
            Region <span className="text-danger-500">*</span>
          </label>
          <select {...register('region_id')} className="input-base w-full">
            <option value="">Select Region</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
            ))}
          </select>
          {errors.region_id && <p className="text-xs text-danger-500 mt-1">{errors.region_id.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
            Sales Manager
          </label>
          {isSM ? (
            <div className="input-base bg-surface-50 dark:bg-surface-800 text-surface-500 cursor-not-allowed select-none">
              {currentUser?.name || 'You (Sales Manager)'}
            </div>
          ) : (
            <select {...register('sales_manager_id')} className="input-base w-full">
              <option value="">Unassigned</option>
              {salesManagers.map(sm => (
                <option key={sm.id} value={sm.id}>{sm.name} ({sm.login_id})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
          Remarks
        </label>
        <textarea
          {...register('remarks')}
          rows={2}
          placeholder="Optional notes about this customer…"
          className="input-base w-full resize-none"
        />
      </div>

      {isEdit && (
        <div>
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-1.5">
            Credit Change Reason
          </label>
          <Input {...register('credit_change_reason')} placeholder="Reason for credit limit change (if modified)" />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-200 dark:border-surface-700">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting
            ? (isEdit ? 'Updating…' : 'Creating…')
            : (isEdit ? 'Update Customer' : 'Create Customer')}
        </Button>
      </div>
    </form>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const location = useLocation()
  const { user } = useAuthStore()
  const roleName = typeof user?.role === 'object' ? user.role.name : user?.role
  const isSM = roleName === 'sales_manager'

  const [activeTab, setActiveTab] = useState('list')
  const [customers, setCustomers] = useState([])
  const [regions, setRegions] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search])

  const [editCustomer, setEditCustomer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── Bulk Import State ──
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const salesManagers = allUsers.filter(u =>
    u.role?.name === 'sales_manager' || u.role_id === 2
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const [custRes, regRes, userRes] = await Promise.all([
        getCustomers(),
        getRegions(),
        getUsers(),
      ])
      if (custRes.success) setCustomers(custRes.data)
      if (regRes.success) setRegions(regRes.data)
      if (userRes.success) setAllUsers(userRes.data)
    } catch {
      toast.error('Failed to load customer data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (location.state?.openNewCustomer) {
      setActiveTab('new')
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // SM sees only their own customers
  const filteredCustomers = customers
    .filter(c => !isSM || c.sales_manager_id === user?.id)
    .filter(c =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.gst.toLowerCase().includes(search.toLowerCase())
    )

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      const res = await deleteCustomer(deleteTarget.id)
      if (res.success) {
        toast.success('Customer deleted successfully')
        setDeleteTarget(null)
        fetchData()
      } else {
        toast.error(res.error || 'Deletion failed')
      }
    } catch (err) {
      toast.error(err.message || 'Deletion failed')
    } finally {
      setDeleting(false)
    }
  }

  // ── Bulk Import Handlers ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        setImportRows(rawJson)
        toast.success(`Loaded ${rawJson.length} customer records from ${file.name}`)
      } catch (err) {
        toast.error('Failed to read Excel/CSV file')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Company Name': 'Acme Global Pvt Ltd',
        'GST': '07AAAAA0000A1Z5',
        'Region': 'North Zone (DEL)',
        'Sales Manager': 'Rahul Sharma',
        'Credit Limit': 500000,
        'Remarks': 'Key enterprise account'
      },
      {
        'Company Name': 'Apex Industrial Supplies',
        'GST': '27BBBBB1111B2Z6',
        'Region': 'West (MUM)',
        'Sales Manager': 'Unassigned',
        'Credit Limit': 250000,
        'Remarks': ''
      }
    ]
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers')
    XLSX.writeFile(workbook, 'Customer_Import_Template.xlsx')
  }

  const handleExecuteImport = async () => {
    if (importRows.length === 0) return toast.error('Please select an Excel or CSV file first')
    setImporting(true)
    try {
      const res = await bulkImportCustomers({ items: importRows })
      if (res.success) {
        setImportResult(res.data)
        toast.success(`Import complete! ${res.data.created} created, ${res.data.updated} updated.`)
        fetchData()
      } else {
        toast.error(res.error || 'Import failed')
      }
    } catch (err) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const tabs = [
    { id: 'list', label: 'Customer List', icon: ClipboardList },
    { id: 'new', label: 'New Customer', icon: UserPlus },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Customers
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {isSM
              ? 'Manage your assigned client accounts and onboard new customers.'
              : 'View and manage all customer accounts across all regions and managers.'}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={FileSpreadsheet}
          size="sm"
          onClick={() => {
            setImportFileName('')
            setImportRows([])
            setImportResult(null)
            setIsImportOpen(true)
          }}
          id="bulk-import-customer-btn"
        >
          Bulk Import Customers
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              id={`customers-${t.id}-tab`}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
                activeTab === t.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── New Customer Tab ── */}
      {activeTab === 'new' && (
        <div className="card p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">Add New Customer</h2>
              <p className="text-xs text-surface-500 mt-0.5">Fill in the details below to create a new customer account.</p>
            </div>
          </div>
          <CustomerForm
            regions={regions}
            salesManagers={salesManagers}
            isSM={isSM}
            currentUser={user}
            onSuccess={() => {
              fetchData()
              setActiveTab('list')
            }}
          />
        </div>
      )}

      {/* ── Customer List Tab ── */}
      {activeTab === 'list' && (
        <div className="card overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by company or GST…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-9 py-1.5 w-full"
                id="customer-search-input"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-surface-500 font-medium whitespace-nowrap">
                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="secondary"
                icon={FileSpreadsheet}
                size="sm"
                onClick={() => {
                  setImportFileName('')
                  setImportRows([])
                  setImportResult(null)
                  setIsImportOpen(true)
                }}
              >
                Import Excel/CSV
              </Button>
              <Button icon={Plus} size="sm" id="add-customer-btn" onClick={() => setActiveTab('new')}>
                Add Customer
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-surface-100 dark:bg-surface-800 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <User className="h-7 w-7 text-surface-400" />
              </div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-1">
                {search ? 'No customers match your search' : 'No customers yet'}
              </h3>
              <p className="text-xs text-surface-500">
                {search ? 'Try a different name or GST number.' : 'Click "Add Customer" or "Import Excel/CSV" above to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">GST</th>
                    <th className="px-5 py-3.5">Region</th>
                    {!isSM && <th className="px-5 py-3.5">Sales Manager</th>}
                    <th className="px-5 py-3.5">Credit Limit</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm">
                  {filteredCustomers.slice((page - 1) * 50, page * 50).map(cust => (
                    <tr key={cust.id} className="hover:bg-surface-50/60 dark:hover:bg-surface-800/40 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{cust.company_name}</div>
                        {cust.remarks && (
                          <div className="text-xs text-surface-400 italic mt-0.5 line-clamp-1">{cust.remarks}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-surface-600 dark:text-surface-400">
                        {cust.gst}
                      </td>
                      <td className="px-5 py-4">
                        {cust.region ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
                            <MapPin className="h-3 w-3 text-surface-400" />
                            {cust.region.name}
                            <span className="text-surface-400">({cust.region.code})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-surface-400">—</span>
                        )}
                      </td>
                      {!isSM && (
                        <td className="px-5 py-4">
                          {cust.salesManager ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
                              <User className="h-3.5 w-3.5 text-surface-400" />
                              {cust.salesManager.name}
                            </span>
                          ) : (
                            <span className="text-xs text-surface-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-100">
                        ₹{parseFloat(cust.credit_limit).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditCustomer(cust)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Edit customer"
                            id={`edit-customer-${cust.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {!isSM && (
                            <button
                              onClick={() => setDeleteTarget(cust)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                              title="Delete customer"
                              id={`delete-customer-${cust.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination
            currentPage={page}
            totalItems={filteredCustomers.length}
            pageSize={50}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer" size="lg">
        {editCustomer && (
          <CustomerForm
            regions={regions}
            salesManagers={salesManagers}
            isSM={isSM}
            currentUser={user}
            editData={editCustomer}
            onSuccess={() => { setEditCustomer(null); fetchData() }}
            onCancel={() => setEditCustomer(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Customer" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">
            Are you sure you want to delete <strong>{deleteTarget?.company_name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Customer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Customers Modal */}
      <Modal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk Import Customers from Excel / CSV"
        description="Upload an Excel (.xlsx, .xls) or CSV (.csv) spreadsheet to batch create or update customer profiles."
        size="lg"
      >
        <div className="space-y-5">
          {/* Action strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
            <div className="text-xs text-surface-600 dark:text-surface-400">
              Expected headers: <strong>Company Name, GST, Region, Sales Manager, Credit Limit, Remarks</strong>
            </div>
            <Button
              variant="secondary"
              size="xs"
              icon={Download}
              onClick={handleDownloadTemplate}
            >
              Download Excel Template
            </Button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 transition-colors rounded-2xl p-6 text-center bg-surface-50/40 dark:bg-surface-800/20">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileSelect}
              className="hidden"
              id="customer-bulk-file-input"
            />
            <label htmlFor="customer-bulk-file-input" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                {importFileName ? importFileName : 'Click or drop Excel / CSV file here'}
              </div>
              <p className="text-xs text-surface-500">Supports .xlsx, .xls, and .csv files</p>
            </label>
          </div>

          {/* Preview Table */}
          {importRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-surface-700 dark:text-surface-300">
                <span>Previewing {importRows.length} rows to import</span>
                <span className="text-primary-600">{importRows.length} items ready</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-surface-200 dark:border-surface-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-100 dark:bg-surface-800 sticky top-0 font-semibold text-surface-600 dark:text-surface-400">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Company Name</th>
                      <th className="px-3 py-2">GST</th>
                      <th className="px-3 py-2">Region</th>
                      <th className="px-3 py-2">Sales Manager</th>
                      <th className="px-3 py-2">Credit Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 font-mono">
                    {importRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-3 py-1.5 text-surface-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-sans font-medium text-surface-900 dark:text-surface-100">
                          {r['Company Name'] || r.company_name || r.companyName || r.Customer || '—'}
                        </td>
                        <td className="px-3 py-1.5">{r['GST'] || r.gst || r.GSTIN || '—'}</td>
                        <td className="px-3 py-1.5 font-sans">{r['Region'] || r.region || '—'}</td>
                        <td className="px-3 py-1.5 font-sans">{r['Sales Manager'] || r.sales_manager || '—'}</td>
                        <td className="px-3 py-1.5">₹{r['Credit Limit'] || r.credit_limit || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 10 && (
                <div className="text-[11px] text-surface-400 text-center">
                  Showing first 10 of {importRows.length} rows...
                </div>
              )}
            </div>
          )}

          {/* Import Result Feedback */}
          {importResult && (
            <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 space-y-2 text-xs text-success-800 dark:text-success-300">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
                Import Processed Successfully
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 text-center font-medium">
                <div className="bg-white/60 dark:bg-surface-800/60 p-2 rounded-lg border">
                  <div className="text-lg font-bold text-success-700 dark:text-success-400">{importResult.created}</div>
                  <div className="text-[10px] uppercase tracking-wider text-surface-500">Created</div>
                </div>
                <div className="bg-white/60 dark:bg-surface-800/60 p-2 rounded-lg border">
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">{importResult.updated}</div>
                  <div className="text-[10px] uppercase tracking-wider text-surface-500">Updated</div>
                </div>
                <div className="bg-white/60 dark:bg-surface-800/60 p-2 rounded-lg border">
                  <div className="text-lg font-bold text-surface-600 dark:text-surface-400">{importResult.skipped}</div>
                  <div className="text-[10px] uppercase tracking-wider text-surface-500">Skipped</div>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-danger-600 space-y-1 max-h-24 overflow-y-auto border-t pt-2 border-danger-200">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <Button
              variant="secondary"
              onClick={() => setIsImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              icon={Upload}
              loading={importing}
              disabled={importRows.length === 0 || importing}
              onClick={handleExecuteImport}
            >
              {importing ? 'Importing Customers…' : `Import ${importRows.length} Customers`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
