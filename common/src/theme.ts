/**
 * NEFOL storefront theme — single source of truth for the admin Theme Customizer and the
 * user panel. Every token is a CSS custom property (`--nf-<key>`) set on :root; components
 * read them via `var(--nf-…)`. Saved overrides live in cms_settings under THEME_SETTING_KEY.
 *
 * Keep DEFAULT values in sync with the :root block in user-panel/src/styles.css.
 */

export const THEME_SETTING_KEY = 'site_theme'
export const THEME_STORAGE_KEY = 'nefol_theme_v1'

export type ThemeTokenKind = 'color' | 'font'

export type ThemeToken = {
  key: string
  label: string
  hint?: string
  kind: ThemeTokenKind
  default: string
}

export type ThemeGroup = {
  id: string
  title: string
  description: string
  tokens: ThemeToken[]
}

const c = (key: string, label: string, def: string, hint?: string): ThemeToken => ({ key, label, kind: 'color', default: def, hint })

export const THEME_GROUPS: ThemeGroup[] = [
  {
    id: 'global',
    title: 'Global & brand',
    description: 'Base colours used across every page — accents, headings, text and backgrounds.',
    tokens: [
      c('page-bg', 'Page background', '#FFFFFF', 'Behind every section of the store'),
      c('surface', 'Cards & panels', '#FFFFFF'),
      c('surface-soft', 'Soft section background', '#F4F9F9', 'Tinted bands, info boxes'),
      c('primary', 'Primary accent', '#4B97C9', 'Buttons, links, icons, highlights'),
      c('primary-hover', 'Primary accent (hover)', '#3C78A0'),
      c('primary-dark', 'Primary accent (dark)', '#32648C'),
      c('primary-light', 'Primary tint', '#E0F5F5'),
      c('primary-lighter', 'Primary tint (lighter)', '#F0F9F9'),
      c('on-primary', 'Text on primary', '#FFFFFF'),
      c('heading', 'Headings & brand dark', '#1B4965'),
      c('heading-hover', 'Brand dark (hover)', '#163D54'),
      c('text', 'Body text', '#1A1A1A'),
      c('text-muted', 'Secondary text', '#666666'),
      c('border', 'Borders & dividers', '#E5E7EB'),
    ],
  },
  {
    id: 'header',
    title: 'Header & navigation',
    description: 'Top bar with the logo, menu, search, wishlist and cart.',
    tokens: [
      c('header-bg', 'Header background', '#0E2730'),
      c('header-text', 'Icons & active text', '#FFFFFF'),
      c('header-link', 'Menu links', '#E8F5F7'),
      c('header-border', 'Bottom border', 'rgba(232, 245, 247, 0.16)'),
      c('header-badge-bg', 'Cart badge', '#FF4B4B'),
      c('menu-bg', 'Dropdown & mobile menu', '#FFFFFF'),
      c('menu-text', 'Dropdown & mobile menu text', '#1A1A1A'),
    ],
  },
  {
    id: 'announcement',
    title: 'Announcement bar',
    description: 'Scrolling offer strip under the header on the homepage.',
    tokens: [
      c('announcement-bg', 'Background', '#4B97C9'),
      c('announcement-text', 'Text', '#FFFFFF'),
    ],
  },
  {
    id: 'buttons',
    title: 'Buttons',
    description: 'Shared button styles (primary buttons also follow the Primary accent).',
    tokens: [
      c('button-primary-bg', 'Primary button', '#4B97C9'),
      c('button-primary-hover', 'Primary button (hover)', '#3C78A0'),
      c('button-primary-text', 'Primary button text', '#FFFFFF'),
      c('button-secondary-border', 'Outline button border', '#0E2730'),
      c('button-secondary-text', 'Outline button text', '#0E2730'),
      c('button-disabled-bg', 'Disabled / out of stock', '#F3F4F6'),
      c('button-disabled-text', 'Disabled text', '#6B7280'),
    ],
  },
  {
    id: 'cards',
    title: 'Product cards & prices',
    description: 'Listing cards, prices, discounts, badges and ratings.',
    tokens: [
      c('card-bg', 'Card background', '#FFFFFF'),
      c('card-title', 'Product name', '#1A1A1A'),
      c('card-desc', 'Short description', '#666666'),
      c('price', 'Selling price', '#1A1A1A'),
      c('price-mrp', 'MRP (struck out)', '#9CA3AF'),
      c('discount-bg', 'Discount badge', '#DCFCE7'),
      c('discount-text', 'Discount badge text', '#15803D'),
      c('badge-bg', 'Best seller / tag badge', '#32648C'),
      c('badge-text', 'Badge text', '#FFFFFF'),
      c('rating-star', 'Rating stars', '#FBBF24'),
    ],
  },
  {
    id: 'forms',
    title: 'Forms & inputs',
    description: 'Text fields, selects and search boxes.',
    tokens: [
      c('input-bg', 'Input background', '#FFFFFF'),
      c('input-border', 'Input border', '#DCE5E7'),
      c('input-focus', 'Focus ring', '#4B97C9'),
      c('input-text', 'Input text', '#1A1A1A'),
    ],
  },
  {
    id: 'feedback',
    title: 'Popups, toasts & chat',
    description: 'Modals, notifications and the floating chat button.',
    tokens: [
      c('modal-bg', 'Popup background', '#FFFFFF'),
      c('toast-bg', 'Toast background', '#0F172A'),
      c('toast-text', 'Toast text', '#FFFFFF'),
      c('chat-button', 'Chat button', '#4B97C9'),
      c('success', 'Success', '#16A34A'),
      c('danger', 'Error / sale', '#DC2626'),
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'Site footer with links, social icons and copyright.',
    tokens: [
      c('footer-bg', 'Footer background', '#0E2730'),
      c('footer-heading', 'Column headings', '#FFFFFF'),
      c('footer-text', 'Links & text', '#E8F5F7'),
      c('footer-divider', 'Divider', 'rgba(255, 255, 255, 0.1)'),
    ],
  },
  {
    id: 'bottom-nav',
    title: 'Mobile bottom bar',
    description: 'Home / Search / Cart / Collection / Wishlist / Account bar on phones.',
    tokens: [
      c('bottomnav-bg', 'Background', '#FFFFFF'),
      c('bottomnav-border', 'Top border', '#E5E7EB'),
      c('bottomnav-icon', 'Icons & labels', '#6B7280'),
      c('bottomnav-active', 'Active item', '#1F2937'),
      c('bottomnav-badge', 'Count badge', '#EF4444'),
    ],
  },
  {
    id: 'social',
    title: 'Nefol Social',
    description: 'Blog, community, creator dashboard and author pages (their own colours).',
    tokens: [
      c('social-bg', 'Page background', '#F4F9F9'),
      c('social-sidebar-bg', 'Sidebar & mobile top bar', '#F4F9F9'),
      c('social-surface', 'Posts & cards', '#FFFFFF'),
      c('social-brand', 'Brand dark (titles, active nav, buttons)', '#1B4965'),
      c('social-brand-hover', 'Brand dark (hover)', '#163D54'),
      c('social-accent', 'Accent (links, highlights)', '#4B97C9'),
      c('social-accent-hover', 'Accent (hover)', '#3C78A0'),
      c('social-text', 'Body text', '#1A1A1A'),
      c('social-nav-text', 'Sidebar links', '#374151'),
    ],
  },
  {
    id: 'typography',
    title: 'Typography',
    description: 'Fonts for headings and body text (loaded from Google Fonts).',
    tokens: [
      { key: 'font-heading', label: 'Heading font', kind: 'font', default: 'Poppins' },
      { key: 'font-body', label: 'Body font', kind: 'font', default: 'Inter' },
    ],
  },
]

export const THEME_FONT_OPTIONS = [
  'Poppins', 'Inter', 'Montserrat', 'DM Sans', 'Lato', 'Nunito', 'Open Sans', 'Raleway',
  'Work Sans', 'Manrope', 'Outfit', 'Playfair Display', 'Cormorant Garamond', 'Lora', 'Marcellus',
] as const

export const ALL_THEME_TOKENS: ThemeToken[] = THEME_GROUPS.flatMap((g) => g.tokens)

export const THEME_DEFAULTS: Record<string, string> = Object.fromEntries(
  ALL_THEME_TOKENS.map((t) => [t.key, t.default])
)

/** Saved shape: only keys that differ from defaults are required. */
export type ThemeValues = Record<string, string>

export const cssVarName = (key: string) => `--nf-${key}`

const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|transparent|[a-z]+)$/i
const SAFE_FONT = /^[A-Za-z0-9 ]{2,40}$/

