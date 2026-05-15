import { useCallback, useEffect, useRef, useState } from 'react'
import {
  pathFromLocationHash,
  parseHashFromFullUrl,
  scheduleNefolHashRouteChange,
  type NefolHashRouteDetail,
} from '../utils/hashRouteEvents'

function readHash(): string {
  return window.location.hash || '#/user/'
}

export type UseHashRouterResult = {
  /** Hash path without `#`, lowercased, query stripped (e.g. `/user/blog/dashboard`). */
  currentPath: string
  /** Full hash including `#` — updates on query-only changes (for blog chrome). */
  currentHash: string
  /** Sets `window.location.hash` (`path` may be `/user/foo` or `#/user/foo`). */
  navigate: (path: string) => void
}

/**
 * Single `hashchange` listener for the app. Dispatches `NEFOL_HASH_ROUTE_CHANGE` for
 * subscribers (badges, ban check, blog nav) without additional listeners in `App`.
 */
export function useHashRouter(): UseHashRouterResult {
  const pathRef = useRef(pathFromLocationHash())
  const [currentPath, setCurrentPath] = useState(() => pathRef.current)
  const [currentHash, setCurrentHash] = useState(readHash)

  const navigate = useCallback((path: string) => {
    const trimmed = path.trim()
    const hash = trimmed.startsWith('#')
      ? trimmed
      : `#${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
    if (window.location.hash === hash) return
    window.location.hash = hash
  }, [])

  useEffect(() => {
    const onHashChange = (e: HashChangeEvent) => {
      const hash = readHash()
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
