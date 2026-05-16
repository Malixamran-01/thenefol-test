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
