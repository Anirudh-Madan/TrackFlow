import { cn } from '../../utils/cn'

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
}) {
  const variants = {
    default: 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300',
    danger:  'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300',
    purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
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
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
