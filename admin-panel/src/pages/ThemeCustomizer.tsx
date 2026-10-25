import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Check, Download, ExternalLink, RotateCcw, Save, Search, Star, Upload } from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import { configService } from '../services/config'
import {
  ALL_THEME_TOKENS,
  THEME_DEFAULTS,
  THEME_FONT_OPTIONS,
  THEME_GROUPS,
  THEME_PRESETS,
  THEME_SETTING_KEY,
  googleFontsHref,
  sanitizeTheme,
  themeToCssVars,
  type ThemeToken,
  type ThemeValues,
} from '../../../common/src/theme'

const API_BASE = configService.getApiConfig().baseUrl
const STORE_URL = 'https://thenefol.com/#/user/'

// ---- colour helpers (for the swatch input + contrast warnings) -------------------------------
function toHex6(value: string): string | null {
  const v = value.trim()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v)
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase()
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v)
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
  return null
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
function contrast(a: string, b: string): number | null {
  const ha = toHex6(a)
  const hb = toHex6(b)
  if (!ha || !hb) return null
  const [l1, l2] = [luminance(ha), luminance(hb)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Text/background pairs worth warning about (WCAG AA ≈ 4.5:1 for normal text). */
const CONTRAST_PAIRS: Array<[string, string, string]> = [
  ['header-link', 'header-bg', 'Header menu links'],
  ['header-text', 'header-bg', 'Header icons'],
  ['announcement-text', 'announcement-bg', 'Announcement bar'],
  ['button-primary-text', 'button-primary-bg', 'Primary buttons'],
  ['footer-text', 'footer-bg', 'Footer links'],
  ['text', 'page-bg', 'Body text'],
  ['card-title', 'card-bg', 'Product names'],
  ['badge-text', 'badge-bg', 'Badges'],
  ['social-text', 'social-bg', 'Nefol Social text'],
  ['toast-text', 'toast-bg', 'Toasts'],
]

// ---- token row ---------------------------------------------------------------------------------
function TokenRow({ token, value, onChange }: { token: ThemeToken; value: string; onChange: (v: string | null) => void }) {
  const changed = value !== token.default
  const hex = token.kind === 'color' ? toHex6(value) : null
  return (
    <div className="flex items-center gap-3 py-2">
      {token.kind === 'color' ? (
        <label className="relative h-9 w-9 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-300 shadow-inner" title="Pick colour">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            value={hex || '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${token.label} colour`}
          />
        </label>
      ) : (
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 text-sm" style={{ fontFamily: `'${value}', sans-serif` }}>Aa</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm text-gray-900">
          {token.label}
          {changed && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Changed from default" />}
        </div>
        {token.hint && <div className="truncate text-xs text-gray-500">{token.hint}</div>}
      </div>
      {token.kind === 'color' ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-36 rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`${token.label} value`}
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-44 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
          aria-label={token.label}
        >
          {THEME_FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={!changed}
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:invisible"
        title="Reset to default"
        aria-label={`Reset ${token.label}`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ---- live preview ------------------------------------------------------------------------------
const v = (key: string) => `var(--nf-${key})`

function StorePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ background: v('page-bg'), color: v('text'), fontFamily: v('font-body') }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: v('header-bg'), borderBottom: `1px solid ${v('header-border')}` }}>
        <span className="text-sm font-semibold tracking-widest" style={{ color: v('header-text'), fontFamily: v('font-heading') }}>NEFOL</span>
        <div className="hidden gap-4 text-[10px] uppercase tracking-[0.15em] sm:flex" style={{ color: v('header-link') }}>
          <span>Home</span><span>Collections</span><span>Shop</span><span>Social</span>
        </div>
        <span className="relative text-xs" style={{ color: v('header-text') }}>
          Cart
          <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white" style={{ background: v('header-badge-bg') }}>2</span>
        </span>
      </div>
      {/* Announcement */}
      <div className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ background: v('announcement-bg'), color: v('announcement-text') }}>
        Buy 3 at ₹999 ✦ Free shipping over ₹499
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="text-lg font-bold" style={{ color: v('heading'), fontFamily: v('font-heading') }}>What's Just Landed</div>
          <div className="text-xs" style={{ color: v('text-muted') }}>Body text and secondary text on the page background.</div>
        </div>

        {/* Product cards */}
        <div className="grid grid-cols-2 gap-3">
          {[false, true].map((soldOut) => (
            <div key={String(soldOut)} className="overflow-hidden rounded-lg border" style={{ background: v('card-bg'), borderColor: v('border') }}>
              <div className="relative aspect-square" style={{ background: v('surface-soft') }}>
                <span className="absolute left-2 top-2 px-1.5 py-0.5 text-[9px] font-medium" style={{ background: v('badge-bg'), color: v('badge-text') }}>Best Seller</span>
              </div>
              <div className="space-y-1 p-2">
                <div className="text-xs font-semibold" style={{ color: v('card-title') }}>Blue Tea Face Serum</div>
                <div className="truncate text-[10px]" style={{ color: v('card-desc') }}>Hydrating serum for radiant skin</div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Star className="h-3 w-3" style={{ color: v('rating-star'), fill: v('rating-star') }} />
                  <span style={{ color: v('text') }}>4.8</span>
                  <span style={{ color: v('text-muted') }}>· 12 reviews</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: v('price') }}>₹477</span>
                  <span className="text-[10px] line-through" style={{ color: v('price-mrp') }}>₹636</span>
                  <span className="rounded px-1 text-[9px] font-medium" style={{ background: v('discount-bg'), color: v('discount-text') }}>25% OFF</span>
                </div>
                <div
                  className="mt-1 rounded-md py-1.5 text-center text-[9px] uppercase tracking-[0.15em]"
                  style={soldOut
                    ? { background: v('button-disabled-bg'), color: v('button-disabled-text') }
                    : { background: v('button-primary-bg'), color: v('button-primary-text') }}
                >
                  {soldOut ? 'Out of stock' : 'Add to cart'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons, link, input */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: v('button-primary-bg'), color: v('button-primary-text') }}>Primary</span>
          <span className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: v('button-primary-hover'), color: v('button-primary-text') }}>Hover</span>
          <span className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: v('button-secondary-border'), color: v('button-secondary-text') }}>Outline</span>
          <span className="text-xs font-medium underline" style={{ color: v('primary') }}>Accent link</span>
        </div>
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ background: v('input-bg'), borderColor: v('input-border'), color: v('input-text'), boxShadow: `0 0 0 2px ${v('input-focus')}` }}>
          Enter pincode (focused input)
        </div>
        <div className="rounded-lg p-3 text-xs" style={{ background: v('primary-lighter'), color: v('heading') }}>
          Soft tint box · <span style={{ color: v('success') }}>In stock</span> · <span style={{ color: v('danger') }}>Only 2 left</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="rounded-full px-3 py-1.5 text-[10px]" style={{ background: v('toast-bg'), color: v('toast-text') }}>✅ Added to cart</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-white shadow" style={{ background: v('chat-button') }}>💬</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4" style={{ background: v('footer-bg') }}>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {['Categories', 'Company', 'Legal'].map((h) => (
            <div key={h} className="space-y-1">
              <div className="font-semibold uppercase" style={{ color: v('footer-heading') }}>{h}</div>
              <div style={{ color: v('footer-text') }}>Link one</div>
              <div style={{ color: v('footer-text') }}>Link two</div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t pt-2 text-[9px]" style={{ borderColor: v('footer-divider'), color: v('footer-text') }}>©2026 NEFOL</div>
      </div>

      {/* Mobile bottom bar */}
      <div className="flex justify-around border-t py-2 text-[9px]" style={{ background: v('bottomnav-bg'), borderColor: v('bottomnav-border') }}>
        {['Home', 'Search', 'Cart', 'Wishlist', 'Account'].map((item, i) => (
          <span key={item} className="relative" style={{ color: i === 0 ? v('bottomnav-active') : v('bottomnav-icon'), fontWeight: i === 0 ? 600 : 400 }}>
            {item}
            {item === 'Cart' && <span className="absolute -right-2.5 -top-1.5 h-3 w-3 rounded-full" style={{ background: v('bottomnav-badge') }} />}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Same re-mapping the storefront applies inside Nefol Social (.nf-scope-social). */
const SOCIAL_SCOPE = {
  '--nf-heading': v('social-brand'),
  '--nf-heading-hover': v('social-brand-hover'),
  '--nf-primary': v('social-accent'),
  '--nf-surface-soft': v('social-bg'),
  '--nf-surface': v('social-surface'),
  '--nf-text': v('social-text'),
} as CSSProperties

function SocialPreview() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 text-xs shadow-sm" style={{ ...SOCIAL_SCOPE, background: v('social-bg'), color: v('text'), fontFamily: v('font-body') }}>
      <div className="w-32 flex-shrink-0 space-y-1 border-r border-gray-200/70 p-3" style={{ background: v('social-sidebar-bg') }}>
        <div className="mb-2 font-semibold tracking-wide" style={{ color: v('heading') }}>NEFOL Social</div>
        {['Home', 'Explore', 'Ask community', 'Activity'].map((item, i) => (
          <div key={item} className="flex items-center gap-1.5 rounded px-1 py-1 font-semibold" style={{ color: i === 0 ? v('heading') : v('social-nav-text') }}>
            <span className="h-3 w-0.5 rounded" style={{ background: i === 0 ? v('heading') : 'transparent' }} />
            {item}
          </div>
        ))}
        <div className="mt-3 rounded-full py-1.5 text-center text-[10px] font-semibold text-white" style={{ background: v('heading') }}>Write a post</div>
      </div>
      <div className="flex-1 space-y-2 p-3">
        {[1, 2].map((n) => (
          <div key={n} className="rounded-lg border border-gray-200 p-3" style={{ background: v('surface') }}>
            <div className="font-semibold" style={{ color: v('heading'), fontFamily: v('font-heading') }}>5 habits for glowing skin</div>
            <div className="mt-1 text-[11px]" style={{ color: v('text') }}>Body text inside a Nefol Social post card.</div>
            <div className="mt-2 text-[11px] font-medium" style={{ color: v('primary') }}>Read more →</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- page --------------------------------------------------------------------------------------
export default function ThemeCustomizer() {
  const { notify } = useToast()
  const [saved, setSaved] = useState<ThemeValues>({})
  const [values, setValues] = useState<ThemeValues>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [openGroup, setOpenGroup] = useState<string>(THEME_GROUPS[0].id)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [history, setHistory] = useState<Array<{ saved_at: string; value: unknown }>>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const loadHistory = () => {
    fetch(`${API_BASE}/cms/settings/history/${THEME_SETTING_KEY}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setHistory(Array.isArray(rows) ? rows : []))
      .catch(() => setHistory([]))
  }
  useEffect(loadHistory, [])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/cms/settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: Record<string, unknown>) => {
        if (cancelled) return
        let raw = s?.[THEME_SETTING_KEY]
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw) } catch { raw = {} }
        }
        const clean = sanitizeTheme(raw)
        setSaved(clean)
        setValues(clean)
      })
      .catch(() => notify('error', 'Could not load the current theme'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [notify])

  // Load chosen Google Fonts so the preview shows them
  const fontsHref = googleFontsHref(values)
  useEffect(() => {
    if (!fontsHref) return
    const id = 'nf-theme-preview-fonts'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = fontsHref
  }, [fontsHref])

  const merged = useMemo(() => ({ ...THEME_DEFAULTS, ...values }), [values])
  const previewVars = useMemo(() => themeToCssVars(values) as CSSProperties, [values])
  const dirty = JSON.stringify(sanitizeTheme(values)) !== JSON.stringify(sanitizeTheme(saved))
  const changedCount = ALL_THEME_TOKENS.filter((t) => merged[t.key] !== t.default).length

  const setToken = (key: string, value: string | null) => {
    setValues((prev) => {
      const next = { ...prev }
      if (value === null || value === THEME_DEFAULTS[key]) delete next[key]
      else next[key] = value
      return next
    })
  }

  const warnings = CONTRAST_PAIRS
    .map(([fg, bg, label]) => ({ label, ratio: contrast(merged[fg], merged[bg]) }))
    .filter((w) => w.ratio !== null && w.ratio < 4.5) as Array<{ label: string; ratio: number }>

  const invalid = ALL_THEME_TOKENS.filter((t) => values[t.key] !== undefined && sanitizeTheme({ [t.key]: values[t.key] })[t.key] === undefined)

  const save = async () => {
    if (invalid.length) {
      notify('error', `Fix invalid values first: ${invalid.map((t) => t.label).join(', ')}`)
      return
    }
    setSaving(true)
    try {
      const clean = sanitizeTheme(values)
      const res = await fetch(`${API_BASE}/cms/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: THEME_SETTING_KEY, setting_value: clean, setting_type: 'json' }),
      })
      if (!res.ok) throw new Error(res.status === 401 ? 'Admin session required' : `HTTP ${res.status}`)
      setSaved(clean)
      loadHistory()
      notify('success', 'Theme saved — the store updates live for open tabs')
    } catch (err) {
      notify('error', `Save failed: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(sanitizeTheme(values), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nefol-theme.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = (text: string) => {
    try {
      const clean = sanitizeTheme(JSON.parse(text))
      setValues(clean)
      setShowImport(false)
      setImportText('')
      notify('success', `Imported ${Object.keys(clean).length} theme values — review and Save`)
    } catch {
      notify('error', 'That is not valid theme JSON')
    }
  }

  const q = query.trim().toLowerCase()
  const groups = THEME_GROUPS
    .map((g) => ({ ...g, tokens: q ? g.tokens.filter((t) => `${t.label} ${t.key} ${t.hint || ''} ${g.title}`.toLowerCase().includes(q)) : g.tokens }))
    .filter((g) => g.tokens.length > 0)

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="admin-page-header">
        <div>
          <h1
            className="mb-2 text-2xl font-light tracking-[0.15em] sm:text-3xl"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}
          >
            Theme Customizer
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Colours and fonts for the whole storefront and Nefol Social. Changes preview instantly; Save publishes them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={STORE_URL} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1.5">
            <ExternalLink className="h-4 w-4" /> View store
          </a>
          <button onClick={save} disabled={saving || loading || !dirty} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
            {dirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {saving ? 'Saving…' : dirty ? 'Save theme' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Presets + tools */}
      <div className="metric-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-gray-900">Start from a preset</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button onClick={exportJson} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4" /> Export</button>
            <button onClick={() => setShowImport((s) => !s)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"><Upload className="h-4 w-4" /> Import</button>
            <button
              onClick={() => { if (confirm('Reset every colour and font to the NEFOL defaults? (Not saved until you click Save.)')) setValues({}) }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset all
            </button>
            {dirty && <button onClick={() => setValues(saved)} className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">Discard changes</button>}
          </div>
        </div>
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Restore a previous version:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const entry = history[Number(e.target.value)]
                if (entry) {
                  setValues(sanitizeTheme(entry.value))
                  notify('success', 'Previous version loaded into the editor — click Save theme to publish it')
                }
                e.target.value = ''
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
              aria-label="Previous theme versions"
            >
              <option value="" disabled>Choose a saved version…</option>
              {history.map((h, i) => (
                <option key={h.saved_at + i} value={i}>
                  {new Date(h.saved_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => {
            const pv = { ...THEME_DEFAULTS, ...p.values }
            return (
              <button
                key={p.id}
                onClick={() => setValues(sanitizeTheme(p.values))}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:border-gray-400"
              >
                <span className="flex overflow-hidden rounded">
                  {['header-bg', 'primary', 'heading', 'surface-soft'].map((k) => <span key={k} className="h-5 w-4" style={{ background: pv[k] }} />)}
                </span>
                {p.name}
              </button>
            )
          })}
        </div>
        {showImport && (
          <div className="space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              placeholder='Paste theme JSON, e.g. { "primary": "#A96570" }'
              className="w-full rounded-lg border border-gray-300 p-2 font-mono text-xs"
            />
            <div className="flex gap-2">
              <button onClick={() => importJson(importText)} className="btn-primary text-sm">Apply JSON</button>
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">Choose file…</button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) importJson(await f.text()); e.target.value = '' }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        {/* Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search colours (e.g. footer, button, price, social)"
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-gray-500">{changedCount} of {ALL_THEME_TOKENS.length} settings changed from the NEFOL defaults</div>

          {loading ? (
            <div className="metric-card text-sm text-gray-500">Loading theme…</div>
          ) : (
            groups.map((g) => {
              const open = q !== '' || openGroup === g.id
              const groupChanged = g.tokens.filter((t) => merged[t.key] !== t.default).length
              return (
                <div key={g.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(open && q === '' ? '' : g.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    aria-expanded={open}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{g.title}</div>
                      <div className="truncate text-xs text-gray-500">{g.description}</div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {groupChanged > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{groupChanged} changed</span>}
                      <span className="flex overflow-hidden rounded">
                        {g.tokens.filter((t) => t.kind === 'color').slice(0, 5).map((t) => <span key={t.key} className="h-4 w-3" style={{ background: merged[t.key] }} />)}
                      </span>
                    </div>
                  </button>
                  {open && (
                    <div className="divide-y divide-gray-100 border-t border-gray-100 px-4">
                      {g.tokens.map((t) => (
                        <TokenRow key={t.key} token={t} value={merged[t.key]} onChange={(val) => setToken(t.key, val)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="mb-1 font-semibold">Low contrast — may be hard to read</div>
              {warnings.map((w) => <div key={w.label}>{w.label}: {w.ratio.toFixed(1)}:1 (aim for 4.5:1)</div>)}
            </div>
          )}
          {invalid.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              Invalid value for: {invalid.map((t) => t.label).join(', ')}. Use #hex, rgb() or rgba().
            </div>
          )}
          <div style={previewVars} className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Store preview</div>
            <StorePreview />
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Nefol Social preview</div>
            <SocialPreview />
          </div>
        </div>
      </div>
    </div>
  )
}
