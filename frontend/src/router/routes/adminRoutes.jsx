import { lazy, Suspense } from 'react'
import { PageLoader } from '../../components/ui/Spinner'

// Eager — always needed
import AdminDashboard from '../../modules/dashboard/admin/AdminDashboard'

// Lazy — code-split by module
const UsersListPage   = lazy(() => import('../../modules/users/pages/UsersListPage'))
const UserCreatePage  = lazy(() => import('../../modules/users/pages/UserCreatePage'))
const UserEditPage    = lazy(() => import('../../modules/users/pages/UserEditPage'))

const RolesListPage   = lazy(() => import('../../modules/users/pages/RolesListPage'))
const RoleDetailPage  = lazy(() => import('../../modules/users/pages/RoleDetailPage'))

const RegionsPage     = lazy(() => import('../../modules/regions/pages/RegionsPage'))

const PartiesListPage = lazy(() => import('../../modules/parties/pages/PartiesListPage'))
const PartyDetailPage = lazy(() => import('../../modules/parties/pages/PartyDetailPage'))

const ProductsListPage  = lazy(() => import('../../modules/products/pages/ProductsListPage'))
const ProductDetailPage = lazy(() => import('../../modules/products/pages/ProductDetailPage'))
const ProductCreatePage = lazy(() => import('../../modules/products/pages/ProductCreatePage'))

const StockOverviewPage = lazy(() => import('../../modules/inventory/pages/StockOverviewPage'))
const StockCleanupPage  = lazy(() => import('../../modules/inventory/pages/StockCleanupPage'))
const InwardListPage    = lazy(() => import('../../modules/inward/pages/InwardListPage'))

const OrdersListPage   = lazy(() => import('../../modules/orders/pages/OrdersListPage'))
const ChallansListPage = lazy(() => import('../../modules/challans/pages/ChallansListPage'))
const DispatchQueuePage = lazy(() => import('../../modules/dispatch/pages/DispatchQueuePage'))

const PaymentsListPage = lazy(() => import('../../modules/payments/pages/PaymentsListPage'))
const PartyLedgerPage  = lazy(() => import('../../modules/payments/pages/PartyLedgerPage'))

const ReorderListPage  = lazy(() => import('../../modules/reorder/pages/ReorderListPage'))

const SalesReportPage      = lazy(() => import('../../modules/reports/pages/SalesReportPage'))
const StockReportPage      = lazy(() => import('../../modules/reports/pages/StockReportPage'))
const AuditLogPage         = lazy(() => import('../../modules/audit/pages/AuditLogPage'))
const ImportHistoryPage    = lazy(() => import('../../modules/reports/pages/ImportHistoryPage'))
const SuggestionConversionPage = lazy(() => import('../../modules/reports/pages/SuggestionConversionPage'))

const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const PriceHistoryPage = lazy(() => import('../../modules/prices/pages/PriceHistoryPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const adminRoutes = [
  { index: true,                  element: <AdminDashboard /> },

  // Users
  { path: 'users',               element: <Wrap><UsersListPage /></Wrap> },
  { path: 'users/new',           element: <Wrap><UserCreatePage /></Wrap> },
  { path: 'users/:id/edit',      element: <Wrap><UserEditPage /></Wrap> },

  // Roles
  { path: 'roles',               element: <Wrap><RolesListPage /></Wrap> },
  { path: 'roles/:id',           element: <Wrap><RoleDetailPage /></Wrap> },

  // Regions
  { path: 'regions',             element: <Wrap><RegionsPage /></Wrap> },

  // Parties
  { path: 'parties',             element: <Wrap><PartiesListPage /></Wrap> },
  { path: 'parties/:id',         element: <Wrap><PartyDetailPage /></Wrap> },

  // Products
  { path: 'products',            element: <Wrap><ProductsListPage /></Wrap> },
  { path: 'products/new',        element: <Wrap><ProductCreatePage /></Wrap> },
  { path: 'products/:id',        element: <Wrap><ProductDetailPage /></Wrap> },

  // Inventory
  { path: 'inventory/stock',     element: <Wrap><StockOverviewPage /></Wrap> },
  { path: 'inventory/inward',    element: <Wrap><InwardListPage /></Wrap> },
  { path: 'inventory/cleanup',   element: <Wrap><StockCleanupPage /></Wrap> },

  // Orders & Challans
  { path: 'orders',              element: <Wrap><OrdersListPage /></Wrap> },
  { path: 'challans',            element: <Wrap><ChallansListPage /></Wrap> },

  // Dispatch
  { path: 'dispatch',            element: <Wrap><DispatchQueuePage /></Wrap> },

  // Payments & Ledger
  { path: 'payments',            element: <Wrap><PaymentsListPage /></Wrap> },
  { path: 'payments/ledger/:id', element: <Wrap><PartyLedgerPage /></Wrap> },

  // Reorder
  { path: 'reorder',             element: <Wrap><ReorderListPage /></Wrap> },

  // Reports
  { path: 'reports/sales',       element: <Wrap><SalesReportPage /></Wrap> },
  { path: 'reports/stock',       element: <Wrap><StockReportPage /></Wrap> },
  { path: 'reports/audit',       element: <Wrap><AuditLogPage /></Wrap> },
  { path: 'reports/imports',     element: <Wrap><ImportHistoryPage /></Wrap> },
  { path: 'reports/suggestions', element: <Wrap><SuggestionConversionPage /></Wrap> },

  // Price History
  { path: 'prices/history',      element: <Wrap><PriceHistoryPage /></Wrap> },

  // Notifications
  { path: 'notifications',       element: <Wrap><NotificationsPage /></Wrap> },
]
