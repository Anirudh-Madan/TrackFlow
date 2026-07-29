import { Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../../components/ui/Spinner'
import { safeLazy } from '../../utils/safeLazy'

// Eager — always needed
import AdminDashboard from '../../modules/dashboard/admin/AdminDashboard'
import RouteRetired from '../RouteRetired'

// Lazy — code-split by module with safe chunk recovery
const UsersListPage   = safeLazy(() => import('../../modules/users/pages/UsersListPage'))
const RegionsPage     = safeLazy(() => import('../../modules/regions/pages/RegionsPage'))

const PartiesListPage = safeLazy(() => import('../../modules/parties/pages/PartiesListPage'))
const PartyDetailPage = safeLazy(() => import('../../modules/parties/pages/PartyDetailPage'))
const CustomersPage   = safeLazy(() => import('../../modules/parties/pages/CustomersPage'))

const ProductsListPage  = safeLazy(() => import('../../modules/products/pages/ProductsListPage'))
const ProductDetailPage = safeLazy(() => import('../../modules/products/pages/ProductDetailPage'))
const ProductCreatePage = safeLazy(() => import('../../modules/products/pages/ProductCreatePage'))
const PriceListPage     = safeLazy(() => import('../../modules/prices/pages/PriceListPage'))

const StockOverviewPage = safeLazy(() => import('../../modules/inventory/pages/StockOverviewPage'))
const StockMovementPage = safeLazy(() => import('../../modules/inventory/pages/StockMovementPage'))
const VelocityMinStockPage = safeLazy(() => import('../../modules/inventory/pages/VelocityMinStockPage'))

const OrdersListPage   = safeLazy(() => import('../../modules/orders/pages/OrdersListPage'))

// Pipeline (replaces dispatch)
const AdminPipelinePage = safeLazy(() => import('../../modules/pipeline/pages/AdminPipelinePage'))

const SalesReportPage      = safeLazy(() => import('../../modules/reports/pages/SalesReportPage'))
const StockReportPage      = safeLazy(() => import('../../modules/reports/pages/StockReportPage'))
const AuditLogPage         = safeLazy(() => import('../../modules/audit/pages/AuditLogPage'))
const BelowDlReportPage    = safeLazy(() => import('../../modules/reports/pages/BelowDlReportPage'))
const PartHistoryPage      = safeLazy(() => import('../../modules/reports/pages/PartHistoryPage'))
const ReportsPage          = safeLazy(() => import('../../modules/reports/pages/ReportsPage'))
const SalesmanReportPage   = safeLazy(() => import('../../modules/reports/pages/SalesmanReportPage'))
const SupplierReportPage   = safeLazy(() => import('../../modules/reports/pages/SupplierReportPage'))

const NotificationsPage = safeLazy(() => import('../../modules/notifications/pages/NotificationsPage'))

// New pages
const AdminChallanPage  = safeLazy(() => import('../../modules/challans/pages/AdminChallanPage'))
const AdminPOPage       = safeLazy(() => import('../../modules/inward/pages/AdminPOPage'))
const PartRequestsPage  = safeLazy(() => import('../../modules/orders/pages/PartRequestsPage'))
const PaymentsListPage  = safeLazy(() => import('../../modules/payments/pages/PaymentsListPage'))
const SettingsPage      = safeLazy(() => import('../../modules/settings/pages/SettingsPage'))

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

  // Products & Part History
  { path: 'products',            element: <Wrap><ProductsListPage /></Wrap> },
  { path: 'products/new',        element: <Wrap><ProductCreatePage /></Wrap> },
  { path: 'products/:id',        element: <Wrap><ProductDetailPage /></Wrap> },
  { path: 'part-history',        element: <Wrap><PartHistoryPage /></Wrap> },
  { path: 'part-history/:sku',   element: <Wrap><PartHistoryPage /></Wrap> },
  { path: 'prices',              element: <Wrap><PriceListPage /></Wrap> },

  // Finance & Payments
  { path: 'payments',            element: <Wrap><PaymentsListPage /></Wrap> },

  // Inventory
  { path: 'inventory',           element: <Wrap><StockOverviewPage /></Wrap> },
  { path: 'stock-movement',      element: <Wrap><StockMovementPage /></Wrap> },
  { path: 'velocity-min-stock',  element: <Wrap><VelocityMinStockPage /></Wrap> },
  { path: 'inventory/velocity',  element: <Wrap><VelocityMinStockPage /></Wrap> },

  // Orders
  { path: 'orders',              element: <Navigate to="/admin/challans" replace /> },

  // Pipeline (was: dispatch)
  { path: 'pipeline',            element: <Wrap><AdminPipelinePage /></Wrap> },
  { path: 'dispatch',            element: <Wrap><AdminPipelinePage /></Wrap> }, // legacy alias

  // Challans (Admin)
  { path: 'challans',            element: <Wrap><OrdersListPage /></Wrap> },

  // Purchase Orders (Admin)
  { path: 'purchase-orders',     element: <Wrap><PartRequestsPage /></Wrap> },

  // Reports — legacy pages kept, standalone page routes
  { path: 'reports',             element: <Wrap><ReportsPage /></Wrap> },
  { path: 'reports/salesman',    element: <Wrap><SalesmanReportPage /></Wrap> },
  { path: 'reports/salesman/:id', element: <Wrap><SalesmanReportPage /></Wrap> },
  { path: 'reports/supplier',    element: <Wrap><SupplierReportPage /></Wrap> },
  { path: 'reports/supplier/:id', element: <Wrap><SupplierReportPage /></Wrap> },
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
