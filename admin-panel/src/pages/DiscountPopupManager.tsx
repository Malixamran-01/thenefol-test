import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Copy, ImagePlus, Monitor, RefreshCw, Save, Smartphone, Trash2, X } from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import { uploadFile } from '../utils/upload'
import { configService } from '../services/config'
import { THEME_SETTING_KEY, googleFontsHref, sanitizeTheme, themeToCssVars, type ThemeValues } from '../../../common/src/theme'
import {
  DEFAULT_DISCOUNT_POPUP,
  DISCOUNT_POPUP_SECTION,
  MAX_POPUP_DELAY,
  POPUP_FREQUENCIES,
  isPopupLive,
  normalizeDiscountPopup,
  popupProblem,
  toPopupHref,
  type DiscountPopupContent,
} from '../../../common/src/discountPopup'

const API_BASE = configService.getApiConfig().baseUrl

type Discount = {
  id: number
  code: string
  name?: string
  type: 'percentage' | 'fixed' | 'free_shipping' | 'fixed_price'
  value: number
  min_purchase?: number | string | null
  is_active: boolean
  valid_until?: string | null
}

const LINK_PRESETS = [
  { label: 'Shop all', link: '#/user/shop' },
  { label: 'Combos', link: '#/user/combos' },
  { label: 'Face', link: '#/user/face' },
  { label: 'Hair', link: '#/user/hair' },
  { label: 'Body', link: '#/user/body' },
]

