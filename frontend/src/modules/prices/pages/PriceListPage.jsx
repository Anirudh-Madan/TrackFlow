import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { matchHeaders, applyMapping, buildRowsFromSheet } from '../../../utils/headerMatcher'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
} from '../../../api/endpoints/products.api'
import { getVendors } from '../../../api/endpoints/parties.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import {
  Plus,
  Search,
  Package,
  Tag,
  TrendingUp,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Truck,
  Percent,
  FileSpreadsheet,
  FileUp,
  CheckCircle2,
  ChevronRight,
  Info,
  ChevronDown,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'
import TablePagination from '../../../components/data/TablePagination'

// ─── Price Record Schema ──────────────────────────────────────────────────────
const priceRecordSchema = z.object({
  name: z.string().optional().or(z.literal('')),
  sku: z.string().min(1, 'Part Number is required').max(50),
  purchase_price: z.coerce.number().min(0, 'DN must be ≥ 0').optional().or(z.literal('')),
  dealer_landing_price: z.coerce.number().min(0, 'DL must be ≥ 0').optional().or(z.literal('')),
  selling_price: z.coerce.number().min(0, 'Selling Price must be ≥ 0').optional().or(z.literal('')),
  gst_rate: z.coerce.number().min(0, 'GST % must be ≥ 0').max(100, 'GST cannot exceed 100%').optional().or(z.literal('')).default(18.00),
  planner: z.string().optional().or(z.literal('')),
  supplier: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
})

// ─── Currency & Qty Formatters ────────────────────────────────────────────────────────
const fmt = (v) => v != null && v !== '' ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
const fmtQty = (v) => v != null ? parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'

// ─── Delimiter-Detecting BOM-Stripping CSV Parser ─────────────────────────────
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/)
  if (lines.length === 0) return []

  const firstLine = lines[0]
  let delimiter = ','
  const commaCount = (firstLine.match(/,/g) || []).length
  const semiCount = (firstLine.match(/;/g) || []).length
  const tabCount = (firstLine.match(/\t/g) || []).length

  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';'
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t'

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''))
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    let cells = []
    let inQuotes = false
    let currentCell = ''

    for (let c = 0; c < line.length; c++) {
      const char = line[c]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        cells.push(currentCell.trim().replace(/^"|"$/g, ''))
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    cells.push(currentCell.trim().replace(/^"|"$/g, ''))

    if (cells.length > 0 && cells.some(c => c !== '')) {
      const obj = {}
      headers.forEach((h, index) => {
        obj[h] = cells[index] !== undefined ? cells[index] : ''
      })
      result.push(obj)
    }
  }
  return result
}

// ─── [FIX] Cross-Sheet Description Lookup ─────────────────────────────────────
// Root cause of the "Description not parsing for Cummins" bug:
// Cummins workbooks split data across multiple sheets — e.g.
//   "On Highway Pricelist"  → Part Number, DN/DL/GST/HSN prices  (NO Description column)
//   "Summary"               → Part Number, Description, New/Old CASL & MRP prices
//   "V.BELT Ref."           → Part Number, Description, Market ref.
// The importer picks the pricing sheet correctly (it matches "price" in the name),
// but Description simply does not exist on that sheet — it lives on a different
// tab, keyed by the same Part Number. headerMatcher.js can never find it because
// it only ever sees headers from the single sheet it was handed.
//
// This helper scans every *other* sheet in the same workbook, finds any sheet
// where Part Number + Description both map via matchHeaders, and builds a
// SKU → Description lookup. Sheets with "summary" in the name are checked
// first since that's typically the canonical full-catalog description index;
// other sheets (e.g. category-specific reference sheets) are checked after,
// filling in any SKUs the summary sheet didn't cover.
const normSkuKey = (s) => {
  if (s === null || s === undefined) return ''
  let str = String(s).trim().toUpperCase()
  str = str.replace(/\.0+$/, '')
  str = str.replace(/\s+/g, '')
  return str
}

