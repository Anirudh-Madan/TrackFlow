import { cn } from '../../utils/cn'
import { Clock, Rocket, Wrench, Layers, FileText, Package, 
         BarChart2, Users, MapPin, Bell, Truck, CreditCard, RefreshCw } from 'lucide-react'

const MODULE_ICONS = {
  orders:        Layers,
  dispatch:      Truck,
  payments:      CreditCard,
  ledger:        CreditCard,
  inventory:     Package,
  inward:        Package,
  cleanup:       Wrench,
  reorder:       RefreshCw,
  reports:       BarChart2,
  audit:         FileText,
  imports:       FileText,
  suggestions:   BarChart2,
  prices:        BarChart2,
  notifications: Bell,
  regions:       MapPin,
  roles:         Users,
  parties:       Users,
  products:      Package,
  default:       Rocket,
}

const MODULE_DESCRIPTIONS = {
  orders:        'Full order lifecycle management — create, track, and fulfill customer orders.',
  dispatch:      'Queue and manage dispatches, assign drivers, and track deliveries in real time.',
  payments:      'Record payments, reconcile accounts, and view party-wise outstanding balances.',
  ledger:        'Detailed party ledger with credit/debit history and running balance.',
  inventory:     'Live inventory levels, low-stock alerts, and batch management.',
  inward:        'Record and verify incoming stock from purchase orders and transfers.',
  cleanup:       'Resolve discrepancies and clean up stale or orphaned stock entries.',
  reorder:       'AI-suggested reorder points based on historical demand patterns.',
  reports:       'Rich analytics and exportable reports across all business dimensions.',
  audit:         'Complete audit trail of every action performed across the platform.',
  imports:       'Bulk import history for products, parties, inventory, and more.',
  suggestions:   'Track how AI reorder suggestions translate into actual purchase conversions.',
  prices:        'Full price-change history by SKU with effective date and user tracking.',
  notifications: 'Centralised notification centre for alerts, approvals, and system events.',
  regions:       'Manage sales regions, assign territories, and map parties to locations.',
  roles:         'Configure role-based access control and permission sets for each role.',
  parties:       'Manage customers, vendors, and their contact and billing information.',
  products:      'Product catalogue management — SKUs, categories, units, and pricing.',
  default:       'This section is under active development and will be available soon.',
}

export default function ComingSoon({ module = 'default', title, description }) {
  const Icon = MODULE_ICONS[module] || MODULE_ICONS.default
  const subtitle = description || MODULE_DESCRIPTIONS[module] || MODULE_DESCRIPTIONS.default

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in">
      {/* Decorative grid background card */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700',
        'bg-white dark:bg-surface-800',
        'min-h-[400px] flex flex-col items-center justify-center p-10 text-center shadow-card'
      )}>
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-primary-400/5 dark:bg-primary-400/8 blur-3xl" />
          {/* Subtle dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6 max-w-md">
          {/* Icon container */}
          <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800/50 shadow-inner">
            <Icon className="h-9 w-9 text-primary-500 dark:text-primary-400" />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/40 text-xs font-semibold text-warning-700 dark:text-warning-400 uppercase tracking-wide">
              <Clock className="h-3 w-3" />
              Under Construction
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
              {title || 'Coming Soon'}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Decorative progress bar */}
          <div className="space-y-1.5">
            <div className="h-1.5 w-48 mx-auto rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                style={{ width: '40%', animation: 'progressPulse 2s ease-in-out infinite' }}
              />
            </div>
            <p className="text-xs text-surface-400 dark:text-surface-500">Development in progress…</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50%       { width: 55%; }
        }
      `}</style>
    </div>
  )
}
