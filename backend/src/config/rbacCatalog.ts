/**
 * Single source of truth for: sidebar nav permissions, role templates, and seed/upsert lists.
 * Keep `admin-panel/src/config/rbacNav.ts` in sync (same nav codes + template ids).
 */

/** Business / API permissions (pre-existing) */
export const BUSINESS_PERMISSION_CODES = [
  'products:read',
  'products:update',
  'orders:read',
  'orders:update',
  'shipping:read',
  'shipping:update',
  'invoices:read',
  'returns:read',
  'returns:update',
  'returns:create',
  'analytics:read',
  'marketing:read',
  'users:read',
  'users:update',
  'cms:read',
  'payments:read',
  'pos:read',
  'pos:update',
  'discounts:read',
  'notifications:read',
  /** Staff / RBAC administration */
  'staff:invite',
  'staff:manage',
  'staff:read',
  'staff:delete',
  'permissions:manage',
] as const

/**
 * Sidebar divisions — one code controls visibility of that block in the admin nav.
 * Granular enough for "Meta vs Google" etc.
 */
export const NAV_PERMISSION_CODES = [
  'nav:overview',
  'nav:store',
  'nav:channels',
  'nav:meta',
  'nav:google',
  'nav:facebook',
  'nav:loyalty',
  'nav:catalog',
  'nav:sales',
  'nav:content',
  'nav:crm',
  'nav:finance',
  'nav:marketing',
  'nav:affiliate',
  'nav:analytics',
  'nav:forms',
  'nav:team',
  'nav:settings',
] as const

/**
 * Optional granular keys under “Products & catalog” — if user has only some of these, only those
 * sidebar lines appear. Having `nav:catalog` still grants the whole block (backward compatible).
 */
export const NAV_CATALOG_FINE: { code: string; label: string }[] = [
  { code: 'nav:catalog:products', label: 'Products' },
  { code: 'nav:catalog:categories', label: 'Catalog (categories)' },
  { code: 'nav:catalog:collections', label: 'Product collections' },
  { code: 'nav:catalog:variants', label: 'Product variants' },
  { code: 'nav:catalog:inventory', label: 'Inventory' },
  { code: 'nav:catalog:warehouses', label: 'Warehouses' },
  { code: 'nav:catalog:discounts', label: 'Discounts' },
]

export const NAV_CATALOG_FINE_CODES = NAV_CATALOG_FINE.map((x) => x.code)

/**
 * “Whole division” = one click in the role UI to assign every nav + common API for that area.
 * Keys are stable ids for the admin UI; `permissionCodes` are merged when applying.
 */
