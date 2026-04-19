import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LayoutGrid,
  Building2,
  Megaphone,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'
import MetaBusinessSuite from './MetaBusinessSuite'
import MetaAds from './MetaAds'

const api = getApiBaseUrl()
const metaStatus = () => `${api}/admin/meta/config/status`

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

type MetaStatusPayload = {
  meta_app_id?: string | null
  env_token_set?: boolean
  page_access_token_set?: boolean
  token_resolved?: boolean
  debug?: {
    is_valid?: boolean | null
    expires_at?: string | null
    expires_at_raw?: number | null
    type?: string | null
    scopes?: string[] | null
    granular_scopes?: { scope?: string }[] | null
    user_id?: string | null
    app_id?: string | null
  } | null
}

type SuiteSection =
  | 'overview'
  | 'businesses'
  | 'pages'
  | 'instagram'
  | 'messaging'
  | 'ads'
  | 'reference'

const CAPABILITY_ROWS: {
  id: string
  title: string
  blurb: string
  /** Any of these scopes enables the row */
  anyScope: string[]
  view: 'suite' | 'ads'
  section?: SuiteSection
}[] = [
  {
    id: 'ads',
    title: 'Ads & performance',
    blurb: 'Campaigns, ad sets, ads, insights, audiences — Marketing API.',
    anyScope: ['ads_read', 'ads_management'],
    view: 'ads',
  },
  {
    id: 'bm',
    title: 'Business portfolio',
    blurb: 'Business Manager assets, owned ad accounts, verification.',
    anyScope: ['business_management'],
    view: 'suite',
    section: 'businesses',
  },
  {
    id: 'pages',
    title: 'Facebook Pages',
    blurb: 'Pages you manage, fan counts, linked Instagram.',
    anyScope: ['pages_show_list', 'pages_read_engagement'],
    view: 'suite',
    section: 'pages',
  },
  {
    id: 'messaging',
    title: 'Messenger & Instagram inbox',
    blurb: 'Conversation list via Graph. Page token may be required for some edges.',
    anyScope: ['pages_messaging', 'instagram_manage_messages'],
    view: 'suite',
    section: 'messaging',
  },
  {
    id: 'catalog',
    title: 'Catalog & shops',
    blurb: 'Product catalogs, pixels, commerce hooks in this admin.',
    anyScope: ['catalog_management'],
    view: 'suite',
    section: 'ads',
  },
  {
    id: 'leads',
    title: 'Lead ads',
    blurb: 'Lead retrieval permissions for lead-gen workflows.',
    anyScope: ['leads_retrieval'],
    view: 'suite',
    section: 'reference',
  },
]

function scopeSetFromPayload(debug: MetaStatusPayload['debug']): Set<string> {
  const s = new Set<string>()
  for (const x of debug?.scopes || []) {
    if (typeof x === 'string') s.add(x)
  }
  for (const g of debug?.granular_scopes || []) {
    if (g?.scope) s.add(g.scope)
  }
  return s
}

