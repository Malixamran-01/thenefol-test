/**
 * Get the API base URL with production detection
 * Always uses production URL - no environment variables
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If on production domain, use current domain
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      return `${window.location.protocol}//${window.location.host}/api`
    }
    // For any other domain, always use production URL
    // This ensures we never use local IPs or development URLs in production builds
    return 'https://thenefol.com/api'
  }
  // Default to production API URL
  return 'https://thenefol.com/api'
}

