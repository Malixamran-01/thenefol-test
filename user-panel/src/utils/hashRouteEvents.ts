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
