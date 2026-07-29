import { Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../../components/ui/Spinner'
import { safeLazy } from '../../utils/safeLazy'

// Eager — always needed
import SMDashboard from '../../modules/dashboard/sm/SMDashboard'

// Lazy — code-split by module
const PartiesListPage   = safeLazy(() => import('../../modules/parties/pages/PartiesListPage'))
const PartyDetailPage   = safeLazy(() => import('../../modules/parties/pages/PartyDetailPage'))
const CustomersPage     = safeLazy(() => import('../../modules/parties/pages/CustomersPage'))

const OrderNewPage      = safeLazy(() => import('../../modules/orders/pages/OrderNewPage'))
const OrdersListPage    = safeLazy(() => import('../../modules/orders/pages/OrdersListPage'))
const OrderDetailPage   = safeLazy(() => import('../../modules/orders/pages/OrderDetailPage'))
const OrderHistoryPage  = safeLazy(() => import('../../modules/orders/pages/OrderHistoryPage'))

const PaymentNewPage    = safeLazy(() => import('../../modules/payments/pages/PaymentNewPage'))
const PaymentsListPage  = safeLazy(() => import('../../modules/payments/pages/PaymentsListPage'))
const PartyLedgerPage   = safeLazy(() => import('../../modules/payments/pages/PartyLedgerPage'))

const MyReorderFlagsPage = safeLazy(() => import('../../modules/reorder/pages/MyReorderFlagsPage'))
const SMPipelinePage    = safeLazy(() => import('../../modules/pipeline/pages/SMPipelinePage'))

const NotificationsPage  = safeLazy(() => import('../../modules/notifications/pages/NotificationsPage'))
const PartRequestsPage   = safeLazy(() => import('../../modules/orders/pages/PartRequestsPage'))
const StockOverviewPage  = safeLazy(() => import('../../modules/inventory/pages/StockOverviewPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const smRoutes = [
  { index: true,                   element: <SMDashboard /> },
  { path: 'dashboard',             element: <SMDashboard /> },

  // Customers
  { path: 'customers',             element: <Wrap><CustomersPage /></Wrap> },

  // Parties
  { path: 'parties',               element: <Wrap><PartiesListPage /></Wrap> },
  { path: 'parties/:id',           element: <Wrap><PartyDetailPage /></Wrap> },

  // Orders
  { path: 'orders/new',            element: <Navigate to="/sm/orders" replace state={{ openNewOrder: true }} /> },
  { path: 'orders',                element: <Wrap><OrdersListPage /></Wrap> },
  { path: 'orders/history',        element: <Navigate to="/sm/orders" replace state={{ activeTab: 'order-history' }} /> },
  { path: 'orders/:id',            element: <Wrap><OrderDetailPage /></Wrap> },

  // Payments & Ledger
  { path: 'payments/new',          element: <Navigate to="/sm/payments" replace state={{ openNewPayment: true }} /> },
  { path: 'payments',              element: <Wrap><PaymentsListPage /></Wrap> },
  { path: 'ledger/:partyId',       element: <Wrap><PartyLedgerPage /></Wrap> },

  // Reorder Flags
  { path: 'reorder-flags',         element: <Navigate to="/sm/stock" replace state={{ activeTab: 'reorder-flags' }} /> },

  // Fulfilment
  { path: 'pipeline',              element: <Wrap><SMPipelinePage /></Wrap> },
  { path: 'dispatches',            element: <Wrap><SMPipelinePage /></Wrap> },
  { path: 'requests',              element: <Wrap><PartRequestsPage /></Wrap> },
  { path: 'purchase-requests',     element: <Navigate to="/sm/requests" replace /> },
  { path: 'stock',                 element: <Wrap><StockOverviewPage /></Wrap> },

  // Notifications
  { path: 'notifications',         element: <Wrap><NotificationsPage /></Wrap> },
]
