import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Image as ImageIcon, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useToast } from '../../components/ToastProvider'
import { loadConcernOptions } from '../../components/ConcernPicker'
import { getApiBaseUrl } from '../../utils/apiUrl'
import { uploadFile } from '../../utils/upload'

type Concern = {
  id: number
  slug: string
  name: string
  description: string | null
  image_url: string | null
  concern_group: Group | null
  headline: string | null
  subheadline: string | null
  banner_url: string | null
  banner_mobile_url: string | null
  about_title: string | null
  about_body: string | null
  aliases: string[] | null
  sort_order: number
  is_active: boolean
  show_in_nav: boolean
  product_count: number
}

type ProductRow = { id: number; title: string; slug: string; category?: string; list_image?: string; concerns?: { slug: string; name: string }[] }

type Group = 'skin' | 'hair' | 'body'
const GROUPS: Array<{ value: Group | ''; label: string }> = [
  { value: '', label: 'No group' },
  { value: 'skin', label: 'Skin' },
  { value: 'hair', label: 'Hair' },
  { value: 'body', label: 'Body' },
]

const TEXT_FIELDS = ['description', 'image_url', 'headline', 'subheadline', 'banner_url', 'banner_mobile_url', 'about_title', 'about_body'] as const
type TextField = (typeof TEXT_FIELDS)[number]
type Draft = { id?: number; name: string; slug: string; aliases: string; concern_group: Group | ''; is_active: boolean; show_in_nav: boolean } & Record<TextField, string>
const EMPTY_DRAFT: Draft = {
  name: '', slug: '', aliases: '', concern_group: '', is_active: true, show_in_nav: true,
  description: '', image_url: '', headline: '', subheadline: '', banner_url: '', banner_mobile_url: '', about_title: '', about_body: '',
}

const toDraft = (c: Concern): Draft => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  aliases: (c.aliases || []).join(', '),
  concern_group: c.concern_group || '',
  is_active: c.is_active,
  show_in_nav: c.show_in_nav,
  ...(Object.fromEntries(TEXT_FIELDS.map((k) => [k, c[k] || ''])) as Record<TextField, string>),
})

const STORE_BASE = 'https://thenefol.com/#/user/concern/'

