import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Trash2,
  Play,
  Pause,
  BarChart3,
  DollarSign,
  Eye,
  Users,
  Target,
  Settings,
  RefreshCw,
  Radio,
  Layers,
  CloudDownload,
  MousePointerClick,
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

const apiBase = getApiBaseUrl()
const meta = (path: string) => `${apiBase}/meta-ads${path.startsWith('/') ? path : `/${path}`}`
const metaAdmin = (path: string) => `${apiBase}/admin/meta${path.startsWith('/') ? path : `/${path}`}`

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  let role = 'admin'
  let permissions =
    'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
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
  headers['x-user-role'] = role
  headers['x-user-permissions'] = permissions
  return headers
}

function unwrapList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: unknown[] }).data
  }
  return []
}

function errMessage(raw: unknown): string {
  if (raw && typeof raw === 'object' && 'error' in raw) {
    const e = (raw as { error?: string }).error
    return typeof e === 'string' ? e : 'Request failed'
  }
  return 'Request failed'
}

interface Campaign {
  campaign_id: string
  name: string
  objective: string
  status: string
  daily_budget?: number
  lifetime_budget?: number
  start_time?: string
  stop_time?: string
  created_time?: string
}

interface AdSet {
  adset_id: string
  campaign_id: string
  name: string
  status: string
  daily_budget?: number
  targeting?: unknown
}

interface Ad {
  ad_id: string
  adset_id: string
  campaign_id: string
  name: string
  status: string
  preview_url?: string
}

interface Insight {
  date_start?: string
  date_stop?: string
  impressions?: number
  clicks?: number
  spend?: number
  cpm?: number
  cpc?: number
  ctr?: number
  conversions?: number
  campaign_id?: string
}

interface AdAccountRow {
  id: string
  name?: string
  account_id?: string
  currency?: string
  account_status?: number
}

interface AudienceRow {
  id: string
  name?: string
  subtype?: string
  approximate_count?: number
}

type TabId = 'overview' | 'campaigns' | 'adsets' | 'ads' | 'insights' | 'audiences'

type MetaAdsProps = { embeddedInHub?: boolean }

