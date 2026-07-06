import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

const sizes = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-7xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideClose = false,
  className,
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel
                className={cn(
                  'w-full bg-white dark:bg-surface-800 rounded-2xl shadow-xl',
                  'border border-surface-200 dark:border-surface-700',
                  'flex flex-col max-h-[90vh]',
                  sizes[size],
                  className
                )}
              >
                {/* Header */}
                {(title || !hideClose) && (
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-100 dark:border-surface-700 shrink-0">
                    <div>
                      {title && (
                        <Dialog.Title className="text-base font-semibold text-surface-900 dark:text-surface-100">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                    {!hideClose && (
                      <button
                        onClick={onClose}
                        className="ml-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        aria-label="Close modal"
                        id="modal-close-btn"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 border-t border-surface-100 dark:border-surface-700 flex items-center justify-end gap-3 shrink-0 bg-surface-50/50 dark:bg-surface-800/50 rounded-b-2xl">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
