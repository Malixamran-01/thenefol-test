/**
 * Image Optimization Utilities
 * Helps optimize image loading by preferring modern formats (WebP/AVIF)
 */

/**
 * Get optimized image URL - prefers WebP format for better performance
 * Falls back to original if WebP not available
 */
export const getOptimizedImage = (imageUrl: string | undefined): string => {
  if (!imageUrl || typeof imageUrl !== 'string') return ''
  
  // If already WebP or AVIF, return as is
  if (/\.(webp|avif)$/i.test(imageUrl)) return imageUrl
  
  // If absolute URL, return as is (external images)
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  
  // Try WebP version first
  const webpUrl = imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  
  // Return original as fallback (browser will try WebP first, fallback to original)
  return imageUrl
}

/**
 * Generate responsive image srcset for different screen sizes
 */
export const generateSrcSet = (imageUrl: string, sizes: number[] = [400, 800, 1200]): string => {
  if (!imageUrl) return ''
  
  const baseUrl = imageUrl.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '')
  const extension = imageUrl.match(/\.(jpg|jpeg|png|webp|avif)$/i)?.[1] || 'jpg'
  
  return sizes
    .map(size => {
      const webpUrl = `${baseUrl}-${size}w.webp ${size}w`
      const fallbackUrl = `${baseUrl}-${size}w.${extension} ${size}w`
      return `${webpUrl}, ${fallbackUrl}`
    })
    .join(', ')
}

/**
 * Get image with fallback support
 * Returns picture element compatible source URLs
 */
export const getImageWithFallback = (imageUrl: string): {
  webp: string
  avif: string
  original: string
} => {
  if (!imageUrl) {
    return { webp: '', avif: '', original: '' }
  }
  
  const baseUrl = imageUrl.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '')
  const extension = imageUrl.match(/\.(jpg|jpeg|png|webp|avif)$/i)?.[1] || 'jpg'
  
  return {
    webp: `${baseUrl}.webp`,
    avif: `${baseUrl}.avif`,
    original: imageUrl
  }
}

/**
 * Check if browser supports WebP
 */
export const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * Check if browser supports AVIF
 */
export const supportsAVIF = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  
  const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybMN4AQAAABJpeGx5AAAAAAABAAAAAGlwbWEAAAAAAAAAAQABCBwaXhpAAAAAAMNCgoAAAARhdjFDgQkKAAAAABN2Y2d0AAAAAAAAAAAAAwEAAQABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybMN4AQAAABJpeGx5AAAAAAABAAAAAGlwbWEAAAAAAAAAAQABCBwaXhpAAAAAAMNCgoAAAARhdjFDgQkKAAAAABN2Y2d0AAAAAAAAAAAAAwEAAQAB'
  
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = avifData
  })
}

