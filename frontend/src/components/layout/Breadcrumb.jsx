import { useLocation, Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '../../utils/cn'

const ROUTE_LABELS = {
  admin: 'Admin',
  users: 'Users',
  roles: 'Roles',
  regions: 'Regions',
  parties: 'Parties',
  products: 'Products',
  catalogue: 'Catalogue',
  inventory: 'Inventory',
  stock: 'Stock Overview',
  inward: 'Inward Entries',
  cleanup: 'Stock Cleanup',
  orders: 'Orders & Challans',
  challans: 'Challans',
  dispatch: 'Dispatch',
  payments: 'Payments',
  ledger: 'Ledger',
  reorder: 'Reorder List',
  reports: 'Reports',
  sales: 'Sales Reports',
  audit: 'Audit Logs',
  imports: 'Import History',
  suggestions: 'Suggestion Conversion',
  notifications: 'Notifications',
  settings: 'Settings',
  prices: 'Prices',
  history: 'Price History',
  new: 'New',
  edit: 'Edit',
}

export default function Breadcrumb({ className }) {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)

  // Build cumulative hrefs
  const crumbs = parts.map((part, i) => ({
    label: ROUTE_LABELS[part] || part.replace(/-/g, ' '),
    href: '/' + parts.slice(0, i + 1).join('/'),
    isLast: i === parts.length - 1,
    // If it looks like an ID (numeric or UUID), label as "Detail"
    isId: /^[0-9a-f-]{8,}$/i.test(part) && !/^\d+$/.test(part.replace(/-/g, '')),
  }))

  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
      <Link
        to="/admin"
        className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
        aria-label="Dashboard home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, i) => (
        <div key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-surface-300 dark:text-surface-600 shrink-0" />
          {crumb.isLast ? (
            <span className="font-medium text-surface-900 dark:text-surface-100 capitalize">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.href}
              className="text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors capitalize"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
