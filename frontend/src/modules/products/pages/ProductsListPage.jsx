import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, updateCategory, deleteCategory,
  getUOM, createUOM, updateUOM, deleteUOM,
  getPricing, createPricing, updatePricing, deletePricing,
  bulkImportProducts,
} from '../../../api/endpoints/products.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import {
  Plus, Search, Package, Tag, Ruler, TrendingUp, AlertCircle,
  Pencil, Trash2, ChevronRight, X, Calendar, Layers,
  FileSpreadsheet, FileUp, CheckCircle2, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const productSchema = z.object({
  name:                 z.string().min(1, 'Product name is required').max(150),
  sku:                  z.string().min(1, 'SKU is required').max(50),
  category_id:          z.string().optional().or(z.literal('')),
  uom_id:               z.string().optional().or(z.literal('')),
  purchase_price:       z.coerce.number().min(0, 'Must be ≥ 0'),
  dealer_landing_price: z.coerce.number().min(0).optional().or(z.literal('')),
  selling_price:        z.coerce.number().min(0, 'Must be ≥ 0'),
  reorder_threshold:    z.coerce.number().int().min(0).optional(),
  remarks:              z.string().optional().or(z.literal('')),
})

const categorySchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  parent_id:   z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
})

const uomSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(50),
  code:        z.string().min(1, 'Code is required').max(10),
  description: z.string().optional().or(z.literal('')),
})

const pricingSchema = z.object({
  product_id:           z.string().min(1, 'Product is required'),
  purchase_price:       z.coerce.number().min(0, 'Must be ≥ 0'),
  dealer_landing_price: z.coerce.number().min(0).optional().or(z.literal('')),
  selling_price:        z.coerce.number().min(0, 'Must be ≥ 0'),
  effective_from:       z.string().min(1, 'Effective from date is required'),
  effective_to:         z.string().optional().or(z.literal('')),
  notes:                z.string().optional().or(z.literal('')),
})

// ─── Pure JS RFC 4180 Compliant CSV Parser ──────────────────────────────────
function parseCSV(text) {
  let p = '', c = '', r = [];
  let q = false;
  let row = [''];
  for (let i = 0; i < text.length; i++) {
    c = text[i];
    let next = text[i+1];
    if (c === '"') {
      if (q && next === '"') { row[row.length - 1] += '"'; i++; } // Escaped quote
      else { q = !q; }
    } else if (c === ',' && !q) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !q) {
      if (c === '\r' && next === '\n') { i++; }
      r.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    r.push(row);
  }
  
  if (r.length === 0) return [];
  
  // Extract and normalize headers
  const headers = r[0].map(h => h.trim().toLowerCase().replace(/[\s_]+/g, '_'));
  return r.slice(1).map(rowValues => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = rowValues[index] !== undefined ? rowValues[index].trim() : '';
    });
    return obj;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
      <AlertCircle className="h-4 w-4 shrink-0" />{msg}
    </div>
  )
}

