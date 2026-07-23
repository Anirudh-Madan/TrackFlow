// ─── headerMatcher.js ────────────────────────────────────────────────────────
// Shared utility for Excel / CSV import header matching.
//
// Design goals
//   • One source of truth for all field aliases (FIELD_ALIASES)
//   • Robust normalisation: trim → lowercase → strip ALL punctuation → collapse
//     whitespace/underscores  (handles "Part No.", "PART_NUMBER", "Item Code ")
//   • Never hard-fails: always returns matched + unmatched, caller decides
//   • Structured log object so the caller can always emit useful debug output

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Normalise an arbitrary header string into a canonical key.
 *
 * Steps:
 *   1. Strip leading BOM character if present
 *   2. Trim surrounding whitespace
 *   3. Lowercase
 *   4. Remove ALL punctuation / special characters EXCEPT letters, digits,
 *      spaces, and underscores  (handles dots, slashes, hyphens, percent signs…)
 *   5. Collapse any run of spaces or underscores into a single underscore
 *   6. Strip leading/trailing underscores
 *
 * Examples:
 *   "Part No."    → "part_no"
 *   "PART_NUMBER" → "part_number"
 *   "Item Code "  → "item_code"
 *   "GST%"        → "gst"
 *   "DN Price"    → "dn_price"
 *   "  Closing Qty " → "closing_qty"
 */
export function normalizeKey(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/^\uFEFF/, '')               // strip BOM
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')        // drop punctuation (keeps letters/digits/space/underscore)
    .replace(/[\s_]+/g, '_')             // collapse spaces and underscores
    .replace(/^_+|_+$/g, '')             // strip leading/trailing underscores
}

// ── Alias Dictionary ──────────────────────────────────────────────────────────
// Each key is the canonical internal field name.
// Values are arrays of accepted raw-header aliases (before normalisation).
// Aliases are matched AFTER both sides have been normalised, so you don't need
// to enumerate every capitalisation variant — just the distinct word forms.

export const FIELD_ALIASES = {
  sku: [
    'sku', 'sku_code', 'product_sku', 'item_sku', 'part_sku',
    'part_number', 'part_no', 'partno', 'part no', 'part_num', 'part_id',
    'partnumber', 'part number', 'part_code',
    'item_code', 'item_no', 'itemno', 'item no', 'item_number', 'item_id',
    'product_code', 'product_no', 'prod_code', 'prod_no',
    'code', 'article_no', 'article no', 'article_number', 'art_no',
    'ref', 'reference', 'ref_no', 'reference_no', 'part_ref',
    'material_no', 'material_number', 'material_code',
    'oem_part_no', 'oem_no', 'oem_part_number',
  ],
  name: [
    'description', 'desc', 'name', 'product_name', 'item_name',
    'part_description', 'part description', 'part_desc', 'part desc', 'part_name', 'part name', 'partname',
    'item_description', 'item description', 'item_desc', 'item desc',
    'product_description', 'product description', 'product_desc',
    'material_description', 'material description', 'material_desc', 'material desc', 'material',
    'details', 'item_details', 'part_details', 'part details',
    'description_of_goods', 'description of goods', 'goods_description',
    'particulars', 'item_particulars', 'item particulars',
    'nomenclature', 'specification', 'specifications', 'specs',
    'part_info', 'product_info', 'short_description', 'long_description',
    'item', 'title', 'product', 'part',
  ],
  planner: [
    'planner', 'plan', 'planned_by', 'buyer', 'buyer_name',
    'planner_section', 'planner section', 'planner/section', 'planner_sec', 'planner sec',
    'planner_code', 'planner code', 'planner_name', 'planner name', 'planner_no', 'planner no', 'planner_num', 'planner_id',
    'section', 'sec', 'sec_name', 'section_name', 'section_code',
    'category', 'part_category', 'part category', 'product_category', 'product category', 'prod_category', 'category_name',
    'group', 'part_group', 'product_group', 'product group', 'prod_group', 'prod group', 'item_group', 'pg', 'p_g',
    'division', 'segment', 'family', 'product_family', 'sub_group', 'sub_category',
  ],
  location: [
    'location', 'loc', 'bin', 'warehouse_location', 'bin_location',
    'shelf', 'rack', 'store_location', 'wh_location', 'rack_no', 'bin_no',
  ],
  purchase_price: [
    'new_casl_dn_price', 'new casl dn price', 'new_casl_dn', 'new casl dn', 
    'casl_dn_price', 'casl dn price', 'casl_dn', 'casl dn',
    'new_dn_price', 'new dn price', 'new_dn', 'new dn', 
    'new_purchase_price', 'new purchase price',
    'old_casl_dn_price', 'old casl dn price', 'old_casl_dn', 'old casl dn',
    'purchase_price', 'purchase price', 'purchase', 'pur_price',
    'buy_price', 'buy price', 'buying_price', 'cost_price', 'cost price', 'cost',
    'dn', 'dn_price', 'dn price', 'dealer_net', 'dealer net', 'dealer_net_price',
    'net_price', 'net price', 'basic_price', 'basic price', 'ndp', 'net_dealer_price',
    'unit_cost', 'unit cost', 'po_price', 'rate', 'unit_rate',
  ],
  dealer_landing_price: [
    'new_casl_dl_price', 'new casl dl price', 'new_casl_dl', 'new casl dl', 
    'casl_dl_price', 'casl dl price', 'casl_dl', 'casl dl',
    'new_dl_price', 'new dl price', 'new_dl', 'new dl', 
    'new_landing_price', 'new landing price',
    'old_casl_dl_price', 'old casl dl price', 'old_casl_dl', 'old casl dl',
    'dealer_landing_price', 'dealer landing price', 'dealer landing', 'dealer_landing',
    'landing_price', 'landing price', 'landing', 'landed_price', 'landed_cost',
    'dealer_price', 'dealer price', 'dl_price', 'dl price', 'dl', 'dl_rate',
    'dp', 'dp_price', 'd_l_price', 'd_l',
  ],
  selling_price: [
    'new_mrp_price', 'new mrp price', 'new_mrp', 'new mrp', 
    'casl_mrp_price', 'casl mrp price', 'casl_mrp', 'casl mrp',
    'new_selling_price', 'new selling price', 'new_sp', 'new sp',
    'old_mrp_price', 'old mrp price', 'old_mrp', 'old mrp',
    'selling_price', 'selling price', 'selling', 'sell_price', 'sell price',
    'mrp', 'maximum_retail_price', 'mrp_price', 'mrp_rs', 'mrp_amount',
    'price', 'unit_price', 'list_price', 'list price', 'retail_price', 'retail price',
    'customer_price', 'customer price', 'sp', 'sp_price', 'sale_price',
  ],
  quantity: [
    'quantity', 'qty', 'stock', 'stock_quantity', 'stock quantity',
    'stock_on_hand', 'on_hand', 'soh', 'count', 'units',
    'closing_qty', 'closing qty', 'closing_quantity', 'closing quantity',
    'opening_qty', 'opening_quantity', 'available_qty', 'available quantity',
    'balance', 'balance_qty', 'current_stock', 'in_stock',
  ],
  gst_rate: [
    'gst', 'gst_rate', 'gst rate', 'gst_percent', 'gst percent', 'gst_%',
    'gst_percentage', 'gst percentage', 'gst_perc', 'gst_per',
    'tax_rate', 'tax rate', 'tax', 'vat', 'vat_rate', 'igst', 'cgst_sgst',
  ],
  supplier: [
    'supplier', 'vendor', 'vendor_name', 'vendor name',
    'supplier_name', 'supplier name', 'make', 'brand', 'manufacturer', 'mfr',
  ],
}

