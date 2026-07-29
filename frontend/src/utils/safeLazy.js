import { lazy } from 'react'

/**
 * Enhanced lazy loader with automatic retry and stale chunk recovery.
 * Handles Vite/Webpack ChunkLoadError / 'Failed to fetch dynamically imported module'
 * by automatically performing a single page reload to fetch the latest production manifest.
 */
export function safeLazy(importFn) {
  return lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem('page_chunk_reloaded')
    try {
      const module = await importFn()
      // Reset reload flag on successful load
      if (pageHasBeenReloaded) {
        sessionStorage.removeItem('page_chunk_reloaded')
      }
      return module
    } catch (error) {
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /Loading chunk/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '')

      if (isChunkError && !pageHasBeenReloaded) {
        console.warn('[SafeLazy] Stale or missing chunk detected after build update. Reloading page...')
        sessionStorage.setItem('page_chunk_reloaded', 'true')
        window.location.reload()
        return new Promise(() => {}) // keep promise pending while page reloads
      }

      throw error
    }
  })
}
