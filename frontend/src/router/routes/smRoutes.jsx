import { lazy, Suspense } from 'react'
import { PageLoader } from '../../components/ui/Spinner'

// Eager
import SMDashboard from '../../modules/dashboard/sm/SMDashboard'

// Lazy
const OrdersListPage    = lazy(() => import('../../modules/orders/pages/OrdersListPage'))
const OrderNewPage      = lazy(() => import('../../modules/orders/pages/OrderNewPage'))
const SMPipelinePage    = lazy(() => import('../../modules/pipeline/pages/SMPipelinePage'))
const SMRequestsPage    = lazy(() => import('../../modules/pipeline/pages/SMRequestsPage'))
const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const smRoutes = [
  { index: true, element: <SMDashboard /> },
  { path: 'dashboard', element: <SMDashboard /> },
  { path: 'orders', element: <Wrap><OrdersListPage /></Wrap> },
  { path: 'orders/new', element: <Wrap><OrderNewPage /></Wrap> },
  { path: 'pipeline', element: <Wrap><SMPipelinePage /></Wrap> },
  { path: 'dispatches', element: <Wrap><SMPipelinePage /></Wrap> }, // legacy alias
  { path: 'requests', element: <Wrap><SMRequestsPage /></Wrap> },
  { path: 'notifications', element: <Wrap><NotificationsPage /></Wrap> },
]

export default smRoutes
