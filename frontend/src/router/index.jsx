import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AuthGuard from './guards/AuthGuard'
import RoleGuard from './guards/RoleGuard'
import FirstLoginGuard from './guards/FirstLoginGuard'
import AdminLayout from '../layouts/AdminLayout'
import IMLayout from '../layouts/IMLayout'
import { adminRoutes } from './routes/adminRoutes'
import { imRoutes } from './routes/imRoutes'

// Auth pages (eagerly loaded — small)
import LoginPage from '../modules/auth/pages/LoginPage'
import ChangePasswordPage from '../modules/auth/pages/ChangePasswordPage'
import AuthLayout from '../layouts/AuthLayout'

// Non-admin placeholder
import RolePlaceholderPage from '../modules/dashboard/RolePlaceholderPage'

const router = createBrowserRouter([
  // Root redirect
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  // Auth flows
  {
    path: '/login',
    element: (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    ),
  },
  {
    path: '/change-password',
    element: (
      <AuthGuard>
        <AuthLayout>
          <ChangePasswordPage />
        </AuthLayout>
      </AuthGuard>
    ),
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
    children: adminRoutes,
  },

  // Sales Manager
  {
    path: '/sm',
    element: (
      <AuthGuard>
        <RoleGuard role="sales_manager">
          <RolePlaceholderPage />
        </RoleGuard>
      </AuthGuard>
    ),
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
    children: imRoutes,
  },

  // Dispatch Worker
  {
    path: '/dw',
    element: (
      <AuthGuard>
        <RoleGuard role="dispatch_worker">
          <RolePlaceholderPage />
        </RoleGuard>
      </AuthGuard>
    ),
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
