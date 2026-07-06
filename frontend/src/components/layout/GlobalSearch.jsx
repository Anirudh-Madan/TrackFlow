import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, Package, ShoppingCart, X } from 'lucide-react'
import { cn } from '../../utils/cn'

const MOCK_RESULTS = {
  Parties: [
    { id: 1, label: 'Raj Enterprises', sub: 'Mumbai, MH', href: '/admin/parties/1' },
    { id: 2, label: 'Sharma & Co.', sub: 'Delhi, DL', href: '/admin/parties/2' },
  ],
  Products: [
    { id: 1, label: 'Industrial Bearing 6204', sub: 'SKU: IB-6204', href: '/admin/products/1' },
    { id: 2, label: 'Steel Rod 12mm', sub: 'SKU: SR-12MM', href: '/admin/products/2' },
  ],
  Orders: [
    { id: 1, label: 'ORD-2024-001', sub: 'Raj Enterprises · ₹45,000', href: '/admin/orders/1' },
    { id: 2, label: 'ORD-2024-002', sub: 'Sharma & Co. · ₹12,500', href: '/admin/orders/2' },
  ],
}

const CATEGORY_ICONS = {
  Parties: Building2,
  Products: Package,
  Orders: ShoppingCart,
}

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Build flat results list for keyboard nav
  const filteredCategories = Object.entries(MOCK_RESULTS).map(([cat, items]) => ({
    category: cat,
    items: query
      ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
      : items,
  })).filter((c) => c.items.length > 0)

  const flatItems = filteredCategories.flatMap((c) => c.items)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      navigate(flatItems[activeIndex].href)
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  let flatIdx = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-100 dark:border-surface-700">
          <Search className="h-4.5 w-4.5 text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search parties, products, orders…"
            className="flex-1 text-sm bg-transparent outline-none text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500"
            id="global-search-input"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-surface-400 hover:text-surface-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-surface-400 bg-surface-100 dark:bg-surface-700 rounded-md border border-surface-200 dark:border-surface-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {filteredCategories.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-surface-400">
              {query ? 'No results found.' : 'Start typing to search…'}
            </div>
          )}

          {filteredCategories.map(({ category, items }) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Search
            return (
              <div key={category}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
                  {category}
                </p>
                {items.map((item) => {
                  const isActive = flatIdx === activeIndex
                  const currentIdx = flatIdx++
                  return (
                    <button
                      key={item.id}
                      onClick={() => { navigate(item.href); onClose() }}
                      onMouseEnter={() => setActiveIndex(currentIdx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30'
                          : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                      )}
                    >
                      <CategoryIcon className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium truncate',
                          isActive ? 'text-primary-700 dark:text-primary-300' : 'text-surface-900 dark:text-surface-100'
                        )}>
                          {item.label}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{item.sub}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-surface-100 dark:border-surface-700 flex items-center gap-4 text-[10px] text-surface-400">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-surface-500 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-surface-500 font-mono">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-surface-500 font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
