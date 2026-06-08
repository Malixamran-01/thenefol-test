import { getShareSiteOrigin } from './productShareUrls'

export type AuthorShareUrls = {
  /** Hash-only SPA route. */
  appUrl: string
  /** Crawlable path — WhatsApp/Facebook fetch this for OG tags. */
  crawlUrl: string
  /** Path + hash — copy/share on VPS hash routing. */
  universalUrl: string
}

export function authorIdForSharePath(authorId: string | number): string {
  const raw = String(authorId || '').trim()
  if (!raw) return ''
  try {
    return encodeURIComponent(decodeURIComponent(raw))
  } catch {
    return encodeURIComponent(raw)
  }
}

export function getAuthorShareUrls(authorId: string | number): AuthorShareUrls {
  const origin = getShareSiteOrigin()
  const pathId = authorIdForSharePath(authorId)
  const crawlUrl = `${origin}/author/${pathId}`
  const appUrl = `${origin}/#/user/author/${pathId}`
  return {
    appUrl,
    crawlUrl,
    universalUrl: `${crawlUrl}#/user/author/${pathId}`,
  }
}

export function getAuthorShareLink(authorId: string | number): string {
  return getAuthorShareUrls(authorId).universalUrl
}
