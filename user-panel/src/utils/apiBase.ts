export const getApiBase = () => {
  // Priority 1: Check if we're on production domain (SAFETY FIRST)
  // If on production domain, ALWAYS use production API regardless of VITE_API_URL
  // This prevents accidental test backend usage in production
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      const baseUrl = `${protocol}//${hostname}`
      console.log('🌐 [API] Production domain detected, using base:', baseUrl)
      return baseUrl
    }
  }
  
  // Priority 2: Use VITE_API_URL if set (for test/staging deployments)
  // This is replaced at BUILD TIME by Vite, so it must be set in Vercel build settings
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL
    console.log('🌐 [API] Using VITE_API_URL:', apiUrl)
    return apiUrl.replace(/\/api$/, '') // Remove /api suffix if present
  }
  
  // Priority 3: Fallback for non-production domains without VITE_API_URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    console.warn('⚠️ [API] VITE_API_URL not set! Test deployment should have VITE_API_URL set in Vercel.')
    console.warn('⚠️ [API] Falling back to production URL. This may cause test actions to affect production!')
    console.warn('⚠️ [API] Current hostname:', hostname)
    return 'https://thenefol.com'
  }
  
  // Default to production base URL (without /api)
  return 'https://thenefol.com'
}

// Backward-compatible alias used by newer service modules.
export const getApiBaseUrl = getApiBase

/**
 * Returns the absolute origin of the current site (no trailing slash, no path).
 * Mirrors getApiBase() but for the *frontend* URL, not the backend API.
 *
 * Examples:
 *   Production  → "https://thenefol.com"
 *   Test/local  → "http://localhost:2001" or the Vercel preview URL
 *
 * Use this when you need to build a full absolute URL for display, sharing,
 * or linking across environments (e.g. "https://thenefol.com/#/user/terms-of-service").
 * For in-app SPA navigation just use hash links ("#/user/terms-of-service") — they
 * are already environment-agnostic.
 */
export const getSiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : ''
    return `${protocol}//${hostname}${portSuffix}`
  }
  return 'https://thenefol.com'
}
