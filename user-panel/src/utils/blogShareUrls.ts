import { getShareSiteOrigin } from './productShareUrls'

/** A post, or just its ID (old callers / notifications that only carry `post_id`). */
export type BlogPostRef = string | number | { id: string | number; slug?: string | null }

export type BlogShareUrls = {
  /** Hash SPA route (in-app navigation / address bar). */
  appUrl: string
  /** Clean SEO URL — thenefol.com/blog/<title-slug>. Canonical, sitemap and share link. */
  canonicalUrl: string
  /** @deprecated kept for old callers; same as canonicalUrl. */
  crawlUrl: string
  /** Primary share link (clean slug URL, OG-friendly). */
  universalUrl: string
}

/** URL segment for a post: its title slug when known, else its numeric ID (the API resolves both). */
export function blogPostSegment(ref: BlogPostRef): string {
  if (ref != null && typeof ref === 'object') {
    const slug = ref.slug ? String(ref.slug).trim() : ''
    return slug ? encodeURIComponent(slug) : String(ref.id)
  }
  return String(ref)
}

/** In-app link: `#/user/blog/<slug>`. */
export function blogPostHref(ref: BlogPostRef): string {
  return `#/user/blog/${blogPostSegment(ref)}`
}

export function getBlogShareUrls(ref: BlogPostRef): BlogShareUrls {
  const origin = getShareSiteOrigin()
  const segment = blogPostSegment(ref)
  const canonicalUrl = `${origin}/blog/${segment}`
  return {
    appUrl: `${origin}/#/user/blog/${segment}`,
    canonicalUrl,
    crawlUrl: canonicalUrl,
    universalUrl: canonicalUrl,
  }
}

/** Primary link for copy, WhatsApp, and all share actions. */
export function getBlogShareLink(ref: BlogPostRef): string {
  return getBlogShareUrls(ref).universalUrl
}

/** Absolute URL for /uploads/ paths used in og:image (must be same-origin for crawlers). */
export function absoluteBlogMediaUrl(url?: string | null): string {
  if (!url || !String(url).trim()) return ''
  const trimmed = String(url).trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const origin = getShareSiteOrigin()
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}
