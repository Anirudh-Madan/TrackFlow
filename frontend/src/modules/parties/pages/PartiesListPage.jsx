import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getVendors, createVendor, updateVendor, deleteVendor
} from '../../../api/endpoints/parties.api'
import { getRegions } from '../../../api/endpoints/regions.api'
import { getUsers } from '../../../api/endpoints/users.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import {
  Plus, Search, Building2, User, Phone, MapPin, AlertCircle, Pencil, Trash2,
  Mail, Shield, Landmark, ClipboardList, Package, HelpCircle, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

// ─── Zod Validation Schemas ──────────────────────────────────────────────────
const customerSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(150),
  gst: z.string().min(15, 'GST must be exactly 15 characters').max(15, 'GST must be exactly 15 characters'),
  region_id: z.string().min(1, 'Region is required'),
  sales_manager_id: z.string().optional().or(z.literal('')),
  credit_limit: z.coerce.number().min(0, 'Credit limit must be positive'),
  remarks: z.string().optional().or(z.literal('')),
  credit_change_reason: z.string().optional().or(z.literal('')),
})

const vendorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(150),
  gst: z.string().min(15, 'GST must be exactly 15 characters').max(15, 'GST must be exactly 15 characters'),
  remarks: z.string().optional().or(z.literal('')),
})

