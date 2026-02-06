/**
 * Utility functions for handling URLs in the blog application
 */

/**
 * Converts a hash-based URL to a clean URL
 * Example: https://example.com/#/user/blog/9 -> https://example.com/user/blog/9
 */
export const getCleanUrl = (customCanonicalUrl?: string): string => {
  // If a custom canonical URL is provided and doesn't contain hash, use it
  if (customCanonicalUrl && !customCanonicalUrl.includes('#')) {
    return customCanonicalUrl
  }

  const currentUrl = window.location.href
  const baseUrl = currentUrl.split('#')[0].replace(/\/$/, '') // Remove trailing slash
  const hash = window.location.hash || ''
  const cleanPath = hash.replace('#/', '')

  return `${baseUrl}/${cleanPath}`
}

/**
 * Ensures an image URL is absolute
 */
export const getAbsoluteImageUrl = (imageUrl: string, apiBase: string): string => {
  if (!imageUrl) return ''
  
  // Already absolute URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // Relative path starting with /
  if (imageUrl.startsWith('/')) {
    return `${apiBase}${imageUrl}`
  }
  
  // Relative path without /
  return `${apiBase}/${imageUrl}`
}

/**
 * Gets the site base URL without hash
 */
export const getSiteBaseUrl = (): string => {
  const currentUrl = window.location.href
  return currentUrl.split('#')[0].replace(/\/$/, '')
}