export const DIVISION_BUNDLES: {
  id: string
  label: string
  description: string
  /** Includes parent `nav:*` and related `products:read` etc. where useful */
  permissionCodes: string[]
}[] = [
  {
    id: 'div_overview',
    label: 'Overview',
    description: 'Dashboard home only',
    permissionCodes: ['nav:overview'],
  },
  {
    id: 'div_store',
    label: 'Store & homepage',
    description: 'Storefront and homepage',
    permissionCodes: ['nav:store'],
  },
  {
    id: 'div_channels',
    label: 'Sales channels',
    description: 'Marketplaces and FB Shop',
    permissionCodes: ['nav:channels'],
  },
  {
    id: 'div_meta',
    label: 'Meta (ads & business)',
    description: 'Meta hub + common marketing read',
    permissionCodes: ['nav:meta', 'marketing:read'],
  },
  {
    id: 'div_google',
    label: 'Google & YouTube',
    description: 'Search / YouTube integrations',
    permissionCodes: ['nav:google', 'analytics:read'],
  },
  {
    id: 'div_facebook',
    label: 'Facebook & Instagram',
    description: 'Social integrations',
    permissionCodes: ['nav:facebook', 'marketing:read'],
  },
  {
    id: 'div_loyalty',
    label: 'Loyalty & rewards',
    description: 'Loyalty and cashback',
    permissionCodes: ['nav:loyalty', 'marketing:read'],
  },
  {
    id: 'div_catalog_full',
    label: 'Products & catalog (full division)',
    description: 'All catalog nav lines + product/inventory API access',
    permissionCodes: [
      'nav:catalog',
      ...NAV_CATALOG_FINE_CODES,
      'products:read',
      'products:update',
      'discounts:read',
      'inventory:read',
    ],
  },
  {
    id: 'div_catalog_nav_only',
    label: 'Products & catalog (nav only, no API extras)',
    description: 'Sidebar lines only; fine-grained items still controlled separately',
    permissionCodes: ['nav:catalog', ...NAV_CATALOG_FINE_CODES],
  },
  {
    id: 'div_sales',
    label: 'Sales & e-commerce',
    description: 'Orders, shipping, returns, POS, cart, unified sales',
    permissionCodes: [
      'nav:sales',
      'orders:read',
      'orders:update',
      'shipping:read',
      'shipping:update',
      'invoices:read',
      'returns:read',
      'returns:update',
      'pos:read',
      'pos:update',
    ],
  },
  {
    id: 'div_content',
    label: 'Content & CMS',
    description: 'Site content and blog',
    permissionCodes: ['nav:content', 'cms:read', 'users:read'],
  },
  {
    id: 'div_crm',
    label: 'Customer & CRM',
    description: 'Customers, comms, journeys',
    permissionCodes: ['nav:crm', 'users:read', 'users:update', 'orders:read', 'notifications:read'],
  },
  {
    id: 'div_finance',
    label: 'Finance & payments',
    description: 'Invoices, tax, payment settings',
    permissionCodes: ['nav:finance', 'payments:read', 'invoices:read', 'orders:read'],
  },
  {
    id: 'div_marketing',
    label: 'Marketing hub',
    description: 'Marketing home',
    permissionCodes: ['nav:marketing', 'marketing:read'],
  },
  {
    id: 'div_affiliate',
    label: 'Affiliate & monetization',
    description: 'Partners and rewards ops',
    permissionCodes: ['nav:affiliate', 'users:read', 'marketing:read'],
  },
  {
    id: 'div_analytics',
    label: 'Analytics & insights',
    description: 'Reports and audit',
    permissionCodes: ['nav:analytics', 'analytics:read'],
  },
  {
    id: 'div_forms',
    label: 'Forms & communication',
    description: 'Forms, contact, system alerts',
    permissionCodes: ['nav:forms', 'notifications:read', 'users:read'],
  },
  {
    id: 'div_team',
    label: 'Team & access',
    description: 'Staff, roles, account security',
    permissionCodes: ['nav:team', 'users:read', 'users:update'],
  },
  {
    id: 'div_settings',
    label: 'Settings (footer)',
    description: 'Global settings entry',
    permissionCodes: ['nav:settings', 'users:read'],
  },
]

export const ALL_RBAC_SEED_CODES: string[] = [
  ...BUSINESS_PERMISSION_CODES,
  ...NAV_PERMISSION_CODES,
  ...NAV_CATALOG_FINE_CODES,
]

export type PermissionDivisionGroup = {
  id: string
  label: string
  description: string
  permissionCode: string
}

export const NAV_DIVISION_GROUPS: PermissionDivisionGroup[] = [
  { id: 'overview', label: 'Overview (home dashboard)', description: 'Main admin dashboard', permissionCode: 'nav:overview' },
  { id: 'store', label: 'Store & homepage', description: 'Online store & homepage layout', permissionCode: 'nav:store' },
  { id: 'channels', label: 'Sales channels', description: 'Marketplaces (Amazon, Flipkart, etc.) & Facebook Shop', permissionCode: 'nav:channels' },
  { id: 'meta', label: 'Meta (Business & Ads)', description: 'Meta hub, ads, catalog', permissionCode: 'nav:meta' },
  { id: 'google', label: 'Google & YouTube', description: 'Search & YouTube integrations', permissionCode: 'nav:google' },
  { id: 'facebook', label: 'Facebook & Instagram', description: 'Organic social integrations', permissionCode: 'nav:facebook' },
  { id: 'loyalty', label: 'Loyalty & cashback', description: 'Loyalty program & cashback', permissionCode: 'nav:loyalty' },
  { id: 'catalog', label: 'Products & catalog', description: 'Products, catalog, collections, inventory, discounts', permissionCode: 'nav:catalog' },
  { id: 'sales', label: 'Sales & e-commerce', description: 'Orders, unified sales, shipments, POS, cart', permissionCode: 'nav:sales' },
  { id: 'content', label: 'Content & CMS', description: 'CMS, blog, video, static pages', permissionCode: 'nav:content' },
  { id: 'crm', label: 'Customer & CRM', description: 'Customers, users, WhatsApp, journeys', permissionCode: 'nav:crm' },
  { id: 'finance', label: 'Finance & payments', description: 'Invoices, tax, payment settings', permissionCode: 'nav:finance' },
  { id: 'marketing', label: 'Marketing hub', description: 'Campaigns & automations (hub page)', permissionCode: 'nav:marketing' },
  { id: 'affiliate', label: 'Affiliate & monetization', description: 'Affiliates, collab, coin withdrawals', permissionCode: 'nav:affiliate' },
  { id: 'analytics', label: 'Analytics & insights', description: 'Reports & audit', permissionCode: 'nav:analytics' },
  { id: 'forms', label: 'Forms & communication', description: 'Forms, contact, alerts', permissionCode: 'nav:forms' },
  { id: 'team', label: 'Team & access', description: 'Staff, roles, security (not settings footer)', permissionCode: 'nav:team' },
  { id: 'settings', label: 'Settings (global)', description: 'Global app settings in sidebar footer', permissionCode: 'nav:settings' },
]

