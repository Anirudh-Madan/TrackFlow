import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes safely.
 * Usage: cn('px-4 py-2', isActive && 'bg-primary-600', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
