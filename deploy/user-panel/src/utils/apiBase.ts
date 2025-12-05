export const getApiBase = () => {
  // Runtime production detection - always use production URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // CRITICAL: Production check - always use production domain
    // If on production domain, use current protocol and hostname
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      const baseUrl = `${protocol}//${hostname}`
      console.log('🌐 [API] Production detected, using base:', baseUrl)
      return baseUrl
    }
    
    // For any other domain (including localhost), use production URL
    // This ensures we never use local IPs or development URLs in production builds
    console.log('🌐 [API] Non-production domain detected, using production URL')
    return 'https://thenefol.com'
  }
  
  // Default to production base URL (without /api)
  return 'https://thenefol.com'
}
