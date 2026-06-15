/** Site origin for share links (always the storefront host, not a separate API host). */
export function getShareSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return 'https://thenefol.com'
}

export type ProductShareUrls = {
  /** Hash-only SPA route. */
  appUrl: string
  /** Short crawlable path for OG — thenefol.com/p/:slug */
  crawlUrl: string
  /** Primary share link (short, OG-friendly). */
  universalUrl: string
}

/** Path-safe slug for share URLs (avoid double-encoding). */
export function slugForSharePath(slug: string): string {
  const raw = String(slug || '').trim()
  if (!raw) return ''
  try {
    return encodeURIComponent(decodeURIComponent(raw))
  } catch {
    return encodeURIComponent(raw)
  }
}

export function getProductShareUrls(slug: string): ProductShareUrls {
  const origin = getShareSiteOrigin()
  const pathSlug = slugForSharePath(slug)
  const crawlUrl = `${origin}/p/${pathSlug}`
  const appUrl = `${origin}/#/user/product/${pathSlug}`
  return {
    appUrl,
    crawlUrl,
    universalUrl: crawlUrl,
  }
}

/** Primary link for copy, WhatsApp, and all share actions. */
export function getProductShareLink(slug: string): string {
  return getProductShareUrls(slug).universalUrl
}
