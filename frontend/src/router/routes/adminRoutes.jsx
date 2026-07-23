import { lazy, Suspense } from 'react'
import { PageLoader } from '../../components/ui/Spinner'

// Eager — always needed
import AdminDashboard from '../../modules/dashboard/admin/AdminDashboard'
import RouteRetired from '../RouteRetired'

// Lazy — code-split by module
const UsersListPage   = lazy(() => import('../../modules/users/pages/UsersListPage'))
const RegionsPage     = lazy(() => import('../../modules/regions/pages/RegionsPage'))

const PartiesListPage = lazy(() => import('../../modules/parties/pages/PartiesListPage'))
const PartyDetailPage = lazy(() => import('../../modules/parties/pages/PartyDetailPage'))
const CustomersPage   = lazy(() => import('../../modules/parties/pages/CustomersPage'))

const ProductsListPage  = lazy(() => import('../../modules/products/pages/ProductsListPage'))
const ProductDetailPage = lazy(() => import('../../modules/products/pages/ProductDetailPage'))
const ProductCreatePage = lazy(() => import('../../modules/products/pages/ProductCreatePage'))
const PriceListPage     = lazy(() => import('../../modules/prices/pages/PriceListPage'))

const StockOverviewPage = lazy(() => import('../../modules/inventory/pages/StockOverviewPage'))

const OrdersListPage   = lazy(() => import('../../modules/orders/pages/OrdersListPage'))

// Pipeline (replaces dispatch)
const AdminPipelinePage = lazy(() => import('../../modules/pipeline/pages/AdminPipelinePage'))

const SalesReportPage      = lazy(() => import('../../modules/reports/pages/SalesReportPage'))
const StockReportPage      = lazy(() => import('../../modules/reports/pages/StockReportPage'))
const AuditLogPage         = lazy(() => import('../../modules/audit/pages/AuditLogPage'))
const BelowDlReportPage    = lazy(() => import('../../modules/reports/pages/BelowDlReportPage'))
const ReportsPage          = lazy(() => import('../../modules/reports/pages/ReportsPage'))

const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

// New pages
const AdminChallanPage  = lazy(() => import('../../modules/challans/pages/AdminChallanPage'))
const AdminPOPage       = lazy(() => import('../../modules/inward/pages/AdminPOPage'))
const PartRequestsPage  = lazy(() => import('../../modules/orders/pages/PartRequestsPage'))
const SettingsPage      = lazy(() => import('../../modules/settings/pages/SettingsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const adminRoutes = [
  { index: true,                  element: <AdminDashboard /> },

  // Users & Roles
  { path: 'users',               element: <Wrap><UsersListPage /></Wrap> },

  // Regions
  { path: 'regions',             element: <Wrap><RegionsPage /></Wrap> },

  // Customers
  { path: 'customers',           element: <Wrap><CustomersPage /></Wrap> },

  // Parties
  { path: 'parties',             element: <Wrap><PartiesListPage /></Wrap> },
  { path: 'parties/:id',         element: <Wrap><PartyDetailPage /></Wrap> },

  // Products
  { path: 'products',            element: <Wrap><ProductsListPage /></Wrap> },
  { path: 'products/new',        element: <Wrap><ProductCreatePage /></Wrap> },
  { path: 'products/:id',        element: <Wrap><ProductDetailPage /></Wrap> },
  { path: 'prices',              element: <Wrap><PriceListPage /></Wrap> },

  // Inventory
  { path: 'inventory',           element: <Wrap><StockOverviewPage /></Wrap> },

  // Orders
  { path: 'orders',              element: <Wrap><OrdersListPage /></Wrap> },

  // Pipeline (was: dispatch)
  { path: 'pipeline',            element: <Wrap><AdminPipelinePage /></Wrap> },
  { path: 'dispatch',            element: <Wrap><AdminPipelinePage /></Wrap> }, // legacy alias

  // Challans (Admin)
  { path: 'challans',            element: <Wrap><OrdersListPage /></Wrap> },

  // Purchase Orders (Admin)
  { path: 'purchase-orders',     element: <Wrap><PartRequestsPage /></Wrap> },

  // Reports — legacy pages kept, new combined insights page at /admin/reports
  { path: 'reports',             element: <Wrap><ReportsPage /></Wrap> },
  { path: 'reports/sales',       element: <Wrap><SalesReportPage /></Wrap> },
  { path: 'reports/stock',       element: <Wrap><StockReportPage /></Wrap> },
  { path: 'reports/activity',    element: <Wrap><AuditLogPage /></Wrap> },
  { path: 'reports/audit',       element: <Wrap><AuditLogPage /></Wrap> },
  { path: 'activity-logs',        element: <Wrap><AuditLogPage /></Wrap> },
  { path: 'reports/below-dl',    element: <Wrap><BelowDlReportPage /></Wrap> },

  // Settings (Admin PIN, Gemini API info)
  { path: 'settings',            element: <Wrap><SettingsPage /></Wrap> },

  // Retired routes
  { path: 'payments',            element: <RouteRetired /> },
  { path: 'payments/ledger/:id', element: <RouteRetired /> },
  { path: 'reports/imports',     element: <RouteRetired /> },
  { path: 'reports/suggestions', element: <RouteRetired /> },
  { path: 'prices/history',      element: <RouteRetired /> },

  // Notifications
  { path: 'notifications',       element: <Wrap><NotificationsPage /></Wrap> },
]