export type RoleTemplate = {
  id: string
  name: string
  description: string
  /** Permission codes to assign in one click */
  permissionCodes: string[]
}

/**
 * Quick-assign templates. Include both `nav:*` (sidebar) and relevant `products:read` etc. so APIs work.
 */
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'full_operator',
    name: 'Full operator (nav + operations)',
    description: 'All navigation areas and standard operational permissions (typical for owners).',
    permissionCodes: [...ALL_RBAC_SEED_CODES],
  },
  {
    id: 'ecommerce_lead',
    name: 'E-commerce lead',
    description: 'Store, channels, catalog, sales, and marketing visibility.',
    permissionCodes: [
      'nav:overview',
      'nav:store',
      'nav:channels',
      'nav:catalog',
      'nav:sales',
      'nav:marketing',
      'nav:finance',
      'nav:settings',
      'products:read',
      'products:update',
      'orders:read',
      'orders:update',
      'shipping:read',
      'shipping:update',
      'invoices:read',
      'payments:read',
      'returns:read',
      'returns:update',
      'marketing:read',
      'discounts:read',
    ],
  },
  {
    id: 'marketing_ads',
    name: 'Marketing & paid social',
    description: 'Meta, Google, Facebook/IG, and marketing hub; light analytics.',
    permissionCodes: [
      'nav:overview',
      'nav:meta',
      'nav:google',
      'nav:facebook',
      'nav:marketing',
      'nav:analytics',
      'nav:content',
      'marketing:read',
      'analytics:read',
      'cms:read',
    ],
  },
  {
    id: 'channel_marketplace',
    name: 'Marketplace & channel specialist',
    description: 'Sales channels (including unified sales), no ad platforms.',
    permissionCodes: [
      'nav:overview',
      'nav:channels',
      'nav:sales',
      'nav:store',
      'nav:catalog',
      'nav:settings',
      'products:read',
      'orders:read',
      'orders:update',
      'shipping:read',
    ],
  },
  {
    id: 'loyalty_retention',
    name: 'Loyalty & retention',
    description: 'Loyalty/cashback and affiliate program tools.',
    permissionCodes: [
      'nav:overview',
      'nav:loyalty',
      'nav:affiliate',
      'nav:crm',
      'marketing:read',
      'users:read',
    ],
  },
  {
    id: 'finance',
    name: 'Finance & billing',
    description: 'Invoices, tax, payment configuration.',
    permissionCodes: [
      'nav:overview',
      'nav:finance',
      'nav:sales',
      'invoices:read',
      'payments:read',
      'orders:read',
    ],
  },
  {
    id: 'support_crm',
    name: 'Support & CRM',
    description: 'Customers, users, forms, and messaging tools.',
    permissionCodes: [
      'nav:overview',
      'nav:crm',
      'nav:forms',
      'users:read',
      'users:update',
      'orders:read',
      'notifications:read',
    ],
  },
  {
    id: 'content_editor',
    name: 'Content editor',
    description: 'CMS, blog, video, and static content only.',
    permissionCodes: ['nav:overview', 'nav:content', 'cms:read', 'nav:settings'],
  },
  {
    id: 'analyst',
    name: 'Analyst (read-only)',
    description: 'Dashboard and analytics/audit; no order changes.',
    permissionCodes: ['nav:overview', 'nav:analytics', 'analytics:read', 'orders:read', 'products:read'],
  },
  {
    id: 'system_admin',
    name: 'System & staff admin',
    description: 'Team, roles, account security, settings; no catalog editing.',
    permissionCodes: [
      'nav:overview',
      'nav:team',
      'nav:settings',
      'users:read',
      'users:update',
    ],
  },
]
