import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

export default function Spinner({ size = 'md', className }) {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  }
  return (
    <Loader2
      className={cn('animate-spin text-primary-600 dark:text-primary-400', sizes[size], className)}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-surface-400">Loading…</span>
      </div>
    </div>
  )
}
