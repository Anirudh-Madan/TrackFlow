import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-xs border border-primary-700/20',
  secondary: 'bg-white hover:bg-surface-50 active:bg-surface-100 text-surface-700 border border-surface-300 shadow-xs dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-200 dark:border-surface-600',
  ghost:     'hover:bg-surface-100 active:bg-surface-200 text-surface-600 dark:hover:bg-surface-700 dark:text-surface-300',
  danger:    'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white shadow-xs border border-danger-700/20',
  success:   'bg-success-600 hover:bg-success-700 text-white shadow-xs',
  link:      'text-primary-600 hover:text-primary-700 dark:text-primary-400 underline-offset-4 hover:underline p-0 h-auto',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-lg',
  xl: 'h-11 px-6 text-base gap-2 rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'select-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      {children && <span>{children}</span>}
      {IconRight && !loading && <IconRight className="h-4 w-4 shrink-0" />}
    </button>
  )
}
