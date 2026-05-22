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

export function getProductShareUrls(slug: string): ProductShareUrls {
  const origin = getShareSiteOrigin()
  const encoded = encodeURIComponent(String(slug || '').trim())
  return {
    appUrl: `${origin}/#/user/product/${encoded}`,
    crawlUrl: `${origin}/product/${encoded}`,
  }
}
