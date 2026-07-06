import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../../components/ui/Spinner'

// Eager — always needed
import SMDashboard from '../../modules/dashboard/sm/SMDashboard'

// Lazy — code-split by module
const PartiesListPage   = lazy(() => import('../../modules/parties/pages/PartiesListPage'))
const PartyDetailPage   = lazy(() => import('../../modules/parties/pages/PartyDetailPage'))

const OrderNewPage      = lazy(() => import('../../modules/orders/pages/OrderNewPage'))
const OrdersListPage    = lazy(() => import('../../modules/orders/pages/OrdersListPage'))
const OrderDetailPage   = lazy(() => import('../../modules/orders/pages/OrderDetailPage'))
const OrderHistoryPage  = lazy(() => import('../../modules/orders/pages/OrderHistoryPage'))

const PaymentNewPage    = lazy(() => import('../../modules/payments/pages/PaymentNewPage'))
const PaymentsListPage  = lazy(() => import('../../modules/payments/pages/PaymentsListPage'))
const PartyLedgerPage   = lazy(() => import('../../modules/payments/pages/PartyLedgerPage'))

const MyReorderFlagsPage = lazy(() => import('../../modules/reorder/pages/MyReorderFlagsPage'))

const NotificationsPage  = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const smRoutes = [
  { index: true,                   element: <SMDashboard /> },
  { path: 'dashboard',             element: <SMDashboard /> },

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
  { path: 'reorder-flags',         element: <Wrap><MyReorderFlagsPage /></Wrap> },

  // Notifications
  { path: 'notifications',         element: <Wrap><NotificationsPage /></Wrap> },
]
