import { lazy, Suspense } from 'react'
import { PageLoader } from '../../components/ui/Spinner'

// Eager
import IMDashboard from '../../modules/dashboard/im/IMDashboard'

// Lazy
const ProductsListPage  = lazy(() => import('../../modules/products/pages/ProductsListPage'))
const InwardListPage    = lazy(() => import('../../modules/inward/pages/InwardListPage'))
const InwardNewPage     = lazy(() => import('../../modules/inward/pages/InwardNewPage'))
const InwardDetailPage  = lazy(() => import('../../modules/inward/pages/InwardDetailPage'))

// Placeholders for other views
const OrdersPendingPage = lazy(() => import('../../modules/orders/pages/OrdersListPage')) // We can reuse or map
const ChallansPage      = lazy(() => import('../../modules/challans/pages/ChallansListPage'))
const ReorderListPage   = lazy(() => import('../../modules/reorder/pages/ReorderListPage'))
const ComingSoon        = lazy(() => import('../../components/ui/ComingSoon'))
const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const imRoutes = [
  { index: true, element: <IMDashboard /> },
  { path: 'dashboard', element: <IMDashboard /> },
  { path: 'products', element: <Wrap><ProductsListPage /></Wrap> },
  { path: 'inward', element: <Wrap><InwardListPage /></Wrap> },
  { path: 'inward/new', element: <Wrap><InwardNewPage /></Wrap> },
  { path: 'inward/:id', element: <Wrap><InwardDetailPage /></Wrap> },
  { path: 'orders/pending', element: <Wrap><OrdersPendingPage /></Wrap> },
  { path: 'challans', element: <Wrap><ChallansPage /></Wrap> },
  { path: 'reorder', element: <Wrap><ReorderListPage /></Wrap> },
  { path: 'notifications', element: <Wrap><NotificationsPage /></Wrap> },
]
