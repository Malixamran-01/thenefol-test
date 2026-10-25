import {
  THEME_STORAGE_KEY,
  googleFontsHref,
  sanitizeTheme,
  themeToCssVars,
  type ThemeValues,
} from '../../../common/src/theme'

const FONT_LINK_ID = 'nf-theme-fonts'

/** Writes every theme token onto :root (defaults + saved overrides) and loads the chosen fonts. */
export function applyTheme(values: ThemeValues | null | undefined, { persist = true } = {}) {
  if (typeof document === 'undefined') return
  const clean = sanitizeTheme(values || {})
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeToCssVars(clean))) {
    root.style.setProperty(name, value)
  }

  const href = googleFontsHref(clean)
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (href) {
    if (!link) {
      link = document.createElement('link')
      link.id = FONT_LINK_ID
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    if (link.href !== href) link.href = href
  }

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(clean))
    } catch {
      /* storage unavailable — theme still applied for this visit */
    }
  }
}

/** Apply the last saved theme synchronously on boot so returning visitors don't see a colour flash. */
export function applyCachedTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw) applyTheme(JSON.parse(raw), { persist: false })
  } catch {
    /* ignore corrupt cache */
  }
}

/** cms_settings stores the theme as JSON (setting_type json) — accept object or string. */
export function parseThemeSetting(raw: unknown): ThemeValues | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as ThemeValues
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return null
}
