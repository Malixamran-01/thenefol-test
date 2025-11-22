export const getApiBase = () => {
  // Use environment variable if available (highest priority)
  if ((import.meta as any).env?.VITE_API_URL) {
    const apiUrl = (import.meta as any).env.VITE_API_URL
    console.log('🌐 Using API URL from VITE_API_URL:', apiUrl)
    return apiUrl
  }
  
  // Check if we're accessing via ngrok
  const currentHost = window.location.hostname
  const isNgrok = currentHost.includes('ngrok.io') || currentHost.includes('ngrok-free.dev')
  
  // If accessed via ngrok, use the ngrok backend URL
  if (isNgrok) {
    const ngrokBackendUrl = (import.meta as any).env?.VITE_NGROK_BACKEND_URL
    if (ngrokBackendUrl) {
      console.log('🌐 Using ngrok backend URL from VITE_NGROK_BACKEND_URL:', ngrokBackendUrl)
      return ngrokBackendUrl
    }
    
    // If no explicit ngrok backend URL is set, use the same ngrok domain
    // This works if:
    // 1. Backend is also accessible via the same ngrok tunnel (path-based routing)
    // 2. Or you need to set up a separate ngrok tunnel for backend and set VITE_NGROK_BACKEND_URL
    const proto = window.location.protocol || 'https:'
    const sameDomainUrl = `${proto}//${currentHost}`
    console.warn('⚠️ Ngrok detected but VITE_NGROK_BACKEND_URL not set. Using same domain:', sameDomainUrl)
    console.warn('💡 To use a separate backend ngrok URL, set VITE_NGROK_BACKEND_URL in your .env file')
    return sameDomainUrl
  }
  
  // For development and production, use environment variables
  const proto = window.location.protocol || 'http:'
  const host = (import.meta as any).env?.VITE_BACKEND_HOST || (import.meta as any).env?.VITE_API_HOST || window.location.hostname || 'localhost'
  const port = (import.meta as any).env?.VITE_BACKEND_PORT || (import.meta as any).env?.VITE_API_PORT || '2000'
  
  // Ensure we have a valid URL
  if (!host || !port) {
    console.warn('⚠️ API base URL configuration missing, using default https://thenefol.com/api')
    return 'https://thenefol.com/api'
  }
  
  const devUrl = `${proto}//${host}:${port}`
  console.log('🌐 Using development API URL:', devUrl)
  return devUrl
}
