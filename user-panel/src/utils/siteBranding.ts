/** Defaults match index.html — overridden when CMS settings load. */
export const SITE_BRANDING_DEFAULTS = {
  site_brand_name: 'NEFOL',
  site_browser_title: 'Best skincare and haircare products | NEFOL',
  site_meta_description:
    'Natural and safe skincare for every skin type. Shop premium haircare and face care made with love.',
} as const

export type SiteBrandingSettings = {
  site_brand_name?: string
  site_meta_description?: string
  site_browser_title?: string
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Updates document title and head meta tags (Safari URL bar, bookmarks, social previews).
 */
export function applySiteBranding(settings: SiteBrandingSettings = {}) {
  const brand =
    (typeof settings.site_brand_name === 'string' && settings.site_brand_name.trim()) ||
    SITE_BRANDING_DEFAULTS.site_brand_name
  const title =
    (typeof settings.site_browser_title === 'string' && settings.site_browser_title.trim()) ||
    SITE_BRANDING_DEFAULTS.site_browser_title
  const description =
    (typeof settings.site_meta_description === 'string' && settings.site_meta_description.trim()) ||
    SITE_BRANDING_DEFAULTS.site_meta_description

  document.title = title
  setMeta('description', description)
  setMeta('application-name', brand)
  setMeta('apple-mobile-web-app-title', brand)
  setMeta('og:site_name', brand, 'property')
  setMeta('og:title', title, 'property')
  setMeta('og:description', description, 'property')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
}