// ─── Inline CRUD list used inside Category & UOM management modals ─────────────
function ManageListModal({ open, onClose, title, icon: Icon, items, form, editId, onSave, onEdit, onDelete, renderRow, renderForm }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Existing items */}
        <div className="divide-y divide-surface-100 dark:divide-surface-700 max-h-60 overflow-y-auto rounded-xl border border-surface-200 dark:border-surface-700">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-surface-400 italic">No entries yet.</div>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
              {renderRow(item)}
              <div className="flex gap-1.5 shrink-0 ml-3">
                <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit form */}
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            {editId ? 'Edit Entry' : 'Add New'}
          </p>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-3" noValidate>
            {renderForm(form)}
            <div className="flex gap-2 justify-end">
              {editId && (
                <Button type="button" variant="secondary" size="sm" onClick={() => { form.reset(); onEdit(null) }}>
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" loading={form.formState.isSubmitting}>
                {editId ? 'Save' : 'Add'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsListPage() {
  const [products, setProducts]         = useState([])
  const [categories, setCategories]     = useState([])
  const [uoms, setUoms]                 = useState([])
  const [pricing, setPricing]           = useState([])
  const [loading, setLoading]           = useState(true)

  // Import modal state
  const [isImportOpen, setIsImportOpen]         = useState(false)
  const [parsedImportData, setParsedImportData] = useState([])
  const [importFileName, setImportFileName]     = useState('')
  const [importStockMode, setImportStockMode]   = useState('absolute')
  const [importEffectiveFrom, setImportEffectiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [importNotes, setImportNotes]           = useState('')
  const [importing, setImporting]               = useState(false)

  // Filter state
  const [search, setSearch]             = useState('')
  const [catFilter, setCatFilter]       = useState('')
  const [pricingSearch, setPricingSearch] = useState('')
  const [activeTab, setActiveTab]       = useState('catalogue')

  // Product modals
  const [isProdOpen, setIsProdOpen]     = useState(false)
  const [isProdDelete, setIsProdDelete] = useState(false)
  const [editProduct, setEditProduct]   = useState(null)
  const [activeProduct, setActiveProduct] = useState(null)
  const [prodError, setProdError]       = useState(null)
  const [deleting, setDeleting]         = useState(false)

  // Category modal
  const [isCatOpen, setIsCatOpen]       = useState(false)
  const [editCatId, setEditCatId]       = useState(null)
  const [deleteCatTarget, setDeleteCatTarget] = useState(null)
  const [isCatDeleteOpen, setIsCatDeleteOpen] = useState(false)

  // UOM modal
  const [isUomOpen, setIsUomOpen]       = useState(false)
  const [editUomId, setEditUomId]       = useState(null)
  const [deleteUomTarget, setDeleteUomTarget] = useState(null)
  const [isUomDeleteOpen, setIsUomDeleteOpen] = useState(false)

  // Pricing modals
  const [isPricingOpen, setIsPricingOpen]   = useState(false)
  const [isPricingDelete, setIsPricingDelete] = useState(false)
  const [editPricing, setEditPricing]       = useState(null)
  const [activePricing, setActivePricing]   = useState(null)
  const [pricingError, setPricingError]     = useState(null)
  const [deletingPricing, setDeletingPricing] = useState(false)

  // ── Forms ──────────────────────────────────────────────────────────────────
  const prodForm = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', sku: '', category_id: '', uom_id: '', purchase_price: 0, dealer_landing_price: '', selling_price: 0, reorder_threshold: 0, remarks: '' },
  })

  const catForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', parent_id: '', description: '' },
  })

  const uomForm = useForm({
    resolver: zodResolver(uomSchema),
    defaultValues: { name: '', code: '', description: '' },
  })

  const pricingForm = useForm({
    resolver: zodResolver(pricingSchema),
    defaultValues: { product_id: '', purchase_price: 0, dealer_landing_price: '', selling_price: 0, effective_from: '', effective_to: '', notes: '' },
  })

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pRes, cRes, uRes, prRes] = await Promise.all([
        getProducts(), getCategories(), getUOM(), getPricing(),
      ])
      if (pRes.success)  setProducts(pRes.data)
      if (cRes.success)  setCategories(cRes.data)
      if (uRes.success)  setUoms(uRes.data)
      if (prRes.success) setPricing(prRes.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load products data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || String(p.category_id) === catFilter
    return matchSearch && matchCat
  }), [products, search, catFilter])

  const filteredPricing = useMemo(() => pricing.filter(pr => {
    if (!pricingSearch) return true
    const q = pricingSearch.toLowerCase()
    return (
      pr.product?.name?.toLowerCase().includes(q) ||
      pr.product?.sku?.toLowerCase().includes(q)
    )
  }), [pricing, pricingSearch])

  // ── Product handlers ───────────────────────────────────────────────────────
  const openCreateProduct = () => {
    setEditProduct(null)
    setProdError(null)
    prodForm.reset({ name: '', sku: '', category_id: '', uom_id: '', purchase_price: 0, dealer_landing_price: '', selling_price: 0, reorder_threshold: 0, remarks: '' })
    setIsProdOpen(true)
  }

  const openEditProduct = (p) => {
    setEditProduct(p)
    setProdError(null)
    prodForm.reset({
      name:                 p.name,
      sku:                  p.sku,
      category_id:          p.category_id ? String(p.category_id) : '',
      uom_id:               p.uom_id ? String(p.uom_id) : '',
      purchase_price:       parseFloat(p.purchase_price) || 0,
      dealer_landing_price: p.dealer_landing_price ? parseFloat(p.dealer_landing_price) : '',
      selling_price:        parseFloat(p.selling_price) || 0,
      reorder_threshold:    p.reorder_threshold || 0,
      remarks:              p.remarks || '',
    })
    setIsProdOpen(true)
  }

  const onProductSubmit = async (data) => {
    setProdError(null)
    try {
      const payload = {
        ...data,
        category_id:          data.category_id ? parseInt(data.category_id) : null,
        uom_id:               data.uom_id ? parseInt(data.uom_id) : null,
        dealer_landing_price: data.dealer_landing_price !== '' ? data.dealer_landing_price : null,
      }
      const res = editProduct
        ? await updateProduct(editProduct.id, payload)
        : await createProduct(payload)

      if (res.success) {
        toast.success(`Product ${editProduct ? 'updated' : 'created'} successfully!`)
        setIsProdOpen(false)
        fetchAll()
      } else {
        setProdError(res.error || 'Operation failed')
      }
    } catch (err) {
      setProdError(err.message || 'Operation failed')
    }
  }

  const confirmDeleteProduct = async () => {
    setDeleting(true)
    try {
      const res = await deleteProduct(activeProduct.id)
      if (res.success) {
        toast.success('Product deleted successfully')
        setIsProdDelete(false)
        fetchAll()
      } else {
        toast.error(res.error || 'Delete failed')
      }
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // ── Category handlers ──────────────────────────────────────────────────────
  const onCategoryEdit = (cat) => {
    if (!cat) { setEditCatId(null); catForm.reset({ name: '', parent_id: '', description: '' }); return }
    setEditCatId(cat.id)
    catForm.reset({ name: cat.name, parent_id: cat.parent_id ? String(cat.parent_id) : '', description: cat.description || '' })
  }

  const onCategorySave = async (data) => {
    try {
      const payload = { ...data, parent_id: data.parent_id ? parseInt(data.parent_id) : null }
      const res = editCatId
        ? await updateCategory(editCatId, payload)
        : await createCategory(payload)

      if (res.success) {
        toast.success(editCatId ? 'Category updated' : 'Category added')
        setEditCatId(null)
        catForm.reset({ name: '', parent_id: '', description: '' })
        fetchAll()
      } else {
        toast.error(res.error || 'Failed')
      }
    } catch (err) {
      toast.error(err.message || 'Failed')
    }
  }

  const confirmDeleteCategory = async () => {
    try {
      const res = await deleteCategory(deleteCatTarget.id)
      if (res.success) { toast.success('Category deleted'); setIsCatDeleteOpen(false); fetchAll() }
      else toast.error(res.error || 'Delete failed')
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  // ── UOM handlers ───────────────────────────────────────────────────────────
  const onUomEdit = (u) => {
    if (!u) { setEditUomId(null); uomForm.reset({ name: '', code: '', description: '' }); return }
    setEditUomId(u.id)
    uomForm.reset({ name: u.name, code: u.code, description: u.description || '' })
  }

  const onUomSave = async (data) => {
    try {
      const res = editUomId
        ? await updateUOM(editUomId, data)
        : await createUOM(data)

      if (res.success) {
        toast.success(editUomId ? 'UOM updated' : 'UOM added')
        setEditUomId(null)
        uomForm.reset({ name: '', code: '', description: '' })
        fetchAll()
      } else {
        toast.error(res.error || 'Failed')
      }
    } catch (err) {
      toast.error(err.message || 'Failed')
    }
  }

  const confirmDeleteUOM = async () => {
    try {
      const res = await deleteUOM(deleteUomTarget.id)
      if (res.success) { toast.success('UOM deleted'); setIsUomDeleteOpen(false); fetchAll() }
      else toast.error(res.error || 'Delete failed')
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  // ── Pricing handlers ───────────────────────────────────────────────────────
  const openCreatePricing = (productId = '') => {
    setEditPricing(null)
    setPricingError(null)
    pricingForm.reset({ product_id: productId ? String(productId) : '', purchase_price: 0, dealer_landing_price: '', selling_price: 0, effective_from: new Date().toISOString().split('T')[0], effective_to: '', notes: '' })
    setIsPricingOpen(true)
  }

  const openEditPricing = (pr) => {
    setEditPricing(pr)
    setPricingError(null)
    pricingForm.reset({
      product_id:           String(pr.product_id),
      purchase_price:       parseFloat(pr.purchase_price),
      dealer_landing_price: pr.dealer_landing_price ? parseFloat(pr.dealer_landing_price) : '',
      selling_price:        parseFloat(pr.selling_price),
      effective_from:       pr.effective_from,
      effective_to:         pr.effective_to || '',
      notes:                pr.notes || '',
    })
    setIsPricingOpen(true)
  }

  const onPricingSubmit = async (data) => {
    setPricingError(null)
    try {
      const payload = {
        ...data,
        product_id:           parseInt(data.product_id),
        dealer_landing_price: data.dealer_landing_price !== '' ? data.dealer_landing_price : null,
        effective_to:         data.effective_to || null,
      }
      const res = editPricing
        ? await updatePricing(editPricing.id, payload)
        : await createPricing(payload)

      if (res.success) {
        toast.success(`Pricing ${editPricing ? 'updated' : 'created'} successfully!`)
        setIsPricingOpen(false)
        fetchAll()
      } else {
        setPricingError(res.error || 'Operation failed')
      }
    } catch (err) {
      setPricingError(err.message || 'Operation failed')
    }
  }

  const confirmDeletePricing = async () => {
    setDeletingPricing(true)
    try {
      const res = await deletePricing(activePricing.id)
      if (res.success) {
        toast.success('Pricing record deleted')
        setIsPricingDelete(false)
        fetchAll()
      } else {
        toast.error(res.error || 'Delete failed')
      }
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeletingPricing(false)
    }
  }

  // Create lookup dictionary of active products by SKU
  const productDict = useMemo(() => {
    const dict = {}
    products.forEach(p => {
      dict[p.sku?.toUpperCase()] = p
    });
    return dict
  }, [products])

  const onImportDrop = (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const rawRows = parseCSV(text)
        
        // Map headers dynamically to known keys
        const headerMaps = {
          sku: ['sku', 'sku_code', 'product_sku', 'item_sku', 'part_number'],
          purchase_price: ['purchase_price', 'purchase price', 'purchase', 'buy_price', 'cost_price', 'cost'],
          dealer_landing_price: ['dealer_landing_price', 'dealer landing price', 'dealer landing', 'landing_price', 'dealer_price'],
          selling_price: ['selling_price', 'selling price', 'selling', 'sell_price', 'mrp', 'price'],
          quantity: ['quantity', 'qty', 'stock', 'stock_quantity', 'stock quantity', 'stock_on_hand', 'on_hand', 'count']
        }

        const findMappedValue = (row, mappingKeys) => {
          for (const key of mappingKeys) {
            const normalizedKey = key.replace(/[\s_]+/g, '_').toLowerCase()
            for (const rowKey in row) {
              if (rowKey.replace(/[\s_]+/g, '_').toLowerCase() === normalizedKey) {
                return row[rowKey]
              }
            }
          }
          return undefined
        }

        const normalizedRows = rawRows.map(row => {
          const sku = findMappedValue(row, headerMaps.sku)
          const purchase_price = findMappedValue(row, headerMaps.purchase_price)
          const dealer_landing_price = findMappedValue(row, headerMaps.dealer_landing_price)
          const selling_price = findMappedValue(row, headerMaps.selling_price)
          const quantity = findMappedValue(row, headerMaps.quantity)

          return {
            sku: sku || '',
            purchase_price: purchase_price !== undefined ? purchase_price : '',
            dealer_landing_price: dealer_landing_price !== undefined ? dealer_landing_price : '',
            selling_price: selling_price !== undefined ? selling_price : '',
            quantity: quantity !== undefined ? quantity : ''
          }
        }).filter(r => r.sku || r.purchase_price || r.selling_price || r.quantity)

        setParsedImportData(normalizedRows)
        toast.success(`Successfully parsed ${normalizedRows.length} rows from file.`)
      } catch (err) {
        toast.error('Failed to parse CSV file. Ensure it is a valid CSV format.')
      }
    };
    reader.readAsText(file)
  }

  const { getRootProps: getImportRootProps, getInputProps: getImportInputProps, isDragActive: isImportDragActive } = useDropzone({
    onDrop: onImportDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  })

  // Validate the parsed items against database products list
  const validatedImportItems = useMemo(() => {
    return parsedImportData.map((item, index) => {
      const skuUpper = item.sku?.trim().toUpperCase()
      const dbProduct = productDict[skuUpper]
      
      const errors = []
      if (!item.sku?.trim()) {
        errors.push('SKU is missing')
      } else if (!dbProduct) {
        errors.push('SKU not found in catalog')
      }

      const hasPurchase = item.purchase_price !== '' && item.purchase_price !== null
      const hasSelling = item.selling_price !== '' && item.selling_price !== null
      const hasQty = item.quantity !== '' && item.quantity !== null

      if (hasPurchase && isNaN(parseFloat(item.purchase_price))) {
        errors.push('Purchase Price must be a number')
      }
      if (hasSelling && isNaN(parseFloat(item.selling_price))) {
        errors.push('Selling Price must be a number')
      }
      if (item.dealer_landing_price !== '' && item.dealer_landing_price !== null && isNaN(parseFloat(item.dealer_landing_price))) {
        errors.push('Dealer Landing Price must be a number')
      }
      if (hasQty && isNaN(parseFloat(item.quantity))) {
        errors.push('Stock Quantity must be a number')
      }

      if (!hasPurchase && !hasSelling && !hasQty) {
        errors.push('No prices or stock levels specified for update')
      }

      return {
        ...item,
        id: index,
        dbProduct,
        isValid: errors.length === 0,
        errors
      }
    })
  }, [parsedImportData, productDict])

  // Count items summary
  const importSummary = useMemo(() => {
    const total = validatedImportItems.length
    const valid = validatedImportItems.filter(item => item.isValid).length
    const invalid = total - valid
    return { total, valid, invalid }
  }, [validatedImportItems])

  const downloadImportTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,SKU,Purchase Price,Dealer Landing Price,Selling Price,Stock Quantity\nSKU001,150.00,165.00,199.00,50\nSKU002,300.00,,399.00,120";
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "bulk_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportSubmit = async () => {
    const validPayloadItems = validatedImportItems
      .filter(item => item.isValid)
      .map(item => ({
        sku: item.sku,
        purchase_price: item.purchase_price !== '' ? parseFloat(item.purchase_price) : undefined,
        dealer_landing_price: item.dealer_landing_price !== '' ? parseFloat(item.dealer_landing_price) : undefined,
        selling_price: item.selling_price !== '' ? parseFloat(item.selling_price) : undefined,
        quantity: item.quantity !== '' ? parseFloat(item.quantity) : undefined
      }))

    if (validPayloadItems.length === 0) {
      toast.error('No valid items to import.')
      return
    }

    setImporting(true)
    try {
      const res = await bulkImportProducts({
        items: validPayloadItems,
        stock_mode: importStockMode,
        effective_from: importEffectiveFrom,
        notes: importNotes
      })

      if (res.success) {
        toast.success(res.message || 'Bulk import successful!')
        // Reset state
        setParsedImportData([])
        setImportFileName('')
        setImportNotes('')
        setIsImportOpen(false)
        // Refresh products list on screen immediately!
        fetchAll()
      } else {
        toast.error(res.error || 'Import failed')
      }
    } catch (err) {
      toast.error(err.message || 'Error occurred during import')
    } finally {
      setImporting(false)
    }
  }

  // ── Category map for display ───────────────────────────────────────────────
  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  const getCategoryLabel = (cat) => {
    if (!cat) return '—'
    if (cat.parent_id && categoryMap[cat.parent_id]) {
      return `${categoryMap[cat.parent_id].name} › ${cat.name}`
    }
    return cat.name
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">

      {/* ── Products Tabs ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6">
          <button
            type="button"
            onClick={() => { setActiveTab('catalogue'); setSearch(''); setPricingSearch('') }}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'catalogue'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
            )}
            id="catalogue-tab"
          >
            <Package className="h-4 w-4" />
            Catalogue
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('pricing'); setSearch(''); setPricingSearch('') }}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'pricing'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
            )}
            id="pricing-tab"
          >
            <TrendingUp className="h-4 w-4" />
            Pricing
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
              {activeTab === 'catalogue' ? 'Product Catalogue' : 'Pricing Versions'}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              {activeTab === 'catalogue'
                ? 'Browse and manage the product catalogue, categories, and reorder levels.'
                : 'Versioned price records with effective dates for each product.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="secondary" size="sm" icon={Layers} onClick={() => { catForm.reset({ name: '', parent_id: '', description: '' }); setEditCatId(null); setIsCatOpen(true) }}>
              Categories
            </Button>
            <Button variant="secondary" size="sm" icon={Ruler} onClick={() => { uomForm.reset({ name: '', code: '', description: '' }); setEditUomId(null); setIsUomOpen(true) }}>
              Units (UOM)
            </Button>
            {activeTab === 'catalogue' && (
              <Button variant="secondary" size="md" icon={FileSpreadsheet} onClick={() => { setParsedImportData([]); setImportFileName(''); setIsImportOpen(true) }} className="w-full sm:w-auto">
                Import CSV
              </Button>
            )}
            {activeTab === 'catalogue' ? (
              <Button icon={Plus} size="md" onClick={openCreateProduct} className="w-full sm:w-auto">
                Add Product
              </Button>
            ) : (
              <Button icon={Plus} size="md" onClick={() => openCreatePricing()} className="w-full sm:w-auto">
                Add Pricing
              </Button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'catalogue' && (
        <>
          {/* Filters */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-base pl-9 py-1.5"
                />
              </div>

              <div className="relative w-full sm:w-48">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <select
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                  className={`input-base pl-9 py-1.5 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{getCategoryLabel(c)}</option>
                  ))}
                </select>
              </div>

              {catFilter && (
                <button onClick={() => setCatFilter('')} className="flex items-center gap-1 text-xs text-surface-500 hover:text-danger-600 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" /> Clear filter
                </button>
              )}

              <div className="text-xs text-surface-500 font-medium ml-auto shrink-0">
                {filteredProducts.length} of {products.length} products
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />)}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No products found</h3>
                  <p className="text-xs text-surface-500 mt-1">
                    {search || catFilter ? 'Try adjusting your filters.' : 'Add your first product to get started.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-6 py-3.5">SKU</th>
                      <th className="px-6 py-3.5">Product Name</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">UOM</th>
                      <th className="px-6 py-3.5">Stock</th>
                      <th className="px-6 py-3.5">Selling Price</th>
                      <th className="px-6 py-3.5">Purchase Price</th>
                      <th className="px-6 py-3.5">Reorder At</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="table-row-hover">
                        <td className="px-6 py-4 font-mono text-xs font-medium text-surface-600 dark:text-surface-400">{p.sku}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-surface-900 dark:text-surface-50">{p.name}</div>
                          {p.remarks && <div className="text-xs text-surface-400 mt-0.5 line-clamp-1 italic">{p.remarks}</div>}
                        </td>
                        <td className="px-6 py-4">
                          {p.category ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-600">
                              <Tag className="h-2.5 w-2.5" />
                              {getCategoryLabel(p.category)}
                            </span>
                          ) : <span className="text-surface-400">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {p.uom ? (
                            <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50">
                              {p.uom.code}
                            </span>
                          ) : <span className="text-surface-400">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-surface-900 dark:text-surface-50">
                              {p.available != null ? parseFloat(p.available).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}
                              <span className="text-xs text-surface-500 font-normal ml-1">{p.uom?.code}</span>
                            </div>
                            <div className="flex">
                              {p.available <= 0 ? (
                                <Badge variant="danger" dot size="sm">Out of Stock</Badge>
                              ) : p.is_low_stock ? (
                                <Badge variant="warning" dot size="sm">Low Stock</Badge>
                              ) : (
                                <Badge variant="success" dot size="sm">In Stock</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-surface-900 dark:text-surface-50">{fmt(p.selling_price)}</td>
                        <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{fmt(p.purchase_price)}</td>
                        <td className="px-6 py-4">
                          {p.reorder_threshold > 0 ? (
                            <span className="text-xs font-medium text-warning-700 dark:text-warning-400">{p.reorder_threshold} units</span>
                          ) : <span className="text-surface-400">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openCreatePricing(p.id)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
                              title="Add pricing version"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditProduct(p)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                              title="Edit product"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setActiveProduct(p); setIsProdDelete(true) }}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                              title="Delete product"
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
          </div>
        </>
      )}

      {activeTab === 'pricing' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Pricing Versions</h1>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                Versioned price records with effective date ranges per product.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={pricingSearch}
                  onChange={e => setPricingSearch(e.target.value)}
                  className="input-base pl-9 py-1.5"
                />
              </div>
              <div className="text-xs text-surface-500 font-medium ml-auto shrink-0">
                {filteredPricing.length} records
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />)}
                </div>
              ) : filteredPricing.length === 0 ? (
                <div className="p-12 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No pricing records</h3>
                  <p className="text-xs text-surface-500 mt-1">Add a pricing version from the Products tab or click "Add Pricing".</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Product</th>
                      <th className="px-6 py-3.5">Purchase ₹</th>
                      <th className="px-6 py-3.5">Dealer Landing ₹</th>
                      <th className="px-6 py-3.5">Selling ₹</th>
                      <th className="px-6 py-3.5">Effective From</th>
                      <th className="px-6 py-3.5">Effective To</th>
                      <th className="px-6 py-3.5">Notes</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                    {filteredPricing.map(pr => (
                      <tr key={pr.id} className="table-row-hover">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-surface-900 dark:text-surface-50">{pr.product?.name || '—'}</div>
                          <div className="text-xs font-mono text-surface-400 mt-0.5">{pr.product?.sku}</div>
                        </td>
                        <td className="px-6 py-4">{fmt(pr.purchase_price)}</td>
                        <td className="px-6 py-4">{pr.dealer_landing_price ? fmt(pr.dealer_landing_price) : <span className="text-surface-400">—</span>}</td>
                        <td className="px-6 py-4 font-semibold text-surface-900 dark:text-surface-50">{fmt(pr.selling_price)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3 text-surface-400" />
                            {pr.effective_from}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {pr.effective_to ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3 text-surface-400" />
                              {pr.effective_to}
                            </span>
                          ) : <span className="text-xs text-success-600 dark:text-success-400 font-medium">Current</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-surface-500 max-w-[160px] line-clamp-1 italic">
                          {pr.notes || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditPricing(pr)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                              title="Edit pricing"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setActivePricing(pr); setIsPricingDelete(true) }}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                              title="Delete pricing record"
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
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PRODUCT CREATE / EDIT MODAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        open={isProdOpen}
        onClose={() => setIsProdOpen(false)}
        title={editProduct ? `Edit: ${editProduct.name}` : 'Add New Product'}
        description="Define product identity, classification, pricing, and inventory thresholds."
        size="lg"
      >
        <form onSubmit={prodForm.handleSubmit(onProductSubmit)} className="space-y-4" noValidate>
          <ErrorBanner msg={prodError} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input {...prodForm.register('name')} label="Product Name" placeholder="e.g. Copper Wire 1.5mm" required error={prodForm.formState.errors.name?.message} icon={Package} />
            <Input {...prodForm.register('sku')} label="SKU Code" placeholder="e.g. CW-1.5-RED" required error={prodForm.formState.errors.sku?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-surface-400" /> Category
              </label>
                <select
                  {...prodForm.register('category_id')}
                  className={`input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
                >
                <option value="">— No Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{getCategoryLabel(c)}</option>)}
              </select>
            </div>

            {/* UOM */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5 text-surface-400" /> Unit of Measure
              </label>
              <select
                {...prodForm.register('uom_id')}
                className={`input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
              >
                <option value="">— No UOM —</option>
                {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input {...prodForm.register('purchase_price')} label="Purchase Price (₹)" type="number" step="0.01" required error={prodForm.formState.errors.purchase_price?.message} />
            <Input {...prodForm.register('dealer_landing_price')} label="Dealer Landing Price (₹)" type="number" step="0.01" error={prodForm.formState.errors.dealer_landing_price?.message} />
            <Input {...prodForm.register('selling_price')} label="Selling Price (₹)" type="number" step="0.01" required error={prodForm.formState.errors.selling_price?.message} />
          </div>

          <Input {...prodForm.register('reorder_threshold')} label="Reorder Threshold (units)" type="number" placeholder="e.g. 50" error={prodForm.formState.errors.reorder_threshold?.message} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Remarks</label>
            <textarea {...prodForm.register('remarks')} rows={2} placeholder="Optional product notes..." className="input-base py-2 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsProdOpen(false)} disabled={prodForm.formState.isSubmitting}>Cancel</Button>
            <Button type="submit" loading={prodForm.formState.isSubmitting}>{editProduct ? 'Save Product' : 'Create Product'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Product Delete Confirm ─────────────────────────────────────── */}
      <Modal open={isProdDelete} onClose={() => setIsProdDelete(false)} title="Delete Product" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Delete <strong className="text-surface-900 dark:text-surface-50">{activeProduct?.name}</strong> ({activeProduct?.sku})? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setIsProdDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={confirmDeleteProduct} icon={Trash2}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIES MANAGEMENT MODAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <ManageListModal
        open={isCatOpen}
        onClose={() => setIsCatOpen(false)}
        title="Manage Categories"
        icon={Tag}
        items={categories}
        form={catForm}
        editId={editCatId}
        onSave={onCategorySave}
        onEdit={onCategoryEdit}
        onDelete={(cat) => { setDeleteCatTarget(cat); setIsCatDeleteOpen(true) }}
        renderRow={(cat) => (
          <div>
            <div className="text-sm font-medium text-surface-900 dark:text-surface-50 flex items-center gap-1">
              {cat.parent_id && <ChevronRight className="h-3 w-3 text-surface-400" />}
              {cat.name}
            </div>
            {cat.parent?.name && <div className="text-xs text-surface-400 mt-0.5">Under: {cat.parent.name}</div>}
          </div>
        )}
        renderForm={(form) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input {...form.register('name')} label="Name" placeholder="e.g. Wires" required error={form.formState.errors.name?.message} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Parent (optional)</label>
                <select
                  {...form.register('parent_id')}
                  className={`input-base text-sm appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
                >
                  <option value="">— Top Level —</option>
                  {categories.filter(c => c.id !== editCatId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Input {...form.register('description')} label="Description" placeholder="Optional..." error={form.formState.errors.description?.message} />
          </>
        )}
      />

      <Modal open={isCatDeleteOpen} onClose={() => setIsCatDeleteOpen(false)} title="Delete Category" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Delete <strong className="text-surface-900 dark:text-surface-50">{deleteCatTarget?.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setIsCatDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} onClick={confirmDeleteCategory}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* UOM MANAGEMENT MODAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <ManageListModal
        open={isUomOpen}
        onClose={() => setIsUomOpen(false)}
        title="Manage Units of Measure"
        icon={Ruler}
        items={uoms}
        form={uomForm}
        editId={editUomId}
        onSave={onUomSave}
        onEdit={onUomEdit}
        onDelete={(u) => { setDeleteUomTarget(u); setIsUomDeleteOpen(true) }}
        renderRow={(u) => (
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 shrink-0">
              {u.code}
            </span>
            <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{u.name}</span>
          </div>
        )}
        renderForm={(form) => (
          <div className="grid grid-cols-2 gap-3">
            <Input {...form.register('name')} label="Name" placeholder="e.g. Kilogram" required error={form.formState.errors.name?.message} />
            <Input {...form.register('code')} label="Code" placeholder="e.g. KG" required error={form.formState.errors.code?.message} />
          </div>
        )}
      />

      <Modal open={isUomDeleteOpen} onClose={() => setIsUomDeleteOpen(false)} title="Delete UOM" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Delete <strong className="text-surface-900 dark:text-surface-50">{deleteUomTarget?.name} ({deleteUomTarget?.code})</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setIsUomDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} onClick={confirmDeleteUOM}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PRICING CREATE / EDIT MODAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        open={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        title={editPricing ? 'Edit Pricing Record' : 'Add Pricing Version'}
        description="Set purchase, dealer, and selling prices with an effective date range."
        size="md"
      >
        <form onSubmit={pricingForm.handleSubmit(onPricingSubmit)} className="space-y-4" noValidate>
          <ErrorBanner msg={pricingError} />

          {/* Product selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Product <span className="text-danger-500">*</span>
            </label>
            <select
              {...pricingForm.register('product_id')}
              disabled={!!editPricing}
              className={cn(
                `input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`,
                editPricing && 'opacity-60 cursor-not-allowed',
                pricingForm.formState.errors.product_id && 'border-danger-500 focus:ring-danger-500'
              )}
            >
              <option value="">— Select Product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            {pricingForm.formState.errors.product_id && <p className="text-xs text-danger-600">{pricingForm.formState.errors.product_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input {...pricingForm.register('purchase_price')} label="Purchase Price (₹)" type="number" step="0.01" required error={pricingForm.formState.errors.purchase_price?.message} />
            <Input {...pricingForm.register('dealer_landing_price')} label="Dealer Landing (₹)" type="number" step="0.01" error={pricingForm.formState.errors.dealer_landing_price?.message} />
            <Input {...pricingForm.register('selling_price')} label="Selling Price (₹)" type="number" step="0.01" required error={pricingForm.formState.errors.selling_price?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input {...pricingForm.register('effective_from')} label="Effective From" type="date" required icon={Calendar} error={pricingForm.formState.errors.effective_from?.message} />
            <Input {...pricingForm.register('effective_to')} label="Effective To (leave blank = current)" type="date" icon={Calendar} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Notes</label>
            <textarea {...pricingForm.register('notes')} rows={2} placeholder="Reason for price change..." className="input-base py-2 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsPricingOpen(false)} disabled={pricingForm.formState.isSubmitting}>Cancel</Button>
            <Button type="submit" loading={pricingForm.formState.isSubmitting}>{editPricing ? 'Save Changes' : 'Create Pricing'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Pricing Delete Confirm ─────────────────────────────────────── */}
      <Modal open={isPricingDelete} onClose={() => setIsPricingDelete(false)} title="Delete Pricing Record" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Delete pricing record for <strong className="text-surface-900 dark:text-surface-50">{activePricing?.product?.name}</strong> (effective {activePricing?.effective_from})?
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setIsPricingDelete(false)} disabled={deletingPricing}>Cancel</Button>
            <Button variant="danger" loading={deletingPricing} onClick={confirmDeletePricing} icon={Trash2}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk CSV Import Modal ────────────────────────────────────────── */}
      <Modal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk Import Price Lists & Stock"
        description="Upload a CSV spreadsheet to update purchase prices, selling prices, and stock quantities in bulk."
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 text-xs">
            {/* Stock Mode Selection */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Stock Update Mode</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setImportStockMode('absolute')}
                  className={cn(
                    "py-1.5 rounded-lg border text-[10px] font-medium transition-all text-center",
                    importStockMode === 'absolute'
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300"
                      : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                  )}
                >
                  Set Absolute
                </button>
                <button
                  type="button"
                  onClick={() => setImportStockMode('relative')}
                  className={cn(
                    "py-1.5 rounded-lg border text-[10px] font-medium transition-all text-center",
                    importStockMode === 'relative'
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300"
                      : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                  )}
                >
                  Add Relative
                </button>
              </div>
            </div>

            {/* Price Effective From Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Price Effective From</label>
              <input
                type="date"
                value={importEffectiveFrom}
                onChange={e => setImportEffectiveFrom(e.target.value)}
                className="input-base py-1 px-2.5 text-xs text-surface-800 dark:text-surface-100"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Import Notes / Reason</label>
              <input
                type="text"
                placeholder="Reason..."
                value={importNotes}
                onChange={e => setImportNotes(e.target.value)}
                className="input-base py-1 px-2.5 text-xs text-surface-800 dark:text-surface-100"
              />
            </div>
          </div>

          {parsedImportData.length === 0 ? (
            <div
              {...getImportRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px]",
                isImportDragActive
                  ? "border-primary-500 bg-primary-50/20 dark:bg-primary-950/10"
                  : "border-surface-200 dark:border-surface-800 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-surface-50/50 dark:hover:bg-surface-800/10"
              )}
            >
              <input {...getImportInputProps()} />
              <FileUp className="h-10 w-10 text-surface-400 mb-3 animate-bounce" />
              <h3 className="text-sm font-bold text-surface-800 dark:text-surface-100">
                {isImportDragActive ? 'Drop your CSV file here' : 'Drag & drop price list / stock CSV'}
              </h3>
              <p className="text-xs text-surface-500 mt-1">
                or click to browse your local files (only .csv files supported)
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); downloadImportTemplate(); }}
                className="text-xs text-primary-600 hover:text-primary-700 underline mt-4 inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Download CSV Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-surface-50 dark:bg-surface-800 p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-xs">
                <div>
                  <span className="font-semibold text-surface-900 dark:text-surface-50">File: </span>
                  <span className="font-mono text-primary-600 dark:text-primary-400">{importFileName}</span>
                  <div className="flex gap-3 text-[10px] text-surface-500 mt-0.5">
                    <span>Total Rows: <strong>{importSummary.total}</strong></span>
                    <span className="text-success-600">Valid: <strong>{importSummary.valid}</strong></span>
                    {importSummary.invalid > 0 && <span className="text-danger-600">Errors: <strong>{importSummary.invalid}</strong></span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setParsedImportData([]); setImportFileName(''); }}
                  className="text-xs text-danger-600 hover:text-danger-700 hover:underline flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Clear File
                </button>
              </div>

              {importSummary.invalid > 0 && (
                <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-100 dark:border-danger-900/50 rounded-lg text-[11px] text-danger-700 dark:text-danger-400 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Warning:</strong> {importSummary.invalid} invalid rows will be skipped during import. Please check matching details.
                  </div>
                </div>
              )}

              <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-surface-900 z-10">
                      <th className="px-4 py-2">SKU / Match</th>
                      <th className="px-4 py-2">Pricing</th>
                      <th className="px-4 py-2">Stock ({importStockMode === 'absolute' ? 'Abs' : 'Rel'})</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                    {validatedImportItems.map(item => {
                      const hasPurchase = item.purchase_price !== '';
                      const hasSelling = item.selling_price !== '';
                      const hasQty = item.quantity !== '';
                      const qtyNum = parseFloat(item.quantity) || 0;

                      return (
                        <tr key={item.id} className={cn("hover:bg-surface-50/50 dark:hover:bg-surface-800/20", !item.isValid && "bg-danger-50/5 dark:bg-danger-950/5")}>
                          <td className="px-4 py-2">
                            <span className="font-mono font-medium block text-surface-900 dark:text-surface-50">{item.sku || 'N/A'}</span>
                            {item.dbProduct && <span className="text-[10px] text-surface-400">{item.dbProduct.name}</span>}
                          </td>
                          <td className="px-4 py-2">
                            {item.dbProduct ? (
                              <div className="space-y-0.5">
                                {hasPurchase && (
                                  <div>
                                    <span className="text-surface-400">Buy: </span>
                                    <span>{fmt(item.dbProduct.purchase_price)}</span>
                                    <ChevronRight className="h-2.5 w-2.5 inline mx-1 text-surface-400" />
                                    <span className="font-semibold text-success-600">{fmt(item.purchase_price)}</span>
                                  </div>
                                )}
                                {hasSelling && (
                                  <div>
                                    <span className="text-surface-400">Sell: </span>
                                    <span>{fmt(item.dbProduct.selling_price)}</span>
                                    <ChevronRight className="h-2.5 w-2.5 inline mx-1 text-surface-400" />
                                    <span className="font-semibold text-success-600">{fmt(item.selling_price)}</span>
                                  </div>
                                )}
                                {!hasPurchase && !hasSelling && <span className="text-surface-400 italic">No price change</span>}
                              </div>
                            ) : (
                              <span className="text-surface-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {item.dbProduct ? (
                              hasQty ? (
                                <div className="flex items-center gap-1">
                                  <span>{fmtQty(item.dbProduct.available)}</span>
                                  <ChevronRight className="h-2.5 w-2.5 text-surface-400" />
                                  <span className="font-semibold text-primary-600 dark:text-primary-400">
                                    {importStockMode === 'absolute' 
                                      ? fmtQty(qtyNum)
                                      : fmtQty(parseFloat(item.dbProduct.available) + qtyNum)
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span className="text-surface-400 italic">No stock change</span>
                              )
                            ) : (
                              <span className="text-surface-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {item.isValid ? (
                              <Badge variant="success" size="sm">Ready</Badge>
                            ) : (
                              <div className="space-y-0.5">
                                {item.errors.map((err, i) => (
                                  <div key={i} className="text-danger-600 dark:text-danger-400 flex items-center gap-1 text-[9px]">
                                    <AlertCircle className="h-2.5 w-2.5 shrink-0" /> {err}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsImportOpen(false)} disabled={importing}>Cancel</Button>
            <Button
              type="button"
              loading={importing}
              onClick={handleImportSubmit}
              disabled={importSummary.valid === 0}
            >
              Confirm Import ({importSummary.valid} items)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
