import { getShareSiteOrigin } from './productShareUrls'

/** A community question, or just its ID. The API resolves both slugs and IDs. */
export type QuestionRef = string | number | { id: string | number; slug?: string | null }

/** URL segment: title slug when known, else numeric ID. */
export function questionSegment(ref: QuestionRef): string {
  if (ref != null && typeof ref === 'object') {
    const slug = ref.slug ? String(ref.slug).trim() : ''
    return slug ? encodeURIComponent(slug) : String(ref.id)
  }
  return String(ref)
}

/** In-app link: `#/user/blog/ask-community/<slug>`. */
export function questionHref(ref: QuestionRef): string {
  return `#/user/blog/ask-community/${questionSegment(ref)}`
}

/** Clean SEO URL — thenefol.com/questions/<title-slug>. Canonical, sitemap and share link. */
export function questionCanonicalUrl(ref: QuestionRef): string {
  return `${getShareSiteOrigin()}/questions/${questionSegment(ref)}`
}
