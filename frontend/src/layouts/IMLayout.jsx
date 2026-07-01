import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from '../components/layout/Sidebar'
import TopNavbar from '../components/layout/TopNavbar'

export default function IMLayout() {
  return (
    <div className="flex h-dvh bg-surface-50 dark:bg-surface-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top nav */}
        <TopNavbar />

        {/* Page content */}
        <main
          id="im-main-content"
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6"
        >
          <Outlet />
        </main>
      </div>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: '#0f172a',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 10px -6px rgb(0 0 0 / 0.1)',
            fontSize: '13px',
            fontWeight: '500',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </div>
  )
}