export default function MetaAds({ embeddedInHub = false }: MetaAdsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [audiences, setAudiences] = useState<AudienceRow[]>([])
  const [adAccounts, setAdAccounts] = useState<AdAccountRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [showCreateAdSet, setShowCreateAdSet] = useState(false)
  const [showCreateAd, setShowCreateAd] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)

  const [config, setConfig] = useState({
    ad_account_id: '',
    pixel_id: '',
    access_token: '',
    access_token_set: false,
    meta_app_id: '',
    meta_fb_page_id: '',
    meta_use_env_only: false,
    token_source: '' as string,
  })
  const [tokenStatus, setTokenStatus] = useState<{
    debug?: {
      expires_at?: string | null
      scopes?: string[] | null
      is_valid?: boolean | null
    } | null
    token_source_hint?: string
  } | null>(null)
  const [adsetFilterCampaign, setAdsetFilterCampaign] = useState('')
  const [insightStart, setInsightStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [insightEnd, setInsightEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [lastFullSync, setLastFullSync] = useState<string | null>(null)

  const parseJson = async (res: Response) => {
    const text = await res.text()
    const trimmed = text.trim()
    if (!trimmed) return {}
    if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
      throw new Error(
        'Server returned HTML instead of JSON. Check that the API is running and VITE_API_URL points to your backend.'
      )
    }
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new Error('Invalid JSON from server.')
    }
  }

  /** Campaign + ad set lists for dropdowns across tabs */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const h = authHeaders()
        const [cRes, aRes] = await Promise.all([
          fetch(meta('/campaigns'), { headers: h }),
          fetch(meta('/adsets'), { headers: h }),
        ])
        const cRaw = await parseJson(cRes)
        const aRaw = await parseJson(aRes)
        if (cancelled) return
        if (cRes.ok) setCampaigns(unwrapList(cRaw) as Campaign[])
        if (aRes.ok) setAdsets(unwrapList(aRaw) as AdSet[])
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(meta('/config'), { headers: authHeaders() })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      const data = raw as Record<string, unknown>
      setConfig({
        ad_account_id: String(data.ad_account_id || ''),
        pixel_id: String(data.pixel_id || ''),
        access_token: '',
        access_token_set: Boolean(data.access_token_set),
        meta_app_id: String(data.meta_app_id || ''),
        meta_fb_page_id: String(data.meta_fb_page_id || ''),
        meta_use_env_only: Boolean(data.meta_use_env_only),
        token_source: String(data.token_source || ''),
      })
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }, [])

  const loadTokenStatus = useCallback(async () => {
    try {
      const res = await fetch(metaAdmin('/config/status'), { headers: authHeaders() })
      const raw = (await parseJson(res)) as Record<string, unknown>
      if (!res.ok) {
        setTokenStatus(null)
        return
      }
      setTokenStatus({
        debug: raw.debug as {
          expires_at?: string | null
          scopes?: string[] | null
          is_valid?: boolean | null
        } | null,
        token_source_hint: String(raw.token_source_hint || ''),
      })
    } catch {
      setTokenStatus(null)
    }
  }, [])

  const loadAdAccounts = useCallback(async () => {
    try {
      setBusy('Loading ad accounts…')
      const res = await fetch(meta('/ad-accounts'), { headers: authHeaders() })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      setAdAccounts(unwrapList(raw) as AdAccountRow[])
    } catch (e) {
      setAdAccounts([])
      console.warn(e)
    } finally {
      setBusy('')
    }
  }, [])

  const loadTabData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      if (activeTab === 'overview') {
        await loadConfig()
        await loadTokenStatus()
        await loadAdAccounts()
        return
      }

      let path = ''
      if (activeTab === 'campaigns') path = '/campaigns'
      else if (activeTab === 'adsets') path = '/adsets'
      else if (activeTab === 'ads') path = '/ads'
      else if (activeTab === 'insights') path = '/insights'
      else if (activeTab === 'audiences') path = '/audiences'
      else return

      const res = await fetch(meta(path), { headers: authHeaders() })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))

      if (activeTab === 'campaigns') setCampaigns(unwrapList(raw) as Campaign[])
      else if (activeTab === 'adsets') setAdsets(unwrapList(raw) as AdSet[])
      else if (activeTab === 'ads') setAds(unwrapList(raw) as Ad[])
      else if (activeTab === 'insights') setInsights(unwrapList(raw) as Insight[])
      else if (activeTab === 'audiences') setAudiences(unwrapList(raw) as AudienceRow[])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [activeTab, loadAdAccounts, loadConfig, loadTokenStatus])

  useEffect(() => {
    loadTabData()
  }, [loadTabData])

  const saveConfig = async () => {
    try {
      setLoading(true)
      const body: Record<string, string> = {
        ad_account_id: config.ad_account_id,
        pixel_id: config.pixel_id || '',
      }
      if (config.access_token.trim()) body.access_token = config.access_token.trim()

      const res = await fetch(meta('/config'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      setShowConfigModal(false)
      setConfig((c) => ({ ...c, access_token: '', access_token_set: true, meta_app_id: c.meta_app_id }))
      await loadConfig()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const postSync = async (path: string, label: string) => {
    try {
      setBusy(label)
      setError('')
      const res = await fetch(meta(path), { method: 'POST', headers: authHeaders() })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      if (path === '/sync/all') {
        setLastFullSync(new Date().toISOString())
      }
      await loadTabData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setBusy('')
    }
  }

  const syncInsights = async () => {
    try {
      setBusy('Syncing insights…')
      setError('')
      const campaign_ids = campaigns.map((c) => c.campaign_id).filter(Boolean)
      const res = await fetch(meta('/insights/sync'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          campaign_ids,
          date_start: insightStart,
          date_stop: insightEnd,
        }),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      const res2 = await fetch(meta('/insights'), { headers: authHeaders() })
      const insightsRaw = await parseJson(res2)
      if (!res2.ok) throw new Error(errMessage(insightsRaw))
      setInsights(unwrapList(insightsRaw) as Insight[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Insights sync failed')
    } finally {
      setBusy('')
    }
  }

  const createCampaign = async (campaignData: Record<string, unknown>) => {
    try {
      setLoading(true)
      const res = await fetch(meta('/campaigns'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(campaignData),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      await loadTabData()
      setShowCreateCampaign(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const createAdSet = async (form: Record<string, unknown>) => {
    try {
      setLoading(true)
      const res = await fetch(meta('/adsets'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      await loadTabData()
      setShowCreateAdSet(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ad set')
    } finally {
      setLoading(false)
    }
  }

  const createAd = async (form: Record<string, unknown>) => {
    try {
      setLoading(true)
      const res = await fetch(meta('/ads'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      await loadTabData()
      setShowCreateAd(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ad')
    } finally {
      setLoading(false)
    }
  }

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const res = await fetch(meta(`/campaigns/${encodeURIComponent(campaignId)}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      await loadTabData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Archive/delete this campaign in Meta? This cannot be undone from here.')) return
    try {
      const res = await fetch(meta(`/campaigns/${encodeURIComponent(campaignId)}`), {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const raw = await parseJson(res)
      if (!res.ok) throw new Error(errMessage(raw))
      await loadTabData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
      case 'DELETED':
      case 'ARCHIVED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const totalInsights = insights.reduce<{
    impressions: number
    clicks: number
    spend: number
    conversions: number
  }>(
    (acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      spend: acc.spend + (Number(row.spend) || 0),
      conversions: acc.conversions + (Number(row.conversions) || 0),
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
  )

  const filteredAdsets = adsetFilterCampaign
    ? adsets.filter((a) => a.campaign_id === adsetFilterCampaign)
    : adsets

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      {embeddedInHub ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ads manager</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Same token as the Meta hub — system user / long-lived access with{' '}
              <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">ads_read</code> &amp;{' '}
              <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">ads_management</code>.
            </p>
            <Link
              to="/admin/meta?view=home"
              className="mt-1 inline-block text-sm text-cyan-700 underline dark:text-cyan-400"
            >
              ← Meta dashboard
            </Link>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="btn-secondary flex w-full items-center justify-center gap-2 sm:inline-flex sm:w-auto"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => postSync('/sync/all', 'Syncing from Meta…')}
              disabled={!!busy}
              className="btn-primary flex w-full items-center justify-center gap-2 sm:inline-flex sm:w-auto"
            >
              <CloudDownload className="h-4 w-4 shrink-0" />
              <span>Sync all from Meta</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-page-header">
          <div>
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-light mb-2 tracking-[0.06em] sm:tracking-[0.1em] md:tracking-[0.15em]"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              }}
            >
              Meta Ads
            </h1>
            <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Marketing API: campaigns, ad sets, ads, insights, and audiences — also available under{' '}
              <Link to="/admin/meta?view=ads" className="underline">
                Meta hub
              </Link>
              .
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="btn-secondary flex w-full items-center justify-center gap-2 sm:inline-flex sm:w-auto"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => postSync('/sync/all', 'Syncing from Meta…')}
              disabled={!!busy}
              className="btn-primary flex w-full items-center justify-center gap-2 sm:inline-flex sm:w-auto"
            >
              <CloudDownload className="h-4 w-4 shrink-0" />
              <span>Sync all from Meta</span>
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-100">
          {busy}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4 break-words dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="-mx-1 border-b border-gray-200 px-1 dark:border-gray-700">
        <nav
          className="-mb-px flex gap-1 overflow-x-auto pb-px sm:gap-2 md:gap-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
          aria-label="Meta Ads sections"
        >
          {(
            [
              { id: 'overview' as const, label: 'Overview', icon: Radio },
              { id: 'campaigns' as const, label: 'Campaigns', icon: Target },
              { id: 'adsets' as const, label: 'Ad sets', icon: Users },
              { id: 'ads' as const, label: 'Ads', icon: Eye },
              { id: 'insights' as const, label: 'Performance', icon: BarChart3 },
              { id: 'audiences' as const, label: 'Audiences', icon: Layers },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-2 sm:py-4 sm:text-sm ${
                  activeTab === tab.id ? '' : 'border-transparent'
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        borderColor: 'var(--arctic-blue-primary, #7DD3D3)',
                        color: 'var(--arctic-blue-primary-dark, #4A9FAF)',
                      }
                    : { color: 'var(--text-muted)' }
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {loading && activeTab !== 'overview' ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Connection
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Marketing API app ID (from server env):{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-900">
                    {config.meta_app_id || '—'}
                  </code>
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Ad account ID:{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-900">
                    {config.ad_account_id || '—'}
                  </code>
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Access token:{' '}
                  {config.access_token_set ? (
                    <span className="text-green-600 dark:text-green-400">stored securely</span>
                  ) : (
                    <span className="text-amber-600">not set — open Settings</span>
                  )}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Pixel ID: {config.pixel_id || '—'}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Facebook Page ID (env):{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-900">
                    {config.meta_fb_page_id || '—'}
                  </code>
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Token source:{' '}
                  <span className="font-medium">
                    {config.token_source === 'env'
                      ? '.env (META_GRAPH_ACCESS_TOKEN)'
                      : config.token_source === 'database'
                        ? 'Database (admin save)'
                        : config.token_source || '—'}
                  </span>
                </p>
                {config.meta_use_env_only && (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    META_USE_ENV_ONLY: settings form is disabled — change backend .env only.
                  </p>
                )}
                {tokenStatus?.debug?.expires_at && (
                  <p className="mt-2 text-xs text-gray-500">
                    Token expires (approx):{' '}
                    {new Date(tokenStatus.debug.expires_at).toLocaleString()}
                  </p>
                )}
                {tokenStatus?.debug?.scopes && tokenStatus.debug.scopes.length > 0 && (
                  <p className="mt-1 text-[11px] leading-snug text-gray-500">
                    Scopes: {tokenStatus.debug.scopes.join(', ')}
                  </p>
                )}
                {lastFullSync && (
                  <p className="mt-3 text-xs text-gray-500">Last full sync: {new Date(lastFullSync).toLocaleString()}</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ad accounts (token)
                  </h3>
                  <button
                    type="button"
                    onClick={loadAdAccounts}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs dark:border-gray-600"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
                {adAccounts.length === 0 ? (
                  <p className="text-sm text-gray-500">No accounts loaded. Check token permissions (ads_read, ads_management).</p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                    {adAccounts.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50"
                      >
                        <span className="font-medium">{a.name || a.id}</span>
                        <span className="text-xs text-gray-500">
                          {a.currency} · status {a.account_status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 p-5 lg:col-span-2 dark:border-gray-600">
                <h3 className="mb-2 text-sm font-semibold">Incremental sync</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700"
                    onClick={() => postSync('/sync/campaigns', 'Syncing campaigns…')}
                    disabled={!!busy}
                  >
                    Campaigns only
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700"
                    onClick={() => postSync('/sync/adsets', 'Syncing ad sets…')}
                    disabled={!!busy}
                  >
                    Ad sets only
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700"
                    onClick={() => postSync('/sync/ads', 'Syncing ads…')}
                    disabled={!!busy}
                  >
                    Ads only
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaign(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New campaign
                </button>
                <button
                  type="button"
                  onClick={() => postSync('/sync/campaigns', 'Syncing campaigns…')}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm dark:border-gray-600"
                  disabled={!!busy}
                >
                  <RefreshCw className="h-4 w-4" />
                  Pull from Meta
                </button>
              </div>
              {campaigns.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-12 text-center dark:bg-gray-800/50">
                  <Target className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No campaigns in the database. Use Pull from Meta or create one.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.campaign_id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div className="admin-page-header mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{campaign.name}</h3>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {campaign.objective} · {campaign.campaign_id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                          <button
                            type="button"
                            title="Pause / activate"
                            onClick={() =>
                              updateCampaignStatus(
                                campaign.campaign_id,
                                campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                              )
                            }
                            className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {campaign.status === 'ACTIVE' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCampaign(campaign.campaign_id)}
                            className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Daily budget</p>
                          <p className="font-semibold">
                            {campaign.daily_budget != null
                              ? `${(Number(campaign.daily_budget) / 100).toFixed(2)} (account currency)`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Lifetime budget</p>
                          <p className="font-semibold">
                            {campaign.lifetime_budget != null
                              ? `${(Number(campaign.lifetime_budget) / 100).toFixed(2)}`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Created</p>
                          <p className="font-semibold">
                            {campaign.created_time ? new Date(campaign.created_time).toLocaleDateString() : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'adsets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Filter by campaign</label>
                  <select
                    value={adsetFilterCampaign}
                    onChange={(e) => setAdsetFilterCampaign(e.target.value)}
                    className="rounded-md border px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="">All</option>
                    {campaigns.map((c) => (
                      <option key={c.campaign_id} value={c.campaign_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateAdSet(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New ad set
                </button>
                <button
                  type="button"
                  onClick={() => postSync('/sync/adsets', 'Syncing ad sets…')}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm dark:border-gray-600"
                  disabled={!!busy}
                >
                  <RefreshCw className="h-4 w-4" />
                  Pull from Meta
                </button>
              </div>
              {!adsetFilterCampaign && campaigns.length === 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Sync campaigns first so ad sets have parent campaigns to attach to.
                </p>
              )}
              {filteredAdsets.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-12 text-center dark:bg-gray-800/50">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No ad sets. Pull from Meta or create one.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredAdsets.map((adset) => (
                    <div
                      key={adset.adset_id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div className="admin-page-header mb-2">
                        <div>
                          <h3 className="text-lg font-semibold dark:text-gray-100">{adset.name}</h3>
                          <p className="text-sm text-gray-500">Campaign: {adset.campaign_id}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(adset.status)}`}>
                          {adset.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Ad set ID: {adset.adset_id}</p>
                      {adset.daily_budget != null && (
                        <p className="mt-2 text-sm">
                          Daily budget: {(Number(adset.daily_budget) / 100).toFixed(2)} (minor units)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAd(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New ad
                </button>
                <button
                  type="button"
                  onClick={() => postSync('/sync/ads', 'Syncing ads…')}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm dark:border-gray-600"
                  disabled={!!busy}
                >
                  <RefreshCw className="h-4 w-4" />
                  Pull from Meta
                </button>
              </div>
              {ads.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-12 text-center dark:bg-gray-800/50">
                  <Eye className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No ads yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {ads.map((ad) => (
                    <div
                      key={ad.ad_id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div className="admin-page-header mb-2">
                        <div>
                          <h3 className="text-lg font-semibold dark:text-gray-100">{ad.name}</h3>
                          <p className="text-sm text-gray-500">
                            Ad set {ad.adset_id} · Campaign {ad.campaign_id}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(ad.status)}`}>
                          {ad.status}
                        </span>
                      </div>
                      {ad.preview_url && (
                        <a
                          href={ad.preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-700 underline dark:text-cyan-400"
                        >
                          Preview →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={insightStart}
                    onChange={(e) => setInsightStart(e.target.value)}
                    className="rounded-md border px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={insightEnd}
                    onChange={(e) => setInsightEnd(e.target.value)}
                    className="rounded-md border px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={syncInsights}
                  disabled={!!busy || campaigns.length === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Fetch & store insights
                </button>
              </div>
              {campaigns.length === 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Go to Campaigns and sync from Meta first — insights are pulled per campaign.
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  { label: 'Impressions', val: totalInsights.impressions.toLocaleString(), icon: Eye },
                  { label: 'Clicks', val: totalInsights.clicks.toLocaleString(), icon: MousePointerClick },
                  { label: 'Spend', val: totalInsights.spend.toFixed(2), icon: DollarSign },
                  { label: 'Purchases (from actions)', val: String(totalInsights.conversions), icon: BarChart3 },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{card.label}</p>
                        <p className="mt-1 text-2xl font-semibold">{card.val}</p>
                      </div>
                      <card.icon className="h-8 w-8 text-cyan-600 opacity-80" />
                    </div>
                  </div>
                ))}
              </div>
              {insights.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-12 text-center dark:bg-gray-800/50">
                  <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No stored insights yet — fetch for the selected range.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Start</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Impr.</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Clicks</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Spend</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">CPC</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">CTR%</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {insights.map((insight, index) => (
                        <tr key={`${insight.date_start}-${index}`} className="dark:bg-gray-800/40">
                          <td className="whitespace-nowrap px-4 py-3">{insight.date_start || '—'}</td>
                          <td className="px-4 py-3">{insight.impressions ?? 0}</td>
                          <td className="px-4 py-3">{insight.clicks ?? 0}</td>
                          <td className="px-4 py-3">{Number(insight.spend ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-3">{Number(insight.cpc ?? 0).toFixed(4)}</td>
                          <td className="px-4 py-3">{Number(insight.ctr ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-3">{insight.conversions ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audiences' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => loadTabData()}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm dark:border-gray-600"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh list
              </button>
              {audiences.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-12 text-center dark:bg-gray-800/50">
                  <Layers className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No custom audiences returned for this ad account.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Subtype</th>
                        <th className="px-4 py-3 text-left font-medium">Approx. size</th>
                        <th className="px-4 py-3 text-left font-medium">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {audiences.map((a) => (
                        <tr key={a.id} className="dark:bg-gray-800/40">
                          <td className="px-4 py-3 font-medium">{a.name || '—'}</td>
                          <td className="px-4 py-3">{a.subtype || '—'}</td>
                          <td className="px-4 py-3">{a.approximate_count ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showCreateCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-semibold dark:text-gray-100">Create campaign</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                createCampaign({
                  name: data.get('name'),
                  objective: data.get('objective'),
                  status: data.get('status') || 'PAUSED',
                  daily_budget: data.get('daily_budget') ? parseFloat(String(data.get('daily_budget'))) : undefined,
                  lifetime_budget: data.get('lifetime_budget')
                    ? parseFloat(String(data.get('lifetime_budget')))
                    : undefined,
                  start_time: data.get('start_time') || undefined,
                  stop_time: data.get('stop_time') || undefined,
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input name="name" required className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Objective</label>
                <select
                  name="objective"
                  required
                  className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="OUTCOME_TRAFFIC">Traffic</option>
                  <option value="OUTCOME_LEADS">Leads</option>
                  <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                  <option value="OUTCOME_AWARENESS">Awareness</option>
                  <option value="OUTCOME_SALES">Sales</option>
                  <option value="OUTCOME_APP_PROMOTION">App promotion</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Daily budget (major units)</label>
                  <input name="daily_budget" type="number" min="0" step="0.01" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Lifetime budget</label>
                  <input name="lifetime_budget" type="number" min="0" step="0.01" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Start</label>
                  <input name="start_time" type="datetime-local" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">End</label>
                  <input name="stop_time" type="datetime-local" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select name="status" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
                  <option value="PAUSED">Paused</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg border px-4 py-2 dark:border-gray-600" onClick={() => setShowCreateCampaign(false)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-white">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateAdSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-semibold dark:text-gray-100">Create ad set</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                createAdSet({
                  campaign_id: data.get('campaign_id'),
                  name: data.get('name'),
                  status: 'PAUSED',
                  daily_budget: data.get('daily_budget') ? parseFloat(String(data.get('daily_budget'))) : undefined,
                  optimization_goal: data.get('optimization_goal') || 'LINK_CLICKS',
                  targeting: {
                    age_min: 18,
                    age_max: 55,
                    countries: (String(data.get('countries') || 'IN').split(',') as string[]).map((x) => x.trim().toUpperCase()).filter(Boolean),
                  },
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">Campaign</label>
                <select name="campaign_id" required className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
                  <option value="">Select</option>
                  {campaigns.map((c) => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ad set name</label>
                <input name="name" required className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Daily budget (major units)</label>
                <input name="daily_budget" type="number" min="1" step="0.01" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Optimization goal</label>
                <select name="optimization_goal" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
                  <option value="LINK_CLICKS">Link clicks</option>
                  <option value="OFFSITE_CONVERSIONS">Conversions</option>
                  <option value="IMPRESSIONS">Impressions</option>
                  <option value="REACH">Reach</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Country codes (comma)</label>
                <input name="countries" defaultValue="IN" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg border px-4 py-2 dark:border-gray-600" onClick={() => setShowCreateAdSet(false)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-white">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-semibold dark:text-gray-100">Create ad (link)</h2>
            <p className="mb-4 text-sm text-gray-500">
              Creates a link creative in Meta, then an ad inside the selected ad set. Requires a Facebook Page ID in `facebook_config` for your catalog connection.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                createAd({
                  adset_id: data.get('adset_id'),
                  name: data.get('name'),
                  status: 'PAUSED',
                  creative: {
                    link_url: data.get('link_url'),
                    message: data.get('message') || '',
                    image_url: data.get('image_url') || undefined,
                    call_to_action_type: data.get('cta') || 'LEARN_MORE',
                  },
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">Ad set</label>
                <select name="adset_id" required className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
                  <option value="">Select</option>
                  {adsets.map((a) => (
                    <option key={a.adset_id} value={a.adset_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ad name</label>
                <input name="name" required className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Landing URL</label>
                <input name="link_url" type="url" required className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Image URL (optional)</label>
                <input name="image_url" type="url" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Primary text</label>
                <textarea name="message" rows={2} className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Call to action</label>
                <select name="cta" className="w-full rounded-lg border px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
                  <option value="LEARN_MORE">Learn more</option>
                  <option value="SHOP_NOW">Shop now</option>
                  <option value="SIGN_UP">Sign up</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg border px-4 py-2 dark:border-gray-600" onClick={() => setShowCreateAd(false)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-white">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-semibold dark:text-gray-100">Meta Ads settings</h2>
            {config.meta_use_env_only ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <strong>META_USE_ENV_ONLY</strong> is on. Edit <code className="text-xs">META_GRAPH_ACCESS_TOKEN</code>,{' '}
                <code className="text-xs">META_AD_ACCOUNT_ID</code>, <code className="text-xs">META_FB_PAGE_ID</code> in{' '}
                <code className="text-xs">backend/.env</code> and restart the server.
              </p>
            ) : null}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Ad account ID</label>
                <input
                  value={config.ad_account_id}
                  onChange={(e) => setConfig({ ...config, ad_account_id: e.target.value })}
                  placeholder="act_123456789"
                  disabled={config.meta_use_env_only}
                  className="w-full rounded-lg border px-3 py-2 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pixel ID (optional)</label>
                <input
                  value={config.pixel_id}
                  onChange={(e) => setConfig({ ...config, pixel_id: e.target.value })}
                  disabled={config.meta_use_env_only}
                  className="w-full rounded-lg border px-3 py-2 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">System user / long-lived token</label>
                <p className="mb-1 text-xs text-gray-500">
                  {config.access_token_set ? 'A token is already stored. Paste a new value only when rotating.' : 'Paste a token with ads_management and ads_read.'}
                </p>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={config.access_token}
                  onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                  placeholder={config.access_token_set ? '•••••••• (leave blank to keep)' : 'Paste token'}
                  disabled={config.meta_use_env_only}
                  className="w-full rounded-lg border px-3 py-2 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 dark:border-gray-600"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-white disabled:opacity-50"
                  disabled={config.meta_use_env_only}
                  onClick={saveConfig}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
