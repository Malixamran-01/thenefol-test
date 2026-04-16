import React, { useState, useEffect, useCallback } from 'react'
import { getApiBaseUrl } from '../../utils/apiUrl'
import { RefreshCw, Link2, Unlink, ExternalLink, TrendingUp, Users, Film, Eye, Heart } from 'lucide-react'

type BrandInfo = {
  connected: boolean
  ig_username: string | null
  ig_user_id: string | null
  token_expires_at: string | null
}

type ReelRow = {
  media_id: string
  shortcode: string
  reel_url: string
  thumbnail_url: string | null
  caption: string | null
  timestamp: string
  likes: number
  views: number
  caption_ok: boolean
  date_ok: boolean
  eligible: boolean
}

type CollabRow = {
  id: number
  name: string
  email: string
  ig_username: string | null
  instagram_connected: boolean
  reel_count: number
  total_views: number
  total_likes: number
}

type DashboardPayload = {
  brand: BrandInfo
  reels: ReelRow[]
  reel_totals: { count: number; views: number; likes: number }
  top_collabs: CollabRow[]
  summary: {
    creators_with_ig: number
    collab_reels_tracked: number
    collab_total_views: number
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
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
  headers['x-user-role'] = role
  headers['x-user-permissions'] = permissions
  return headers
}

export default function FacebookInstagram() {
  const apiBase = getApiBaseUrl()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dash, setDash] = useState<DashboardPayload | null>(null)
  const [oauthMsg, setOauthMsg] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`${apiBase}/api/admin/instagram/dashboard`, { headers: authHeaders() })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as DashboardPayload
      setDash(data)
    } catch (e: unknown) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to load Instagram data')
      setDash(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const hash = window.location.hash || ''
    const q = hash.includes('?') ? hash.split('?').slice(1).join('?') : ''
    const params = new URLSearchParams(q)
    if (params.get('ig_connected') === '1') {
      setOauthMsg('Instagram connected successfully.')
      window.history.replaceState({}, '', '#/admin/facebook')
      void loadDashboard()
    }
    const igErr = params.get('ig_error')
    if (igErr) {
      setError(decodeURIComponent(igErr))
      window.history.replaceState({}, '', '#/admin/facebook')
    }
  }, [loadDashboard])

  const startConnect = () => {
    const token = localStorage.getItem('auth_token')
    if (!token?.startsWith('staff_')) {
      setError('Please sign in to the admin panel with a staff account, then try again.')
      return
    }
    window.location.href = `${apiBase}/api/admin/instagram/connect?token=${encodeURIComponent(token)}`
  }

  const disconnect = async () => {
    if (!confirm('Disconnect the brand Instagram account from the admin panel?')) return
    try {
      const res = await fetch(`${apiBase}/api/admin/instagram/disconnect`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Disconnect failed')
      setOauthMsg('')
      await loadDashboard()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    }
  }

  const connected = dash?.brand?.connected

  return (
    <div className="space-y-8 max-w-6xl text-[var(--text-primary)]">
      <div className="admin-page-header flex-col sm:flex-row gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-light mb-2 tracking-[0.15em]"
            style={{ fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
          >
            Facebook &amp; Instagram
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
            Connect your brand&apos;s <strong className="text-[var(--text-primary)]">Instagram Professional</strong> account
            (same OAuth as Creator Collab). Fetch reels, views, and likes from the Graph API. Creator collab performance is
            listed below for comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] hover:bg-[var(--brand-highlight)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {connected ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
            >
              <Unlink className="h-4 w-4" />
              Disconnect Instagram
            </button>
          ) : (
            <button
              type="button"
              onClick={startConnect}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-accent)] text-white hover:opacity-90"
            >
              <Link2 className="h-4 w-4" />
              Connect Instagram
            </button>
          )}
        </div>
      </div>

      {oauthMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-900 px-4 py-3 text-sm">{oauthMsg}</div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 px-4 py-3 text-sm">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-[var(--text-secondary)]">
          <div className="h-10 w-10 border-2 border-[var(--brand-border)] border-t-[var(--brand-accent)] rounded-full animate-spin" />
        </div>
      )}

      {!loading && !connected && (
        <div
          className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-10 text-center shadow-sm"
        >
          <div className="text-5xl mb-4" aria-hidden>
            📷
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Connect brand Instagram</h2>
          <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
            Uses the same Meta app and redirect URI as the collab flow. You&apos;ll authorize insights so we can show reel
            views and likes. Facebook Page posting is not part of this integration yet.
          </p>
          <button
            type="button"
            onClick={startConnect}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--brand-accent)] text-white font-medium hover:opacity-90"
          >
            <Link2 className="h-5 w-5" />
            Connect Instagram (OAuth)
          </button>
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Requires <code className="bg-[var(--brand-highlight)] px-1 rounded">ADMIN_PANEL_URL</code> in backend env for
            correct redirect after login (defaults to http://localhost:5173).
          </p>
        </div>
      )}

      {!loading && connected && dash && (
        <div className="space-y-8">
          <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Connected account</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">@{dash.brand.ig_username || '—'}</p>
              {dash.brand.token_expires_at && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Token refreshes before: {new Date(dash.brand.token_expires_at).toLocaleString()}
                </p>
              )}
            </div>
            <a
              href={`https://www.instagram.com/${dash.brand.ig_username || ''}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--brand-accent)] hover:underline"
            >
              Open profile <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                <Film className="h-4 w-4" /> Brand reels (loaded)
              </div>
              <p className="text-2xl font-bold tabular-nums">{dash.reel_totals.count}</p>
            </div>
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                <Eye className="h-4 w-4" /> Brand views (sum)
              </div>
              <p className="text-2xl font-bold tabular-nums">{dash.reel_totals.views.toLocaleString()} </p>
            </div>
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                <Heart className="h-4 w-4" /> Brand likes (sum)
              </div>
              <p className="text-2xl font-bold tabular-nums">{dash.reel_totals.likes.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                <Users className="h-4 w-4" /> Creators (IG linked)
              </div>
              <p className="text-2xl font-bold tabular-nums">{dash.summary.creators_with_ig}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface-muted)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Collab reels in database</p>
              <p className="text-lg font-semibold">{dash.summary.collab_reels_tracked}</p>
            </div>
            <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface-muted)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Collab reel views (tracked total)</p>
              <p className="text-lg font-semibold">{Number(dash.summary.collab_total_views).toLocaleString()}</p>
            </div>
          </div>

          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Film className="h-5 w-5 text-[var(--text-muted)]" />
              Your reels &amp; performance
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--brand-surface-muted)]">
                  <tr>
                    <th className="text-left px-3 py-2">Preview</th>
                    <th className="text-left px-3 py-2">Caption</th>
                    <th className="text-right px-3 py-2">Views</th>
                    <th className="text-right px-3 py-2">Likes</th>
                    <th className="text-left px-3 py-2">Nefol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-border)]">
                  {dash.reels.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                        No video reels found for this account yet.
                      </td>
                    </tr>
                  )}
                  {dash.reels.map((r) => (
                    <tr key={r.media_id}>
                      <td className="px-3 py-2 w-20">
                        {r.thumbnail_url ? (
                          <img src={r.thumbnail_url} alt="" className="w-16 h-16 rounded object-cover bg-[var(--brand-highlight)]" />
                        ) : (
                          <div className="w-16 h-16 rounded bg-[var(--brand-highlight)]" />
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-md">
                        <p className="line-clamp-2 text-[var(--text-primary)]">{r.caption || '—'}</p>
                        <a
                          href={r.reel_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--brand-accent)] inline-flex items-center gap-1 mt-1"
                        >
                          Open reel <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.views.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.likes.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {r.caption_ok ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">Mention</span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--text-muted)]" />
              Top creator collabs (by tracked reel views)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--brand-surface-muted)]">
                  <tr>
                    <th className="text-left px-3 py-2">Creator</th>
                    <th className="text-left px-3 py-2">Instagram</th>
                    <th className="text-right px-3 py-2">Reels</th>
                    <th className="text-right px-3 py-2">Views</th>
                    <th className="text-right px-3 py-2">Likes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-border)]">
                  {dash.top_collabs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                        No approved collab data yet.
                      </td>
                    </tr>
                  )}
                  {dash.top_collabs.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--text-primary)]">{c.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{c.email}</div>
                      </td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{c.ig_username ? `@${c.ig_username}` : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.reel_count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(c.total_views).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(c.total_likes).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
