import { getApiBaseUrl } from './apiUrl'

/**
 * The backend now requires a valid staff session on admin endpoints. Some pages call fetch()
 * without an Authorization header, so attach the signed-in staff token to every request that
 * goes to our own API (never to third-party hosts).
 */
function collectApiOrigins(): Set<string> {
  const origins = new Set<string>([window.location.origin])
  const candidates = [getApiBaseUrl(), import.meta.env.VITE_API_URL as string | undefined]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      origins.add(new URL(String(candidate), window.location.origin).origin)
    } catch {
      // ignore malformed values
    }
  }
  return origins
}

export function installAdminAuthFetch() {
  if (typeof window === 'undefined' || (window as any).__nefolAdminAuthFetch) return
  ;(window as any).__nefolAdminAuthFetch = true

  const originalFetch = window.fetch.bind(window)
  let apiOrigins: Set<string> | null = null

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token && token.startsWith('staff_')) {
        const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const url = new URL(rawUrl, window.location.href)
        if (!apiOrigins) apiOrigins = collectApiOrigins()
        if (apiOrigins.has(url.origin) && url.pathname.includes('/api/')) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
          const current = headers.get('Authorization')
          // Missing, or built from an empty localStorage value ("Bearer null")
          if (!current || /^Bearer\s*(null|undefined)?\s*$/i.test(current)) {
            headers.set('Authorization', `Bearer ${token}`)
            return originalFetch(input, { ...init, headers })
          }
        }
      }
    } catch {
      // fall through to the untouched request
    }
    return originalFetch(input, init)
  }
}
