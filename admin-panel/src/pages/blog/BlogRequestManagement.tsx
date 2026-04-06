import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArchiveRestore,
  Calendar,
  CheckCircle,
  ExternalLink,
  Eye,
  Heart,
  LayoutList,
  Loader2,
  MessageCircle,
  Search,
  Share2,
  Star,
  Trash2,
  User,
  X,
  XCircle,
  BarChart3,
  ImageIcon,
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

/** Row from GET /blog/admin/posts (+ joined counts) */
interface AdminBlogPost {
  id: number
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email?: string | null
  author_unique_user_id?: string | null
  user_id?: number | null
  cover_image?: string | null
  detail_image?: string | null
  og_image?: string | null
  images?: unknown
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
  created_at: string
  updated_at: string
  rejection_reason?: string | null
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: unknown
  og_title?: string | null
  og_description?: string | null
  canonical_url?: string | null
  categories?: unknown
  allow_comments?: boolean
  is_active?: boolean
  is_archived?: boolean
  is_deleted?: boolean
  deleted_at?: string | null
  views_count?: number | null
  reads_count?: number | null
  admin_likes_count?: number | null
  admin_comments_count?: number | null
}

type MainTab = 'review' | 'live' | 'rejected' | 'all' | 'trash'
type PanelTab = 'preview' | 'seo' | 'moderation'

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('role') || 'admin'
  const permissions = localStorage.getItem('permissions') || ''
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  if (role) h['x-user-role'] = role
  if (permissions) h['x-user-permissions'] = permissions
  return h
}

