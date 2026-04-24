/**
 * Aligns with `backend/src/config/rbacCatalog.ts` — used for Layout sidebar gating.
 */
export const Nav = {
  overview: 'nav:overview',
  store: 'nav:store',
  channels: 'nav:channels',
  meta: 'nav:meta',
  google: 'nav:google',
  facebook: 'nav:facebook',
  loyalty: 'nav:loyalty',
  catalog: 'nav:catalog',
  sales: 'nav:sales',
  content: 'nav:content',
  crm: 'nav:crm',
  finance: 'nav:finance',
  marketing: 'nav:marketing',
  affiliate: 'nav:affiliate',
  analytics: 'nav:analytics',
  forms: 'nav:forms',
  team: 'nav:team',
  settings: 'nav:settings',
} as const

/** Granular “Products & catalog” lines — any one shows that sidebar row without `nav:catalog`. */
export const NavCatalog = {
  products: 'nav:catalog:products',
  categories: 'nav:catalog:categories',
  collections: 'nav:catalog:collections',
  variants: 'nav:catalog:variants',
  inventory: 'nav:catalog:inventory',
  warehouses: 'nav:catalog:warehouses',
  discounts: 'nav:catalog:discounts',
} as const

export const NAV_CATALOG_FINE_CODES: string[] = Object.values(NavCatalog)
