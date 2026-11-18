import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DISCOUNT_POPUP,
  isPopupLive,
  normalizeDiscountPopup,
  popupAllowedOnRoute,
  popupDueForVisitor,
  popupProblem,
  toPopupHref,
} from './discountPopup'

const live = { ...DEFAULT_DISCOUNT_POPUP, enabled: true, version: 'v1' }

describe('normalizeDiscountPopup', () => {
  it('fills defaults and cleans values', () => {
    const p = normalizeDiscountPopup({ enabled: true, couponCode: ' save 10 ', delaySeconds: 500, frequency: 'weird', startsAt: 'nope' })
    expect(p.couponCode).toBe('SAVE10')
    expect(p.delaySeconds).toBe(60)
    expect(p.frequency).toBe('once_per_session')
    expect(p.startsAt).toBe('')
    expect(normalizeDiscountPopup(null).enabled).toBe(false)
  })
})

describe('isPopupLive', () => {
  it('respects enabled and the schedule', () => {
    const now = Date.parse('2026-11-18T10:00:00Z')
    expect(isPopupLive({ ...live, enabled: false }, now)).toBe(false)
    expect(isPopupLive(live, now)).toBe(true)
    expect(isPopupLive({ ...live, startsAt: '2026-11-19T00:00:00Z' }, now)).toBe(false)
    expect(isPopupLive({ ...live, endsAt: '2026-11-18T09:00:00Z' }, now)).toBe(false)
    expect(isPopupLive({ ...live, startsAt: '2026-11-17T00:00:00Z', endsAt: '2026-11-20T00:00:00Z' }, now)).toBe(true)
  })
})

describe('popupAllowedOnRoute', () => {
  it('stays off checkout and cart', () => {
    expect(popupAllowedOnRoute(live, '#/user/checkout')).toBe(false)
    expect(popupAllowedOnRoute(live, '#/user/cart')).toBe(false)
    expect(popupAllowedOnRoute(live, '#/user/product/serum')).toBe(true)
  })
  it('home-only popups show on the home page alone', () => {
    const home = { ...live, pages: 'home' as const }
    expect(popupAllowedOnRoute(home, '')).toBe(true)
    expect(popupAllowedOnRoute(home, '#/user/')).toBe(true)
    expect(popupAllowedOnRoute(home, '#/user/shop')).toBe(false)
  })
})

describe('popupDueForVisitor', () => {
  const now = Date.parse('2026-11-18T10:00:00Z')
  it('once per session', () => {
    expect(popupDueForVisitor(live, null, false, now)).toBe(true)
    expect(popupDueForVisitor(live, null, true, now)).toBe(false)
  })
  it('once a day, and again after the popup changes', () => {
    const p = { ...live, frequency: 'once_per_day' as const }
    expect(popupDueForVisitor(p, { version: 'v1', at: now - 3600_000 }, false, now)).toBe(false)
    expect(popupDueForVisitor(p, { version: 'v1', at: now - 25 * 3600_000 }, false, now)).toBe(true)
    expect(popupDueForVisitor(p, { version: 'v0', at: now - 3600_000 }, false, now)).toBe(true)
  })
  it('only once until changed', () => {
    const p = { ...live, frequency: 'once' as const }
    expect(popupDueForVisitor(p, { version: 'v1', at: 0 }, false, now)).toBe(false)
    expect(popupDueForVisitor({ ...p, version: 'v2' }, { version: 'v1', at: 0 }, false, now)).toBe(true)
  })
})

describe('links and validation', () => {
  it('turns store paths into hash routes and rejects unsafe links', () => {
    expect(toPopupHref('/user/shop')).toBe('#/user/shop')
    expect(toPopupHref('#/user/combos')).toBe('#/user/combos')
    expect(toPopupHref('https://example.com/a')).toBe('https://example.com/a')
    expect(toPopupHref('javascript:alert(1)')).toBeNull()
  })
  it('explains what is missing', () => {
    expect(popupProblem({ ...live, heading: '', body: '', image: '' })).toMatch(/heading/)
    expect(popupProblem({ ...live, ctaLink: '' })).toMatch(/link/)
    expect(popupProblem(live)).toBeNull()
  })
})
