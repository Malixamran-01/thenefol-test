/** Dispatched from the single `hashchange` listener in `App` (after path/hash derived). */
export const NEFOL_HASH_ROUTE_CHANGE = 'nefol-hash-route-changed'

export type NefolHashRouteDetail = {
  /** Normalized path without `#`, lowercased, query stripped (e.g. `/user/blog`). */
  path: string
  /** Full hash including `#` (e.g. `#/user/blog?tab=x`). */
  hash: string
  /** Previous full hash from `HashChangeEvent.oldURL` (may be `""`). */
  oldHash: string
}

const scheduleMicrotask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask.bind(globalThis)
    : (fn: () => void) => void Promise.resolve().then(fn)

let routeChangeFlushScheduled = false
let routeChangePending: NefolHashRouteDetail | null = null

/**
 * Dispatches `NEFOL_HASH_ROUTE_CHANGE` on a **microtask**, not synchronously inside `hashchange`.
 * Safari can re-enter `hashchange` / layout when listeners mutate `location` or scroll; deferring
 * breaks synchronous feedback loops while keeping a single coalesced event per tick burst.
 */
export function scheduleNefolHashRouteChange(detail: NefolHashRouteDetail): void {
  routeChangePending = detail
  if (routeChangeFlushScheduled) return
  routeChangeFlushScheduled = true
  scheduleMicrotask(() => {
    routeChangeFlushScheduled = false
    const d = routeChangePending
    routeChangePending = null
    if (!d || typeof window === 'undefined') return
    try {
      window.dispatchEvent(new CustomEvent<NefolHashRouteDetail>(NEFOL_HASH_ROUTE_CHANGE, { detail: d }))
    } catch {
      /* ignore */
    }
  })
}

export function pathFromLocationHash(): string {
  return (window.location.hash || '#/user/').replace('#', '').toLowerCase().split('?')[0]
}

export function parseHashFromFullUrl(url: string): string {
  try {
    const idx = url.indexOf('#')
    if (idx === -1) return ''
    return url.slice(idx) || ''
  } catch {
    return ''
  }
}
