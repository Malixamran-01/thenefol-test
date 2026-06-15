import { getShareSiteOrigin } from './productShareUrls'

export type AuthorShareUrls = {
  /** Hash-only SPA route. */
  appUrl: string
  /** Short crawlable path for OG — thenefol.com/a/:id */
  crawlUrl: string
  /** Primary share link (short, OG-friendly). */
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
  const crawlUrl = `${origin}/a/${pathId}`
  const appUrl = `${origin}/#/user/author/${pathId}`
  return {
    appUrl,
    crawlUrl,
    universalUrl: crawlUrl,
  }
}

export function getAuthorShareLink(authorId: string | number): string {
  return getAuthorShareUrls(authorId).universalUrl
}
