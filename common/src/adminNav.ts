/**
 * Every admin-panel page, grouped by sidebar section, with the permission that opens it.
 *
 * Access rule: a staff member can open a page when they hold the section's `nav:*` code
 * (the whole section) OR that page's own code (just that page). Admins see everything.
 *
 * Used by the admin sidebar, the admin route guard, the Roles & permissions screen and the
 * per-staff page list. `backend/src/config/adminNavCatalog.ts` is a copy for the backend
 * (its tsconfig can't import this folder); `adminNav.test.ts` fails if they drift apart.
 */

export type AdminNavPage = {
  path: string
  label: string
  /** Page-level permission. Single-page sections reuse the section code. */
  code: string
  /** Other routes that belong to this page (detail pages, sub-tabs) */
  alsoMatches?: string[]
}

export type AdminNavSection = {
  id: string
  label: string
  /** Grants every page in the section */
  navCode: string
  pages: AdminNavPage[]
}

const A = '/loginasadmin'

export const ADMIN_NAV: AdminNavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    navCode: 'nav:overview',
    pages: [{ path: `${A}/dashboard`, label: 'Dashboard', code: 'nav:overview' }],
  },
  {
    id: 'sales',
    label: 'Sales & e-commerce',
    navCode: 'nav:sales',
    pages: [
      { path: `${A}/orders`, label: 'Orders', code: 'nav:sales:orders', alsoMatches: [`${A}/orders/`] },
      { path: `${A}/unified-sales`, label: 'Unified sales', code: 'nav:sales:unified_sales' },
      { path: `${A}/shipments`, label: 'Shipments', code: 'nav:sales:shipments' },
      { path: `${A}/returns`, label: 'Returns', code: 'nav:sales:returns' },
      { path: `${A}/pos`, label: 'POS system', code: 'nav:sales:pos' },
      { path: `${A}/cart-checkout`, label: 'Cart & checkout', code: 'nav:sales:cart_checkout' },
    ],
  },
  {
    id: 'catalog',
    label: 'Products & catalog',
    navCode: 'nav:catalog',
    pages: [
      { path: `${A}/products`, label: 'Products', code: 'nav:catalog:products', alsoMatches: [`${A}/products/`] },
      { path: `${A}/product-reviews`, label: 'Reviews', code: 'nav:catalog:reviews' },
      { path: `${A}/google-reviews`, label: 'Google reviews', code: 'nav:catalog:google_reviews' },
      { path: `${A}/concerns`, label: 'Shop by Concern', code: 'nav:catalog:concerns' },
      { path: `${A}/categories`, label: 'Catalog (categories)', code: 'nav:catalog:categories' },
      { path: `${A}/product-collections`, label: 'Product collections', code: 'nav:catalog:collections' },
      { path: `${A}/product-variants`, label: 'Product variants', code: 'nav:catalog:variants' },
      { path: `${A}/inventory`, label: 'Inventory', code: 'nav:catalog:inventory' },
      { path: `${A}/warehouses`, label: 'Warehouses', code: 'nav:catalog:warehouses' },
      { path: `${A}/discounts`, label: 'Discounts', code: 'nav:catalog:discounts' },
    ],
  },
  {
    id: 'crm',
    label: 'Customer & CRM',
    navCode: 'nav:crm',
    pages: [
      { path: `${A}/customers`, label: 'Customers', code: 'nav:crm:customers', alsoMatches: [`${A}/customers/`] },
      { path: `${A}/users`, label: 'Users', code: 'nav:crm:users', alsoMatches: [`${A}/users/`] },
      { path: `${A}/user-profiles`, label: 'User profiles', code: 'nav:crm:user_profiles' },
      { path: `${A}/user-notifications`, label: 'User notifications', code: 'nav:crm:user_notifications' },
      { path: `${A}/customer-segmentation`, label: 'Customer segmentation', code: 'nav:crm:segmentation' },
      { path: `${A}/custom-audience`, label: 'Custom audience', code: 'nav:crm:custom_audience' },
      { path: `${A}/whatsapp-subscriptions`, label: 'WhatsApp subscriptions', code: 'nav:crm:whatsapp_subscriptions' },
      { path: `${A}/whatsapp-chat`, label: 'WhatsApp chat', code: 'nav:crm:whatsapp_chat' },
      { path: `${A}/whatsapp-management`, label: 'WhatsApp management', code: 'nav:crm:whatsapp_management' },
      { path: `${A}/whatsapp-notifications`, label: 'WhatsApp notifications', code: 'nav:crm:whatsapp_notifications' },
      { path: `${A}/journey-funnel`, label: 'Journey funnel', code: 'nav:crm:journey_funnel' },
      { path: `${A}/journey-tracking`, label: 'Journey tracking', code: 'nav:crm:journey_tracking' },
      { path: `${A}/live-chat`, label: 'Live chat', code: 'nav:crm:live_chat' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & insights',
    navCode: 'nav:analytics',
    pages: [
      { path: `${A}/analytics`, label: 'Analytics', code: 'nav:analytics:analytics' },
      { path: `${A}/advanced-analytics`, label: 'Advanced analytics', code: 'nav:analytics:advanced' },
      { path: `${A}/actionable-analytics`, label: 'Actionable analytics', code: 'nav:analytics:actionable' },
      { path: `${A}/system/audit-logs`, label: 'Audit logs', code: 'nav:analytics:audit_logs' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & payments',
    navCode: 'nav:finance',
    pages: [
      { path: `${A}/invoices`, label: 'Invoices', code: 'nav:finance:invoices' },
      { path: `${A}/invoice-settings`, label: 'Invoice settings', code: 'nav:finance:invoice_settings' },
      { path: `${A}/payment`, label: 'Payment', code: 'nav:finance:payment' },
      { path: `${A}/payment-options`, label: 'Payment options', code: 'nav:finance:payment_options' },
      { path: `${A}/tax`, label: 'Tax', code: 'nav:finance:tax' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    navCode: 'nav:marketing',
    pages: [{ path: `${A}/marketing`, label: 'Marketing', code: 'nav:marketing' }],
  },
  {
    id: 'content',
    label: 'Content & CMS',
    navCode: 'nav:content',
    pages: [
      { path: `${A}/cms`, label: 'CMS', code: 'nav:content:cms' },
      { path: `${A}/blog-requests`, label: 'Blog', code: 'nav:content:blog' },
      { path: `${A}/ask-community`, label: 'Ask Community', code: 'nav:content:ask_community' },
      { path: `${A}/author-management`, label: 'Authors', code: 'nav:content:authors' },
      { path: `${A}/video-manager`, label: 'Video manager', code: 'nav:content:video_manager' },
      { path: `${A}/static-pages`, label: 'Static pages', code: 'nav:content:static_pages' },
      { path: `${A}/community-management`, label: 'Community management', code: 'nav:content:community' },
    ],
  },
  {
    id: 'affiliate',
    label: 'Affiliate & monetization',
    navCode: 'nav:affiliate',
    pages: [
      { path: `${A}/affiliate-program`, label: 'Affiliate program', code: 'nav:affiliate:program' },
      { path: `${A}/affiliate-requests`, label: 'Affiliate requests', code: 'nav:affiliate:requests' },
      { path: `${A}/collab-requests`, label: 'Collab requests', code: 'nav:affiliate:collab_requests' },
      { path: `${A}/collab-tasks`, label: 'Collab tasks', code: 'nav:affiliate:collab_tasks' },
      { path: `${A}/coin-withdrawals`, label: 'Coin withdrawals', code: 'nav:affiliate:coin_withdrawals' },
      { path: `${A}/loyalty-program-management`, label: 'Loyalty program management', code: 'nav:affiliate:loyalty_management' },
    ],
  },
  {
    id: 'loyalty',
    label: 'Loyalty & rewards',
    navCode: 'nav:loyalty',
    pages: [
      { path: `${A}/loyalty-program`, label: 'Loyalty program', code: 'nav:loyalty:program' },
      { path: `${A}/cashback`, label: 'Cashback system', code: 'nav:loyalty:cashback' },
    ],
  },
  {
    id: 'forms',
    label: 'Forms & communication',
    navCode: 'nav:forms',
    pages: [
      { path: `${A}/forms`, label: 'Forms', code: 'nav:forms:forms' },
      { path: `${A}/form-builder`, label: 'Form builder', code: 'nav:forms:builder' },
      { path: `${A}/form-submissions`, label: 'Form submissions', code: 'nav:forms:submissions' },
      { path: `${A}/contact-messages`, label: 'Contact messages', code: 'nav:forms:contact_messages' },
      { path: `${A}/system/alerts`, label: 'Alert settings', code: 'nav:forms:alerts' },
    ],
  },
  {
    id: 'store',
    label: 'Store & homepage',
    navCode: 'nav:store',
    pages: [
      { path: `${A}/store`, label: 'Online store', code: 'nav:store:online_store' },
      { path: `${A}/homepage-layout`, label: 'Homepage layout', code: 'nav:store:homepage' },
      { path: `${A}/discount-popup`, label: 'Discount popup', code: 'nav:store:discount_popup' },
      { path: `${A}/theme`, label: 'Theme customizer', code: 'nav:store:theme' },
    ],
  },
  {
    id: 'channels',
    label: 'Sales channels',
    navCode: 'nav:channels',
    pages: [
      { path: `${A}/marketplaces`, label: 'Marketplaces', code: 'nav:channels:marketplaces' },
      { path: `${A}/fb-shop`, label: 'FB Shop integration', code: 'nav:channels:fb_shop' },
    ],
  },
  {
    id: 'meta',
    label: 'Meta',
    navCode: 'nav:meta',
    pages: [
      { path: `${A}/meta`, label: 'Meta (Business & Ads)', code: 'nav:meta', alsoMatches: [`${A}/meta-ads`, `${A}/meta-business`] },
    ],
  },
  {
    id: 'google',
    label: 'Google & YouTube',
    navCode: 'nav:google',
    pages: [{ path: `${A}/google`, label: 'Google & YouTube', code: 'nav:google' }],
  },
  {
    id: 'facebook',
    label: 'Facebook & Instagram',
    navCode: 'nav:facebook',
    pages: [{ path: `${A}/facebook`, label: 'Facebook & Instagram', code: 'nav:facebook' }],
  },
  {
    id: 'team',
    label: 'Team & access',
    navCode: 'nav:team',
    pages: [
      { path: `${A}/system/staff`, label: 'Staff accounts', code: 'nav:team:staff' },
      { path: `${A}/system/admin-management`, label: 'Admin management', code: 'nav:team:admin_management' },
      { path: `${A}/system/roles`, label: 'Roles & permissions', code: 'nav:team:roles' },
      { path: `${A}/account-security`, label: 'Account security', code: 'nav:team:account_security' },
    ],
  },
]

/** Page codes that differ from their section code (the granular ones), with labels. */
export const ADMIN_PAGE_PERMISSIONS: { section: string; sectionLabel: string; navCode: string; pages: { code: string; label: string }[] }[] =
  ADMIN_NAV.filter((s) => s.pages.some((p) => p.code !== s.navCode)).map((s) => ({
    section: s.id,
    sectionLabel: s.label,
    navCode: s.navCode,
    pages: s.pages.map((p) => ({ code: p.code, label: p.label })),
  }))

export const ADMIN_PAGE_CODES: string[] = ADMIN_PAGE_PERMISSIONS.flatMap((s) => s.pages.map((p) => p.code))

/**
 * Codes split out of a broader one. When the backend first adds one of these, roles holding
 * the source code get it too, so nobody loses a page they could open before.
 */
export const PERMISSION_SPLITS: Record<string, string> = {
  'nav:catalog:reviews': 'nav:catalog:products',
  'nav:catalog:google_reviews': 'nav:catalog:products',
  'nav:catalog:concerns': 'nav:catalog:products',
  'reviews:read': 'products:update',
  'reviews:update': 'products:update',
}

const normalize = (path: string) => {
  const p = (path || '').split(/[?#]/)[0].replace(/\/+$/, '')
  return p || '/'
}

/** The section and page an admin route belongs to, or null for routes outside the sidebar. */
export function findAdminPage(path: string): { section: AdminNavSection; page: AdminNavPage } | null {
  const p = normalize(path)
  for (const section of ADMIN_NAV) {
    for (const page of section.pages) {
      if (p === page.path) return { section, page }
      if (page.alsoMatches?.some((m) => (m.endsWith('/') ? p.startsWith(m) : p === m))) return { section, page }
    }
  }
  return null
}

/** Whole section or this page. Routes outside the sidebar are not restricted here. */
export function canOpenAdminPage(has: (code: string) => boolean, path: string): boolean {
  const hit = findAdminPage(path)
  if (!hit) return true
  return has(hit.section.navCode) || has(hit.page.code)
}

/** First page this person can open, for redirects. */
export function firstAllowedAdminPage(has: (code: string) => boolean): string | null {
  for (const section of ADMIN_NAV) {
    for (const page of section.pages) {
      if (has(section.navCode) || has(page.code)) return page.path
    }
  }
  return null
}