// Pre-build a normalised lookup: normalisedAlias → internalField
// (built once at module load, not per file drop)
const _aliasLookup = new Map()
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) {
    const key = normalizeKey(alias)
    if (!_aliasLookup.has(key)) {
      _aliasLookup.set(key, field)
    }
  }
}

// ── matchHeaders ──────────────────────────────────────────────────────────────

/**
 * Match an array of raw column headers against FIELD_ALIASES.
 *
 * @param {string[]} rawHeaders  - Column headers exactly as read from the file
 * @param {string}   [supplierId] - Optional label for debug logging (e.g. 'Cummins')
 *
 * @returns {{
 *   fieldMap:         Object.<string, string>,   // internalField → original header
 *   unmatchedHeaders: string[],                   // original headers with no match
 *   matchLog:         {
 *     received:   string[],
 *     matched:    Object.<string, string>,
 *     unmatched:  string[],
 *     supplierId: string
 *   }
 * }}
 */
export function matchHeaders(rawHeaders, supplierId = 'unknown') {
  const fieldMap = {}         // internalField → original header (first match wins)
  const unmatchedHeaders = []

  for (const header of rawHeaders) {
    const normHeader = normalizeKey(header)
    const internalField = _aliasLookup.get(normHeader)

    if (internalField) {
      if (!fieldMap[internalField]) {
        fieldMap[internalField] = header
      }
    } else {
      unmatchedHeaders.push(header)
    }
  }

  // ── Fuzzy Secondary Pass for unmapped fields ──────────────────────────────
  const checkFallback = (field, keywords) => {
    if (fieldMap[field]) return
    for (let i = 0; i < unmatchedHeaders.length; i++) {
      const header = unmatchedHeaders[i]
      const norm = normalizeKey(header)
      if (keywords.some(kw => norm.includes(kw))) {
        fieldMap[field] = header
        unmatchedHeaders.splice(i, 1)
        break
      }
    }
  }

  checkFallback('name', ['desc', 'description', 'detail', 'particular', 'nomenclature', 'spec'])
  checkFallback('planner', ['planner', 'plan', 'category', 'group', 'section', 'segment', 'family'])
  checkFallback('sku', ['part', 'sku', 'code', 'article', 'number'])
  checkFallback('purchase_price', ['new_casl_dn', 'new_dn', 'casl_dn', 'dn', 'purchase', 'cost', 'buy', 'net'])
  checkFallback('dealer_landing_price', ['new_casl_dl', 'new_dl', 'casl_dl', 'landing', 'dl', 'dealer'])
  checkFallback('selling_price', ['new_mrp', 'casl_mrp', 'mrp', 'sell', 'selling', 'price'])
  checkFallback('quantity', ['qty', 'quantity', 'stock', 'soh', 'balance', 'count'])

  const matchLog = {
    supplierId,
    received:  rawHeaders,
    matched:   fieldMap,
    unmatched: unmatchedHeaders,
  }

  return { fieldMap, unmatchedHeaders, matchLog }
}

