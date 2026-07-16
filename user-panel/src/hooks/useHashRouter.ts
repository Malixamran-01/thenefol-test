import { useCallback, useEffect, useRef, useState } from 'react'
import {
  pathFromLocationHash,
  parseHashFromFullUrl,
  scheduleNefolHashRouteChange,
  type NefolHashRouteDetail,
} from '../utils/hashRouteEvents'

/**
 * Resolve the active route on initial page load.
 * Priority: hash fragment (existing behaviour) → pathname (for SEO / clean-URL landings).
 */
function initialPath(): string {
  const hash = window.location.hash
  if (hash && hash.length > 1) return pathFromLocationHash()
  const pathname = window.location.pathname
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    return pathname.toLowerCase().replace(/\/$/, '') || '/user/'
  }
  return '/user/'
}

function initialHash(): string {
  const hash = window.location.hash
  if (hash && hash.length > 1) return hash
  const pathname = window.location.pathname
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    return `#${pathname.toLowerCase().replace(/\/$/, '')}`
  }
  return '#/user/'
}

export type UseHashRouterResult = {
  /** Path without `#`, lowercased, query stripped (e.g. `/user/blog/dashboard`). */
  currentPath: string
  /** Full hash including `#` — updates on query-only changes (for blog chrome). */
  currentHash: string
  /** Navigate to a path. Accepts `/user/foo` or `#/user/foo`. */
  navigate: (path: string) => void
}

/**
 * Single route-change listener for the app.
 *
 * Supports two entry modes:
 *  - Hash-based (existing): `thenefol.com/#/user/shop`
 *  - Clean-URL (SEO): `thenefol.com/user/shop` — detected on first render;
 *    subsequent navigations normalise back to hash so all existing `href="#/…"` links
 *    continue to work without any changes to the 90+ files that use them.
 */
export function useHashRouter(): UseHashRouterResult {
  const pathRef = useRef(initialPath())
  const [currentPath, setCurrentPath] = useState(() => pathRef.current)
  const [currentHash, setCurrentHash] = useState(initialHash)

  const navigate = useCallback((path: string) => {
    const trimmed = path.trim()
    const hash = trimmed.startsWith('#')
      ? trimmed
      : `#${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
    if (window.location.hash === hash) return
    // If the browser is on a clean pathname URL (from a Google / direct landing),
    // normalise back to root so the URL doesn't become `/user/shop#/user/blog`.
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
      history.replaceState(null, '', '/')
    }
    window.location.hash = hash
  }, [])

  useEffect(() => {
    const onHashChange = (e: HashChangeEvent) => {
      const hash = window.location.hash || '#/user/'
      const nextPath = pathFromLocationHash()
      const oldHash = parseHashFromFullUrl(String(e.oldURL ?? ''))

      if (pathRef.current !== nextPath) {
        pathRef.current = nextPath
        setCurrentPath((prev) => (prev === nextPath ? prev : nextPath))
      }

      setCurrentHash((prev) => (prev === hash ? prev : hash))

      const detail: NefolHashRouteDetail = { path: nextPath, hash, oldHash }
      scheduleNefolHashRouteChange(detail)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return { currentPath, currentHash, navigate }
}
