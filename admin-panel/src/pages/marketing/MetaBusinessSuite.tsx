import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2,
  LayoutGrid,
  Facebook,
  Instagram,
  MessageCircle,
  BarChart3,
  Layers,
  BookOpen,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Megaphone,
  ShoppingBag,
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

const api = getApiBaseUrl()
const mb = (path: string) => `${api}/admin/meta-business${path.startsWith('/') ? path : `/${path}`}`
/** Page access token routes (META_PAGE_ACCESS_TOKEN) — inbox, etc. */
const mpage = (path: string) => `${api}/admin/meta/page${path.startsWith('/') ? path : `/${path}`}`

type MetaConversationSender = { name?: string; email?: string; id?: string }
type MetaConversationThread = {
  id?: string
  updated_time?: string
  snippet?: string
  message_count?: number
  senders?: { data?: MetaConversationSender[] }
}
type MetaConversationsPayload = {
  data?: MetaConversationThread[]
  paging?: { cursors?: { before?: string; after?: string }; next?: string }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  let role = 'admin'
  let permissions = 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user?.role) role = user.role
      if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
        permissions = user.permissions.join(',')
      }
    }
  } catch {
    /* ignore */
  }
  h['x-user-role'] = role
  h['x-user-permissions'] = permissions
  return h
}

async function fetchJson<T>(url: string): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, { headers: authHeaders() })
    const raw = await res.text()
    let body: unknown = {}
    if (raw.trim()) {
      try {
        body = JSON.parse(raw)
      } catch {
        return { ok: false, error: 'Invalid JSON response' }
      }
    }
    if (!res.ok) {
      const err = (body as { error?: string })?.error || `HTTP ${res.status}`
      return { ok: false, error: err }
    }
    return { ok: true, data: body as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

type SectionId =
  | 'overview'
  | 'businesses'
  | 'pages'
  | 'instagram'
  | 'messaging'
  | 'ads'
  | 'reference'

const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutGrid; desc: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid, desc: 'Token, user & app' },
  { id: 'businesses', label: 'Business portfolio', icon: Building2, desc: 'BM + owned assets' },
  { id: 'pages', label: 'Facebook Pages', icon: Facebook, desc: 'Pages you manage' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, desc: 'Media & insights' },
  { id: 'messaging', label: 'Inbox', icon: MessageCircle, desc: 'Messenger & Instagram' },
  { id: 'ads', label: 'Ads & catalog', icon: Megaphone, desc: 'Pixels & catalogs' },
  { id: 'reference', label: 'API map', icon: BookOpen, desc: 'Meta API surface' },
]

const DOC_LINKS: { title: string; href: string; blurb: string }[] = [
  {
    title: 'Marketing API',
    href: 'https://developers.facebook.com/docs/marketing-api/',
    blurb: 'Campaigns, ad sets, ads, audiences, insights, catalog ads.',
  },
  {
    title: 'Graph API',
    href: 'https://developers.facebook.com/docs/graph-api/',
    blurb: 'User, Page, and object nodes; includes many Business Suite operations.',
  },
  {
    title: 'Instagram Graph API',
    href: 'https://developers.facebook.com/docs/instagram-api/',
    blurb: 'Professional/business Instagram: media, comments, insights, messaging.',
  },
  {
    title: 'Messenger Platform',
    href: 'https://developers.facebook.com/docs/messenger-platform/',
    blurb: 'Send/receive messages, handover, templates, webhooks.',
  },
  {
    title: 'Conversations API',
    href: 'https://developers.facebook.com/docs/messenger-platform/conversations/',
    blurb: 'Unified inbox conversations for Pages (Messenger & linked Instagram).',
  },
  {
    title: 'WhatsApp Business Platform',
    href: 'https://developers.facebook.com/docs/whatsapp/',
    blurb: 'WhatsApp Cloud API — also wired in this admin under WhatsApp pages.',
  },
  {
    title: 'Commerce & catalog',
    href: 'https://developers.facebook.com/docs/commerce-platform/',
    blurb: 'Product catalogs, shops, checkout — overlaps with FB Shop integration.',
  },
  {
    title: 'Webhooks',
    href: 'https://developers.facebook.com/docs/graph-api/webhooks/',
    blurb: 'Subscribe to Page, Instagram, permissions, and messaging events in real time.',
  },
  {
    title: 'Conversions API',
    href: 'https://developers.facebook.com/docs/marketing-api/conversions-api/',
    blurb: 'Server-side events for ads optimization (pairs with Pixel ID).',
  },
  {
    title: 'Business Management API',
    href: 'https://developers.facebook.com/docs/marketing-api/business-manager/',
    blurb: 'Business assets, system users, ad account assignment.',
  },
  {
    title: 'Meta Business SDK',
    href: 'https://developers.facebook.com/docs/business-api/',
    blurb: 'Higher-level patterns for businesses with multiple assets.',
  },
  {
    title: 'Permissions reference',
    href: 'https://developers.facebook.com/docs/permissions/reference/',
    blurb: 'ads_read, ads_management, pages_messaging, instagram_manage_messages, etc.',
  },
]

