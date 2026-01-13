/**
 * Get the API base URL with production detection
 * Priority: VITE_API_URL > Production domain detection > Production fallback
 * 
 * IMPORTANT: This function is called at RUNTIME, not build time.
 * VITE_API_URL must be set in Vercel environment variables for test deployments.
 */
export const getApiBaseUrl = (): string => {
  // Priority 1: Check if we're on production domain (SAFETY FIRST)
  // If on production domain, ALWAYS use production API regardless of VITE_API_URL
  // This prevents accidental test backend usage in production
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      const prodUrl = `${window.location.protocol}//${window.location.host}/api`
      console.log('🌐 [API] Production domain detected, using:', prodUrl)
      return prodUrl
    }
  }
  
  // Priority 2: Use VITE_API_URL if set (for test/staging deployments)
  // This is replaced at BUILD TIME by Vite, so it must be set in Vercel build settings
  const viteApiUrl = import.meta.env.VITE_API_URL
  
  if (viteApiUrl) {
    const apiUrl = String(viteApiUrl).trim()
    console.log('🌐 [API] Using VITE_API_URL from environment:', apiUrl)
    const finalUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`
    console.log('🌐 [API] Final API URL:', finalUrl)
    return finalUrl
  }
  
  // Priority 3: Fallback for non-production domains without VITE_API_URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    console.warn('⚠️ [API] VITE_API_URL not set! Test deployment should have VITE_API_URL set in Vercel.')
    console.warn('⚠️ [API] Falling back to production URL. This may cause test actions to affect production!')
    console.warn('⚠️ [API] Current hostname:', hostname)
    return 'https://thenefol.com/api'
  }
  
  // Default to production API URL (server-side rendering)
  console.warn('⚠️ [API] VITE_API_URL not set, defaulting to production')
  return 'https://thenefol.com/api'
}

