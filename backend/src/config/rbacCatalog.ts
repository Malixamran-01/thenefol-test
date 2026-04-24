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

export const ALL_RBAC_SEED_CODES: string[] = [
  ...BUSINESS_PERMISSION_CODES,
  ...NAV_PERMISSION_CODES,
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
