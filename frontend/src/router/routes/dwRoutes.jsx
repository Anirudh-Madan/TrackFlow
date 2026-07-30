import { Suspense } from 'react'
import { PageLoader } from '../../components/ui/Spinner'
import { safeLazy } from '../../utils/safeLazy'

// Eager
import DWDashboard from '../../modules/dashboard/dw/DWDashboard'

// Lazy
const DWPipelinePage    = safeLazy(() => import('../../modules/pipeline/pages/DWPipelinePage'))
const ChallansListPage  = safeLazy(() => import('../../modules/challans/pages/ChallansListPage'))
const NotificationsPage = safeLazy(() => import('../../modules/notifications/pages/NotificationsPage'))

const Wrap = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

export const dwRoutes = [
  { index: true, element: <DWDashboard /> },
  { path: 'dashboard', element: <DWDashboard /> },
  { path: 'pipeline', element: <Wrap><DWPipelinePage /></Wrap> },
  { path: 'challans', element: <Wrap><ChallansListPage /></Wrap> },
  { path: 'queue', element: <Wrap><DWPipelinePage /></Wrap> },   // legacy alias
  { path: 'summary', element: <Wrap><DWPipelinePage /></Wrap> }, // legacy alias
  { path: 'notifications', element: <Wrap><NotificationsPage /></Wrap> },
]

export default dwRoutes
