import { cn } from '../../utils/cn'

export default function Card({
  children,
  className,
  padding = true,
  hover = false,
  ...props
}) {
  return (
    <div
      className={cn(
        'card',
        padding && 'p-5',
        hover && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, action }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>{children}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-sm font-semibold text-surface-900 dark:text-surface-100', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }) {
  return (
    <p className={cn('text-xs text-surface-500 dark:text-surface-400 mt-0.5', className)}>
      {children}
    </p>
  )
}
