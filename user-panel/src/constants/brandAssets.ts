/**
 * Brand assets live in the production `IMAGES/` tree (gitignored, deployed separately).
 * Do not add copies under `user-panel/public/IMAGES/`.
 */

/** Encode filename segments so paths with spaces work on all servers/CDNs. */
export function brandImagePath(filename: string): string {
  return `/IMAGES/${filename.split('/').map(encodeURIComponent).join('/')}`
}

export const BRAND_ICON_SRC = brandImagePath('NEFOL icon.png')
export const BRAND_LOGO_WIDE_SRC = brandImagePath('NEFOL wide.png')
export const BRAND_LOGO_LIGHT_SRC = brandImagePath('light theme logo.webp')
/** Absolute URL for meta tags (spaces encoded). */
export const BRAND_ICON_OG_URL = 'https://thenefol.com/IMAGES/NEFOL%20icon.png'
