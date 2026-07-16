import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../../components/ui/Spinner'

// Eager
import IMDashboard from '../../modules/dashboard/im/IMDashboard'

// Lazy
const StockOverviewPage = lazy(() => import('../../modules/inventory/pages/StockOverviewPage'))
const InwardListPage    = lazy(() => import('../../modules/inward/pages/InwardListPage'))
const InwardNewPage     = lazy(() => import('../../modules/inward/pages/InwardNewPage'))
const InwardDetailPage  = lazy(() => import('../../modules/inward/pages/InwardDetailPage'))
const PriceListPage     = lazy(() => import('../../modules/prices/pages/PriceListPage'))

const OrdersPendingPage = lazy(() => import('../../modules/orders/pages/OrdersListPage'))
const ChallansPage      = lazy(() => import('../../modules/challans/pages/ChallansListPage'))
const ReorderListPage   = lazy(() => import('../../modules/reorder/pages/ReorderListPage'))
const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))
const PartRequestsPage   = lazy(() => import('../../modules/orders/pages/PartRequestsPage'))

// Pipeline + requests
const IMPipelinePage = lazy(() => import('../../modules/pipeline/pages/IMPipelinePage'))
const IMRequestsPage = lazy(() => import('../../modules/pipeline/pages/IMRequestsPage'))
const IMWorkersPage  = lazy(() => import('../../modules/pipeline/pages/IMWorkersPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const imRoutes = [
  { index: true, element: <IMDashboard /> },
  { path: 'dashboard', element: <IMDashboard /> },
  { path: 'stock', element: <Wrap><StockOverviewPage /></Wrap> },
  { path: 'products', element: <Navigate to="/im/stock" replace /> },
  { path: 'prices', element: <Wrap><PriceListPage /></Wrap> },
  { path: 'inward', element: <Wrap><InwardListPage /></Wrap> },
  { path: 'inward/new', element: <Wrap><InwardNewPage /></Wrap> },
  { path: 'inward/:id', element: <Wrap><InwardDetailPage /></Wrap> },
  { path: 'orders/pending', element: <Wrap><OrdersPendingPage /></Wrap> },
  { path: 'challans', element: <Wrap><ChallansPage /></Wrap> },
  { path: 'reorder', element: <Wrap><ReorderListPage /></Wrap> },
  { path: 'pipeline', element: <Wrap><IMPipelinePage /></Wrap> },
  { path: 'workers', element: <Wrap><IMWorkersPage /></Wrap> },
  { path: 'requests', element: <Wrap><IMRequestsPage /></Wrap> },
  { path: 'purchase-requests', element: <Wrap><PartRequestsPage /></Wrap> },
  { path: 'notifications', element: <Wrap><NotificationsPage /></Wrap> },
]
