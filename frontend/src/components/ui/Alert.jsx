import { cn } from '../../utils/cn'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

const variants = {
  info: {
    wrapper: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />,
    text: 'text-blue-800 dark:text-blue-300',
  },
  success: {
    wrapper: 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800',
    icon: <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0 mt-0.5" />,
    text: 'text-success-800 dark:text-success-300',
  },
  warning: {
    wrapper: 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800',
    icon: <AlertTriangle className="h-4 w-4 text-warning-500 shrink-0 mt-0.5" />,
    text: 'text-warning-800 dark:text-warning-300',
  },
  danger: {
    wrapper: 'bg-danger-50 border-danger-200 dark:bg-danger-900/20 dark:border-danger-800',
    icon: <AlertCircle className="h-4 w-4 text-danger-500 shrink-0 mt-0.5" />,
    text: 'text-danger-800 dark:text-danger-300',
  },
}

export default function Alert({ variant = 'info', title, children, className }) {
  const config = variants[variant]
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 rounded-xl border text-sm',
        config.wrapper,
        className
      )}
    >
      {config.icon}
      <div className={cn('flex-1', config.text)}>
        {title && <p className="font-medium">{title}</p>}
        {children && <p className={cn('text-sm', title ? 'mt-0.5 opacity-90' : '')}>{children}</p>}
      </div>
    </div>
  )
}