function parseStringList(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      if (Array.isArray(j)) return j.map((x) => String(x).trim()).filter(Boolean)
    } catch {
      return raw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

function parseImages(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      return Array.isArray(j) ? j.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Static files live at /uploads/... on the API host, NOT under /api.
 * Admin getApiBaseUrl() often ends with /api — strip it for asset URLs.
 */
function uploadsOriginFromApiBase(apiBase: string): string {
  return apiBase.replace(/\/+$/, '').replace(/\/api$/i, '')
}

/** Absolute URL for a stored upload path, filename, or full URL. */
function toUploadUrl(apiBase: string, path: string | null | undefined): string {
  if (!path) return ''
  const p = String(path).trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  const origin = uploadsOriginFromApiBase(apiBase)
  if (p.startsWith('/uploads/')) return `${origin}${p}`
  // Wrong legacy shape from some clients
  if (p.startsWith('/api/uploads/')) return `${origin}${p.replace(/^\/api/, '')}`
  if (!p.includes('/') && /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(p)) {
    return `${origin}/uploads/blog/${p}`
  }
  if (p.startsWith('uploads/')) return `${origin}/${p}`
  return `${origin}/${p.replace(/^\//, '')}`
}

function stripHtml(html: string): string {
  if (!html) return ''
  const tmp = typeof document !== 'undefined' ? document.createElement('div') : null
  if (tmp) {
    tmp.innerHTML = html
    return (tmp.textContent || tmp.innerText || '').trim()
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Match user-panel BlogPreview image width fixes */
function processContentImages(htmlContent: string): string {
  if (!htmlContent) return htmlContent
  let content = htmlContent
  content = content.replace(/<img([^>]*)>/gi, (match) => {
    const widthStyleMatch = match.match(/data-width-style=["'](full|wide|normal)["']/i)
    const style = widthStyleMatch ? widthStyleMatch[1].toLowerCase() : null
    const styleAttr = match.match(/style=["']([^"']*)["']/)?.[1] ?? ''
    const hasOverflow = /100vw|calc\(|120%/.test(styleAttr)
    const widthCss =
      style === 'full'
        ? 'width:100%;max-width:100%'
        : style === 'wide'
          ? 'width:50%;max-width:50%'
          : 'width:auto;max-width:100%'
    const newStyle = `height:auto;margin:10px auto;display:block;${widthCss}`
    if (style || hasOverflow) {
      if (match.includes('style=')) {
        return match.replace(/\s*style=["'][^"']*["']/, ` style="${newStyle}"`)
      }
      return match.replace(/<img/, `<img style="${newStyle}"`)
    }
    return match
  })
  return content
}

/**
 * Prepare stored HTML for admin preview: fix image & iframe URLs and YouTube embed sizing.
 * Uploads are served at {origin}/uploads/... — not under /api (admin API base often ends with /api).
 */
function prepareAdminBlogBodyHtml(html: string, apiBase: string, postImagePaths: string[]): string {
  if (!html) return html
  const origin = uploadsOriginFromApiBase(apiBase)
  const postImagesAbs = postImagePaths.map((p) => toUploadUrl(apiBase, p))

  let processed = html

  processed = processed
    .replace(/src="(\/uploads\/[^"]+)"/g, `src="${origin}$1"`)
    .replace(/src='(\/uploads\/[^']+)'/g, `src='${origin}$1'`)
    .replace(/src\s*=\s*"(\/uploads\/[^"]+)"/g, `src="${origin}$1"`)
    .replace(/src\s*=\s*'(\/uploads\/[^']+)'/g, `src='${origin}$1'`)

  // src="https://host/api/uploads/..." → drop /api (static files are not under /api)
  processed = processed.replace(
    /src=(["'])(https?:\/\/[^"']+?)\/api(\/uploads\/[^"']+)\1/gi,
    (_m, q: string, base: string, uploadRest: string) => `src=${q}${base}${uploadRest}${q}`
  )

  processed = processed.replace(/<img([^>]*data-filename="([^"]+)"[^>]*)>/gi, (match, _rest, filename: string) => {
    const fn = String(filename || '').trim()
    if (!fn) return match
    const hit = postImagesAbs.find((u) => u.includes(fn) || u.endsWith(fn) || fn.includes(u.split('/').pop() || ''))
    const src = hit || (fn.startsWith('/uploads/') ? `${origin}${fn}` : `${origin}/uploads/blog/${fn.replace(/^\/+/, '')}`)
    if (/src\s*=/i.test(match)) {
      return match.replace(/\s+src\s*=\s*["'][^"']*["']/i, ` src="${src}"`)
    }
    return match.replace(/<img/i, `<img src="${src}"`)
  })

  processed = processed.replace(
    /<img([^>]*)\ssrc\s*=\s*["']([a-f0-9-]{30,}\.(?:png|jpe?g|gif|webp))["']([^>]*)>/gi,
    (_m, pre, fname: string, post) => {
      const src = `${origin}/uploads/blog/${fname}`
      return `<img${pre} src="${src}"${post}>`
    }
  )

  // src="filename.png" (no path) — common when HTML was saved before URL rewrite
  processed = processed.replace(
    /<img([^>]*)\bsrc\s*=\s*"((?!https?:|\/|data:|blob:)[^"]+\.(?:png|jpe?g|gif|webp))"([^>]*)>/gi,
    (_m, pre, fname: string, post) => `<img${pre} src="${origin}/uploads/blog/${fname}"${post}>`
  )
  processed = processed.replace(
    /<img([^>]*)\bsrc\s*=\s*'((?!https?:|\/|data:|blob:)[^']+\.(?:png|jpe?g|gif|webp))'([^>]*)>/gi,
    (_m, pre, fname: string, post) => `<img${pre} src='${origin}/uploads/blog/${fname}'${post}>`
  )

  processed = processed.replace(/<iframe([^>]*)>/gi, (_full, attrs: string) => {
    const srcMatch = attrs.match(/\ssrc\s*=\s*["']([^"']*)["']/i)
    let src = srcMatch ? srcMatch[1].trim() : ''
    if (!src) return `<iframe${attrs}>`
    if (src.startsWith('//')) src = `https:${src}`
    else if (src.startsWith('/') && (src.includes('youtube') || src.includes('youtu'))) {
      src = `https://www.youtube.com${src}`
    } else if (!/^https?:/i.test(src) && (src.includes('youtube.com') || src.includes('youtu.be'))) {
      src = `https://${src.replace(/^\/\//, '')}`
    }
    let next = attrs
      .replace(/\s+src\s*=\s*["'][^"']*["']/i, ` src="${src}"`)
      .replace(/\s+style\s*=\s*["'][^"']*["']/gi, '')
    const allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    if (!/\sallow\s*=/i.test(next)) next += ` allow="${allow}"`
    if (!/\sallowfullscreen/i.test(next)) next += ' allowfullscreen'
    if (!/\sreferrerpolicy\s*=/i.test(next)) next += ' referrerpolicy="strict-origin-when-cross-origin"'
    if (!/\sloading\s*=/i.test(next)) next += ' loading="lazy"'
    next += ` style="width:100%;max-width:720px;height:405px;min-height:240px;border:0;border-radius:8px;display:block;margin:12px auto"`
    return `<iframe${next}>`
  })

  return processContentImages(processed)
}

