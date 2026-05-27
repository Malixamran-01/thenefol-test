/** Site origin for share links (always the storefront host, not a separate API host). */
export function getShareSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return 'https://thenefol.com'
}

export type ProductShareUrls = {
  /** Hash route — opens the product in the SPA immediately (copy link, email). */
  appUrl: string
  /** Crawlable URL — backend serves OG tags + redirects to appUrl (WhatsApp, Facebook). */
  crawlUrl: string
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
  return {
    appUrl: `${origin}/#/user/product/${pathSlug}`,
    crawlUrl: `${origin}/product/${pathSlug}`,
  }
}
