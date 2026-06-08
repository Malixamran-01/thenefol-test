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
  /** Path before # — used by crawlers for OG (do not share alone). */
  crawlUrl: string
  /** Primary share link: /product/:slug#/user/product/:slug */
  universalUrl: string
}

/** Primary share link for copy, WhatsApp, Facebook, etc. Includes #/user. */
export function getProductShareLink(slug: string): string {
  return getProductShareUrls(slug).universalUrl
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
  const crawlUrl = `${origin}/product/${pathSlug}`
  const appUrl = `${origin}/#/user/product/${pathSlug}`
  return {
    appUrl,
    crawlUrl,
    universalUrl: `${crawlUrl}#/user/product/${pathSlug}`,
  }
}
