import { useState, useEffect } from 'react'
import { Search, Menu } from 'lucide-react'
import Breadcrumb from './Breadcrumb'
import NotificationBell from './NotificationBell'
import ProfileMenu from './ProfileMenu'
import GlobalSearch from './GlobalSearch'
import { cn } from '../../utils/cn'
import { useUIStore } from '../../store/uiStore'

export default function TopNavbar({ className }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { toggleMobileSidebar } = useUIStore()

  // Cmd/Ctrl + K to open search
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      <header
        className={cn(
          'h-14 flex items-center px-4 sm:px-5 gap-3 sm:gap-4 shrink-0',
          'bg-white/80 dark:bg-surface-900/80 backdrop-blur-md',
          'border-b border-surface-200 dark:border-surface-800',
          'sticky top-0 z-30',
          className
        )}
      >
        {/* Mobile menu toggle */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-1.5 -ml-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <Breadcrumb />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search trigger */}
          <button
            id="global-search-trigger"
            onClick={() => setSearchOpen(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm text-surface-400 dark:text-surface-500',
              'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700',
              'border border-surface-200 dark:border-surface-700',
              'rounded-lg transition-colors duration-150 cursor-pointer',
              'hidden sm:flex'
            )}
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search…</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-400">
              ⌘K
            </kbd>
          </button>

          {/* Mobile search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <NotificationBell />
          <ProfileMenu />
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