type MetaBusinessSuiteProps = { embedded?: boolean }

export default function MetaBusinessSuite({ embedded = false }: MetaBusinessSuiteProps) {
  const [searchParams] = useSearchParams()
  const [section, setSection] = useState<SectionId>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [overview, setOverview] = useState<{
    meta_app_id?: string | null
    token_configured?: boolean
    page_access_token_set?: boolean
    me?: { id?: string; name?: string; email?: string }
    businesses?: unknown[]
    businesses_error?: string | null
  } | null>(null)

  const [businessPayload, setBusinessPayload] = useState<unknown>(null)
  const [pagesPayload, setPagesPayload] = useState<{ data?: unknown[] } | null>(null)
  const [selectedPageId, setSelectedPageId] = useState('')
  const [pageDetail, setPageDetail] = useState<unknown>(null)
  const [igUserId, setIgUserId] = useState('')
  const [igMedia, setIgMedia] = useState<unknown>(null)
  const [igInsights, setIgInsights] = useState<unknown>(null)
  const [msgPageId, setMsgPageId] = useState('')
  const [msgPlatform, setMsgPlatform] = useState<'messenger' | 'instagram'>('messenger')
  const [conversations, setConversations] = useState<MetaConversationsPayload | null>(null)
  const [msgError, setMsgError] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [adAccountDetail, setAdAccountDetail] = useState<unknown>(null)
  const [pixels, setPixels] = useState<unknown>(null)
  const [catalogs, setCatalogs] = useState<unknown>(null)
  const [ownedAds, setOwnedAds] = useState<unknown>(null)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    const r = await fetchJson<typeof overview>(mb('/overview'))
    if (r.ok && r.data) setOverview(r.data as typeof overview)
    else setError(r.error || 'Failed to load overview')
    setLoading(false)
  }, [])

  useEffect(() => {
    if (section === 'overview') loadOverview()
  }, [section, loadOverview])

  useEffect(() => {
    const s = searchParams.get('section')
    if (s && SECTIONS.some((x) => x.id === s)) {
      setSection(s as SectionId)
    }
  }, [searchParams])

  const loadBusinesses = async () => {
    setLoading(true)
    setError('')
    const r = await fetchJson(mb('/businesses'))
    if (r.ok) setBusinessPayload(r.data)
    else setError(r.error || 'Failed')
    setLoading(false)
  }

  const loadPages = async () => {
    setLoading(true)
    setError('')
    const r = await fetchJson<{ data?: unknown[] }>(mb('/pages'))
    if (r.ok && r.data) setPagesPayload(r.data)
    else setError(r.error || 'Failed')
    setLoading(false)
  }

  const loadPageDetail = async (pageId: string) => {
    if (!pageId) return
    setLoading(true)
    const r = await fetchJson(mb(`/page/${encodeURIComponent(pageId)}`))
    if (r.ok) setPageDetail(r.data)
    else setError(r.error || 'Failed')
    setLoading(false)
  }

  const loadIg = async () => {
    if (!igUserId.trim()) return
    setLoading(true)
    setError('')
    const [m, i] = await Promise.all([
      fetchJson(mb(`/instagram/${encodeURIComponent(igUserId.trim())}/media`)),
      fetchJson(mb(`/instagram/${encodeURIComponent(igUserId.trim())}/insights`)),
    ])
    if (m.ok) setIgMedia(m.data)
    else setError(m.error || '')
    if (i.ok) setIgInsights(i.data)
    setLoading(false)
  }

  const loadConversations = async () => {
    if (!msgPageId.trim()) return
    setLoading(true)
    setMsgError('')
    const q = new URLSearchParams({
      page_id: msgPageId.trim(),
      platform: msgPlatform,
      limit: '50',
    })
    const r = await fetchJson<MetaConversationsPayload>(`${mpage('/conversations')}?${q.toString()}`)
    if (r.ok && r.data) {
      setConversations(r.data)
      setMsgError('')
    } else {
      setConversations(null)
      setMsgError(r.error || 'Could not load conversations')
    }
    setLoading(false)
  }

  const loadAdStuff = async () => {
    const id = adAccountId.trim()
    if (!id) return
    setLoading(true)
    setError('')
    const a = await fetchJson(mb(`/ad-account/${encodeURIComponent(id)}`))
    const p = await fetchJson(mb(`/ad-account/${encodeURIComponent(id)}/pixels`))
    const c = await fetchJson(mb(`/ad-account/${encodeURIComponent(id)}/product-catalogs`))
    if (a.ok) setAdAccountDetail(a.data)
    else setError(a.error || '')
    if (p.ok) setPixels(p.data)
    if (c.ok) setCatalogs(c.data)
    setLoading(false)
  }

  const loadOwnedFromBusiness = async (businessId: string) => {
    setLoading(true)
    const r = await fetchJson(mb(`/business/${encodeURIComponent(businessId)}/owned-ad-accounts`))
    if (r.ok) setOwnedAds(r.data)
    else setError(r.error || '')
    setLoading(false)
  }

  const pagesList = pagesPayload?.data || []

  return (
    <div
      className={`${embedded ? 'min-h-0' : 'min-h-screen'} bg-[var(--arctic-blue-background,#F4F9F9)] dark:bg-gray-950`}
      style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}
    >
      <div
        className={`mx-auto flex max-w-[1600px] flex-col gap-6 px-4 ${embedded ? 'py-4' : 'py-8'} lg:flex-row lg:gap-8`}
      >
        {/* Side nav */}
        <aside className="w-full shrink-0 lg:w-64">
          <div
            className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80"
            style={{ fontFamily: 'var(--font-heading-family, serif)' }}
          >
            <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Business Suite
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Uses your Meta access token (e.g. long-lived system user in{' '}
              <code className="rounded bg-gray-100 px-0.5 dark:bg-gray-800">META_GRAPH_ACCESS_TOKEN</code>) for Graph user
              endpoints. Inbox may also use{' '}
              <code className="rounded bg-gray-100 px-0.5 dark:bg-gray-800">META_PAGE_ACCESS_TOKEN</code> when required.
              Open{' '}
              <Link to="/admin/meta?view=ads" className="text-cyan-700 underline dark:text-cyan-400">
                Ads manager
              </Link>{' '}
              from the Meta hub.
            </p>
            <nav className="mt-4 space-y-1" aria-label="Business Suite sections">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                const active = section === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? 'bg-cyan-50 text-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-100'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                    <span>
                      <span className="block font-medium">{s.label}</span>
                      <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-400">{s.desc}</span>
                    </span>
                  </button>
                )
              })}
            </nav>
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="text-[11px] text-gray-500">Shortcuts</p>
              <div className="mt-2 flex flex-col gap-1.5 text-xs">
                <Link
                  to="/admin/meta?view=ads"
                  className="inline-flex items-center gap-1 text-cyan-700 hover:underline dark:text-cyan-400"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  Ads campaigns
                </Link>
                <Link
                  to="/admin/meta?view=home"
                  className="inline-flex items-center gap-1 text-cyan-700 hover:underline dark:text-cyan-400"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Meta dashboard
                </Link>
                <Link
                  to="/admin/facebook"
                  className="inline-flex items-center gap-1 text-cyan-700 hover:underline dark:text-cyan-400"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  Brand Instagram
                </Link>
                <Link
                  to="/admin/fb-shop"
                  className="inline-flex items-center gap-1 text-cyan-700 hover:underline dark:text-cyan-400"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  FB Shop catalog
                </Link>
                <a
                  href="https://business.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-600 hover:underline dark:text-gray-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Business Suite (Meta)
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {error && section !== 'messaging' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Connection overview</h2>
                <button
                  type="button"
                  onClick={loadOverview}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">App</p>
                  <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                    {overview?.meta_app_id || '—'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">From server env (META_ADS_APP_ID)</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Meta access token</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {overview?.token_configured ? 'Configured' : 'Missing'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    System user / long-lived token via META_GRAPH_ACCESS_TOKEN (same as Ads)
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Page token</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {overview?.page_access_token_set ? 'Configured' : 'Missing'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">META_PAGE_ACCESS_TOKEN — inbox / Page API</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Token identity (me)</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{overview?.me?.name || '—'}</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">{overview?.me?.id}</p>
                </div>
              </div>
              {overview?.businesses_error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <strong className="font-medium">Business portfolio</strong> could not be loaded:{' '}
                  {overview.businesses_error}
                  <span className="block mt-1 text-xs opacity-90">
                    Grant <code className="rounded bg-amber-100/80 px-1">business_management</code> and reconnect your
                    token.
                  </span>
                </div>
              )}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Building2 className="h-4 w-4" />
                  Businesses ({overview?.businesses?.length ?? 0})
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {(overview?.businesses as { id?: string; name?: string }[])?.map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                      <span>{b.name}</span>
                      <span className="font-mono text-xs text-gray-500">{b.id}</span>
                    </li>
                  ))}
                  {!overview?.businesses?.length && !overview?.businesses_error && (
                    <li className="text-gray-500">No businesses returned for this user token.</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {section === 'businesses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Business portfolio</h2>
                <button
                  type="button"
                  onClick={loadBusinesses}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:border-gray-700"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Reload
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Raw Graph payload — includes primary page and owned ad account stubs when permissions allow.
              </p>
              <pre className="max-h-[480px] overflow-auto rounded-2xl border border-gray-200 bg-gray-950/90 p-4 text-xs text-green-100">
                {JSON.stringify(businessPayload, null, 2)}
              </pre>
              <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Load owned ad accounts by Business ID</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    placeholder="Business ID"
                    className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    id="biz-id-input"
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white"
                    onClick={() => {
                      const el = document.getElementById('biz-id-input') as HTMLInputElement
                      if (el?.value) loadOwnedFromBusiness(el.value.trim())
                    }}
                  >
                    Fetch
                  </button>
                </div>
                {ownedAds != null ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                    {JSON.stringify(ownedAds, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>
          )}

          {section === 'pages' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Facebook Pages</h2>
              <button
                type="button"
                onClick={loadPages}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:border-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Reload list
              </button>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Page</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Fans</th>
                      <th className="px-4 py-3">Instagram</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pagesList.map((row: any) => {
                      const ig = row.instagram_business_account
                      return (
                        <tr key={row.id} className="bg-white dark:bg-gray-900/40">
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                          <td className="px-4 py-3">{row.fan_count ?? '—'}</td>
                          <td className="px-4 py-3 text-xs">{ig?.username || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="text-cyan-700 hover:underline dark:text-cyan-400"
                              onClick={() => {
                                setSelectedPageId(row.id)
                                loadPageDetail(row.id)
                                if (ig?.id) setIgUserId(ig.id)
                              }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!pagesList.length && !loading && (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">No pages — needs pages_show_list / Page roles.</p>
                )}
              </div>
              {selectedPageId && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/80">
                  <h3 className="text-sm font-semibold">Page {selectedPageId}</h3>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                    {JSON.stringify(pageDetail, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {section === 'instagram' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Instagram</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use the <strong>Instagram Business Account ID</strong> from your Page (Pages tab → Details). Requires{' '}
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">instagram_basic</code>,{' '}
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">instagram_manage_insights</code> as
                applicable.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={igUserId}
                  onChange={(e) => setIgUserId(e.target.value)}
                  placeholder="IG user id (e.g. 1784…)"
                  className="min-w-[240px] flex-1 rounded-lg border px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={loadIg}
                  disabled={loading || !igUserId.trim()}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Load media &amp; insights
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/80">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Layers className="h-4 w-4" />
                    Media
                  </h3>
                  <pre className="mt-2 max-h-80 overflow-auto text-xs">{JSON.stringify(igMedia, null, 2)}</pre>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/80">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4" />
                    Insights
                  </h3>
                  <pre className="mt-2 max-h-80 overflow-auto text-xs">{JSON.stringify(igInsights, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {section === 'messaging' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Inbox (Graph)</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uses <strong>META_PAGE_ACCESS_TOKEN</strong> on the server (not the user Graph token). Set it in backend
                env for the Page this token belongs to. Messenger needs{' '}
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">pages_messaging</code>; Instagram DMs need the
                linked IG account and{' '}
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">instagram_manage_messages</code> as
                documented by Meta.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Facebook Page ID
                  <input
                    value={msgPageId}
                    onChange={(e) => setMsgPageId(e.target.value)}
                    placeholder="Numeric Page ID"
                    className="rounded-lg border px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Platform
                  <select
                    value={msgPlatform}
                    onChange={(e) => setMsgPlatform(e.target.value as 'messenger' | 'instagram')}
                    className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="messenger">Messenger</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={loadConversations}
                  disabled={loading || !msgPageId.trim()}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Load conversations
                </button>
              </div>
              {msgError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  {msgError}
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3">Preview</th>
                      <th className="px-4 py-3">Msgs</th>
                      <th className="px-4 py-3">Thread</th>
                      <th className="px-4 py-3">Participants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(conversations?.data || []).map((row, idx) => {
                      const senders = row.senders?.data || []
                      const names = senders.map((s) => s.name || s.email || s.id || '—').join(', ')
                      let updated = '—'
                      if (row.updated_time) {
                        const d = new Date(row.updated_time)
                        if (!Number.isNaN(d.getTime())) updated = d.toLocaleString()
                      }
                      return (
                        <tr key={row.id || `conv-${idx}`} className="bg-white dark:bg-gray-900/40">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                            {updated}
                          </td>
                          <td className="max-w-md px-4 py-3">
                            <span className="line-clamp-3 text-gray-900 dark:text-gray-100">
                              {(row.snippet || '—').replace(/\n/g, ' ')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.message_count ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{row.id || '—'}</td>
                          <td className="max-w-xs px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{names || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!loading && (!conversations?.data || conversations.data.length === 0) && !msgError && (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">
                    No rows yet — enter a Page ID and load (requires META_PAGE_ACCESS_TOKEN).
                  </p>
                )}
              </div>
            </div>
          )}

          {section === 'ads' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ads account &amp; catalog tools</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uses Marketing API objects tied to <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">act_…</code>
                . Full campaign editing lives in{' '}
                <Link to="/admin/meta?view=ads" className="text-cyan-700 underline dark:text-cyan-400">
                  Ads manager
                </Link>
                .
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={adAccountId}
                  onChange={(e) => setAdAccountId(e.target.value)}
                  placeholder="Ad account id (act_… or digits)"
                  className="min-w-[260px] flex-1 rounded-lg border px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={loadAdStuff}
                  disabled={loading || !adAccountId.trim()}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Load account, pixels &amp; catalogs
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/80">
                  <h3 className="text-xs font-semibold uppercase text-gray-500">Ad account</h3>
                  <pre className="mt-2 max-h-56 overflow-auto text-xs">{JSON.stringify(adAccountDetail, null, 2)}</pre>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/80">
                  <h3 className="text-xs font-semibold uppercase text-gray-500">Pixels</h3>
                  <pre className="mt-2 max-h-56 overflow-auto text-xs">{JSON.stringify(pixels, null, 2)}</pre>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/80">
                  <h3 className="text-xs font-semibold uppercase text-gray-500">Product catalogs</h3>
                  <pre className="mt-2 max-h-56 overflow-auto text-xs">{JSON.stringify(catalogs, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {section === 'reference' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Meta API surface</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Meta does not expose “Business Suite” as a single API. Suite is a UI that combines{' '}
                <strong>Graph API</strong>, <strong>Marketing API</strong>, <strong>Instagram</strong>,{' '}
                <strong>Messenger</strong>, <strong>WhatsApp</strong>, <strong>Commerce</strong>, and{' '}
                <strong>Webhooks</strong>. This admin page wires the token you already use for ads into read-only Graph
                explorers; sending Instagram DMs, WhatsApp, or broad posting still needs the right permissions,
                webhooks, and in some cases separate app products (e.g. WhatsApp in this project).
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {DOC_LINKS.map((d) => (
                  <a
                    key={d.href}
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900/80"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{d.title}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-cyan-600" />
                    </span>
                    <span className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{d.blurb}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400">
                      Open docs
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
