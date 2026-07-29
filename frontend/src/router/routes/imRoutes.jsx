import { Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../../components/ui/Spinner'
import { safeLazy } from '../../utils/safeLazy'

// Eager
import IMDashboard from '../../modules/dashboard/im/IMDashboard'

// Lazy
const StockOverviewPage = safeLazy(() => import('../../modules/inventory/pages/StockOverviewPage'))
const InwardListPage    = safeLazy(() => import('../../modules/inward/pages/InwardListPage'))
const InwardNewPage     = safeLazy(() => import('../../modules/inward/pages/InwardNewPage'))
const InwardDetailPage  = safeLazy(() => import('../../modules/inward/pages/InwardDetailPage'))
const PriceListPage     = safeLazy(() => import('../../modules/prices/pages/PriceListPage'))

const OrdersPendingPage = safeLazy(() => import('../../modules/orders/pages/OrdersListPage'))
const ChallansPage      = safeLazy(() => import('../../modules/challans/pages/ChallansListPage'))
const ReorderListPage   = safeLazy(() => import('../../modules/reorder/pages/ReorderListPage'))
const NotificationsPage = safeLazy(() => import('../../modules/notifications/pages/NotificationsPage'))
const PartRequestsPage  = safeLazy(() => import('../../modules/orders/pages/PartRequestsPage'))

// Pipeline + requests
const IMPipelinePage = safeLazy(() => import('../../modules/pipeline/pages/IMPipelinePage'))
const IMRequestsPage = safeLazy(() => import('../../modules/pipeline/pages/IMRequestsPage'))
const IMWorkersPage  = safeLazy(() => import('../../modules/pipeline/pages/IMWorkersPage'))

const BillsListPage  = safeLazy(() => import('../../modules/challans/pages/BillsListPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const imRoutes = [
  { index: true, element: <IMDashboard /> },
  { path: 'dashboard', element: <IMDashboard /> },
  { path: 'stock', element: <Wrap><StockOverviewPage /></Wrap> },
  { path: 'products', element: <Navigate to="/im/stock" replace /> },
  { path: 'prices', element: <Wrap><PriceListPage /></Wrap> },
  { path: 'inward', element: <Navigate to="/im/stock" replace /> },
  { path: 'inward/new', element: <Navigate to="/im/stock" replace /> },
  { path: 'inward/:id', element: <Navigate to="/im/stock" replace /> },
  { path: 'orders/pending', element: <Wrap><OrdersPendingPage /></Wrap> },
  { path: 'bills', element: <Wrap><BillsListPage /></Wrap> },
  { path: 'challans', element: <Navigate to="/im/orders/pending" replace /> },
  { path: 'reorder', element: <Wrap><ReorderListPage /></Wrap> },
  { path: 'pipeline', element: <Wrap><IMPipelinePage /></Wrap> },
  { path: 'workers', element: <Wrap><IMWorkersPage /></Wrap> },
  { path: 'requests', element: <Wrap><IMRequestsPage /></Wrap> },
  { path: 'purchase-requests', element: <Wrap><PartRequestsPage /></Wrap> },
  { path: 'notifications', element: <Wrap><NotificationsPage /></Wrap> },
]
