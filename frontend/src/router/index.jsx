import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
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

// Auth pages (eagerly loaded — small)
import LoginPage from '../modules/auth/pages/LoginPage'
import ChangePasswordPage from '../modules/auth/pages/ChangePasswordPage'
import AuthLayout from '../layouts/AuthLayout'

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
          <FirstLoginGuard>
            <SMLayout />
          </FirstLoginGuard>
        </RoleGuard>
      </AuthGuard>
    ),
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
    children: dwRoutes,
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
