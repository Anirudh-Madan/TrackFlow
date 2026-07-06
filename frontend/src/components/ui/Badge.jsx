import { cn } from '../../utils/cn'

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
}) {
  const variants = {
    default: 'bg-surface-50 text-surface-700 border-surface-200 dark:bg-surface-800/40 dark:text-surface-300 dark:border-surface-700/50',
    primary: 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800/40',
    success: 'bg-success-50 text-success-700 border-success-100 dark:bg-success-950/40 dark:text-success-400 dark:border-success-800/40',
    warning: 'bg-warning-50 text-warning-700 border-warning-100 dark:bg-warning-950/40 dark:text-warning-400 dark:border-warning-800/40',
    danger:  'bg-danger-50 text-danger-700 border-danger-100 dark:bg-danger-950/40 dark:text-danger-400 dark:border-danger-800/40',
    purple:  'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40',
    blue:    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
  }

  const dotColors = {
    default: 'bg-surface-400',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger:  'bg-danger-500',
    purple:  'bg-purple-500',
    blue:    'bg-blue-500',
  }

  const sizes = {
    sm: 'text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full whitespace-nowrap border transition-colors duration-150',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {(variant === 'success' || variant === 'warning' || variant === 'danger') && (
            <span className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dotColors[variant]
            )} />
          )}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
        </span>
      )}
      <span>{children}</span>
    </span>
  )
}

