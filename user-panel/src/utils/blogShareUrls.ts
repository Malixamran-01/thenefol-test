import { getShareSiteOrigin } from './productShareUrls'

export type BlogShareUrls = {
  /** Hash-only SPA route (in-app navigation). */
  appUrl: string
  /** Short crawlable path for OG — thenefol.com/b/:id */
  crawlUrl: string
  /** Primary share link (short, OG-friendly). */
  universalUrl: string
}

export function getBlogShareUrls(id: string | number): BlogShareUrls {
  const origin = getShareSiteOrigin()
  const postId = String(id)
  const crawlUrl = `${origin}/b/${postId}`
  const appUrl = `${origin}/#/user/blog/${postId}`
  return {
    appUrl,
    crawlUrl,
    universalUrl: crawlUrl,
  }
}

/** Primary link for copy, WhatsApp, and all share actions. */
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