function estimateReadMinutes(html: string): number {
  const text = stripHtml(html)
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function userBlogPostUrl(postId: number): string {
  const origin = (import.meta.env.VITE_USER_APP_ORIGIN as string | undefined)?.replace(/\/$/, '') || 'https://thenefol.com'
  return `${origin}/#/user/blog/${postId}`
}

export default function BlogRequestManagement() {
  const API_BASE = getApiBaseUrl()
  const [library, setLibrary] = useState<AdminBlogPost[]>([])
  const [trashList, setTrashList] = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [trashLoading, setTrashLoading] = useState(false)
  const [mainTab, setMainTab] = useState<MainTab>('review')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminBlogPost | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('preview')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<AdminBlogPost | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [seoDraft, setSeoDraft] = useState<Record<string, string>>({})
  const [seoSaving, setSeoSaving] = useState(false)

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts`, { headers: authHeaders() })
      const data = await r.json()
      setLibrary(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setLibrary([])
    } finally {
      setLoading(false)
    }
  }, [API_BASE])

  const loadTrash = useCallback(async () => {
    setTrashLoading(true)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts?trash=1`, { headers: authHeaders() })
      const data = await r.json()
      setTrashList(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setTrashList([])
    } finally {
      setTrashLoading(false)
    }
  }, [API_BASE])

  useEffect(() => {
    loadLibrary()
    loadTrash()
  }, [loadLibrary, loadTrash])

  useEffect(() => {
    if (mainTab === 'trash') loadTrash()
  }, [mainTab, loadTrash])

  useEffect(() => {
    if (!selected) {
      setSeoDraft({})
      return
    }
    const kw = parseStringList(selected.meta_keywords).join(', ')
    const cat = parseStringList(selected.categories).join(', ')
    setSeoDraft({
      meta_title: selected.meta_title || '',
      meta_description: selected.meta_description || '',
      meta_keywords: kw,
      og_title: selected.og_title || '',
      og_description: selected.og_description || '',
      canonical_url: selected.canonical_url || '',
      categories: cat,
    })
  }, [selected?.id])

  const counts = useMemo(() => {
    const pending = library.filter((p) => p.status === 'pending').length
    const live = library.filter((p) => p.status === 'approved').length
    const rejected = library.filter((p) => p.status === 'rejected').length
    return { pending, live, rejected, total: library.length, trash: trashList.length }
  }, [library, trashList])

  const visibleRows = useMemo(() => {
    const base = mainTab === 'trash' ? trashList : library
    let rows =
      mainTab === 'review'
        ? library.filter((p) => p.status === 'pending')
        : mainTab === 'live'
          ? library.filter((p) => p.status === 'approved')
          : mainTab === 'rejected'
            ? library.filter((p) => p.status === 'rejected')
            : mainTab === 'all'
              ? library
              : base
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (p) =>
          stripHtml(p.title).toLowerCase().includes(q) ||
          p.author_name.toLowerCase().includes(q) ||
          (p.author_unique_user_id && p.author_unique_user_id.toLowerCase().includes(q)) ||
          String(p.id).includes(q)
      )
    }
    return rows
  }, [library, trashList, mainTab, search])

  const approve = async (post: AdminBlogPost, featured: boolean) => {
    setActionBusy(`approve-${post.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/approve/${post.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ featured }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.message || 'Approve failed')
        return
      }
      await loadLibrary()
      setSelected(null)
    } finally {
      setActionBusy(null)
    }
  }

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      alert('Please enter a rejection reason.')
      return
    }
    setActionBusy(`reject-${rejectTarget.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/reject/${rejectTarget.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.message || 'Reject failed')
        return
      }
      setRejectOpen(false)
      setRejectTarget(null)
      setRejectReason('')
      await loadLibrary()
      setSelected(null)
    } finally {
      setActionBusy(null)
    }
  }

  const softDelete = async (post: AdminBlogPost) => {
    if (!confirm(`Move "${stripHtml(post.title)}" to trash?`)) return
    setActionBusy(`del-${post.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts/${post.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) {
        alert('Delete failed')
        return
      }
      await loadLibrary()
      await loadTrash()
      setSelected(null)
    } finally {
      setActionBusy(null)
    }
  }

  const restore = async (post: AdminBlogPost) => {
    setActionBusy(`restore-${post.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts/${post.id}/restore`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (!r.ok) {
        alert('Restore failed')
        return
      }
      await loadLibrary()
      await loadTrash()
      setSelected(null)
    } finally {
      setActionBusy(null)
    }
  }

  const toggleFeatured = async (post: AdminBlogPost) => {
    setActionBusy(`feat-${post.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts/${post.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ featured: !post.featured }),
      })
      if (!r.ok) {
        alert('Update failed')
        return
      }
      const data = await r.json().catch(() => ({}))
      const updated = data.post as AdminBlogPost | undefined
      setLibrary((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...(updated || { featured: !post.featured }) } : p)))
      setSelected((s) => (s && s.id === post.id ? { ...s, featured: updated?.featured ?? !post.featured } : s))
    } finally {
      setActionBusy(null)
    }
  }

  const patchPostStatus = async (post: AdminBlogPost, body: { is_active?: boolean; is_archived?: boolean }) => {
    setActionBusy(`st-${post.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts/${post.id}/status`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        alert('Status update failed')
        return
      }
      const data = await r.json().catch(() => ({}))
      const updated = data.post as AdminBlogPost | undefined
      if (updated) {
        setLibrary((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)))
        setSelected((s) => (s && s.id === post.id ? { ...s, ...updated } : s))
      }
    } finally {
      setActionBusy(null)
    }
  }

  const toggleAllowComments = async (post: AdminBlogPost) => {
    const next = !(post.allow_comments !== false)
    setActionBusy(`com-${post.id}`)
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts/${post.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ allow_comments: next }),
      })
      if (!r.ok) {
        alert('Update failed')
        return
      }
      const data = await r.json().catch(() => ({}))
      const updated = data.post as AdminBlogPost | undefined
      setLibrary((prev) => prev.map((p) => (p.id === post.id ? { ...p, allow_comments: updated?.allow_comments ?? next } : p)))
      setSelected((s) => (s && s.id === post.id ? { ...s, allow_comments: updated?.allow_comments ?? next } : s))
    } finally {
      setActionBusy(null)
    }
  }

  const saveSeo = async () => {
    if (!selected) return
    setSeoSaving(true)
    try {
      const keywords = seoDraft.meta_keywords
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const categories = seoDraft.categories
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const r = await fetch(`${API_BASE}/blog/admin/posts/${selected.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          meta_title: seoDraft.meta_title || null,
          meta_description: seoDraft.meta_description || null,
          meta_keywords: keywords.length ? JSON.stringify(keywords) : null,
          og_title: seoDraft.og_title || null,
          og_description: seoDraft.og_description || null,
          canonical_url: seoDraft.canonical_url || null,
          categories: categories.length ? JSON.stringify(categories) : null,
        }),
      })
      if (!r.ok) {
        alert('Save failed')
        return
      }
      const data = await r.json().catch(() => ({}))
      const updated = data.post as AdminBlogPost | undefined
      if (updated) {
        setLibrary((prev) => prev.map((p) => (p.id === selected.id ? { ...p, ...updated } : p)))
        setSelected({ ...selected, ...updated })
      }
      alert('SEO settings saved.')
    } finally {
      setSeoSaving(false)
    }
  }

  const applyWeeklyCreatorReward = async (postId: number) => {
    try {
      const r = await fetch(`${API_BASE}/blog/admin/posts/${postId}/apply-weekly-creator-reward`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => ({}))
      alert(r.ok ? d.message || 'Done.' : d.message || 'Could not apply reward.')
    } catch {
      alert('Request failed.')
    }
  }

  const tabBtn = (id: MainTab, label: string, sub?: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setMainTab(id)}
      className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all ${
        mainTab === id
          ? 'border-[#4B97C9] bg-[#f0f8fd] shadow-sm ring-1 ring-[#4B97C9]/30'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {sub != null && <span className="text-xs text-slate-500 mt-0.5">{sub}</span>}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#f4f9f9] p-4 sm:p-6 lg:p-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-light tracking-[0.12em] text-[#1B4965]"
              style={{ fontFamily: 'var(--font-heading-family, Cormorant Garamond, serif)' }}
            >
              Blog management
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Review submissions, preview rich posts like authors see them, edit SEO / Open Graph, moderate visibility, and manage trash — aligned with NEFOL Social authoring.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadLibrary()
              if (mainTab === 'trash') loadTrash()
            }}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Pending review</p>
            <p className="text-2xl font-light text-amber-950">{counts.pending}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Published</p>
            <p className="text-2xl font-light text-emerald-950">{counts.live}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Rejected</p>
            <p className="text-2xl font-light text-rose-950">{counts.rejected}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">All active</p>
            <p className="text-2xl font-light text-slate-900">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-100/80 px-4 py-3 col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Trash</p>
            <p className="text-2xl font-light text-slate-900">{counts.trash}</p>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex flex-wrap gap-2">
          {tabBtn('review', 'Review queue', `${counts.pending} pending`)}
          {tabBtn('live', 'Live posts', `${counts.live} approved`)}
          {tabBtn('rejected', 'Rejected', `${counts.rejected}`)}
          {tabBtn('all', 'All (active)', `${counts.total} rows`)}
          {tabBtn('trash', 'Trash', `${counts.trash} deleted`)}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search title, author, Nefol ID, post #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm focus:border-[#4B97C9] focus:outline-none focus:ring-2 focus:ring-[#4B97C9]/20"
          />
        </div>

        {/* List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          {loading && mainTab !== 'trash' ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="h-10 w-10 animate-spin text-[#4B97C9] mb-3" />
              Loading posts…
            </div>
          ) : mainTab === 'trash' && trashLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="h-10 w-10 animate-spin text-[#4B97C9] mb-3" />
              Loading trash…
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <LayoutList className="mx-auto h-10 w-10 opacity-40 mb-2" />
              No posts in this view.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleRows.map((post) => {
                const cover = toUploadUrl(API_BASE, post.cover_image)
                const cats = parseStringList(post.categories)
                const busy = actionBusy != null && actionBusy.endsWith(`-${post.id}`)
                return (
                  <li key={`${mainTab}-${post.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 hover:bg-slate-50/80">
                    <div className="flex shrink-0 items-start gap-3 sm:w-[420px]">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 line-clamp-2">{stripHtml(post.title) || '(no title)'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              post.status === 'pending'
                                ? 'bg-amber-100 text-amber-900'
                                : post.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {post.status}
                          </span>
                          {post.featured && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-900">
                              <Star className="h-3 w-3" /> Featured
                            </span>
                          )}
                          {post.is_archived && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">Archived</span>
                          )}
                          {post.is_active === false && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-900">Hidden</span>
                          )}
                          {cats.slice(0, 3).map((c) => (
                            <span key={c} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                              {c}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {post.author_name}
                            {post.author_unique_user_id ? ` · ${post.author_unique_user_id}` : post.user_id ? ` · user #${post.user_id}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(post.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1" title="Views / reads (if tracked)">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {post.views_count ?? 0} / {post.reads_count ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          {post.admin_likes_count ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.admin_comments_count ?? 0}
                        </span>
                        <span>{estimateReadMinutes(post.content)} min read</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setSelected(post)
                            setPanelTab('preview')
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1B4965] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#163d54]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review & preview
                        </button>
                        {post.status === 'approved' && !post.is_deleted && (
                          <a
                            href={userBlogPostUrl(post.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Live
                          </a>
                        )}
                        {mainTab === 'trash' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => restore(post)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        ) : (
                          <>
                            {post.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={!!actionBusy}
                                  onClick={() => approve(post, false)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={!!actionBusy}
                                  onClick={() => approve(post, true)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  Feature
                                </button>
                                <button
                                  type="button"
                                  disabled={!!actionBusy}
                                  onClick={() => {
                                    setRejectTarget(post)
                                    setRejectReason('')
                                    setRejectOpen(true)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                            {post.status === 'approved' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleFeatured(post)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                <Star className="h-3.5 w-3.5" />
                                {post.featured ? 'Unfeature' : 'Feature'}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => softDelete(post)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Trash
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Detail + preview drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Post #{selected.id}</p>
                <h2 className="truncate text-lg font-semibold text-[#1B4965]">{stripHtml(selected.title)}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex border-b border-slate-200 px-2">
              {(['preview', 'seo', 'moderation'] as PanelTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPanelTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                    panelTab === t ? 'border-[#4B97C9] text-[#1B4965]' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'seo' ? 'SEO & sharing' : t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {panelTab === 'preview' && (
                <AdminBlogPreview apiBase={API_BASE} post={selected} onOpenLive={() => window.open(userBlogPostUrl(selected.id), '_blank')} />
              )}
              {panelTab === 'seo' && (
                <div className="space-y-4 p-6 max-w-2xl">
                  <p className="text-sm text-slate-600">
                    Matches author fields in the blog composer: meta title/description, keywords (tags), Open Graph title/description, canonical URL, and categories (comma-separated).
                  </p>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Meta title</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={seoDraft.meta_title}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, meta_title: e.target.value }))}
                  />
                  <label className="block text-xs font-semibold uppercase text-slate-500">Meta description</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
                    value={seoDraft.meta_description}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, meta_description: e.target.value }))}
                  />
                  <label className="block text-xs font-semibold uppercase text-slate-500">Keywords / tags (comma-separated)</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={seoDraft.meta_keywords}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, meta_keywords: e.target.value }))}
                  />
                  <label className="block text-xs font-semibold uppercase text-slate-500">OG title</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={seoDraft.og_title}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, og_title: e.target.value }))}
                  />
                  <label className="block text-xs font-semibold uppercase text-slate-500">OG description</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
                    value={seoDraft.og_description}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, og_description: e.target.value }))}
                  />
                  <label className="block text-xs font-semibold uppercase text-slate-500">Canonical URL</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                    value={seoDraft.canonical_url}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, canonical_url: e.target.value }))}
                  />
                  <label className="block text-xs font-semibold uppercase text-slate-500">Categories (comma-separated)</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={seoDraft.categories}
                    onChange={(e) => setSeoDraft((d) => ({ ...d, categories: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={seoSaving}
                    onClick={() => saveSeo()}
                    className="rounded-xl bg-[#1B4965] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#163d54] disabled:opacity-50"
                  >
                    {seoSaving ? 'Saving…' : 'Save SEO & categories'}
                  </button>
                </div>
              )}
              {panelTab === 'moderation' && (
                <div className="space-y-6 p-6 max-w-xl">
                  {selected.status === 'pending' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!!actionBusy}
                        onClick={() => approve(selected, false)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={!!actionBusy}
                        onClick={() => approve(selected, true)}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Approve & feature
                      </button>
                      <button
                        type="button"
                        disabled={!!actionBusy}
                        onClick={() => {
                          setRejectTarget(selected)
                          setRejectReason('')
                          setRejectOpen(true)
                        }}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Reject…
                      </button>
                    </div>
                  )}
                  {selected.status === 'approved' && !selected.is_deleted && (
                    <>
                      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-800">Visibility</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!!actionBusy}
                            onClick={() => patchPostStatus(selected, { is_active: !(selected.is_active !== false) })}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                          >
                            {selected.is_active === false ? 'Show on site' : 'Hide from listings'}
                          </button>
                          <button
                            type="button"
                            disabled={!!actionBusy}
                            onClick={() => patchPostStatus(selected, { is_archived: !selected.is_archived })}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                          >
                            {selected.is_archived ? 'Unarchive' : 'Archive'}
                          </button>
                          <button
                            type="button"
                            disabled={!!actionBusy}
                            onClick={() => toggleFeatured(selected)}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                          >
                            {selected.featured ? 'Remove featured' : 'Mark featured'}
                          </button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                        <p className="text-sm font-semibold text-slate-800">Comments</p>
                        <button
                          type="button"
                          disabled={!!actionBusy}
                          onClick={() => toggleAllowComments(selected)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                        >
                          {selected.allow_comments === false ? 'Enable comments' : 'Disable comments'}
                        </button>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
                        <p className="text-sm font-semibold text-emerald-900">Creator rewards</p>
                        <p className="text-xs text-emerald-800">
                          First approved post of the UTC week can earn Nefol coins. Use this if you fixed author linkage after approval.
                        </p>
                        <button
                          type="button"
                          onClick={() => applyWeeklyCreatorReward(selected.id)}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Apply weekly creator reward
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={!!actionBusy}
                        onClick={() => softDelete(selected)}
                        className="rounded-xl border-2 border-rose-200 px-4 py-2 text-sm font-semibold text-rose-800"
                      >
                        Move to trash
                      </button>
                    </>
                  )}
                  {selected.rejection_reason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-xs font-semibold text-rose-900 uppercase">Rejection reason</p>
                      <p className="text-sm text-rose-800 mt-1">{selected.rejection_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject submission</h3>
            <p className="mt-1 text-sm text-slate-600">Authors see this message in their dashboard. Be specific and constructive.</p>
            <textarea
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[120px]"
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false)
                  setRejectTarget(null)
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!actionBusy}
                onClick={() => submitReject()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Submit rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminBlogPreview({
  apiBase,
  post,
  onOpenLive,
}: {
  apiBase: string
  post: AdminBlogPost
  onOpenLive: () => void
}) {
  const cover = toUploadUrl(apiBase, post.cover_image)
  const detail = toUploadUrl(apiBase, post.detail_image)
  const cats = parseStringList(post.categories)
  const og = toUploadUrl(apiBase, post.og_image)
  const contentHtml = prepareAdminBlogBodyHtml(post.content || '', apiBase, parseImages(post.images))
  const titleHtml = post.title || ''
  const excerptHtml = post.excerpt || ''
  const mins = estimateReadMinutes(post.content)

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <style>{`
        .admin-blog-preview-content { line-height: 1.85; font-size: 1.0625rem; color: #1e293b; }
        .admin-blog-preview-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .admin-blog-preview-content h2 { font-size: 1.75em; font-weight: bold; margin: 0.5em 0; }
        .admin-blog-preview-content h3 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .admin-blog-preview-content p { margin: 0.5em 0; }
        .admin-blog-preview-content ul { list-style: disc; margin-left: 2em; }
        .admin-blog-preview-content ol { list-style: decimal; margin-left: 2em; }
        .admin-blog-preview-content a { color: #4B97C9; text-decoration: underline; }
        .admin-blog-preview-content img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
        .admin-blog-preview-content .youtube-embed-wrapper {
          width: 100%; max-width: 720px; margin: 1.25rem auto; min-height: 200px;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center;
        }
        .admin-blog-preview-content .youtube-embed-wrapper iframe {
          max-width: 100% !important; width: 100% !important; height: 405px !important; min-height: 240px !important;
          border: 0 !important; border-radius: 8px; display: block;
        }
        .admin-blog-preview-content .image-caption { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center; }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#4B97C9] px-3 py-1 text-xs font-bold text-white">Preview</span>
        {post.status === 'approved' && (
          <button
            type="button"
            onClick={onOpenLive}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open live reader
          </button>
        )}
      </div>

      {cats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cats.map((c) => (
            <span key={c} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
              {c}
            </span>
          ))}
        </div>
      )}

      <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-[#1B4965] mb-4">
        {/<[^>]+>/.test(titleHtml) ? <span dangerouslySetInnerHTML={{ __html: titleHtml }} /> : titleHtml || 'Untitled'}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
            <User className="h-4 w-4" />
          </span>
          <span>
            <span className="font-semibold text-slate-900 block">{post.author_name}</span>
            <span className="text-xs text-slate-500">
              {post.author_unique_user_id || (post.user_id != null ? `User #${post.user_id}` : post.author_email || '')}
            </span>
          </span>
        </span>
        <span className="text-slate-300">|</span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
        <span className="text-slate-300">|</span>
        <span>{mins} min read</span>
        <span className="text-slate-300">|</span>
        <span className="inline-flex items-center gap-1">
          <Heart className="h-4 w-4" /> {post.admin_likes_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-4 w-4" /> {post.admin_comments_count ?? 0}
        </span>
      </div>

      {cover && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-slate-100">
          <img src={cover} alt="" className="w-full max-h-[420px] object-cover" />
        </div>
      )}

      {detail && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-slate-100 aspect-video">
          <img src={detail} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {excerptHtml && (
        <div className="mb-8 text-lg text-slate-700 leading-relaxed">
          {/<[^>]+>/.test(excerptHtml) ? <span dangerouslySetInnerHTML={{ __html: excerptHtml }} /> : excerptHtml}
        </div>
      )}

      <div className="admin-blog-preview-content prose max-w-none" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {(og || parseImages(post.images).length > 0) && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-xs font-semibold uppercase text-slate-500 mb-2 flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" /> Sharing assets
          </p>
          {og && (
            <p className="text-xs text-slate-600 mb-2">
              OG image: <a className="text-[#4B97C9] underline" href={og} target="_blank" rel="noreferrer">{og}</a>
            </p>
          )}
          {parseImages(post.images).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {parseImages(post.images).map((src, i) => (
                <img key={i} src={toUploadUrl(apiBase, src)} alt="" className="rounded-lg object-cover h-24 w-full" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
