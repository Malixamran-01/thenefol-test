let cachedApiBase: string | null = null
let apiBaseLogged = false

function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol

    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      return `${protocol}//${hostname}`
    }
  }

  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/api$/, '')
  }

  if (typeof window !== 'undefined') {
    return 'https://thenefol.com'
  }

  return 'https://thenefol.com'
}

function logApiBaseOnce(base: string): void {
  if (apiBaseLogged) return
  apiBaseLogged = true

  if (typeof window === 'undefined') return

  const hostname = window.location.hostname
  if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
    // eslint-disable-next-line no-console
    console.info('🌐 [API] Production domain, base:', base)
    return
  }

  if (import.meta.env.VITE_API_URL) {
    // eslint-disable-next-line no-console
    console.info('🌐 [API] Using VITE_API_URL:', base)
    return
  }

  // eslint-disable-next-line no-console
  console.warn('⚠️ [API] VITE_API_URL not set; falling back to:', base, '(hostname:', hostname, ')')
}

export const getApiBase = () => {
  if (cachedApiBase === null) {
    cachedApiBase = resolveApiBase()
    logApiBaseOnce(cachedApiBase)
  }
  return cachedApiBase
}

export const getApiBaseUrl = getApiBase

export const getSiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : ''
    return `${protocol}//${hostname}${portSuffix}`
  }
  return 'https://thenefol.com'
}

/**
 * Resolve CMS/product image paths to a fetchable URL on the current site.
 * - Absolute http(s) URLs unchanged
 * - /IMAGES/ and /uploads/ stay same-origin (nginx → backend)
 * - Other relative paths prefixed with API base
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (
    trimmed.startsWith('/IMAGES/') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/favicon') ||
    trimmed.startsWith('/sw.js')
  ) {
    return trimmed
  }

  const apiBase = getApiBase().replace(/\/$/, '')
  return trimmed.startsWith('/') ? `${apiBase}${trimmed}` : `${apiBase}/${trimmed}`
}

/** Encode path segments so filenames with spaces (e.g. SS LOGO.mp4) load in <video src>. */
function encodePathSegment(segment: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(segment))
  } catch {
    return encodeURIComponent(segment)
  }
}

function encodePathname(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => (seg === '' ? seg : encodePathSegment(seg)))
    .join('/')
}

/**
 * Resolve CMS/media paths and percent-encode spaces and special chars in filenames.
 */
export function encodeMediaUrl(url?: string | null): string {
  const resolved = resolveMediaUrl(url)
  if (!resolved) return ''

  if (/^https?:\/\//i.test(resolved)) {
    try {
      const u = new URL(resolved)
      u.pathname = encodePathname(u.pathname)
      return u.toString()
    } catch {
      return resolved
    }
  }

  const hashIdx = resolved.indexOf('#')
  const withoutHash = hashIdx >= 0 ? resolved.slice(0, hashIdx) : resolved
  const hash = hashIdx >= 0 ? resolved.slice(hashIdx) : ''
  const queryIdx = withoutHash.indexOf('?')
  const pathname = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash
  const query = queryIdx >= 0 ? withoutHash.slice(queryIdx) : ''
  return `${encodePathname(pathname)}${query}${hash}`
}