const buildCrossSheetDescriptionLookup = (workbook, primarySheetName) => {
  const lookup = {}
  let sourceSheetName = null

  const otherSheets = workbook.SheetNames.filter(s => s !== primarySheetName)
  const prioritizedSheets = [
    ...otherSheets.filter(s => s.toLowerCase().includes('summary')),
    ...otherSheets.filter(s => !s.toLowerCase().includes('summary')),
  ]

  for (const sName of prioritizedSheets) {
    try {
      const ws = workbook.Sheets[sName]
      if (!ws) continue

      const arrayRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const { rows } = buildRowsFromSheet(arrayRows)
      if (!rows.length) continue

      const headers = Object.keys(rows[0] || {})
      const { fieldMap } = matchHeaders(headers, sName)

      let skuHeader = fieldMap.sku
      let nameHeader = fieldMap.name

      if (!skuHeader) {
        skuHeader = headers.find(h => {
          const n = normalizeKey(h)
          return n.includes('part') || n.includes('sku') || n.includes('code') || n.includes('number') || n.includes('item')
        })
      }

      if (!nameHeader) {
        nameHeader = headers.find(h => {
          const n = normalizeKey(h)
          return n.includes('desc') || n.includes('name') || n.includes('detail') || n.includes('particular')
        })
      }

      if (!nameHeader && headers[1]) {
        const firstVal = rows.find(r => r[headers[1]] && String(r[headers[1]]).trim() !== '')?.[headers[1]]
        if (firstVal && isNaN(Number(String(firstVal).replace(/,/g, '').trim()))) {
          nameHeader = headers[1]
        }
      }

      if (!skuHeader || !nameHeader) continue

      let addedFromThisSheet = 0
      rows.forEach(r => {
        const rawSku = r[skuHeader]
        const skuKey = normSkuKey(rawSku)
        const nameVal = String(r[nameHeader] || '').trim()

        if (skuKey && nameVal && nameVal !== rawSku && !lookup[skuKey]) {
          lookup[skuKey] = nameVal
          addedFromThisSheet++
        }
      })

      if (addedFromThisSheet > 0 && !sourceSheetName) {
        sourceSheetName = sName
      }

      console.log(`[Import – Prices] Cross-sheet scan "${sName}": ${addedFromThisSheet} description(s) indexed`)
    } catch (err) {
      console.warn(`[Import – Prices] Could not scan sheet "${sName}" for descriptions:`, err)
    }
  }

  return { lookup, sourceSheetName }
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {msg}
    </div>
  )
}