const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** "10% off on orders over ₹499 · ends 31 Dec" */
function describeDiscount(d: Discount): string {
  const what =
    d.type === 'percentage' ? `${Number(d.value)}% off`
      : d.type === 'fixed' ? `${rupees(d.value)} off`
        : d.type === 'free_shipping' ? 'Free shipping'
          : `Special price ${rupees(d.value)}`
  const min = Number(d.min_purchase) > 0 ? ` on orders over ${rupees(Number(d.min_purchase))}` : ''
  const ends = d.valid_until ? ` · ends ${new Date(d.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''
  return `${what}${min}${ends}`
}

/** ISO → value for <input type="datetime-local"> in the admin's own time zone */
function toLocalInput(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '')

function popupStatus(p: DiscountPopupContent): { label: string; tone: string } {
  if (!p.enabled) return { label: 'Off', tone: 'bg-gray-100 text-gray-700 ring-gray-200' }
  if (isPopupLive(p)) return { label: 'Live on the site', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
  if (p.startsAt && Date.now() < Date.parse(p.startsAt)) return { label: 'Scheduled', tone: 'bg-amber-50 text-amber-800 ring-amber-200' }
  return { label: 'Ended', tone: 'bg-rose-50 text-rose-800 ring-rose-200' }
}

export default function DiscountPopupManager() {
  const { notify } = useToast()
  const [form, setForm] = useState<DiscountPopupContent>(DEFAULT_DISCOUNT_POPUP)
  const [saved, setSaved] = useState<DiscountPopupContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAgain, setShowAgain] = useState(true)
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [theme, setTheme] = useState<ThemeValues>({})
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof DiscountPopupContent>(key: K, value: DiscountPopupContent[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/cms/sections/home`)
      const sections = res.ok ? await res.json() : []
      const section = Array.isArray(sections) ? sections.find((s: any) => s.section_type === DISCOUNT_POPUP_SECTION) : null
      const p = section ? normalizeDiscountPopup(section.content) : DEFAULT_DISCOUNT_POPUP
      setForm(p)
      setSaved(section ? p : null)
    } catch {
      notify('error', 'Could not load the discount popup')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch(`${API_BASE}/discounts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setDiscounts(Array.isArray(rows) ? rows : []))
      .catch(() => setDiscounts([]))
    fetch(`${API_BASE}/cms/settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: Record<string, unknown>) => {
        let raw = s?.[THEME_SETTING_KEY]
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw) } catch { raw = {} }
        }
        setTheme(sanitizeTheme(raw))
      })
      .catch(() => setTheme({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the site's fonts so the preview matches the store
  const fontsHref = googleFontsHref(theme)
  useEffect(() => {
    if (!fontsHref) return
    const id = 'nf-popup-preview-fonts'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = fontsHref
  }, [fontsHref])

  const activeDiscounts = useMemo(
    () => discounts.filter((d) => d.is_active && (!d.valid_until || Date.parse(d.valid_until) > Date.now())),
    [discounts],
  )
  const matchedDiscount = discounts.find((d) => d.code.toUpperCase() === form.couponCode.toUpperCase())
  const couponWarning = !form.couponCode
    ? null
    : !matchedDiscount
      ? 'No discount with this code exists yet, so it won’t work at checkout.'
      : !activeDiscounts.includes(matchedDiscount)
        ? 'This discount is switched off or has expired, so it won’t work at checkout.'
        : null

  const dirty = JSON.stringify(form) !== JSON.stringify(saved ?? DEFAULT_DISCOUNT_POPUP)
  const problem = popupProblem(form)
  const status = popupStatus(saved ?? DEFAULT_DISCOUNT_POPUP)

  const pickCoupon = (code: string) => {
    const d = discounts.find((x) => x.code === code)
    setForm((f) => ({
      ...f,
      couponCode: code,
      // Fill the line under the code from the discount, unless the admin wrote their own
      couponNote: d && (!f.couponNote || f.couponNote === DEFAULT_DISCOUNT_POPUP.couponNote || discounts.some((x) => describeDiscount(x) === f.couponNote))
        ? describeDiscount(d)
        : f.couponNote,
    }))
  }

  const onImage = async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('error', 'Choose an image file (JPG, PNG or WebP)')
      return
    }
    setUploading(true)
    try {
      const url = await uploadFile(file, API_BASE)
      set('image', url)
      notify('success', 'Image uploaded')
    } catch (e: any) {
      notify('error', e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = async () => {
    if (form.enabled && problem) {
      notify('error', problem)
      return
    }
    setSaving(true)
    try {
      const contentChanged = saved
        ? JSON.stringify({ ...form, enabled: true, version: '' }) !== JSON.stringify({ ...saved, enabled: true, version: '' })
        : true
      const version = showAgain && contentChanged ? Date.now().toString(36) : form.version || Date.now().toString(36)
      const content = normalizeDiscountPopup({ ...form, version })
      const res = await fetch(`${API_BASE}/cms/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_slug: 'home',
          section_type: DISCOUNT_POPUP_SECTION,
          title: 'Discount popup',
          content,
          order_index: 999,
          is_active: content.enabled,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Save failed')
      setForm(content)
      setSaved(content)
      notify('success', content.enabled ? 'Popup saved. Visitors will see it on their next visit.' : 'Popup saved (switched off)')
    } catch (e: any) {
      notify('error', e?.message || 'Could not save the popup')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading discount popup…</div>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Discount popup</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${status.tone}`}>{status.label}</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            An offer that pops up when shoppers open the store. It never appears on the cart or checkout, and a copied code is filled in for them at checkout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} label={form.enabled ? 'Popup on' : 'Popup off'} />
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {form.enabled && problem && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{problem}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Form */}
        <div className="space-y-5">
          <Card title="Image" hint="Optional. Portrait or square photos work best beside the text; wide ones on top.">
            <div className="flex items-start gap-4">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                {form.image ? (
                  <>
                    <img src={form.image} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => set('image', '')}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-gray-700 shadow hover:text-rose-600"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <ImagePlus className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? 'Uploading…' : form.image ? 'Replace image' : 'Upload image'}
                </button>
                <Field label="Describe the image" hint="Read aloud by screen readers. Leave empty if it’s decorative.">
                  <input className={inputCls} value={form.imageAlt} maxLength={200} onChange={(e) => set('imageAlt', e.target.value)} placeholder="e.g. Vitamin C serum on a marble tray" />
                </Field>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {([
                ['side', 'Image beside text', 'Phones show it on top'],
                ['stacked', 'Image on top', 'Compact card'],
              ] as const).map(([value, label, sub]) => (
                <label key={value} className={`cursor-pointer rounded-lg border p-3 text-sm transition ${form.layout === value ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="layout" className="sr-only" checked={form.layout === value} onChange={() => set('layout', value)} />
                  <span className="block font-medium text-gray-900">{label}</span>
                  <span className="block text-xs text-gray-500">{sub}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card title="Message">
            <Field label="Small line above the heading" count={[form.eyebrow.length, 60]}>
              <input className={inputCls} value={form.eyebrow} maxLength={60} onChange={(e) => set('eyebrow', e.target.value)} placeholder="Welcome offer" />
            </Field>
            <Field label="Heading" count={[form.heading.length, 120]}>
              <input className={inputCls} value={form.heading} maxLength={120} onChange={(e) => set('heading', e.target.value)} placeholder="Get 10% off your first order" />
            </Field>
            <Field label="Text" count={[form.body.length, 600]}>
              <textarea className={`${inputCls} min-h-[88px]`} value={form.body} maxLength={600} onChange={(e) => set('body', e.target.value)} placeholder="Tell shoppers what the offer is and why it’s worth it." />
            </Field>
          </Card>

          <Card title="Coupon code" hint="Shown with a Copy button. Leave empty for an announcement without a code.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pick an active discount">
                <select className={inputCls} value={activeDiscounts.some((d) => d.code === form.couponCode) ? form.couponCode : ''} onChange={(e) => pickCoupon(e.target.value)}>
                  <option value="">{activeDiscounts.length ? 'Choose a code…' : 'No active discounts'}</option>
                  {activeDiscounts.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} · {describeDiscount(d)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="…or type a code">
                <input
                  className={`${inputCls} font-mono uppercase tracking-wider`}
                  value={form.couponCode}
                  maxLength={40}
                  onChange={(e) => set('couponCode', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="WELCOME10"
                />
              </Field>
            </div>
            {couponWarning && (
              <p className="text-xs text-amber-800">
                {couponWarning}{' '}
                <Link to="/loginasadmin/discounts" className="font-semibold underline">Open Discounts</Link>
              </p>
            )}
            {form.couponCode && (
              <Field label="Line under the code" count={[form.couponNote.length, 120]}>
                <input className={inputCls} value={form.couponNote} maxLength={120} onChange={(e) => set('couponNote', e.target.value)} placeholder="Apply at checkout" />
              </Field>
            )}
          </Card>

          <Card title="Buttons">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Main button text" hint="Leave empty for no button.">
                <input className={inputCls} value={form.ctaLabel} maxLength={40} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Shop now" />
              </Field>
              <Field label="Close link text" hint="Leave empty to close with ✕ only.">
                <input className={inputCls} value={form.dismissLabel} maxLength={40} onChange={(e) => set('dismissLabel', e.target.value)} placeholder="No thanks" />
              </Field>
            </div>
            {form.ctaLabel && (
              <Field label="Button opens" hint="A store page like #/user/shop or #/user/product/your-product, or a full https:// link.">
                <input className={inputCls} value={form.ctaLink} maxLength={500} onChange={(e) => set('ctaLink', e.target.value)} placeholder="#/user/shop" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LINK_PRESETS.map((p) => (
                    <button
                      key={p.link}
                      type="button"
                      onClick={() => set('ctaLink', p.link)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition ${form.ctaLink === p.link ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </Card>

          <Card title="When and where">
            <Field label={`Open after ${form.delaySeconds === 0 ? 'no delay' : `${form.delaySeconds} second${form.delaySeconds === 1 ? '' : 's'}`}`} hint="A few seconds lets shoppers see the page first.">
              <input type="range" min={0} max={MAX_POPUP_DELAY} step={1} value={form.delaySeconds} onChange={(e) => set('delaySeconds', Number(e.target.value))} className="w-full accent-gray-900" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="How often">
                <select className={inputCls} value={form.frequency} onChange={(e) => set('frequency', e.target.value as DiscountPopupContent['frequency'])}>
                  {POPUP_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Show on">
                <select className={inputCls} value={form.pages} onChange={(e) => set('pages', e.target.value as DiscountPopupContent['pages'])}>
                  <option value="all">Any store page (not cart or checkout)</option>
                  <option value="home">Home page only</option>
                </select>
              </Field>
              <Field label="Start (optional)">
                <input type="datetime-local" className={inputCls} value={toLocalInput(form.startsAt)} onChange={(e) => set('startsAt', fromLocalInput(e.target.value))} />
              </Field>
              <Field label="End (optional)">
                <input type="datetime-local" className={inputCls} value={toLocalInput(form.endsAt)} onChange={(e) => set('endsAt', fromLocalInput(e.target.value))} />
              </Field>
            </div>
            {saved && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" className="mt-0.5" checked={showAgain} onChange={(e) => setShowAgain(e.target.checked)} />
                <span>
                  Show the changed popup again to visitors who already closed it
                  <span className="block text-xs text-gray-500">Turn off for small fixes, like a typo.</span>
                </span>
              </label>
            )}
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
              <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Preview size">
                {([
                  ['desktop', 'Desktop', Monitor],
                  ['phone', 'Phone', Smartphone],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={device === value}
                    onClick={() => setDevice(value)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${device === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <PopupPreview popup={form} theme={theme} device={device} />
            <p className="mt-3 text-xs text-gray-500">Uses your store theme’s colours and fonts. Buttons are not clickable here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900'

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, count, children }: { label: string; hint?: string; count?: [number, number]; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs font-medium text-gray-700">
        {label}
        {count && <span className={`tabular-nums ${count[0] > count[1] * 0.9 ? 'text-amber-700' : 'text-gray-400'}`}>{count[0]}/{count[1]}</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm font-medium text-gray-800"
    >
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-emerald-600' : 'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
      {label}
    </button>
  )
}

/** Mirrors the storefront modal (user-panel/src/components/DiscountPopup.tsx) inside a fake page. */
function PopupPreview({ popup, theme, device }: { popup: DiscountPopupContent; theme: ThemeValues; device: 'desktop' | 'phone' }) {
  const vars = themeToCssVars(theme) as CSSProperties
  const phone = device === 'phone'
  const side = popup.layout === 'side' && !!popup.image && !phone
  const href = popup.ctaLabel ? toPopupHref(popup.ctaLink) : null
  const empty = !popup.heading && !popup.body && !popup.image && !popup.couponCode

  return (
    <div
      className={`relative mx-auto flex overflow-hidden rounded-xl border border-gray-200 ${phone ? 'h-[620px] w-[320px] items-end' : 'min-h-[520px] w-full items-center justify-center p-6'}`}
      style={{ ...vars, backgroundColor: 'var(--nf-page-bg, #fff)', fontFamily: 'var(--nf-font-body)' }}
    >
      {/* faint page behind the overlay */}
      <div className="absolute inset-0 space-y-3 p-4 opacity-60" aria-hidden="true">
        <div className="h-8 rounded" style={{ backgroundColor: 'var(--nf-header-bg, #eee)' }} />
        <div className="h-32 rounded bg-gray-200" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded bg-gray-100" />)}
        </div>
      </div>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10,10,12,0.55)' }} />

      {empty ? (
        <p className="relative mx-auto rounded-lg bg-white/90 px-4 py-3 text-sm text-gray-600">Add a heading, text or image to see the popup.</p>
      ) : (
        <div
          className={`relative w-full overflow-hidden shadow-2xl ${phone ? 'max-h-[88%] rounded-t-3xl' : `rounded-3xl ${side ? 'max-w-[680px]' : 'max-w-[400px]'}`}`}
          style={{ backgroundColor: 'var(--nf-surface, #fff)', color: 'var(--nf-text, #111)' }}
        >
          <span className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-sm ring-1 ring-black/5">
            <X className="h-4 w-4" />
          </span>
          <div className={`max-h-[inherit] overflow-y-auto ${side ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : 'flex flex-col'}`}>
            {popup.image && (
              <div className={`relative shrink-0 overflow-hidden ${side ? 'min-h-[400px]' : 'aspect-[16/10]'}`} style={{ backgroundColor: 'var(--nf-primary-lighter)' }}>
                <img src={popup.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            )}
            <div className={`flex flex-col justify-center ${phone ? 'px-5 pb-6 pt-6' : 'px-8 pb-8 pt-9'} ${popup.image ? '' : 'pt-12'}`}>
              {popup.eyebrow && (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--nf-primary)' }}>{popup.eyebrow}</p>
              )}
              {popup.heading && (
                <h3 className={`pr-8 leading-tight ${phone ? 'text-[1.4rem]' : 'text-[1.75rem]'}`} style={{ fontFamily: 'var(--nf-font-heading)', fontWeight: 600, color: 'var(--nf-heading)' }}>
                  {popup.heading}
                </h3>
              )}
              {popup.body && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--nf-text-muted)' }}>{popup.body}</p>
              )}
              {popup.couponCode && (
                <div className="mt-5">
                  <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--nf-primary)', backgroundColor: 'var(--nf-primary-lighter)' }}>
                    <span className="flex min-w-0 flex-1 items-center px-4 py-2.5 font-mono text-lg font-bold tracking-[0.18em]">
                      <span className="truncate">{popup.couponCode}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 px-4 text-sm font-semibold" style={{ backgroundColor: 'var(--nf-primary)', color: 'var(--nf-on-primary)' }}>
                      <Copy className="h-4 w-4" /> Copy
                    </span>
                  </div>
                  {popup.couponNote && <p className="mt-2 text-xs" style={{ color: 'var(--nf-text-muted)' }}>{popup.couponNote}</p>}
                </div>
              )}
              {(href || popup.dismissLabel) && (
                <div className={`flex flex-col gap-2 ${popup.couponCode ? 'mt-3' : 'mt-5'}`}>
                  {popup.ctaLabel && (
                    <span
                      className={`flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold uppercase tracking-[0.12em] ${href ? '' : 'opacity-50'}`}
                      style={{ backgroundColor: 'var(--nf-primary)', color: 'var(--nf-on-primary)' }}
                      title={href ? href : 'Add a valid link'}
                    >
                      {popup.ctaLabel}
                    </span>
                  )}
                  {popup.dismissLabel && (
                    <span className="py-2 text-center text-sm" style={{ color: 'var(--nf-text-muted)' }}>{popup.dismissLabel}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