export default function MetaHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') || 'home') as 'home' | 'suite' | 'ads'
  const [status, setStatus] = useState<MetaStatusPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(metaStatus(), { headers: authHeaders() })
      const raw = await res.text()
      let body: MetaStatusPayload = {}
      if (raw.trim()) body = JSON.parse(raw) as MetaStatusPayload
      if (!res.ok) {
        setError((body as { error?: string }).error || `HTTP ${res.status}`)
        setStatus(null)
      } else {
        setStatus(body)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'home') loadStatus()
  }, [view, loadStatus])

  const scopes = useMemo(() => scopeSetFromPayload(status?.debug ?? null), [status])

  const setView = (next: 'home' | 'suite' | 'ads', section?: SuiteSection) => {
    const p = new URLSearchParams()
    p.set('view', next)
    if (section) p.set('section', section)
    setSearchParams(p)
  }

  const tabs: { id: 'home' | 'suite' | 'ads'; label: string; short: string }[] = [
    { id: 'home', label: 'Dashboard', short: 'Dashboard' },
    { id: 'suite', label: 'Business Suite', short: 'Suite' },
    { id: 'ads', label: 'Ads manager', short: 'Ads' },
  ]

  const validView = view === 'suite' || view === 'ads' ? view : 'home'

  return (
    <div
      className="min-h-screen bg-[var(--arctic-blue-background,#F4F9F9)] dark:bg-gray-950"
      style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}
    >
      <div className="border-b border-gray-200/80 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1
              className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100"
              style={{ fontFamily: 'var(--font-heading-family, serif)' }}
            >
              Meta
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              One connection for Business Suite tools and Ads: put your long-lived{' '}
              <strong>system user</strong> or admin token in{' '}
              <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">META_GRAPH_ACCESS_TOKEN</code> (same as
              Meta Ads). Optional <code className="rounded bg-gray-100 px-0.5 text-xs dark:bg-gray-800">META_PAGE_ACCESS_TOKEN</code>{' '}
              only if an endpoint requires a dedicated Page token.
            </p>
          </div>
          <nav
            className="flex shrink-0 flex-wrap gap-2"
            aria-label="Meta primary navigation"
          >
            {tabs.map((t) => {
              const active = validView === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (t.id === 'home') setSearchParams({ view: 'home' })
                    else setView(t.id)
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {t.id === 'home' && <LayoutGrid className="h-4 w-4" />}
                  {t.id === 'suite' && <Building2 className="h-4 w-4" />}
                  {t.id === 'ads' && <Megaphone className="h-4 w-4" />}
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6">
        {validView === 'home' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-lg font-semibold">Connection &amp; permissions</h2>
              </div>
              <button
                type="button"
                onClick={loadStatus}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Token status
                </div>
                <dl className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between gap-2">
                    <dt>Resolved</dt>
                    <dd>{status?.token_resolved ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>App ID</dt>
                    <dd className="font-mono text-xs">{status?.meta_app_id || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Debug type</dt>
                    <dd className="text-right">{status?.debug?.type || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Valid</dt>
                    <dd>{status?.debug?.is_valid === true ? 'Yes' : status?.debug?.is_valid === false ? 'No' : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Expiry</dt>
                    <dd className="text-right text-xs">
                      {status?.debug?.expires_at
                        ? new Date(status.debug.expires_at).toLocaleString()
                        : Number(status?.debug?.expires_at_raw) === 0
                          ? 'No expiry (0)'
                          : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Page token (env)</dt>
                    <dd>{status?.page_access_token_set ? 'Set' : 'Not set'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-gray-800 dark:bg-gray-900/80">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Granted scopes (from debug_token)</p>
                <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {(status?.debug?.scopes || []).length ? (
                    status?.debug?.scopes?.map((sc) => (
                      <span
                        key={sc}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-[11px] text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {sc}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No scopes in response — token may be missing or debug failed.</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">What you can use in this admin</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {CAPABILITY_ROWS.map((row) => {
                  const ok = row.anyScope.some((sc) => scopes.has(sc))
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        if (row.view === 'suite') setView('suite', row.section)
                        else setView('ads')
                      }}
                      className={`flex flex-col rounded-2xl border p-4 text-left transition-shadow hover:shadow-md ${
                        ok
                          ? 'border-cyan-200/80 bg-white dark:border-cyan-900/40 dark:bg-gray-900/60'
                          : 'border-dashed border-gray-200 bg-gray-50/80 opacity-90 dark:border-gray-700 dark:bg-gray-900/40'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{row.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            ok
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                          }`}
                        >
                          {ok ? 'Ready' : 'Scope?'}
                        </span>
                      </span>
                      <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{row.blurb}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400">
                        Open
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {validView === 'suite' && (
          <div className="-mx-4 px-0 sm:-mx-0">
            <MetaBusinessSuite embedded />
          </div>
        )}

        {validView === 'ads' && (
          <div className="-mx-4 px-0 sm:-mx-0">
            <MetaAds embeddedInHub />
          </div>
        )}
      </div>
    </div>
  )
}
