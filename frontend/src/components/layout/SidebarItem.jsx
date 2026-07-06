import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function SidebarItem({
  to,
  icon: Icon,
  label,
  badge,
  collapsed,
  end = false,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          'hover:bg-surface-100 dark:hover:bg-surface-700/60',
          isActive
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
            : 'text-surface-600 dark:text-surface-400',
          collapsed ? 'justify-center px-2' : ''
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-600 rounded-full" />
          )}

          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300'
            )}
          />

          {!collapsed && (
            <span className="flex-1 truncate">{label}</span>
          )}

          {!collapsed && badge !== undefined && badge > 0 && (
            <span className="ml-auto min-w-[18px] h-[18px] text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 flex items-center justify-center px-1">
              {badge > 99 ? '99+' : badge}
            </span>
          )}

          {/* Tooltip for collapsed */}
          {collapsed && (
            <div className="absolute left-full ml-2.5 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-lg">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  )
}

export function SidebarGroup({
  label,
  icon: Icon,
  children,
  collapsed,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {children}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/60 hover:text-surface-900 dark:hover:text-surface-200'
        )}
        aria-expanded={open}
      >
        {Icon && (
          <Icon className="h-[18px] w-[18px] shrink-0 text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300 transition-colors" />
        )}
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-surface-400 transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        />
      </button>

      {open && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-surface-200 dark:border-surface-700 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  )
}
