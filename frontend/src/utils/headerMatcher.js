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
    'sku', 'sku_code', 'product_sku', 'item_sku',
    'part_number', 'part_no', 'partno', 'part no',
    'item_code', 'item_no', 'item no', 'product_code',
    'code', 'article_no', 'article no', 'article_number',
    'ref', 'reference', 'part',
  ],
  name: [
    'description', 'desc', 'name', 'product_name', 'item_name',
    'item_description', 'product_description', 'product description',
    'material_description', 'material description', 'material',
    'details', 'item_details',
  ],
  planner: [
    'planner', 'plan', 'planned_by', 'buyer', 'buyer_name',
  ],
  location: [
    'location', 'loc', 'bin', 'warehouse_location', 'bin_location',
    'shelf', 'rack', 'store_location', 'wh_location',
  ],
  purchase_price: [
    'purchase_price', 'purchase price', 'purchase',
    'buy_price', 'buy price', 'cost_price', 'cost price', 'cost',
    'dn', 'dn_price', 'dn price', 'dealer_net', 'dealer net',
    'net_price', 'net price', 'basic_price', 'basic price',
  ],
  dealer_landing_price: [
    'dealer_landing_price', 'dealer landing price', 'dealer landing',
    'landing_price', 'landing price', 'dealer_price', 'dealer price',
    'dl_price', 'dl price', 'dl',
  ],
  selling_price: [
    'selling_price', 'selling price', 'selling',
    'sell_price', 'sell price', 'mrp', 'price',
    'list_price', 'list price', 'retail_price', 'retail price',
    'customer_price', 'customer price',
  ],
  quantity: [
    'quantity', 'qty', 'stock', 'stock_quantity', 'stock quantity',
    'stock_on_hand', 'on_hand', 'count', 'units',
    'closing_qty', 'closing qty', 'closing_quantity', 'closing quantity',
    'available_qty', 'available quantity', 'balance', 'balance_qty',
  ],
  gst_rate: [
    'gst', 'gst_rate', 'gst rate', 'gst_percent', 'gst percent',
    'gst_percentage', 'gst percentage', 'gst_perc',
    'tax_rate', 'tax rate', 'tax', 'vat', 'vat_rate',
  ],
  supplier: [
    'supplier', 'vendor', 'vendor_name', 'vendor name',
    'supplier_name', 'supplier name', 'make', 'brand',
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
      // Only take the first column that maps to a given internal field
      if (!fieldMap[internalField]) {
        fieldMap[internalField] = header
      }
    } else {
      unmatchedHeaders.push(header)
    }
  }

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

// ── findActualHeaderRowIndex ───────────────────────────────────────────────────

/**
 * Scan rows parsed in array-mode (XLSX header:1) and return the index of the
 * first row that looks like a real column-header row.
 *
 * A row qualifies as a header row when it contains at least MIN_STRING_CELLS
 * non-empty, non-numeric string values — this filters out title rows, logo
 * rows, date rows, and blank rows that appear above the real table in many
 * supplier price-list formats.
 *
 * Stops scanning after maxScanRows (default 30) to avoid false positives in
 * large tables.
 *
 * Returns -1 if no qualifying row is found (safe fallback: use row 0).
 *
 * @param {Array[]}  arrayRows    - Rows from XLSX.utils.sheet_to_json(ws, { header: 1 })
 * @param {number}   [maxScanRows=30]
 * @param {number}   [minStringCells=2]
 * @returns {number}
 */
export function findActualHeaderRowIndex(arrayRows, maxScanRows = 30, minStringCells = 2) {
  const limit = Math.min(arrayRows.length, maxScanRows)

  for (let i = 0; i < limit; i++) {
    const row = arrayRows[i]
    if (!Array.isArray(row) || row.length === 0) continue

    // Count cells that are non-empty strings and NOT purely numeric
    let stringCellCount = 0
    for (const cell of row) {
      if (cell === null || cell === undefined || cell === '') continue
      const s = String(cell).trim()
      if (s.length === 0) continue
      // Reject if the cell is just a number (dates, serials, prices in title rows)
      if (!isNaN(Number(s))) continue
      // Reject SheetJS placeholder names  (__EMPTY, __EMPTY_1, …)
      if (/^__EMPTY/.test(s)) continue
      stringCellCount++
    }

    if (stringCellCount >= minStringCells) {
      return i
    }
  }

  return -1
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
