import { getShareSiteOrigin } from './productShareUrls'

export type BlogShareUrls = {
  /** Hash-only SPA route (in-app navigation). */
  appUrl: string
  /** Crawlable path — WhatsApp/Facebook fetch this (hash is stripped by crawlers). */
  crawlUrl: string
  /**
   * Path + hash — best for copy/share on hash-router VPS:
   * crawlers read `/blog/:id`, humans keep `#/user/blog/:id` in the SPA.
   */
  universalUrl: string
}

export function getBlogShareUrls(id: string | number): BlogShareUrls {
  const origin = getShareSiteOrigin()
  const postId = String(id)
  const crawlUrl = `${origin}/blog/${postId}`
  const appUrl = `${origin}/#/user/blog/${postId}`
  return {
    appUrl,
    crawlUrl,
    universalUrl: `${crawlUrl}#/user/blog/${postId}`,
  }
}

/** Primary link for clipboard + social (hybrid when possible). */
export function getBlogShareLink(id: string | number): string {
  return getBlogShareUrls(id).universalUrl
}

/** Absolute URL for /uploads/ paths used in og:image (must be same-origin for crawlers). */
export function absoluteBlogMediaUrl(url?: string | null): string {
  if (!url || !String(url).trim()) return ''
  const trimmed = String(url).trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const origin = getShareSiteOrigin()
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}
