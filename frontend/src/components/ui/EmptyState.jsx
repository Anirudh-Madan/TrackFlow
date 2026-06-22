import { cn } from '../../utils/cn'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {Icon && (
        <div className="mb-4 p-4 rounded-2xl bg-surface-100 dark:bg-surface-800">
          <Icon className="h-8 w-8 text-surface-400 dark:text-surface-500" />
        </div>
      )}
      {title && (
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-surface-500 dark:text-surface-400 max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
