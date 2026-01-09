/**
 * Get the API base URL with production detection
 * Priority: VITE_API_URL > Production domain detection > Production fallback
 */
export const getApiBaseUrl = (): string => {
  // Priority 1: Use VITE_API_URL if set (for deployment flexibility)
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL
    console.log('🌐 [API] Using VITE_API_URL:', apiUrl)
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If on production domain, use current domain
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      return `${window.location.protocol}//${window.location.host}/api`
    }
    // For any other domain, fall back to production URL
    return 'https://thenefol.com/api'
  }
  // Default to production API URL
  return 'https://thenefol.com/api'
}

