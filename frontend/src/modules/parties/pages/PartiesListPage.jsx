import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getVendors, createVendor, updateVendor, deleteVendor
} from '../../../api/endpoints/parties.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import {
  Plus, Search, Building2, User, Phone, MapPin, AlertCircle, Pencil, Trash2,
  Landmark, Package, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import TablePagination from '../../../components/data/TablePagination'

// ─── Zod Validation Schema ──────────────────────────────────────────────────
const vendorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(150),
  gst: z.string().min(15, 'GST must be exactly 15 characters').max(15, 'GST must be exactly 15 characters'),
  remarks: z.string().optional().or(z.literal('')),
})

export default function PartiesListPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  useEffect(() => { setPage(1) }, [search])

  // Modals state
  const [isVendorOpen, setIsVendorOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editMode, setEditMode]         = useState(false)
  const [selectedParty, setSelectedParty] = useState(null)
  const [submitError, setSubmitError]   = useState(null)
  const [deleting, setDeleting]         = useState(false)

  // Dynamic Contact & Product states for Vendor Modal
  const [contacts, setContacts] = useState([{ name: '', phone: '', email: '', designation: '' }])
  const [productMappings, setProductMappings] = useState([{ product_name: '', product_sku: '', purchase_price: '', vendor_sku: '' }])

  // Form
  const vendorForm = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: { company_name: '', gst: '', remarks: '' }
  })

  // Fetch vendors
  const fetchData = async () => {
    setLoading(true)
    try {
      const vendRes = await getVendors()
      if (vendRes.success) setVendors(vendRes.data || [])
    } catch (err) {
      toast.error(err.message || 'Failed to fetch vendor directory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter vendors list
  const filteredVendors = vendors.filter(v =>
    (v.company_name && v.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (v.gst && v.gst.toLowerCase().includes(search.toLowerCase()))
  )

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
      company_name: vendor.company_name || '',
      gst: vendor.gst || '',
      remarks: vendor.remarks || ''
    })

    // Contacts
    if (vendor.contacts && vendor.contacts.length > 0) {
      setContacts(vendor.contacts.map(c => ({
        name: c.name || '',
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
      const res = await deleteVendor(selectedParty.id)
      if (res.success) {
        toast.success('Vendor deleted successfully!')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary-500" />
            Vendor Suppliers
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Track supplier details, primary points of contact, and contract item pricings.
          </p>
        </div>
        <Button
          onClick={openCreateVendor}
          icon={Plus}
          size="md"
          id="create-vendor-btn"
          className="w-full sm:w-auto"
        >
          Add Vendor
        </Button>
      </div>

      {/* Search Strip & Data Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vendor name or GST..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-1.5"
              id="vendor-search-input"
            />
          </div>
          <div className="text-xs text-surface-500 font-medium">
            Showing {filteredVendors.length} entries
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
          ) : filteredVendors.length === 0 ? (
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
                {filteredVendors.slice((page - 1) * 50, page * 50).map(vend => (
                  <tr key={vend.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-surface-900 dark:text-surface-50">{vend.company_name}</div>
                      {vend.remarks && <div className="text-xs text-surface-400 mt-1 line-clamp-1 italic">{vend.remarks}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-xs">{vend.gst || '—'}</td>
                    <td className="px-6 py-4">
                      {vend.contacts && vend.contacts.length > 0 ? (
                        <div className="space-y-1">
                          {vend.contacts.map((c, i) => (
                            <div key={i} className="text-xs text-surface-600 dark:text-surface-400">
                              <strong>{c.name}</strong> ({c.designation || 'Contact'}) · {c.phone || c.email || '—'}
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
          )}
        </div>
        <TablePagination
          currentPage={page}
          totalItems={filteredVendors.length}
          pageSize={50}
          onPageChange={setPage}
        />
      </div>

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
        title="Delete Vendor"
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
              Delete Vendor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
