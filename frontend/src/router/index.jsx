import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { safeLazy } from '../utils/safeLazy'
import AuthGuard from './guards/AuthGuard'
import RoleGuard from './guards/RoleGuard'
import FirstLoginGuard from './guards/FirstLoginGuard'
import AdminLayout from '../layouts/AdminLayout'
import IMLayout from '../layouts/IMLayout'
import SMLayout from '../layouts/SMLayout'
import DWLayout from '../layouts/DWLayout'
import { adminRoutes } from './routes/adminRoutes'
import { imRoutes } from './routes/imRoutes'
import { smRoutes } from './routes/smRoutes'
import { dwRoutes } from './routes/dwRoutes'
import { RouteErrorBoundary } from '../components/feedback/ErrorBoundary'

// Auth pages (eagerly loaded — small)
import LoginPage from '../modules/auth/pages/LoginPage'
import ChangePasswordPage from '../modules/auth/pages/ChangePasswordPage'
import AuthLayout from '../layouts/AuthLayout'

// Public views (no auth required)
const PublicChallanView = safeLazy(() => import('../modules/challans/pages/PublicChallanView'))
const PublicPOView      = safeLazy(() => import('../modules/inward/pages/PublicPOView'))

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent" />
  </div>
)

const router = createBrowserRouter([
  // Root redirect
  { path: '/', element: <Navigate to="/login" replace />, errorElement: <RouteErrorBoundary /> },

  // Auth flows
  {
    path: '/login',
    element: <AuthLayout><LoginPage /></AuthLayout>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/change-password',
    element: <AuthGuard><AuthLayout><ChangePasswordPage /></AuthLayout></AuthGuard>,
    errorElement: <RouteErrorBoundary />,
  },

  // Public share views (no auth required)
  {
    path: '/challan/view/:token',
    element: <Suspense fallback={<LoadingSpinner />}><PublicChallanView /></Suspense>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/po/view/:token',
    element: <Suspense fallback={<LoadingSpinner />}><PublicPOView /></Suspense>,
    errorElement: <RouteErrorBoundary />,
  },

  // Admin module
  {
    path: '/admin',
    element: (
      <AuthGuard>
        <RoleGuard role="admin">
          <FirstLoginGuard>
            <AdminLayout />
          </FirstLoginGuard>
        </RoleGuard>
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: adminRoutes,
  },

  // Sales Manager
  {
    path: '/sm',
    element: (
      <AuthGuard>
        <RoleGuard role="sales_manager">
          <FirstLoginGuard>
            <SMLayout />
          </FirstLoginGuard>
        </RoleGuard>
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: smRoutes,
  },

  // Inventory Manager
  {
    path: '/im',
    element: (
      <AuthGuard>
        <RoleGuard role="inventory_manager">
          <FirstLoginGuard>
            <IMLayout />
          </FirstLoginGuard>
        </RoleGuard>
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: imRoutes,
  },

  // Dispatch Worker
  {
    path: '/dw',
    element: (
      <AuthGuard>
        <RoleGuard role="dispatch_worker">
          <FirstLoginGuard>
            <DWLayout />
          </FirstLoginGuard>
        </RoleGuard>
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: dwRoutes,
  },

  // Catch-all
  { path: '*', element: <Navigate to="/login" replace />, errorElement: <RouteErrorBoundary /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