export default function PriceListPage() {
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, supplierFilter])

  // Modals
  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [isRecordDelete, setIsRecordDelete] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [activeRecord, setActiveRecord] = useState(null)
  const [recordError, setRecordError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Excel / CSV Importer states
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedImportSupplier, setSelectedImportSupplier] = useState('')
  const [importing, setImporting] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [parsedImportData, setParsedImportData] = useState([])
  const [importNotes, setImportNotes] = useState('')
  const [importEffectiveFrom, setImportEffectiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [importStockMode, setImportStockMode] = useState('relative')
  const [importPriceMode, setImportPriceMode] = useState('merge') // 'merge' | 'overwrite'
  const [unmatchedHeaders, setUnmatchedHeaders] = useState([])  // columns the file had that we couldn't map
  const [matchedFields, setMatchedFields] = useState({})    // successfully mapped fields for display
  const [descriptionSourceSheet, setDescriptionSourceSheet] = useState(null) // [FIX] which sheet descriptions were cross-referenced from, if any

  // Forms hook
  const recordForm = useForm({
    resolver: zodResolver(priceRecordSchema),
    defaultValues: {
      name: '',
      sku: '',
      purchase_price: 0,
      dealer_landing_price: '',
      gst_rate: 18.00,
      planner: '',
      supplier: '',
    },
  })

  // Fetch list
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pRes, vRes] = await Promise.all([getProducts(), getVendors()])
      if (pRes.success) {
        setProducts(pRes.data || [])
      } else {
        toast.error(pRes.error || 'Failed to fetch price list')
      }
      if (vRes.success) {
        setVendors(vRes.data || [])
      }
    } catch (err) {
      toast.error(err.message || 'Error loading price records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Memoized catalog helpers
  const productDict = useMemo(() => {
    const dict = {}
    products.forEach(p => {
      if (p.sku) dict[p.sku.toUpperCase()] = p
    })
    return dict
  }, [products])

  // Filtered pricing records
  const filteredRecords = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase()
      const matchSearch = !search ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.planner && p.planner.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q))

      const matchSupplier = !supplierFilter || p.supplier === supplierFilter
      return matchSearch && matchSupplier
    })
  }, [products, search, supplierFilter])

  // Handlers
  const openCreateRecord = () => {
    setEditRecord(null)
    setRecordError(null)
    recordForm.reset({
      name: '',
      sku: '',
      purchase_price: 0,
      dealer_landing_price: '',
      selling_price: '',
      gst_rate: 18.00,
      planner: '',
      supplier: '',
      location: '',
    })
    setIsRecordOpen(true)
  }

  const openEditRecord = (p) => {
    setEditRecord(p)
    setRecordError(null)
    recordForm.reset({
      name: p.name || '',
      sku: p.sku || '',
      purchase_price: p.purchase_price ? parseFloat(p.purchase_price) : 0,
      dealer_landing_price: p.dealer_landing_price ? parseFloat(p.dealer_landing_price) : '',
      selling_price: p.selling_price ? parseFloat(p.selling_price) : '',
      gst_rate: p.gst_rate != null ? parseFloat(p.gst_rate) : 18.00,
      planner: p.planner || '',
      supplier: p.supplier || '',
      location: p.location || '',
    })
    setIsRecordOpen(true)
  }

  const onRecordSubmit = async (data) => {
    setRecordError(null)
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        name: data.name?.trim() || null,
        purchase_price: data.purchase_price !== '' && data.purchase_price != null ? parseFloat(data.purchase_price) : null,
        dealer_landing_price: data.dealer_landing_price !== '' && data.dealer_landing_price != null ? parseFloat(data.dealer_landing_price) : null,
        selling_price: data.selling_price !== '' && data.selling_price != null ? parseFloat(data.selling_price) : null,
        gst_rate: data.gst_rate !== '' && data.gst_rate != null ? parseFloat(data.gst_rate) : 18.00,
        planner: data.planner?.trim() || null,
        supplier: data.supplier?.trim() || null,
        location: data.location?.trim() || null,
      }

      const res = editRecord
        ? await updateProduct(editRecord.id, payload)
        : await createProduct(payload)

      if (res.success) {
        toast.success(`Price record ${editRecord ? 'updated' : 'created'} successfully!`)
        setIsRecordOpen(false)
        fetchAll()
      } else {
        setRecordError(res.error || 'Operation failed')
      }
    } catch (err) {
      setRecordError(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteRecord = async () => {
    if (!activeRecord) return
    setDeleting(true)
    try {
      const res = await deleteProduct(activeRecord.id)
      if (res.success) {
        toast.success('Price record deleted successfully')
        setIsRecordDelete(false)
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

  // ─── Sheet Bulk Import Handler ───────────────────────────────────────────────
  const onImportDrop = (acceptedFiles) => {
    if (!selectedImportSupplier) {
      toast.error('Please select a supplier from the dropdown first. If the supplier is not listed, add them in the Vendors directory first.')
      return
    }

    const file = acceptedFiles[0]
    if (!file) return

    setImportFileName(file.name)
    setUnmatchedHeaders([])   // reset on each new file
    setMatchedFields({})      // reset matched fields display
    setDescriptionSourceSheet(null) // [FIX] reset cross-sheet description note on each new file
    const fileExtension = file.name.split('.').pop().toLowerCase()
    const isExcel = fileExtension === 'xlsx' || fileExtension === 'xls'

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let rawRows = []
        let workbook = null
        let targetSheetName = null

        const data = new Uint8Array(e.target.result)
        workbook = XLSX.read(data, { type: 'array' })
        targetSheetName = workbook.SheetNames[0]
        for (const sName of workbook.SheetNames) {
          const normSName = sName.toLowerCase()
          if (normSName.includes('price') || normSName.includes('part') || normSName.includes('catalog') || normSName.includes('data') || normSName.includes('master') || normSName.includes('item')) {
            targetSheetName = sName
            break
          }
        }
        console.log(`[Import – Prices] Sheets/Tabs found: ${workbook.SheetNames.join(', ')} — using "${targetSheetName}"`)
        const worksheet = workbook.Sheets[targetSheetName]
        const allArrayRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        const { rows, headerRowIndex } = buildRowsFromSheet(allArrayRows)
        console.log(`[Import – Prices] Header row detected at row ${headerRowIndex + 1}`)
        rawRows = rows

        const rawHeaders = Object.keys(rawRows[0] || {})
        const supplierName = selectedImportSupplier
        const { fieldMap, unmatchedHeaders: unmatched, matchLog } = matchHeaders(rawHeaders, supplierName)

        console.group('[Import – Prices] Header matching result')
        console.log('File            :', file.name)
        console.log('Supplier        :', supplierName)
        console.log('Raw headers     :', matchLog.received)
        console.log('Matched fields  :', JSON.stringify(matchLog.matched, null, 2))
        console.log('Unmatched headers:', JSON.stringify(matchLog.unmatched, null, 2))
        if (matchLog.collisions?.length) {
          console.log('Field collisions:', JSON.stringify(matchLog.collisions, null, 2))
        }
        console.groupEnd()

        const cleanNumStr = val => {
          if (val === undefined || val === null || val === '') return ''
          return String(val).replace(/,/g, '').trim()
        }

        const mappedRows = applyMapping(rawRows, fieldMap)
        let normalizedRows = mappedRows
          .map(r => ({
            sku: r.sku || '',
            name: r.name || '',
            planner: r.planner || '',
            location: r.location || '',
            purchase_price: cleanNumStr(r.purchase_price),
            dealer_landing_price: cleanNumStr(r.dealer_landing_price),
            selling_price: cleanNumStr(r.selling_price),
            quantity: cleanNumStr(r.quantity),
            gst_rate: r.gst_rate !== '' && r.gst_rate !== undefined && r.gst_rate !== null ? cleanNumStr(r.gst_rate) : '18.00',
            supplier: selectedImportSupplier,
          }))

        // [FIX] Cross-sheet Description backfill.
        // If the pricing sheet has no Description column at all (fieldMap.name is
        // undefined), scan the workbook's other sheets for one that has BOTH
        // Part Number and Description mapped, build a SKU → Description lookup,
        // and fill it in here rather than leaving every row's `name` blank.
        let crossSheetDescCount = 0
        let descSourceSheet = null

        if (isExcel && workbook && !fieldMap.name) {
          const { lookup, sourceSheetName } = buildCrossSheetDescriptionLookup(workbook, targetSheetName)
          if (Object.keys(lookup).length > 0) {
            descSourceSheet = sourceSheetName
            normalizedRows = normalizedRows.map(r => {
              if (!r.name && r.sku) {
                const skuKey = normSkuKey(r.sku)
                const match = lookup[skuKey]
                if (match) {
                  crossSheetDescCount++
                  return { ...r, name: match }
                }
              }
              return r
            })
          }
        }

        if (crossSheetDescCount > 0) {
          console.log(`[Import – Prices] Backfilled ${crossSheetDescCount} description(s) from sheet "${descSourceSheet}"`)
          setDescriptionSourceSheet(descSourceSheet)
        }

        // Build the fields shown in the "Successfully mapped" banner. If Description
        // wasn't a real column on this sheet but we recovered it from another sheet,
        // reflect that here instead of showing the "Description not present" warning.
        const displayFieldMap = { ...fieldMap }
        if (crossSheetDescCount > 0 && !displayFieldMap.name) {
          displayFieldMap.name = `Description (cross-referenced from "${descSourceSheet}" sheet)`
        }
        setMatchedFields(displayFieldMap)

        normalizedRows = normalizedRows.filter(r => {
          const hasVal = r.sku || r.purchase_price || r.dealer_landing_price || r.selling_price || r.quantity || r.planner || r.location
          if (!hasVal) return false
          // Filter out sub-header banner rows (e.g. "MS-04", "MS-100") that have no description, price, or stock
          const pVal = parseFloat(r.purchase_price || 0)
          const dlVal = parseFloat(r.dealer_landing_price || 0)
          const sVal = parseFloat(r.selling_price || 0)
          const qVal = parseFloat(r.quantity || 0)
          if (!r.name && pVal === 0 && dlVal === 0 && sVal === 0 && qVal === 0 && r.sku && r.sku.length < 10 && !/\d/.test(r.sku)) {
            return false
          }
          return true
        })

        setUnmatchedHeaders(unmatched)
        setParsedImportData(normalizedRows)

        if (normalizedRows.length === 0 && rawRows.length > 0) {
          console.error('[Import – Prices] FAILED: no rows matched after header mapping', {
            file: file.name,
            supplier: supplierName,
            rawHeaders: matchLog.received,
            fieldMap,
          })
          toast.error(
            `No valid data rows found. We need at least: Part Number or SKU. Check browser console for details.`,
            { duration: 6000 }
          )
        } else if (unmatched.length > 0) {
          toast.success(
            `Parsed ${normalizedRows.length} rows for ${supplierName}. ${unmatched.length} column(s) not recognised — see console for details.`
          )
        } else {
          toast.success(`Successfully parsed ${normalizedRows.length} rows for ${supplierName}.`)
        }
      } catch (err) {
        console.error('[Import – Prices] Parse error:', err)
        toast.error('Failed to parse file. Ensure it is a valid CSV or Excel format.')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const { getRootProps: getImportRootProps, getInputProps: getImportInputProps, isDragActive: isImportDragActive } = useDropzone({
    onDrop: onImportDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
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
      }

      const isNewProduct = !dbProduct

      const hasPurchase = item.purchase_price !== '' && item.purchase_price !== null
      const hasDealer = item.dealer_landing_price !== '' && item.dealer_landing_price !== null
      const hasSelling = item.selling_price !== '' && item.selling_price !== null
      const hasQty = item.quantity !== '' && item.quantity !== null

      if (hasPurchase && isNaN(parseFloat(item.purchase_price))) {
        errors.push('DN Price must be a number')
      }
      if (hasSelling && isNaN(parseFloat(item.selling_price))) {
        errors.push('Selling Price must be a number')
      }
      if (hasDealer && isNaN(parseFloat(item.dealer_landing_price))) {
        errors.push('DL Price must be a number')
      }
      if (item.gst_rate !== '' && item.gst_rate !== null && isNaN(parseFloat(item.gst_rate))) {
        errors.push('GST Rate must be a number')
      }
      if (hasQty && isNaN(parseFloat(item.quantity))) {
        errors.push('Stock Quantity must be a number')
      }

      if (!hasPurchase && !hasSelling && !hasDealer && !hasQty && item.gst_rate === '' && !isNewProduct) {
        errors.push('No prices, GST %, or stock levels specified for update')
      }

      const importName = item.name?.trim() || dbProduct?.name || ''
      const hasFileDescription = !!item.name?.trim()
      const importPlanner = item.planner?.trim() || dbProduct?.planner || ''

      return {
        id: index,
        sku: item.sku,
        name: importName,
        hasFileDescription,
        planner: importPlanner,
        location: item.location,
        supplier: item.supplier,
        purchase_price: item.purchase_price,
        dealer_landing_price: item.dealer_landing_price,
        selling_price: item.selling_price,
        quantity: item.quantity,
        gst_rate: item.gst_rate,
        dbProduct,
        isNewProduct,
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
    const csvContent = "data:text/csv;charset=utf-8,Part Number,Description,Planner,DN Price,GST %,DL Price\nSKU001,Copper Wire,John Doe,150.00,18.00,165.00\nSKU002,Fiber Optic,Jane Smith,300.00,18.00,320.00";
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "price_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Auto-create vendor if the typed supplier name is new
  const ensureVendorExists = async (supplierName) => {
    if (!supplierName?.trim()) return
    const exists = vendors.some(
      v => v.company_name.toLowerCase() === supplierName.trim().toLowerCase()
    )
    if (exists) return
    // Skip known static options
    const statics = ['cummins', 'meritor', 'other']
    if (statics.includes(supplierName.trim().toLowerCase())) return

    try {
      setCreatingSupplier(true)
      const res = await createVendor({ company_name: supplierName.trim() })
      if (res.success) {
        toast.success(`New vendor "${supplierName.trim()}" added to the Vendors directory. You can edit the details at /admin/parties.`, { duration: 5000 })
        // Refresh vendors list
        getVendors().then(r => { if (r.success) setVendors(r.data || []) })
      }
    } catch {
      // Silent — vendor creation is best-effort
    } finally {
      setCreatingSupplier(false)
    }
  }

  const handleImportSubmit = async () => {
    const validPayloadItems = validatedImportItems
      .filter(item => item.isValid)
      .map(item => ({
        sku: item.sku,
        name: item.name,
        planner: item.planner || undefined,
        location: item.location || undefined,
        supplier: item.supplier || undefined,
        purchase_price: item.purchase_price !== '' ? parseFloat(item.purchase_price) : undefined,
        dealer_landing_price: item.dealer_landing_price !== '' ? parseFloat(item.dealer_landing_price) : undefined,
        selling_price: item.selling_price !== '' ? parseFloat(item.selling_price) : undefined,
        quantity: item.quantity !== '' ? parseFloat(item.quantity) : undefined,
        gst_rate: item.gst_rate !== '' ? parseFloat(item.gst_rate) : undefined
      }))

    if (validPayloadItems.length === 0) {
      toast.error('No valid items to import.')
      return
    }

    setImporting(true)
    try {
      const BATCH_SIZE = 200
      let totalImported = 0

      for (let i = 0; i < validPayloadItems.length; i += BATCH_SIZE) {
        const batch = validPayloadItems.slice(i, i + BATCH_SIZE)
        const res = await bulkImportProducts({
          items: batch,
          stock_mode: importStockMode,
          price_mode: importPriceMode,
          target_supplier: selectedImportSupplier,
          effective_from: importEffectiveFrom,
          notes: importNotes
        })

        if (!res.success) {
          throw new Error(res.error || `Failed on batch starting at row ${i + 1}`)
        }
        totalImported += batch.length
      }

      toast.success(
        importPriceMode === 'overwrite'
          ? `Successfully overwritten price list for ${selectedImportSupplier} (${totalImported} records)!`
          : `Successfully imported/merged ${totalImported} records for ${selectedImportSupplier}!`
      )
      setParsedImportData([])
      setImportFileName('')
      setImportNotes('')
      setIsImportOpen(false)
      fetchAll()
    } catch (err) {
      toast.error(err.message || 'Error occurred during import')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary-500" />
            Price List Catalog
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Browse and manage product pricing metrics including DN, DL, and GST configurations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button icon={FileSpreadsheet} variant="secondary" size="md" onClick={() => setIsImportOpen(true)} className="w-full sm:w-auto">
            Import Excel/CSV
          </Button>
          <Button icon={Plus} size="md" onClick={openCreateRecord} className="w-full sm:w-auto">
            Add Price Record
          </Button>
        </div>
      </div>

      {/* Filters card */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by part number, desc, planner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 py-1.5"
            />
          </div>

          <div className="relative w-full sm:w-56">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className={`input-base pl-9 py-1.5 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
            >
              <option value="">All Suppliers / Sources</option>
              {vendors.map(v => (
                <option key={v.id} value={v.company_name}>{v.company_name}</option>
              ))}
            </select>
          </div>

          {(search || supplierFilter) && (
            <button
              onClick={() => { setSearch(''); setSupplierFilter(''); }}
              className="flex items-center gap-1 text-xs text-surface-500 hover:text-danger-600 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}

          <div className="text-xs text-surface-500 font-medium ml-auto shrink-0">
            {filteredRecords.length} of {products.length} records
          </div>
        </div>

        {/* Pricing Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No records found</h3>
              <p className="text-xs text-surface-500 mt-1">Try adjusting your filter or search terms.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Part Number</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Planner</th>
                  <th className="px-5 py-3.5">DN (₹)</th>
                  <th className="px-5 py-3.5">GST %</th>
                  <th className="px-5 py-3.5">DL (₹)</th>
                  <th className="px-5 py-3.5">Sell Price (₹)</th>
                  <th className="px-5 py-3.5">Stock Qty</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                {filteredRecords.slice((page - 1) * 50, page * 50).map(p => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-5 py-4 font-mono text-xs font-medium text-surface-600 dark:text-surface-400">
                      {p.sku}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-surface-900 dark:text-surface-50">{p.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                        {p.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-surface-700 dark:text-surface-300">
                      {p.planner || '—'}
                    </td>
                    <td className="px-5 py-4 font-semibold text-surface-900 dark:text-surface-50">
                      {fmt(p.purchase_price)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100/50">
                        <Percent className="h-3 w-3" />
                        {p.gst_rate != null ? parseFloat(p.gst_rate) : '18'}%
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-primary-600 dark:text-primary-400">
                      {fmt(p.dealer_landing_price)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-success-600 dark:text-success-400">
                      {fmt(p.selling_price)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-medium text-surface-800 dark:text-surface-200">
                      {fmtQty(p.available != null ? p.available : (p.on_hand != null ? p.on_hand : 0))}
                    </td>
                    <td className="px-5 py-4">
                      {p.supplier ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50">
                          {p.supplier}
                        </span>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRecord(p)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Edit price record"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setActiveRecord(p); setIsRecordDelete(true) }}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                          title="Delete price record"
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
          totalItems={filteredRecords.length}
          pageSize={50}
          onPageChange={setPage}
        />
      </div>

      {/* ── Add/Edit Record Modal ─────────────────────────────────────── */}
      <Modal
        open={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title={editRecord ? `Edit: ${editRecord.sku}` : 'Add Price Record'}
        description="Configure pricing structure and attributes for parts catalog."
        size="md"
      >
        <form onSubmit={recordForm.handleSubmit(onRecordSubmit)} className="space-y-4" noValidate>
          <ErrorBanner msg={recordError} />

          <div className="grid grid-cols-1 gap-4">
            <Input
              {...recordForm.register('sku')}
              label="Part Number / SKU"
              placeholder="e.g. PART-55442"
              required
              disabled={!!editRecord}
              error={recordForm.formState.errors.sku?.message}
            />

            <Input
              {...recordForm.register('name')}
              label="Description"
              placeholder="e.g. Fuel Filter"
              required
              error={recordForm.formState.errors.name?.message}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              {...recordForm.register('planner')}
              label="Planner"
              placeholder="e.g. John Doe"
              error={recordForm.formState.errors.planner?.message}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Source (Supplier)</label>
              <select
                {...recordForm.register('supplier')}
                className={`input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
              >
                <option value="">— Select Supplier —</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.company_name}>{v.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              {...recordForm.register('purchase_price')}
              label="DN Price (₹)"
              type="number"
              step="0.01"
              required
              error={recordForm.formState.errors.purchase_price?.message}
            />

            <Input
              {...recordForm.register('dealer_landing_price')}
              label="DL Price (₹)"
              type="number"
              step="0.01"
              error={recordForm.formState.errors.dealer_landing_price?.message}
            />

            <Input
              {...recordForm.register('selling_price')}
              label="Sell Price (₹)"
              type="number"
              step="0.01"
              error={recordForm.formState.errors.selling_price?.message}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              {...recordForm.register('gst_rate')}
              label="GST %"
              type="number"
              step="0.01"
              required
              error={recordForm.formState.errors.gst_rate?.message}
            />

            <Input
              {...recordForm.register('location')}
              label="Location / Rack"
              placeholder="e.g. A-12-3"
              error={recordForm.formState.errors.location?.message}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRecordOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editRecord ? 'Save Price' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Record Delete Confirm ─────────────────────────────────────── */}
      <Modal
        open={isRecordDelete}
        onClose={() => setIsRecordDelete(false)}
        title="Confirm Deletion"
        severity="danger"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-500">
            Are you sure you want to delete the price record for{' '}
            <strong className="text-surface-900 dark:text-surface-50">{activeRecord?.sku}</strong>? This action cannot
            be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRecordDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleting}
              onClick={confirmDeleteRecord}
            >
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Excel/CSV Import Modal ─────────────────────────────────────── */}
      <Modal
        open={isImportOpen}
        onClose={() => {
          setIsImportOpen(false)
          setParsedImportData([])
          setImportFileName('')
          setMatchedFields({})
          setUnmatchedHeaders([])
          setDescriptionSourceSheet(null)
        }}
        title="Import Price Records"
        description="Upload an Excel (.xlsx, .xls) or CSV file containing part net prices and tax mappings."
        size="lg"
      >
        <div className="space-y-5">
          {/* Supplier / Vendor Selection (Strict Dropdown) */}
          <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800/50 bg-primary-50/40 dark:bg-primary-900/10 space-y-2">
            <label className="text-xs font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              Select Supplier / Vendor for this Price List <span className="text-danger-500">*</span>
            </label>

            <select
              value={selectedImportSupplier}
              onChange={e => setSelectedImportSupplier(e.target.value)}
              className="input-base bg-white dark:bg-surface-900"
            >
              <option value="">— Select Supplier / Vendor (Required) —</option>
              {vendors.map(v => (
                <option key={v.id} value={v.company_name}>{v.company_name}</option>
              ))}
            </select>

            {vendors.length === 0 ? (
              <p className="text-xs text-danger-600 font-medium mt-1">
                No vendors found in system. Please add vendors in the Vendors Directory (Parties page) before uploading price lists.
              </p>
            ) : (
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Choosing a supplier tags all imported price records under this vendor. If the supplier is not listed, add them in the Vendors directory first.
              </p>
            )}
          </div>

          {/* Dropzone */}
          <div
            {...getImportRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-surface-50/50 dark:bg-surface-950/20",
              !selectedImportSupplier
                ? "border-surface-200 dark:border-surface-800 opacity-60 cursor-not-allowed"
                : "border-surface-300 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-400",
              isImportDragActive && "border-primary-500 bg-primary-50/10"
            )}
          >
            <input {...getImportInputProps()} disabled={!selectedImportSupplier} />
            <FileSpreadsheet className="mx-auto h-10 w-10 text-surface-400 dark:text-surface-600 mb-3" />
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              {!selectedImportSupplier ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Please select a supplier from the dropdown above before uploading.
                </span>
              ) : importFileName ? (
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{importFileName}</span>
              ) : (
                'Drag & drop your Excel or CSV file here, or click to browse'
              )}
            </p>
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
              Supports .xlsx, .xls, .csv templates containing Part Number, Description, DN, GST %, DL
            </p>
          </div>

          {/* Import Controls */}
          {parsedImportData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/20">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-surface-700 dark:text-surface-300">Price List Action</label>
                <select
                  value={importPriceMode}
                  onChange={e => setImportPriceMode(e.target.value)}
                  className="input-base text-xs font-medium"
                >
                  <option value="merge">➕ Add / Merge (Update prices, keep rest)</option>
                  <option value="overwrite">🔄 Overwrite (Replace supplier's price list)</option>
                </select>
              </div>

              <Input
                label="Effective From Date"
                type="date"
                value={importEffectiveFrom}
                onChange={e => setImportEffectiveFrom(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Stock Import Mode</label>
                <select
                  value={importStockMode}
                  onChange={e => setImportStockMode(e.target.value)}
                  className="input-base text-xs"
                >
                  <option value="relative">Add to existing stock (Relative)</option>
                  <option value="absolute">Override current stock (Absolute)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-700 dark:text-surface-300">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Price list updates Q3"
                  value={importNotes}
                  onChange={e => setImportNotes(e.target.value)}
                  className="input-base py-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* Preview list */}
          {parsedImportData.length > 0 && (
            <div className="space-y-2">
              {/* Column Matching Summary */}
              {Object.keys(matchedFields).length > 0 && (
                <div className="p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/50 rounded-lg text-[11px] text-success-700 dark:text-success-300 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500 dark:text-success-400" />
                    <div>
                      <strong>Mapped {Object.keys(matchedFields).length} field(s):</strong>{' '}
                      <span className="font-mono">
                        {Object.entries(matchedFields).map(([field, header]) => `${header} → ${field}`).join(', ')}
                      </span>
                    </div>
                  </div>
                  {descriptionSourceSheet && (
                    /* [FIX] Explain the cross-sheet backfill instead of leaving it invisible */
                    <div className="text-[10px] text-primary-700 dark:text-primary-400 pl-6 font-medium">
                      ℹ️ This file's pricing sheet had no Description column — descriptions were cross-referenced
                      from the <strong>"{descriptionSourceSheet}"</strong> sheet in the same workbook by matching Part Number.
                    </div>
                  )}
                  {!matchedFields.name && !descriptionSourceSheet && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 pl-6 font-medium">
                      ⚠️ <strong>Note:</strong> This CSV file contains prices but no Description column. To auto-link descriptions, upload the original multi-tab <strong>.xlsx</strong> workbook directly, or import the Description catalog CSV first. Existing product descriptions in the database will be preserved.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-xs font-medium text-surface-500 px-1">
                <span>Data Preview</span>
                <span className="text-right">
                  Total: {importSummary.total} | Valid: <span className="text-success-600 font-semibold">{importSummary.valid}</span> | Invalid: <span className="text-danger-600 font-semibold">{importSummary.invalid}</span>
                </span>
              </div>

              {unmatchedHeaders.length > 0 && (
                <div className="p-3 bg-warning-50 dark:bg-yellow-900/20 border border-warning-200 dark:border-yellow-800/50 rounded-lg text-[11px] text-warning-700 dark:text-yellow-300 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-warning-500 dark:text-yellow-400" />
                  <div>
                    <strong>Unrecognised columns skipped ({unmatchedHeaders.length}):</strong>{' '}
                    <span className="font-mono">{unmatchedHeaders.join(', ')}</span>
                    <span className="block mt-0.5 text-warning-600 dark:text-yellow-400 opacity-80">
                      These columns had no matching internal field and were ignored. Add aliases to <code>headerMatcher.js</code> if they should be mapped.
                    </span>
                  </div>
                </div>
              )}

              <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-surface-900 z-10">
                      <th className="px-4 py-2">Part Number / Match</th>
                      <th className="px-4 py-2">Details (Planner/DN/GST/DL)</th>
                      <th className="px-4 py-2">Stock ({importStockMode === 'absolute' ? 'Abs' : 'Rel'})</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-surface-700 dark:text-surface-300">
                    {validatedImportItems.map(item => {
                      const hasQty = item.quantity !== '' && item.quantity !== null;
                      const qtyNum = parseFloat(item.quantity) || 0;

                      return (
                        <tr key={item.id} className={cn("hover:bg-surface-50/50 dark:hover:bg-surface-800/20", !item.isValid && "bg-danger-50/5 dark:bg-danger-950/5")}>
                          <td className="px-4 py-2">
                            <span className="font-mono font-bold block text-surface-900 dark:text-surface-50">{item.sku || 'N/A'}</span>
                            {item.name ? (
                              <span className="text-[11px] font-semibold text-primary-700 dark:text-primary-300 block truncate max-w-xs">{item.name}</span>
                            ) : (
                              <span className="text-[10px] italic text-amber-600 dark:text-amber-400 block font-normal">⚠️ Description not found in file</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="space-y-0.5">
                              {item.planner ? (
                                <div className="mb-0.5">
                                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    Planner: {item.planner}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-surface-400 text-[10px] italic">No Planner</span>
                              )}
                              {item.purchase_price && (
                                <div>
                                  <span className="text-surface-400">DN Price: </span>
                                  <span className="font-semibold text-surface-800 dark:text-surface-200">{fmt(item.purchase_price)}</span>
                                </div>
                              )}
                              {item.gst_rate && (
                                <div>
                                  <span className="text-surface-400">GST: </span>
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">{item.gst_rate}%</span>
                                </div>
                              )}
                              {item.dealer_landing_price && (
                                <div>
                                  <span className="text-surface-400">DL Price: </span>
                                  <span className="font-semibold text-success-600">{fmt(item.dealer_landing_price)}</span>
                                </div>
                              )}
                              {!item.planner && !item.purchase_price && !item.gst_rate && !item.dealer_landing_price && (
                                <span className="text-surface-400 italic">No details</span>
                              )}
                            </div>
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
                              hasQty ? (
                                <div>
                                  <span className="text-surface-400">Initial: </span>
                                  <span className="font-semibold text-primary-600 dark:text-primary-400">{fmtQty(qtyNum)}</span>
                                </div>
                              ) : (
                                <span className="text-surface-400 italic">No stock</span>
                              )
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {item.isValid ? (
                              item.isNewProduct ? (
                                <Badge variant="primary" size="sm">New Product</Badge>
                              ) : (
                                <Badge variant="success" size="sm">Ready</Badge>
                              )
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

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-surface-100 dark:border-surface-700">
            <button
              onClick={downloadImportTemplate}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold flex items-center gap-1"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Download import template
            </button>

            <div className="flex justify-end gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsImportOpen(false)
                  setParsedImportData([])
                  setImportFileName('')
                  setMatchedFields({})
                  setUnmatchedHeaders([])
                  setDescriptionSourceSheet(null)
                }}
                disabled={importing}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportSubmit}
                disabled={importSummary.valid === 0}
                loading={importing}
                className="w-full sm:w-auto font-medium"
              >
                Import {importSummary.valid} Records
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}