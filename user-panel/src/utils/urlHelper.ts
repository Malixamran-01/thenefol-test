/**
 * Utility functions for handling URLs in the blog application
 */

/**
 * Gets the shareable URL for the current page
 * For hash-based routing, this returns the full URL with hash
 * If a custom canonical URL is provided, it uses that instead
 */
export const getShareableUrl = (customCanonicalUrl?: string): string => {
  // If a custom canonical URL is provided and is valid, use it
  if (customCanonicalUrl && customCanonicalUrl.startsWith('http')) {
    return customCanonicalUrl
  }

  // Otherwise, use the current URL with hash (as-is)
  return window.location.href
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