// ── applyMapping ──────────────────────────────────────────────────────────────

/**
 * Convert raw row objects (header → value) into normalised row objects
 * (internalField → value) using the fieldMap produced by matchHeaders().
 *
 * Unrecognised columns are silently dropped (they were already surfaced in
 * unmatchedHeaders by matchHeaders).
 *
 * @param {Object[]} rawRows   - As returned by SheetJS or the CSV parser
 * @param {Object}   fieldMap  - { internalField: originalHeader }
 * @returns {Object[]}
 */
export function applyMapping(rawRows, fieldMap) {
  // Invert fieldMap: originalHeader → internalField
  const invertedMap = Object.fromEntries(
    Object.entries(fieldMap).map(([field, header]) => [header, field])
  )

  return rawRows.map(row => {
    const mapped = {}
    for (const [rawKey, rawValue] of Object.entries(row)) {
      const internalField = invertedMap[rawKey]
      if (internalField) {
        const val = rawValue !== undefined && rawValue !== null ? String(rawValue) : ''
        mapped[internalField] = val
      }
    }
    return mapped
  })
}

const HEADER_KEYWORD_TOKENS = [
  'part', 'sku', 'code', 'item', 'desc', 'description', 'name',
  'planner', 'plan', 'category', 'price', 'cost', 'dn', 'dl', 'mrp',
  'gst', 'qty', 'stock', 'supplier', 'vendor', 'location', 'bin',
  'details', 'particulars', 'serial', 'no', 'number', 'sec', 'section',
  'group', 'make', 'brand', 'rate', 'unit', 'amount', 'hsn', 'sac'
]

/**
 * Scan rows parsed in array-mode (XLSX header:1) and return the index of the
 * row that has the highest column-header keyword score.
 *
 * This robustly identifies the real data table header even when logos, titles,
 * dates, or blank lines sit above the data table in Excel sheets.
 *
 * @param {Array[]}  arrayRows    - Rows from XLSX.utils.sheet_to_json(ws, { header: 1 })
 * @param {number}   [maxScanRows=35]
 * @returns {number}
 */
export function findActualHeaderRowIndex(arrayRows, maxScanRows = 35) {
  const limit = Math.min(arrayRows.length, maxScanRows)

  let bestIndex = 0
  let maxScore = -1

  for (let i = 0; i < limit; i++) {
    const row = arrayRows[i]
    if (!Array.isArray(row) || row.length === 0) continue

    let score = 0
    let validCellCount = 0

    for (const cell of row) {
      if (cell === null || cell === undefined || cell === '') continue
      const s = String(cell).trim()
      if (s.length === 0) continue
      if (/^__EMPTY/.test(s)) continue

      validCellCount++

      const norm = normalizeKey(s)
      if (!norm) continue

      const isKeywordMatch = HEADER_KEYWORD_TOKENS.some(token => norm.includes(token))
      if (isKeywordMatch) {
        score += 3
      } else if (isNaN(Number(s))) {
        score += 1
      }
    }

    if (validCellCount >= 2 && score > maxScore) {
      maxScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

// ── buildRowsFromSheet ─────────────────────────────────────────────────────────

/**
 * Given an array of arrays (from XLSX header:1 mode), find the real header
 * row and reconstruct an array of plain objects keyed by that row's values.
 *
 * This is the drop-in replacement for the naive
 *   XLSX.utils.sheet_to_json(ws, { defval: '' })
 * call that breaks on sheets whose first rows are titles / logos / blank.
 *
 * @param {Array[]} arrayRows  - From XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
 * @returns {{ rows: Object[], headerRowIndex: number }}
 *   rows           — the data rows as plain objects
 *   headerRowIndex — which array row was used as the header (for logging)
 */
export function buildRowsFromSheet(arrayRows) {
  const headerRowIndex = findActualHeaderRowIndex(arrayRows)
  const idx = headerRowIndex === -1 ? 0 : headerRowIndex

  // Build header array, preserving original casing for downstream matchHeaders()
  const rawHeaderRow = arrayRows[idx] || []
  const headers = rawHeaderRow.map(cell =>
    (cell !== null && cell !== undefined) ? String(cell).trim() : ''
  )

  // Data rows = everything after the header row; skip rows where every cell is empty
  const rows = arrayRows
    .slice(idx + 1)
    .filter(row => Array.isArray(row) && row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => {
      const obj = {}
      headers.forEach((h, i) => {
        if (!h) return  // skip columns with empty header
        const v = row[i]
        obj[h] = (v !== null && v !== undefined) ? String(v) : ''
      })
      return obj
    })

  return { rows, headerRowIndex: idx }
}
