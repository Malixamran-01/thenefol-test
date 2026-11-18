/**
 * Storefront discount popup (the offer modal shown when the site loads).
 *
 * Admin → Store & homepage → Discount popup saves it as the CMS section `discount_popup`
 * on the `home` page. The storefront reads that section, checks the schedule, page and how
 * often this visitor has seen it, then opens the modal after a short delay.
 */

export type PopupFrequency = 'every_visit' | 'once_per_session' | 'once_per_day' | 'once'
export type PopupPages = 'all' | 'home'
export type PopupLayout = 'side' | 'stacked'

export interface DiscountPopupContent {
  enabled: boolean
  /** Image URL (uploaded in admin). Optional: the modal works without one. */
  image: string
  imageAlt: string
  /** Small line above the heading, e.g. "Limited time" */
  eyebrow: string
  heading: string
  body: string
  /** Shown with a Copy button when set */
  couponCode: string
  /** Line under the code, e.g. "Use at checkout · Min. order ₹499" */
  couponNote: string
  ctaLabel: string
  /** Store path (#/user/shop, /user/shop) or a full https:// URL */
  ctaLink: string
  dismissLabel: string
  delaySeconds: number
  frequency: PopupFrequency
  pages: PopupPages
  layout: PopupLayout
  /** ISO date-times; empty means no limit */
  startsAt: string
  endsAt: string
  /** Changes on every save, so visitors who closed an older popup see the new one */
  version: string
}

export const DISCOUNT_POPUP_SECTION = 'discount_popup'
export const POPUP_FREQUENCIES: { value: PopupFrequency; label: string }[] = [
  { value: 'once_per_session', label: 'Once per visit (until the browser tab is closed)' },
  { value: 'once_per_day', label: 'Once a day' },
  { value: 'once', label: 'Only once (until the popup is changed)' },
  { value: 'every_visit', label: 'Every time the site is opened' },
]
export const MAX_POPUP_DELAY = 60
/** sessionStorage key: the popup's code, so checkout can fill it in for the visitor */
export const POPUP_COUPON_KEY = 'nf_popup_coupon'

export const DEFAULT_DISCOUNT_POPUP: DiscountPopupContent = {
  enabled: false,
  image: '',
  imageAlt: '',
  eyebrow: 'Welcome offer',
  heading: 'Get 10% off your first order',
  body: 'Natural skincare and haircare, made with care. Use the code below at checkout.',
  couponCode: '',
  couponNote: 'Apply at checkout',
  ctaLabel: 'Shop now',
  ctaLink: '#/user/shop',
  dismissLabel: 'No thanks',
  delaySeconds: 3,
  frequency: 'once_per_session',
  pages: 'all',
  layout: 'side',
  startsAt: '',
  endsAt: '',
  version: '',
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback
const validDate = (v: unknown) => {
  const s = str(v, 40)
  return s && !Number.isNaN(Date.parse(s)) ? s : ''
}

/** Saved CMS content → a complete popup, with anything missing or invalid set to its default. */
export function normalizeDiscountPopup(raw: unknown): DiscountPopupContent {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_DISCOUNT_POPUP
  const delay = Number(c.delaySeconds)
  return {
    enabled: c.enabled === true,
    image: str(c.image, 1000),
    imageAlt: str(c.imageAlt, 200),
    eyebrow: str(c.eyebrow, 60),
    heading: str(c.heading, 120),
    body: str(c.body, 600),
    couponCode: str(c.couponCode, 40).toUpperCase().replace(/\s+/g, ''),
    couponNote: str(c.couponNote, 120),
    ctaLabel: str(c.ctaLabel, 40),
    ctaLink: str(c.ctaLink, 500),
    dismissLabel: str(c.dismissLabel, 40),
    delaySeconds: Number.isFinite(delay) ? Math.min(MAX_POPUP_DELAY, Math.max(0, Math.round(delay))) : d.delaySeconds,
    frequency: oneOf(c.frequency, ['every_visit', 'once_per_session', 'once_per_day', 'once'] as const, d.frequency),
    pages: oneOf(c.pages, ['all', 'home'] as const, d.pages),
    layout: oneOf(c.layout, ['side', 'stacked'] as const, d.layout),
    startsAt: validDate(c.startsAt),
    endsAt: validDate(c.endsAt),
    version: str(c.version, 40),
  }
}

/** Why a popup can't go live, or null when it is ready. Shown in admin before saving. */
export function popupProblem(p: DiscountPopupContent): string | null {
  if (!p.heading && !p.body && !p.image) return 'Add a heading, some text or an image.'
  if (p.ctaLabel && !p.ctaLink) return 'Add a link for the button, or clear the button text.'
  if (p.ctaLink && !toPopupHref(p.ctaLink)) return 'The button link must be a store page (like #/user/shop) or an https:// address.'
  if (p.startsAt && p.endsAt && Date.parse(p.endsAt) <= Date.parse(p.startsAt)) return 'The end time must be after the start time.'
  return null
}

/** Inside its start/end window (and switched on). */
export function isPopupLive(p: DiscountPopupContent, now = Date.now()): boolean {
  if (!p.enabled) return false
  if (p.startsAt && now < Date.parse(p.startsAt)) return false
  if (p.endsAt && now >= Date.parse(p.endsAt)) return false
  return true
}

/** Pages where an offer modal would get in the way of finishing a task. */
const BLOCKED_ROUTES = /^#\/user\/(checkout|cart|login|signup|register|reset-password|forgot-password|order-confirmation|order-success|payment|social|blog|editor)\b/i

export function isHomeRoute(hash: string): boolean {
  const h = (hash || '').split('?')[0]
  return h === '' || h === '#' || h === '#/' || /^#\/user\/?$/.test(h)
}

export function popupAllowedOnRoute(p: DiscountPopupContent, hash: string): boolean {
  if (BLOCKED_ROUTES.test(hash || '')) return false
  return p.pages === 'all' || isHomeRoute(hash)
}

export interface PopupSeen {
  version: string
  at: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Whether this visitor should see the popup now.
 * `stored` is what this browser remembers (localStorage); `seenThisSession` comes from sessionStorage.
 */
export function popupDueForVisitor(
  p: DiscountPopupContent,
  stored: PopupSeen | null,
  seenThisSession: boolean,
  now = Date.now(),
): boolean {
  const sameVersion = !!stored && stored.version === p.version
  switch (p.frequency) {
    case 'every_visit':
      return true
    case 'once_per_session':
      return !seenThisSession
    case 'once_per_day':
      return !sameVersion || now - stored!.at >= DAY_MS
    case 'once':
      return !sameVersion
  }
}

/** Button link → a safe href. Store paths become hash routes; only http(s) for other sites. */
export function toPopupHref(link: string): string | null {
  const l = (link || '').trim()
  if (!l) return null
  if (/^#\//.test(l)) return l
  if (/^\/user(\/|$)/.test(l)) return `#${l}`
  if (/^user\//.test(l)) return `#/${l}`
  if (/^https?:\/\/[^\s]+$/i.test(l)) return l
  return null
}
