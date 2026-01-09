export const getApiBase = () => {
  // Priority 1: Use VITE_API_URL if set (for deployment flexibility)
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL
    console.log('🌐 [API] Using VITE_API_URL:', apiUrl)
    return apiUrl.replace(/\/api$/, '') // Remove /api suffix if present
  }
  
  // Runtime production detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // If on production domain, use current protocol and hostname
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      const baseUrl = `${protocol}//${hostname}`
      console.log('🌐 [API] Production detected, using base:', baseUrl)
      return baseUrl
    }
    
    // For test/staging deployments, fall back to production if no VITE_API_URL
    console.log('🌐 [API] Non-production domain detected, falling back to production URL')
    return 'https://thenefol.com'
  }
  
  // Default to production base URL (without /api)
  return 'https://thenefol.com'
}
