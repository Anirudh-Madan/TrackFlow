import { lazy, Suspense } from 'react'
import { PageLoader } from '../../components/ui/Spinner'

// Eager
import DWDashboard from '../../modules/dashboard/dw/DWDashboard'

// Lazy
const DWPipelinePage    = lazy(() => import('../../modules/pipeline/pages/DWPipelinePage'))
const NotificationsPage = lazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const dwRoutes = [
  { index: true, element: <DWDashboard /> },
  { path: 'dashboard', element: <DWDashboard /> },
  { path: 'pipeline', element: <Wrap><DWPipelinePage /></Wrap> },
  { path: 'queue', element: <Wrap><DWPipelinePage /></Wrap> },   // legacy alias
  { path: 'summary', element: <Wrap><DWPipelinePage /></Wrap> }, // legacy alias
  { path: 'notifications', element: <Wrap><NotificationsPage /></Wrap> },
]

export default dwRoutes
