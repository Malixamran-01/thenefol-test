/**
 * Utility functions for handling image URLs
 * Converts .jpg, .png, .svg to .webp when available
 */

/**
 * Converts image URL extension to .webp if it's .jpg, .png, or .svg
 * This handles cases where CMS returns .jpg but files are actually .webp
 */
export const convertToWebp = (url: string): string => {
  if (!url) return ''
  
  // If already .webp, return as is
  if (url.match(/\.webp$/i)) {
    return url
  }
  
  // Convert .jpg, .jpeg, .png, .svg to .webp
  if (url.match(/\.(jpg|jpeg|png|svg)$/i)) {
    return url.replace(/\.(jpg|jpeg|png|svg)$/i, '.webp')
  }
  
  return url
}

/**
 * Creates an image error handler that tries .webp fallback
 */
export const createImageErrorHandler = (originalSrc: string) => {
  return (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget
    const currentSrc = target.src
    
    // Prevent infinite loop
    if (target.dataset.fallbackAttempted === 'true') {
      return
    }
    
    // Try .webp version if current is .jpg, .png, or .svg
    if (currentSrc.match(/\.(jpg|jpeg|png|svg)$/i)) {
      target.dataset.fallbackAttempted = 'true'
      const webpSrc = convertToWebp(currentSrc)
      console.log(`[Image] Trying .webp fallback: ${currentSrc} -> ${webpSrc}`)
      target.src = webpSrc
    }
  }
}

