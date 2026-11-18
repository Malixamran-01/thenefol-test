import { describe, expect, it } from 'vitest'
import * as shared from './adminNav'
import * as backend from '../../backend/src/config/adminNavCatalog'
import { ALL_RBAC_SEED_CODES, NAV_CATALOG_FINE_CODES } from '../../backend/src/config/rbacCatalog'

const { ADMIN_NAV, ADMIN_PAGE_CODES, canOpenAdminPage, findAdminPage, firstAllowedAdminPage } = shared

describe('admin nav catalog', () => {
  it('backend copy matches the shared one', () => {
    expect(backend.ADMIN_NAV).toEqual(ADMIN_NAV)
    expect(backend.PERMISSION_SPLITS).toEqual(shared.PERMISSION_SPLITS)
  })

  it('has unique paths and page codes', () => {
    const paths = ADMIN_NAV.flatMap((s) => s.pages.map((p) => p.path))
    expect(new Set(paths).size).toBe(paths.length)
    expect(new Set(ADMIN_PAGE_CODES).size).toBe(ADMIN_PAGE_CODES.length)
  })

  it('keeps the existing catalog codes and seeds every page code', () => {
    for (const code of NAV_CATALOG_FINE_CODES) expect(ADMIN_PAGE_CODES).toContain(code)
    for (const code of ADMIN_PAGE_CODES) expect(ALL_RBAC_SEED_CODES).toContain(code)
    for (const s of ADMIN_NAV) expect(ALL_RBAC_SEED_CODES).toContain(s.navCode)
  })
})

describe('page access', () => {
  const holder = (...codes: string[]) => (c: string) => codes.includes(c)

  it('the section code opens every page in it', () => {
    expect(canOpenAdminPage(holder('nav:catalog'), '/loginasadmin/product-reviews')).toBe(true)
    expect(canOpenAdminPage(holder('nav:catalog'), '/loginasadmin/orders')).toBe(false)
  })

  it('a page code opens only that page', () => {
    const reviewsOnly = holder('nav:catalog:reviews')
    expect(canOpenAdminPage(reviewsOnly, '/loginasadmin/product-reviews')).toBe(true)
    expect(canOpenAdminPage(reviewsOnly, '/loginasadmin/products')).toBe(false)
    expect(firstAllowedAdminPage(reviewsOnly)).toBe('/loginasadmin/product-reviews')
  })

  it('matches detail pages and leaves unlisted routes alone', () => {
    expect(findAdminPage('/loginasadmin/orders/123')?.page.code).toBe('nav:sales:orders')
    expect(findAdminPage('/loginasadmin/meta-ads')?.section.navCode).toBe('nav:meta')
    expect(canOpenAdminPage(holder(), '/loginasadmin/some-tool')).toBe(true)
  })
})
