import { useRouteError } from 'react-router-dom'
import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Button from '../ui/Button'

/**
 * Route error element for React Router
 */
export function RouteErrorBoundary() {
  const error = useRouteError()

  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(error?.message || '') ||
    /Loading chunk/i.test(error?.message || '') ||
    /error loading dynamically imported module/i.test(error?.message || '')

  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-surface-50 dark:bg-surface-900">
      <div className="card max-w-lg w-full p-6 text-center space-y-5 shadow-xl border border-surface-200 dark:border-surface-800">
        <div className="mx-auto w-14 h-14 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center text-danger-600 dark:text-danger-400">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">
            {isChunkError ? 'New Version Available' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
            {isChunkError
              ? 'A new update was deployed to TrackFlow. Please reload the page to load the latest version.'
              : error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
        </div>

        {error?.message && !isChunkError && (
          <div className="bg-surface-100 dark:bg-surface-800/80 p-3 rounded-lg text-left text-xs font-mono text-danger-700 dark:text-danger-300 overflow-x-auto max-h-32">
            {error.toString()}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button icon={RefreshCw} onClick={handleReload} variant="primary" className="w-full sm:w-auto">
            Reload Application
          </Button>
          <Button icon={Home} onClick={handleGoHome} variant="secondary" className="w-full sm:w-auto">
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Class component Error Boundary wrapper for component trees
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(this.state.error?.message || '') ||
        /Loading chunk/i.test(this.state.error?.message || '')

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="card max-w-md w-full p-6 text-center space-y-4 border border-surface-200 dark:border-surface-800">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              {isChunkError ? 'New Update Available' : 'Page Load Error'}
            </h3>
            <p className="text-xs text-surface-500">
              {isChunkError
                ? 'TrackFlow was updated on the server. Click below to reload.'
                : this.state.error?.message || 'An error occurred while displaying this section.'}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button icon={RefreshCw} size="sm" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