export default function PartiesListPage() {
  const [activeTab, setActiveTab] = useState('customers') // 'customers' | 'vendors'
  const [customers, setCustomers] = useState([])
  const [vendors, setVendors]     = useState([])
  const [regions, setRegions]     = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  // Modals state
  const [isCustomerOpen, setIsCustomerOpen] = useState(false)
  const [isVendorOpen, setIsVendorOpen]     = useState(false)
  const [isDeleteOpen, setIsDeleteOpen]     = useState(false)
  const [isHistoryOpen, setIsHistoryOpen]   = useState(false)
  
  const [editMode, setEditMode]             = useState(false)
  const [selectedParty, setSelectedParty]   = useState(null)
  const [submitError, setSubmitError]       = useState(null)
  const [deleting, setDeleting]             = useState(false)

  // Dynamic Contact & Product states for Vendor Modal
  const [contacts, setContacts] = useState([{ name: '', phone: '', email: '', designation: '' }])
  const [productMappings, setProductMappings] = useState([{ product_name: '', product_sku: '', purchase_price: '', vendor_sku: '' }])

  // Forms
  const customerForm = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: { company_name: '', gst: '', region_id: '', sales_manager_id: '', credit_limit: 0, remarks: '', credit_change_reason: '' }
  })

  const vendorForm = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: { company_name: '', gst: '', remarks: '' }
  })

  // Fetch all lists
  const fetchData = async () => {
    setLoading(true)
    try {
      const [custRes, vendRes, regRes, userRes] = await Promise.all([
        getCustomers(),
        getVendors(),
        getRegions(),
        getUsers()
      ])
      if (custRes.success) setCustomers(custRes.data)
      if (vendRes.success) setVendors(vendRes.data)
      if (regRes.success) setRegions(regRes.data)
      if (userRes.success) setUsers(userRes.data)
    } catch (err) {
      toast.error(err.message || 'Failed to fetch directory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter lists
  const filteredCustomers = customers.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.gst.toLowerCase().includes(search.toLowerCase())
  )

  const filteredVendors = vendors.filter(v =>
    v.company_name.toLowerCase().includes(search.toLowerCase()) ||
    v.gst.toLowerCase().includes(search.toLowerCase())
  )

  // Sales managers list
  const salesManagers = users.filter(u => u.role?.name === 'sales_manager' || u.role_id === 2)

  // ── Customer Handlers ───────────────────────────
  const openCreateCustomer = () => {
    setEditMode(false)
    setSubmitError(null)
    customerForm.reset({ company_name: '', gst: '', region_id: '', sales_manager_id: '', credit_limit: 0, remarks: '', credit_change_reason: '' })
    setIsCustomerOpen(true)
  }

  const openEditCustomer = (cust) => {
    setEditMode(true)
    setSubmitError(null)
    setSelectedParty(cust)
    customerForm.reset({
      company_name: cust.company_name,
      gst: cust.gst,
      region_id: String(cust.region_id),
      sales_manager_id: cust.sales_manager_id ? String(cust.sales_manager_id) : '',
      credit_limit: parseFloat(cust.credit_limit),
      remarks: cust.remarks || '',
      credit_change_reason: ''
    })
    setIsCustomerOpen(true)
  }

  const onCustomerSubmit = async (data) => {
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        region_id: parseInt(data.region_id),
        sales_manager_id: data.sales_manager_id ? parseInt(data.sales_manager_id) : null,
      }
      let res
      if (editMode) {
        res = await updateCustomer(selectedParty.id, payload)
      } else {
        res = await createCustomer(payload)
      }

      if (res.success) {
        toast.success(`Customer ${editMode ? 'updated' : 'created'} successfully!`)
        setIsCustomerOpen(false)
        fetchData()
      } else {
        setSubmitError(res.error || 'Operation failed')
      }
    } catch (err) {
      setSubmitError(err.message || 'Operation failed')
    }
  }

  // ── Vendor Handlers ─────────────────────────────
  const openCreateVendor = () => {
    setEditMode(false)
    setSubmitError(null)
    vendorForm.reset({ company_name: '', gst: '', remarks: '' })
    setContacts([{ name: '', phone: '', email: '', designation: '' }])
    setProductMappings([{ product_name: '', product_sku: '', purchase_price: '', vendor_sku: '' }])
    setIsVendorOpen(true)
  }

  const openEditVendor = (vendor) => {
    setEditMode(true)
    setSubmitError(null)
    setSelectedParty(vendor)
    vendorForm.reset({
      company_name: vendor.company_name,
      gst: vendor.gst,
      remarks: vendor.remarks || ''
    })

    // Contacts
    if (vendor.contacts && vendor.contacts.length > 0) {
      setContacts(vendor.contacts.map(c => ({
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        designation: c.designation || ''
      })))
    } else {
      setContacts([{ name: '', phone: '', email: '', designation: '' }])
    }

    // Product mapping
    if (vendor.productMappings && vendor.productMappings.length > 0) {
      setProductMappings(vendor.productMappings.map(pm => ({
        product_id: pm.product_id,
        product_name: pm.product?.name || '',
        product_sku: pm.product?.sku || '',
        purchase_price: pm.purchase_price,
        vendor_sku: pm.vendor_sku || ''
      })))
    } else {
      setProductMappings([{ product_name: '', product_sku: '', purchase_price: '', vendor_sku: '' }])
    }

    setIsVendorOpen(true)
  }

  const onVendorSubmit = async (data) => {
    setSubmitError(null)
    try {
      // Filter out empty rows
      const validContacts = contacts.filter(c => c.name.trim() !== '')
      const validProducts = productMappings.filter(p => p.purchase_price !== '' && (p.product_id || (p.product_name?.trim() && p.product_sku?.trim())))

      const payload = {
        ...data,
        contacts: validContacts,
        product_mappings: validProducts
      }

      let res
      if (editMode) {
        res = await updateVendor(selectedParty.id, payload)
      } else {
        res = await createVendor(payload)
      }

      if (res.success) {
        toast.success(`Vendor ${editMode ? 'updated' : 'created'} successfully!`)
        setIsVendorOpen(false)
        fetchData()
      } else {
        setSubmitError(res.error || 'Operation failed')
      }
    } catch (err) {
      setSubmitError(err.message || 'Operation failed')
    }
  }

  // Contact list management
  const addContact = () => setContacts([...contacts, { name: '', phone: '', email: '', designation: '' }])
  const removeContact = (idx) => setContacts(contacts.filter((_, i) => i !== idx))
  const handleContactChange = (idx, field, val) => {
    const updated = [...contacts]
    updated[idx][field] = val
    setContacts(updated)
  }

  // Product mapping management
  const addProduct = () => setProductMappings([...productMappings, { product_name: '', product_sku: '', purchase_price: '', vendor_sku: '' }])
  const removeProduct = (idx) => setProductMappings(productMappings.filter((_, i) => i !== idx))
  const handleProductChange = (idx, field, val) => {
    const updated = [...productMappings]
    updated[idx][field] = val
    setProductMappings(updated)
  }

  // ── Delete Handlers ─────────────────────────────
  const openDeleteModal = (party) => {
    setSelectedParty(party)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      let res
      if (activeTab === 'customers') {
        res = await deleteCustomer(selectedParty.id)
      } else {
        res = await deleteVendor(selectedParty.id)
      }

      if (res.success) {
        toast.success(`${activeTab === 'customers' ? 'Customer' : 'Vendor'} deleted successfully!`)
        setIsDeleteOpen(false)
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

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">
      {/* Tab select */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6">
        <button
          onClick={() => { setActiveTab('customers'); setSearch(''); }}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'customers'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="customers-tab"
        >
          <User className="h-4 w-4" />
          Customers Directory
        </button>
        <button
          onClick={() => { setActiveTab('vendors'); setSearch(''); }}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'vendors'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="vendors-tab"
        >
          <Building2 className="h-4 w-4" />
          Vendors Directory
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            {activeTab === 'customers' ? 'Customer Accounts' : 'Vendor Suppliers'}
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {activeTab === 'customers'
              ? 'Manage commercial client profiles, locations, credit lines, and logs.'
              : 'Track supplier details, primary points of contact, and contract item pricings.'}
          </p>
        </div>
        <Button
          onClick={activeTab === 'customers' ? openCreateCustomer : openCreateVendor}
          icon={Plus}
          size="md"
          id={`create-party-btn`}
          className="w-full sm:w-auto"
        >
          Add {activeTab === 'customers' ? 'Customer' : 'Vendor'}
        </Button>
      </div>

      {/* Search Strip */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search by company name or GST...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-1.5"
              id="party-search-input"
            />
          </div>
          <div className="text-xs text-surface-500 font-medium">
            Showing {activeTab === 'customers' ? filteredCustomers.length : filteredVendors.length} entries
          </div>
        </div>

        {/* Data Loader & Tables */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-6 bg-surface-200 dark:bg-surface-700 animate-pulse rounded w-1/3" />
              <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
              <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
            </div>
          ) : activeTab === 'customers' ? (
            filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <User className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No customers found</h3>
                <p className="text-xs text-surface-500 mt-1">Add a new customer profile to get started.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Company Profile</th>
                    <th className="px-6 py-3.5">GST Code</th>
                    <th className="px-6 py-3.5">Geographic Region</th>
                    <th className="px-6 py-3.5">Sales Manager</th>
                    <th className="px-6 py-3.5">Credit Line</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{cust.company_name}</div>
                        {cust.remarks && <div className="text-xs text-surface-400 mt-1 line-clamp-1 italic">{cust.remarks}</div>}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-xs">{cust.gst}</td>
                      <td className="px-6 py-4">
                        {cust.region ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3 text-surface-400" />
                            {cust.region.name} ({cust.region.code})
                          </span>
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cust.salesManager ? (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-surface-400" />
                            {cust.salesManager.name}
                          </span>
                        ) : (
                          <span className="text-surface-400 italic font-light">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">
                          ₹{parseFloat(cust.credit_limit).toLocaleString('en-IN')}
                        </div>
                        <button
                          onClick={() => { setSelectedParty(cust); setIsHistoryOpen(true); }}
                          className="text-[10px] text-primary-600 hover:text-primary-700 dark:text-primary-400 underline font-medium mt-0.5 block"
                        >
                          View History
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditCustomer(cust)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Edit customer"
                            id={`edit-cust-${cust.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(cust)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                            title="Delete customer"
                            id={`delete-cust-${cust.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            filteredVendors.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No vendors found</h3>
                <p className="text-xs text-surface-500 mt-1">Add a new vendor record to catalog supplier maps.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Vendor Supplier</th>
                    <th className="px-6 py-3.5">GST Code</th>
                    <th className="px-6 py-3.5">Primary Contacts</th>
                    <th className="px-6 py-3.5">Products Catalogued</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                  {filteredVendors.map(vend => (
                    <tr key={vend.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{vend.company_name}</div>
                        {vend.remarks && <div className="text-xs text-surface-400 mt-1 line-clamp-1 italic">{vend.remarks}</div>}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-xs">{vend.gst}</td>
                      <td className="px-6 py-4">
                        {vend.contacts && vend.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {vend.contacts.map((c, i) => (
                              <div key={i} className="text-xs text-surface-600 dark:text-surface-400">
                                <strong>{c.name}</strong> ({c.designation || 'Contact'}) · {c.phone || c.email}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-surface-400 italic text-xs">No contacts</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {vend.productMappings && vend.productMappings.length > 0 ? (
                          <div className="space-y-1">
                            {vend.productMappings.map((pm, i) => (
                              <div key={i} className="text-xs text-surface-600 dark:text-surface-400">
                                {pm.product?.name || pm.vendor_sku} · <span className="font-medium text-surface-800 dark:text-surface-200">₹{pm.purchase_price}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-surface-400 italic text-xs">No product mappings</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditVendor(vend)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Edit vendor"
                            id={`edit-vend-${vend.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(vend)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                            title="Delete vendor"
                            id={`delete-vend-${vend.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* ── Customer Form Modal ─────────────────────────────────────────────── */}
      <Modal
        open={isCustomerOpen}
        onClose={() => setIsCustomerOpen(false)}
        title={editMode ? 'Edit Customer' : 'Add New Customer'}
        description="Fill in organizational buyer parameters. Credit updates require documentation reason logs."
        size="md"
      >
        <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <Input
            {...customerForm.register('company_name')}
            label="Company Name"
            placeholder="e.g. Acme Corporation Pvt Ltd"
            required
            error={customerForm.formState.errors.company_name?.message}
            icon={Building2}
            id="cust-company-name"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              {...customerForm.register('gst')}
              label="GST Registration Code"
              placeholder="e.g. 09AAAAA1111A1Z1"
              required
              error={customerForm.formState.errors.gst?.message}
              icon={Landmark}
              id="cust-gst"
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cust-region" className="text-xs font-medium text-surface-700 dark:text-surface-300">
                Segment Region <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <select
                  {...customerForm.register('region_id')}
                  id="cust-region"
                  className={cn(
                    'input-base pl-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]',
                    'bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")]',
                    customerForm.formState.errors.region_id && 'border-danger-500 focus:ring-danger-500'
                  )}
                >
                  <option value="">— Select Region —</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
              {customerForm.formState.errors.region_id && <p className="text-xs text-danger-600">{customerForm.formState.errors.region_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cust-sm" className="text-xs font-medium text-surface-700 dark:text-surface-300">
                Assigned Sales Manager
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <select
                  {...customerForm.register('sales_manager_id')}
                  id="cust-sm"
                  className={cn(
                    'input-base pl-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]',
                    'bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")]'
                  )}
                >
                  <option value="">— Unassigned —</option>
                  {salesManagers.map(sm => (
                    <option key={sm.id} value={sm.id}>{sm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              {...customerForm.register('credit_limit')}
              label="Credit limit Line (₹)"
              type="number"
              required
              error={customerForm.formState.errors.credit_limit?.message}
              icon={Landmark}
              id="cust-credit"
            />
          </div>

          {editMode && (
            <Input
              {...customerForm.register('credit_change_reason')}
              label="Reason for Credit Limit Change"
              placeholder="e.g. Request approved based on payment patterns"
              required={customerForm.watch('credit_limit') !== selectedParty?.credit_limit}
              error={customerForm.formState.errors.credit_change_reason?.message}
              icon={ClipboardList}
              id="cust-credit-reason"
            />
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cust-remarks" className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Remarks
            </label>
            <textarea
              {...customerForm.register('remarks')}
              id="cust-remarks"
              rows={2}
              placeholder="Enter additional account observations..."
              className="input-base py-2 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsCustomerOpen(false)} disabled={customerForm.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={customerForm.formState.isSubmitting}>
              {editMode ? 'Save Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Vendor Form Modal ───────────────────────────────────────────────── */}
      <Modal
        open={isVendorOpen}
        onClose={() => setIsVendorOpen(false)}
        title={editMode ? 'Edit Vendor Supplier' : 'Add New Vendor'}
        description="Enter general company details and associate dynamic contact logs and inventory price agreements."
        size="lg"
      >
        <form onSubmit={vendorForm.handleSubmit(onVendorSubmit)} className="space-y-5" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              {...vendorForm.register('company_name')}
              label="Supplier Company Name"
              placeholder="e.g. Zenith Metals Inc"
              required
              error={vendorForm.formState.errors.company_name?.message}
              icon={Building2}
              id="vend-company"
            />

            <Input
              {...vendorForm.register('gst')}
              label="GST Registration Code"
              placeholder="e.g. 09AAAAA1111A1Z1"
              required
              error={vendorForm.formState.errors.gst?.message}
              icon={Landmark}
              id="vend-gst"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="vend-remarks" className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Remarks
            </label>
            <textarea
              {...vendorForm.register('remarks')}
              id="vend-remarks"
              rows={2}
              placeholder="Enter supplier contracts terms or notes..."
              className="input-base py-2 resize-none"
            />
          </div>

          {/* Dynamic Contacts */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Contact Personnel
              </p>
              <button
                type="button"
                onClick={addContact}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Add Contact
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-surface-200 dark:border-surface-700 p-4 bg-surface-50/20 dark:bg-surface-800/10 max-h-48 overflow-y-auto">
              {contacts.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={c.name}
                    onChange={e => handleContactChange(i, 'name', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs flex-1"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={c.phone}
                    onChange={e => handleContactChange(i, 'phone', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs w-28"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={c.email}
                    onChange={e => handleContactChange(i, 'email', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Designation"
                    value={c.designation}
                    onChange={e => handleContactChange(i, 'designation', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs w-28"
                  />
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="text-danger-500 hover:text-danger-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Product Mapping */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Product Pricings & Mapping
              </p>
              <button
                type="button"
                onClick={addProduct}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Map Product
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-surface-200 dark:border-surface-700 p-4 bg-surface-50/20 dark:bg-surface-800/10 max-h-48 overflow-y-auto">
              {productMappings.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Product Name (e.g. Copper Wire)"
                    value={p.product_name}
                    onChange={e => handleProductChange(i, 'product_name', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Product SKU (e.g. SKU-COPPER)"
                    value={p.product_sku}
                    onChange={e => handleProductChange(i, 'product_sku', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs w-28"
                  />
                  <input
                    type="number"
                    placeholder="Buy Price (₹)"
                    value={p.purchase_price}
                    onChange={e => handleProductChange(i, 'purchase_price', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs w-24"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Supplier SKU"
                    value={p.vendor_sku}
                    onChange={e => handleProductChange(i, 'vendor_sku', e.target.value)}
                    className="input-base py-1 px-2.5 text-xs w-28"
                  />
                  {productMappings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(i)}
                      className="text-danger-500 hover:text-danger-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsVendorOpen(false)} disabled={vendorForm.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={vendorForm.formState.isSubmitting}>
              {editMode ? 'Save Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Delete ${activeTab === 'customers' ? 'Customer' : 'Vendor'}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Are you sure you want to delete <strong className="text-surface-900 dark:text-surface-50">{selectedParty?.company_name}</strong>?
            This will soft-delete their profile record and log this action in the database.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete} icon={Trash2}>
              Delete Party
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Credit limit history Modal ───────────────────────────────────────── */}
      <Modal
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Credit History: ${selectedParty?.company_name}`}
        description="Audit ledger tracking every credit line update."
        size="md"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {selectedParty?.creditHistory && selectedParty.creditHistory.length > 0 ? (
            <div className="relative border-l-2 border-surface-200 dark:border-surface-700 ml-3 pl-5 space-y-5">
              {selectedParty.creditHistory.map((history, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary-500 bg-white dark:bg-surface-800" />
                  <div className="text-xs text-surface-400">
                    {new Date(history.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div className="font-semibold text-sm text-surface-900 dark:text-surface-50 mt-0.5">
                    ₹{parseFloat(history.old_limit).toLocaleString('en-IN')} → ₹{parseFloat(history.new_limit).toLocaleString('en-IN')}
                  </div>
                  {history.reason && <p className="text-xs text-surface-600 dark:text-surface-400 mt-1 italic">Reason: "{history.reason}"</p>}
                  {history.changedByUser && (
                    <div className="text-[10px] text-surface-400 mt-1">
                      Changed by: {history.changedByUser.name} ({history.changedByUser.login_id})
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-surface-400 italic text-xs">
              No credit limit change ledger records exist for this customer.
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-surface-100 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setIsHistoryOpen(false)}>
              Close Ledger
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
