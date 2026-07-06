import { cn } from '../../utils/cn'

export default function Input({
  label,
  error,
  helper,
  required,
  icon: Icon,
  iconRight: IconRight,
  className,
  inputClassName,
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 text-surface-400" />
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'input-base',
            Icon && 'pl-9',
            IconRight && 'pr-9',
            error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500',
            inputClassName
          )}
          {...props}
        />
        {IconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <IconRight className="h-4 w-4 text-surface-400" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1">
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-surface-500 dark:text-surface-400">{helper}</p>
      )}
    </div>
  )
}
