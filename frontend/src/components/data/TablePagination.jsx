import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TablePagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 50,
  onPageChange,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalItems === 0) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 text-xs text-surface-600 dark:text-surface-400 ${className}`}>
      <div>
        Showing <span className="font-semibold text-surface-900 dark:text-surface-100">{startItem}</span> to{' '}
        <span className="font-semibold text-surface-900 dark:text-surface-100">{endItem}</span> of{' '}
        <span className="font-semibold text-surface-900 dark:text-surface-100">{totalItems}</span> records
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {getPageNumbers().map(pageNum => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                pageNum === currentPage
                  ? 'bg-primary-600 text-white dark:bg-primary-500 font-semibold'
                  : 'border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
