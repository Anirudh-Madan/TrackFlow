import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AuthGuard from './guards/AuthGuard'
import RoleGuard from './guards/RoleGuard'
import FirstLoginGuard from './guards/FirstLoginGuard'
import AdminLayout from '../layouts/AdminLayout'
import { adminRoutes } from './routes/adminRoutes'

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

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
