import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ExternalLink,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileEdit,
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

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

function uploadsOriginFromApiBase(apiBase: string): string {
  return apiBase.replace(/\/+$/, '').replace(/\/api$/i, '')
}

function toUploadUrl(apiBase: string, path: string | null | undefined): string {
  if (!path) return ''
  const p = String(path).trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  const origin = uploadsOriginFromApiBase(apiBase)
  if (p.startsWith('/uploads/')) return `${origin}${p}`
  if (p.startsWith('/api/uploads/')) return `${origin}${p.replace(/^\/api/, '')}`
  return `${origin}/${p.replace(/^\//, '')}`
}

function userAppOrigin(): string {
  return (import.meta.env.VITE_USER_APP_ORIGIN as string | undefined)?.replace(/\/$/, '') || 'https://thenefol.com'
}

interface AuthorListRow {
  id: number
  user_id: number | null
  username: string | null
  display_name: string | null
  pen_name: string | null
  profile_email: string | null
  status: string
  is_verified: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  profile_image: string | null
  profile_unique_user_id: string | null
  user_email: string | null
  user_name: string | null
  user_unique_user_id: string | null
  roles: string[] | null
  followers_count: number
  blog_posts_total: number
  blog_posts_pending: number
  blog_posts_approved: number
  drafts_count: number
}

interface BanReasonOption {
  key: string
  label: string
  preview: string | null
}

interface AuthorDetailResponse {
  profile: Record<string, unknown>
  stats: Record<string, unknown> | null
  blog: {
    total: number
    pending: number
    approved: number
    rejected: number
    trash: number
    drafts: number
  }
  recent_posts: Array<{
    id: number
    title: string
    status: string
    featured: boolean
    created_at: string
    updated_at: string
    is_deleted: boolean
    views_count?: number | null
    reads_count?: number | null
  }>
}

const LIMIT = 30

/** Keys/labels match `backend/src/constants/authorBanReasons.ts` — used if GET /ban-reasons fails */
const STATIC_BAN_REASONS: BanReasonOption[] = [
  { key: 'policy_violation', label: 'Community or content policy violation', preview: null },
  { key: 'spam_promotional', label: 'Spam, misleading, or excessive promotional content', preview: null },
  { key: 'harassment', label: 'Harassment, hate, or harmful behaviour', preview: null },
  { key: 'impersonation', label: 'Impersonation or false identity', preview: null },
  { key: 'copyright', label: 'Copyright or intellectual property issues', preview: null },
  { key: 'platform_abuse', label: 'Abuse of platform features (bots, fake engagement, etc.)', preview: null },
  { key: 'other', label: 'Other (write a message to the author below)', preview: null },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'banned', label: 'Banned' },
  { value: 'deleted', label: 'Deleted (soft)' },
]