export default function Concerns() {
  const { notify } = useToast()
  const apiBase = getApiBaseUrl()
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState<Concern | null>(null)
  const [assignIds, setAssignIds] = useState<Set<number>>(new Set())
  const [assignQuery, setAssignQuery] = useState('')

  const toAbs = (u?: string | null) => {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    return `${apiBase.replace(/\/api\/?$/, '')}${u.startsWith('/') ? '' : '/'}${u}`
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`${apiBase}/admin/concerns`),
        fetch(`${apiBase}/products?_=${Date.now()}`, { cache: 'no-store' }),
      ])
      if (!cRes.ok) throw new Error(cRes.status === 401 ? 'Admin session required' : `HTTP ${cRes.status}`)
      setConcerns(await cRes.json())
      if (pRes.ok) setProducts(await pRes.json())
      loadConcernOptions(true)
    } catch (err) {
      notify('error', `Failed to load concerns: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [apiBase, notify])

  useEffect(() => { load() }, [load])

  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
    return data
  }

  const saveDraft = async () => {
    if (!draft || !draft.name.trim()) return notify('error', 'Name is required')
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, draft[k]])),
        concern_group: draft.concern_group || null,
        aliases: draft.aliases,
        is_active: draft.is_active,
        show_in_nav: draft.show_in_nav,
      }
      if (draft.id) await send(`${apiBase}/admin/concerns/${draft.id}`, 'PUT', payload)
      else await send(`${apiBase}/admin/concerns`, 'POST', payload)
      notify('success', draft.id ? 'Concern updated' : 'Concern added')
      setDraft(null)
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const patch = async (c: Concern, body: Partial<Concern>) => {
    try {
      await send(`${apiBase}/admin/concerns/${c.id}`, 'PUT', body)
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const other = concerns[index + dir]
    const current = concerns[index]
    if (!other || !current) return
    // Re-number everything so equal sort_order values can't get stuck
    const ordered = [...concerns]
    ordered[index] = other
    ordered[index + dir] = current
    try {
      await Promise.all(ordered.map((c, i) => (c.sort_order === (i + 1) * 10 ? null : send(`${apiBase}/admin/concerns/${c.id}`, 'PUT', { sort_order: (i + 1) * 10 }))))
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    }
  }

  const remove = async (c: Concern) => {
    if (!confirm(`Delete "${c.name}"? ${c.product_count} product(s) will be unlinked from it (the products themselves stay).`)) return
    try {
      await send(`${apiBase}/admin/concerns/${c.id}`, 'DELETE')
      notify('success', 'Concern deleted')
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    }
  }

  const openAssign = (c: Concern) => {
    setAssigning(c)
    setAssignQuery('')
    setAssignIds(new Set(products.filter((p) => p.concerns?.some((pc) => pc.slug === c.slug)).map((p) => p.id)))
  }

  const saveAssign = async () => {
    if (!assigning) return
    setSaving(true)
    try {
      await send(`${apiBase}/admin/concerns/${assigning.id}/products`, 'PUT', { productIds: [...assignIds] })
      notify('success', `${assignIds.size} product(s) linked to ${assigning.name}`)
      setAssigning(null)
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const visibleProducts = useMemo(() => {
    const q = assignQuery.trim().toLowerCase()
    return q ? products.filter((p) => `${p.title} ${p.slug} ${p.category || ''}`.toLowerCase().includes(q)) : products
  }, [products, assignQuery])

  const unmapped = products.filter((p) => !p.concerns || p.concerns.length === 0).length

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="admin-page-header">
        <div>
          <h1
            className="mb-2 text-2xl font-light tracking-[0.15em] sm:text-3xl"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}
          >
            Shop by Concern
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Concerns appear in the store's "Shop by Concern" menu. Products are linked from the product form, from the CSV "Concern" column, or here.
          </p>
        </div>
        <button onClick={() => setDraft({ ...EMPTY_DRAFT })} className="btn-primary inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add concern
        </button>
      </div>

      <div className="metric-card text-sm text-gray-700">
        <div className="font-medium text-gray-900">CSV import</div>
        <p className="mt-1">
          Add a <code className="rounded bg-gray-100 px-1">Concern</code> column to your product sheet and list one or more concerns per product, separated by commas
          (e.g. <code className="rounded bg-gray-100 px-1">Acne, Oily skin</code>). Names are matched to the concerns below by name, slug or alias; new names create a new concern.
          {unmapped > 0 && <span className="ml-1 text-amber-700">{unmapped} of {products.length} products have no concern yet.</span>}
        </p>
      </div>

      {loading ? (
        <div className="metric-card text-sm text-gray-500">Loading…</div>
      ) : concerns.length === 0 ? (
        <div className="metric-card text-sm text-gray-500">No concerns yet. Add one, or import a CSV with a Concern column.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {concerns.map((c, i) => (
            <div key={c.id} className={`flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center ${c.is_active ? '' : 'bg-gray-50 opacity-70'}`}>
              <div className="flex items-center gap-3 sm:w-72 sm:flex-shrink-0">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:invisible" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === concerns.length - 1} className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:invisible" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
                {c.image_url ? (
                  <img src={toAbs(c.image_url)} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400"><ImageIcon className="h-5 w-5" /></div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">
                    {c.name}
                    {c.concern_group && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-gray-500">{c.concern_group}</span>}
                  </div>
                  <a href={`${STORE_BASE}${c.slug}`} target="_blank" rel="noreferrer" className="block truncate text-xs text-blue-600 hover:underline">/{c.slug}</a>
                </div>
              </div>
              <div className="min-w-0 flex-1 text-xs text-gray-600">
                {c.description && <div className="truncate">{c.description}</div>}
                {c.aliases && c.aliases.length > 0 && <div className="mt-0.5 truncate text-gray-400">Also matches: {c.aliases.join(', ')}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => openAssign(c)} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100" title="Choose products">
                  {c.product_count} product{c.product_count === 1 ? '' : 's'}
                </button>
                <button
                  onClick={() => patch(c, { show_in_nav: !c.show_in_nav })}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${c.show_in_nav ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                  title="Show in the navbar menu"
                >
                  {c.show_in_nav ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} Menu
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={c.is_active} onChange={() => patch(c, { is_active: !c.is_active })} /> Active
                </label>
                <button
                  onClick={() => setDraft(toDraft(c))}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(c)} className="rounded p-1.5 text-red-500 hover:bg-red-50" aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDraft(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{draft.id ? 'Edit concern' : 'Add concern'}</h3>
              <button onClick={() => setDraft(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-gray-700">Name</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Acne & Breakouts" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">Group <span className="text-gray-400">(sections on the All concerns page)</span></span>
                <select value={draft.concern_group} onChange={(e) => setDraft({ ...draft, concern_group: e.target.value as Group | '' })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900">
                  {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">URL slug <span className="text-gray-400">(optional — made from the name)</span></span>
                <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="acne-breakouts" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">Also matches <span className="text-gray-400">(CSV aliases, comma separated)</span></span>
                <input value={draft.aliases} onChange={(e) => setDraft({ ...draft, aliases: e.target.value })} placeholder="acne, pimples, breakouts" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-gray-700">Short description <span className="text-gray-400">(menu, tiles and page intro)</span></span>
              <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Clear pores and calm breakouts." className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
            </label>

            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-900">Images</legend>
              <ImageField label="Tile image" hint="square, about 800×800. Navbar menu, concern tiles and the circles on concern pages." value={draft.image_url} onChange={(v) => setDraft((d) => d && { ...d, image_url: v })} apiBase={apiBase} toAbs={toAbs} onError={() => notify('error', 'Image upload failed')} />
              <ImageField label="Banner (desktop)" hint="wide, about 1920×640. Top of the concern page." wide value={draft.banner_url} onChange={(v) => setDraft((d) => d && { ...d, banner_url: v })} apiBase={apiBase} toAbs={toAbs} onError={() => notify('error', 'Image upload failed')} />
              <ImageField label="Banner (mobile)" hint="optional, about 1080×1080. Falls back to the desktop banner." value={draft.banner_mobile_url} onChange={(v) => setDraft((d) => d && { ...d, banner_mobile_url: v })} apiBase={apiBase} toAbs={toAbs} onError={() => notify('error', 'Image upload failed')} />
            </fieldset>

            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-900">Page text</legend>
              <label className="block text-sm">
                <span className="text-gray-700">Banner headline <span className="text-gray-400">(leave empty if the banner image already has text on it)</span></span>
                <input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} placeholder="Intense hydration, no more thirsty skin" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">Banner subheadline</span>
                <input value={draft.subheadline} onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })} placeholder="Blue tea care for deep, lasting moisture" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">About section title</span>
                <input value={draft.about_title} onChange={(e) => setDraft({ ...draft, about_title: e.target.value })} placeholder="What causes dry skin?" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">About section text <span className="text-gray-400">(shown below the products; a blank line starts a new paragraph)</span></span>
                <textarea value={draft.about_body} onChange={(e) => setDraft({ ...draft, about_body: e.target.value })} rows={4} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
            </fieldset>
            <div className="flex gap-4 text-sm text-gray-700">
              <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active</label>
              <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={draft.show_in_nav} onChange={(e) => setDraft({ ...draft, show_in_nav: e.target.checked })} /> Show in navbar menu</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDraft(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveDraft} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign products */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssigning(null)}>
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Products for {assigning.name}</h3>
                <div className="text-xs text-gray-500">{assignIds.size} selected</div>
              </div>
              <button onClick={() => setAssigning(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="relative border-b border-gray-100 p-3">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={assignQuery} onChange={(e) => setAssignQuery(e.target.value)} placeholder="Search products" className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm" />
            </div>
            <div className="flex-1 overflow-auto p-2">
              {visibleProducts.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={assignIds.has(p.id)}
                    onChange={() => setAssignIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(p.id)) next.delete(p.id)
                      else next.add(p.id)
                      return next
                    })}
                  />
                  {p.list_image ? <img src={toAbs(p.list_image)} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-gray-100" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-gray-900">{p.title}</div>
                    <div className="truncate text-xs text-gray-500">{p.category}{p.concerns?.length ? ` · ${p.concerns.map((c) => c.name).join(', ')}` : ''}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 p-4">
              <button onClick={() => setAssigning(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveAssign} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : 'Save products'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageField({ label, hint, value, onChange, apiBase, toAbs, onError, wide }: {
  label: string
  hint: string
  value: string
  onChange: (url: string) => void
  apiBase: string
  toAbs: (u?: string | null) => string
  onError: () => void
  wide?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const size = wide ? 'h-14 w-40' : 'h-14 w-14'
  return (
    <div className="text-sm">
      <div className="text-gray-700">{label} <span className="text-gray-400">({hint})</span></div>
      <div className="mt-1.5 flex items-center gap-3">
        {value ? (
          <img src={toAbs(value)} alt="" className={`${size} flex-shrink-0 rounded-lg object-cover`} />
        ) : (
          <div className={`${size} flex flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400`}>
            {uploading ? <span className="text-[11px]">Uploading</span> : <ImageIcon className="h-5 w-5" />}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="min-w-0 text-xs"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setUploading(true)
            onChange('')
            try {
              onChange(await uploadFile(f, apiBase))
            } catch {
              onError()
            } finally {
              setUploading(false)
            }
          }}
        />
        {value && <button type="button" onClick={() => onChange('')} className="text-xs text-red-600 hover:underline">Remove</button>}
      </div>
    </div>
  )
}
