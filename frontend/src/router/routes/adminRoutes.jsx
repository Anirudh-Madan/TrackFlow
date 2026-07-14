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

const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const adminRoutes = [
  { index: true,                  element: <AdminDashboard /> },

  // Users & Roles
  { path: 'users', element: <Wrap><UsersListPage /></Wrap> },

  // Regions
  { path: 'regions',             element: <Wrap><RegionsPage /></Wrap> },

  // Parties
  { path: 'parties',             element: <Wrap><PartiesListPage /></Wrap> },
  { path: 'parties/:id',         element: <Wrap><PartyDetailPage /></Wrap> },

  // Products
  { path: 'products',            element: <Wrap><ProductsListPage /></Wrap> },
  { path: 'products/new',        element: <Wrap><ProductCreatePage /></Wrap> },
  { path: 'products/:id',        element: <Wrap><ProductDetailPage /></Wrap> },
  { path: 'prices',              element: <Wrap><PriceListPage /></Wrap> },

  // Inventory
  { path: 'inventory', element: <Wrap><StockOverviewPage /></Wrap> },

  // Orders
  { path: 'orders',              element: <Wrap><OrdersListPage /></Wrap> },

  // Pipeline (was: dispatch)
  { path: 'pipeline',            element: <Wrap><AdminPipelinePage /></Wrap> },
  { path: 'dispatch',            element: <Wrap><AdminPipelinePage /></Wrap> }, // legacy alias

  // Reports (kept)
  { path: 'reports/sales',       element: <Wrap><SalesReportPage /></Wrap> },
  { path: 'reports/stock',       element: <Wrap><StockReportPage /></Wrap> },
  { path: 'reports/audit',       element: <Wrap><AuditLogPage /></Wrap> },
  { path: 'reports/below-dl',    element: <Wrap><BelowDlReportPage /></Wrap> },

  // Retired per pipeline rebuild — redirect + logout
  { path: 'payments',            element: <RouteRetired /> },
  { path: 'payments/ledger/:id', element: <RouteRetired /> },
  { path: 'reports/imports',     element: <RouteRetired /> },
  { path: 'reports/suggestions', element: <RouteRetired /> },
  { path: 'prices/history',      element: <RouteRetired /> },

  // Notifications
  { path: 'notifications',       element: <Wrap><NotificationsPage /></Wrap> },
]