export default function AuthorManagement() {
  const API_BASE = getApiBaseUrl()
  const USER_ORIGIN = userAppOrigin()

  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [onboarding, setOnboarding] = useState('all')
  const [role, setRole] = useState('all')
  const [sort, setSort] = useState('created_desc')
  const [offset, setOffset] = useState(0)

  const [rows, setRows] = useState<AuthorListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AuthorDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)

  useEffect(() => {
    if (qInput === '') {
      setQ('')
      setOffset(0)
      return
    }
    const t = window.setTimeout(() => {
      setQ(qInput.trim())
      setOffset(0)
    }, 350)
    return () => window.clearTimeout(t)
  }, [qInput])

  const [draftStatus, setDraftStatus] = useState('')
  const [draftVerified, setDraftVerified] = useState(false)
  const [draftOnboarding, setDraftOnboarding] = useState(false)
  const [banReasons, setBanReasons] = useState<BanReasonOption[]>([])
  const [draftBanReasonKey, setDraftBanReasonKey] = useState('')
  const [draftBanOtherMessage, setDraftBanOtherMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await fetch(`${API_BASE}/admin/authors/ban-reasons`, { headers: authHeaders() })
        const data = await r.json().catch(() => ({}))
        if (!r.ok || cancelled) return
        const list = Array.isArray(data.reasons) ? (data.reasons as BanReasonOption[]) : []
        setBanReasons(list)
      } catch {
        /* keep empty; ban UI still works if backend returns 404 in dev */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [API_BASE])

  const loadList = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const sp = new URLSearchParams()
      if (q.trim()) sp.set('q', q.trim())
      if (status !== 'all') sp.set('status', status)
      if (onboarding !== 'all') sp.set('onboarding', onboarding)
      if (role !== 'all') sp.set('role', role)
      if (sort) sp.set('sort', sort)
      sp.set('limit', String(LIMIT))
      sp.set('offset', String(offset))
      const r = await fetch(`${API_BASE}/admin/authors?${sp.toString()}`, { headers: authHeaders() })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setRows([])
        setTotal(0)
        setErr(data.message || 'Failed to load authors')
        return
      }
      setRows(Array.isArray(data.authors) ? data.authors : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
    } catch {
      setErr('Network error')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [API_BASE, q, status, onboarding, role, sort, offset])

  useEffect(() => {
    loadList()
  }, [loadList])

  const loadDetail = useCallback(
    async (id: number) => {
      setDetailLoading(true)
      setDetail(null)
      try {
        const r = await fetch(`${API_BASE}/admin/authors/${id}`, { headers: authHeaders() })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          setDetail(null)
          return
        }
        setDetail(data as AuthorDetailResponse)
        const p = data.profile as Record<string, unknown>
        setDraftStatus(String(p.status || 'active'))
        setDraftVerified(Boolean(p.is_verified))
        setDraftOnboarding(Boolean(p.onboarding_completed))
        const brk = typeof p.ban_reason_key === 'string' ? p.ban_reason_key.trim() : ''
        setDraftBanReasonKey(brk)
        const bpm = typeof p.ban_public_message === 'string' ? p.ban_public_message : ''
        setDraftBanOtherMessage(brk === 'other' ? bpm : '')
      } finally {
        setDetailLoading(false)
      }
    },
    [API_BASE]
  )

  useEffect(() => {
    if (selectedId != null) loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  const saveDetail = async () => {
    if (selectedId == null) return
    if (draftStatus === 'banned') {
      if (!draftBanReasonKey.trim()) {
        alert('Select a reason for banning this author.')
        return
      }
      if (draftBanReasonKey === 'other' && draftBanOtherMessage.trim().length < 10) {
        alert('Enter a clear message to the author (at least 10 characters).')
        return
      }
    }
    setSaveBusy(true)
    try {
      const body: Record<string, unknown> = {
        status: draftStatus,
        is_verified: draftVerified,
        onboarding_completed: draftOnboarding,
      }
      if (draftStatus === 'banned') {
        body.ban_reason_key = draftBanReasonKey.trim()
        if (draftBanReasonKey === 'other') {
          body.ban_public_message = draftBanOtherMessage
        }
      }
      const r = await fetch(`${API_BASE}/admin/authors/${selectedId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        alert(data.message || 'Update failed')
        return
      }
      await loadList()
      await loadDetail(selectedId)
    } finally {
      setSaveBusy(false)
    }
  }

  const displayName = (r: AuthorListRow) =>
    r.display_name?.trim() || r.pen_name?.trim() || r.username?.trim() || `Author #${r.id}`

  const hasPrev = offset > 0
  const hasNext = offset + LIMIT < total

  const selectedRow = useMemo(() => rows.find((x) => x.id === selectedId) || null, [rows, selectedId])

  const banReasonOptions = useMemo(() => (banReasons.length > 0 ? banReasons : STATIC_BAN_REASONS), [banReasons])

  const profile = detail?.profile
  const userId = profile && typeof profile.user_id === 'number' ? profile.user_id : null

  return (
    <div className="min-h-screen bg-[#f4f9f9] p-4 sm:p-6 lg:p-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-light tracking-[0.12em] text-[#1B4965]"
              style={{ fontFamily: 'var(--font-heading-family, Cormorant Garamond, serif)' }}
            >
              Author management
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Unified view of NEFOL Social author profiles and linked user accounts: verification, onboarding, moderation
              status, engagement stats, and blog activity. Use this alongside Blog management for reviews and published
              posts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadList()}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{err}</div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
            Search
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Name, @handle, email, Nefol ID, user #…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4B97C9] focus:ring-1 focus:ring-[#4B97C9]"
              />
            </span>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600">
            Profile status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600">
            Onboarding
            <select
              value={onboarding}
              onChange={(e) => {
                setOnboarding(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
            >
              <option value="all">All</option>
              <option value="complete">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600">
            Account role
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
            >
              <option value="all">Any profile</option>
              <option value="author">AUTHOR on user</option>
            </select>
          </label>
          <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-slate-600">
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
            >
              <option value="created_desc">Newest profiles</option>
              <option value="followers_desc">Followers</option>
              <option value="posts_desc">Blog posts (count)</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">User account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Followers</th>
                  <th className="px-4 py-3 text-right">Posts</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Drafts</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#4B97C9]" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No author profiles match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-[#f0f8fd]/60 ${
                        selectedId === r.id ? 'bg-[#f0f8fd]' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.profile_image ? (
                            <img
                              src={toUploadUrl(API_BASE, r.profile_image)}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                              <User className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 font-medium text-slate-900">
                              {displayName(r)}
                              {r.is_verified && (
                                <span title="Verified author">
                                  <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              @{r.username || '—'} · id {r.id}
                              {r.onboarding_completed ? '' : ' · onboarding open'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{r.user_name || '—'}</div>
                        <div className="text-xs text-slate-500">{r.user_email || r.profile_email || '—'}</div>
                        {r.user_unique_user_id && (
                          <div className="text-xs text-slate-500">Nefol ID: {r.user_unique_user_id}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'banned'
                                ? 'bg-rose-100 text-rose-800'
                                : r.status === 'deleted'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-amber-50 text-amber-900'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">{r.followers_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">{r.blog_posts_total}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-800">{r.blog_posts_pending}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.drafts_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <span>
              {total === 0 ? '0' : `${offset + 1}–${Math.min(offset + LIMIT, total)}`} of {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!hasPrev || loading}
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => setOffset((o) => o + LIMIT)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedId != null && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-[1px]" role="presentation">
          <button
            type="button"
            className="h-full flex-1 cursor-default"
            aria-label="Close panel"
            onClick={() => setSelectedId(null)}
          />
          <aside className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Author detail</h2>
                {selectedRow && <p className="text-sm text-slate-500">{displayName(selectedRow)}</p>}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
              {detailLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#4B97C9]" />
                </div>
              ) : !detail || !profile ? (
                <p className="text-slate-500">Could not load detail.</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`${USER_ORIGIN}/#/user/author/${selectedId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Public profile
                    </a>
                    {userId != null && (
                      <>
                        <Link
                          to={`/admin/users/${userId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
                        >
                          <User className="h-3.5 w-3.5" /> User #{userId}
                        </Link>
                        <Link
                          to={`/admin/blog-requests?user_id=${userId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#4B97C9]/40 bg-[#f0f8fd] px-3 py-2 text-xs font-medium text-[#1B4965] hover:bg-[#e4f2fa]"
                        >
                          <BookOpen className="h-3.5 w-3.5" /> Blog posts
                        </Link>
                      </>
                    )}
                  </div>

                  <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Moderation</h3>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-600">Profile status</span>
                      <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="banned">banned</option>
                        <option value="deleted">deleted (30-day recovery)</option>
                      </select>
                    </label>
                    {draftStatus === 'banned' && (
                      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-amber-950">Reason (shown to the author)</span>
                          <select
                            value={draftBanReasonKey}
                            onChange={(e) => setDraftBanReasonKey(e.target.value)}
                            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">— Select a reason —</option>
                            {banReasonOptions.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {draftBanReasonKey &&
                          draftBanReasonKey !== 'other' &&
                          banReasonOptions.find((x) => x.key === draftBanReasonKey)?.preview && (
                            <p className="text-xs leading-relaxed text-amber-950/90">
                              {banReasonOptions.find((x) => x.key === draftBanReasonKey)?.preview}
                            </p>
                          )}
                        {draftBanReasonKey === 'other' && (
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-amber-950">Message to the author (min. 10 characters)</span>
                            <textarea
                              value={draftBanOtherMessage}
                              onChange={(e) => setDraftBanOtherMessage(e.target.value)}
                              rows={4}
                              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                              placeholder="Explain briefly why the profile was restricted…"
                            />
                          </label>
                        )}
                      </div>
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draftVerified}
                        onChange={(e) => setDraftVerified(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="flex items-center gap-1 text-slate-800">
                        <Shield className="h-4 w-4 text-sky-600" /> Verified author badge
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draftOnboarding}
                        onChange={(e) => setDraftOnboarding(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-slate-800">Onboarding completed</span>
                    </label>
                    <button
                      type="button"
                      disabled={saveBusy}
                      onClick={() => void saveDetail()}
                      className="w-full rounded-lg bg-[#1B4965] py-2.5 text-sm font-semibold text-white hover:bg-[#163a52] disabled:opacity-50"
                    >
                      {saveBusy ? 'Saving…' : 'Save changes'}
                    </button>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile vs account</h3>
                    <dl className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">Pen / display</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {String(profile.display_name || profile.pen_name || profile.username || '—')}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">@username</dt>
                        <dd className="text-right font-medium text-slate-800">{String(profile.username || '—')}</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">Profile email</dt>
                        <dd className="text-right font-medium text-slate-800">{String(profile.email || '—')}</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">Account email</dt>
                        <dd className="text-right font-medium text-slate-800">{String(profile.account_email || '—')}</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">Nefol ID (profile)</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {String(profile.unique_user_id || '—')}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">Nefol ID (user)</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {String(profile.account_unique_user_id || '—')}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <dt className="text-slate-500">User roles</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {Array.isArray(profile.account_roles)
                            ? (profile.account_roles as string[]).join(', ')
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {detail.stats && (
                    <section className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Cached stats</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(detail.stats).map(([k, v]) => (
                          <div key={k} className="rounded-lg border border-slate-100 bg-white px-2 py-2">
                            <div className="text-slate-500">{k}</div>
                            <div className="font-semibold text-slate-900">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Blog summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                      {Object.entries(detail.blog).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-slate-100 bg-white px-2 py-2">
                          <div className="capitalize text-slate-500">{k.replace(/_/g, ' ')}</div>
                          <div className="font-semibold text-slate-900">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <FileEdit className="h-3.5 w-3.5" /> Recent posts
                    </h3>
                    <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
                      {detail.recent_posts.length === 0 ? (
                        <li className="text-slate-500">No posts yet.</li>
                      ) : (
                        detail.recent_posts.map((p) => (
                          <li
                            key={p.id}
                            className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-white px-2 py-2"
                          >
                            <span className="font-medium text-slate-800 line-clamp-2">{p.title}</span>
                            <span className="text-slate-500">
                              {p.status}
                              {p.is_deleted ? ' · trashed' : ''} · #{p.id}
                            </span>
                            <a
                              href={`${USER_ORIGIN}/#/user/blog/${p.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#1B4965] underline"
                            >
                              Open on site
                            </a>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
