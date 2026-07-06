import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { cn } from '../../utils/cn'
import { logout as apiLogout } from '../../api/endpoints/auth.api'
import { User, LogOut, Moon, Sun, ChevronDown } from 'lucide-react'

export default function ProfileMenu() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'A'

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('trackflow-refresh-token')
      if (refreshToken) {
        await apiLogout(refreshToken)
      }
    } catch (err) {
      console.error('Logout API error:', err)
    } finally {
      localStorage.removeItem('trackflow-refresh-token')
      logout()
      navigate('/login')
    }
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        id="profile-menu-btn"
        className={cn(
          'flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg',
          'hover:bg-surface-100 dark:hover:bg-surface-700',
          'transition-colors duration-150'
        )}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        {user?.name && (
          <span className="text-sm font-medium text-surface-700 dark:text-surface-200 max-w-[120px] truncate hidden sm:block">
            {user.name}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-surface-400 hidden sm:block" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="transform opacity-0 scale-95 translate-y-1"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-95 translate-y-1"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 focus:outline-none z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700">
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5 font-mono">
              {user?.login_id || ''}
            </p>
            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
              {user?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
            </span>
          </div>

          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => {}}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
                      : 'text-surface-700 dark:text-surface-300'
                  )}
                  id="profile-view-btn"
                >
                  <User className="h-4 w-4 text-surface-400" />
                  My Profile
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={toggleTheme}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
                      : 'text-surface-700 dark:text-surface-300'
                  )}
                  id="theme-toggle-btn"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-surface-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-surface-400" />
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              )}
            </Menu.Item>
          </div>

          <div className="py-1 border-t border-surface-100 dark:border-surface-700">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400'
                      : 'text-surface-700 dark:text-surface-300'
                  )}
                  id="logout-btn"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