/** Drops unknown keys and anything that isn't a plain colour / font name (no CSS injection). */
export function sanitizeTheme(input: unknown): ThemeValues {
  const out: ThemeValues = {}
  if (!input || typeof input !== 'object') return out
  const byKey = new Map(ALL_THEME_TOKENS.map((t) => [t.key, t]))
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const token = byKey.get(key)
    if (!token || typeof raw !== 'string') continue
    const value = raw.trim()
    if (token.kind === 'color' ? SAFE_COLOR.test(value) : SAFE_FONT.test(value)) out[key] = value
  }
  return out
}

/** CSS custom-property map for a theme (defaults merged with overrides). */
export function themeToCssVars(values: ThemeValues): Record<string, string> {
  const merged = { ...THEME_DEFAULTS, ...sanitizeTheme(values) }
  const vars: Record<string, string> = {}
  for (const token of ALL_THEME_TOKENS) {
    const v = merged[token.key]
    vars[cssVarName(token.key)] = token.kind === 'font' ? `'${v}', system-ui, -apple-system, 'Segoe UI', sans-serif` : v
  }
  return vars
}

export function googleFontsHref(values: ThemeValues): string | null {
  const merged = { ...THEME_DEFAULTS, ...sanitizeTheme(values) }
  const families = [...new Set([merged['font-heading'], merged['font-body']].filter(Boolean))]
  if (families.length === 0) return null
  const q = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`).join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}

export type ThemePreset = { id: string; name: string; values: ThemeValues }

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'nefol', name: 'Nefol Classic', values: {} },
  {
    id: 'clean',
    name: 'Clean White',
    values: {
      'header-bg': '#FFFFFF', 'header-text': '#1B4965', 'header-link': '#1B4965', 'header-border': '#E5E7EB',
      'footer-bg': '#F4F9F9', 'footer-heading': '#1B4965', 'footer-text': '#334155', 'footer-divider': '#E2E8F0',
      'announcement-bg': '#1B4965',
    },
  },
  {
    id: 'rose',
    name: 'Rose Glow',
    values: {
      primary: '#9A5763', 'primary-hover': '#8E4F5A', 'primary-dark': '#7A4049', 'primary-light': '#F8E8EA', 'primary-lighter': '#FCF4F5',
      heading: '#4A2329', 'heading-hover': '#3A1B20', 'surface-soft': '#FBF3F4',
      'header-bg': '#FFFFFF', 'header-text': '#4A2329', 'header-link': '#4A2329', 'header-border': '#F1E1E3',
      'announcement-bg': '#9A5763', 'button-primary-bg': '#9A5763', 'button-primary-hover': '#8E4F5A',
      'button-secondary-border': '#4A2329', 'button-secondary-text': '#4A2329', 'input-focus': '#9A5763', 'chat-button': '#9A5763',
      'badge-bg': '#9A5763', 'footer-bg': '#4A2329', 'footer-text': '#F8E8EA',
      'social-bg': '#FBF3F4', 'social-sidebar-bg': '#FBF3F4', 'social-brand': '#4A2329', 'social-brand-hover': '#3A1B20', 'social-accent': '#9A5763', 'social-accent-hover': '#8E4F5A',
    },
  },
  {
    id: 'forest',
    name: 'Botanical Green',
    values: {
      primary: '#3F7D58', 'primary-hover': '#32654A', 'primary-dark': '#26503A', 'primary-light': '#E3F1E8', 'primary-lighter': '#F2F8F4',
      heading: '#1E3A2B', 'heading-hover': '#152A1F', 'surface-soft': '#F2F8F4',
      'header-bg': '#1E3A2B', 'footer-bg': '#1E3A2B', 'announcement-bg': '#3F7D58',
      'button-primary-bg': '#3F7D58', 'button-primary-hover': '#32654A', 'button-secondary-border': '#1E3A2B', 'button-secondary-text': '#1E3A2B',
      'input-focus': '#3F7D58', 'chat-button': '#3F7D58', 'badge-bg': '#3F7D58',
      'social-bg': '#F2F8F4', 'social-sidebar-bg': '#F2F8F4', 'social-brand': '#1E3A2B', 'social-brand-hover': '#152A1F', 'social-accent': '#3F7D58', 'social-accent-hover': '#32654A',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Gold',
    values: {
      primary: '#B08D57', 'primary-hover': '#957444', 'primary-dark': '#7A5E36', 'primary-light': '#F5EEE2', 'primary-lighter': '#FAF6EF',
      heading: '#111827', 'heading-hover': '#030712', 'surface-soft': '#FAF6EF',
      'header-bg': '#111827', 'header-link': '#E5E7EB', 'footer-bg': '#111827', 'footer-text': '#D1D5DB',
      'announcement-bg': '#B08D57', 'button-primary-bg': '#111827', 'button-primary-hover': '#1F2937',
      'button-secondary-border': '#111827', 'button-secondary-text': '#111827', 'input-focus': '#B08D57', 'chat-button': '#111827', 'badge-bg': '#B08D57',
      'social-bg': '#FAF6EF', 'social-sidebar-bg': '#FAF6EF', 'social-brand': '#111827', 'social-brand-hover': '#030712', 'social-accent': '#B08D57', 'social-accent-hover': '#957444',
      'font-heading': 'Playfair Display',
    },
  },
]
