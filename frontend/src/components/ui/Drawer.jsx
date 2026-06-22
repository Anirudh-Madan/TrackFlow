import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

const sizes = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]',
  xl: 'w-[600px]',
}

export default function Drawer({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-250"
                enterFrom="translate-x-full opacity-0"
                enterTo="translate-x-0 opacity-100"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0 opacity-100"
                leaveTo="translate-x-full opacity-0"
              >
                <Dialog.Panel
                  className={cn(
                    'pointer-events-auto flex flex-col h-full',
                    'bg-white dark:bg-surface-800',
                    'border-l border-surface-200 dark:border-surface-700',
                    'shadow-xl',
                    sizes[size],
                    className
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface-100 dark:border-surface-700 shrink-0">
                    <div>
                      {title && (
                        <Dialog.Title className="text-base font-semibold text-surface-900 dark:text-surface-100">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="ml-3 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                      aria-label="Close drawer"
                      id="drawer-close-btn"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

                  {/* Footer */}
                  {footer && (
                    <div className="px-5 py-4 border-t border-surface-100 dark:border-surface-700 flex items-center justify-end gap-3 shrink-0">
                      {footer}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
