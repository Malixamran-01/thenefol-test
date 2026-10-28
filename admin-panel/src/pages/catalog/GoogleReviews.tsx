import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Eye, EyeOff, Link2, Loader2, MapPin, Pin, PinOff, RefreshCw, Unlink } from 'lucide-react'
import { useToast } from '../../components/ToastProvider'
import { getApiBaseUrl } from '../../utils/apiUrl'

type Status = {
  configured: boolean
  encryptionReady: boolean
  redirectUri: string
  connected: boolean
  connectedEmail: string | null
  location: { accountName: string; locationName: string; title: string | null } | null
  rating: number | null
  totalReviews: number
  mapsUrl: string | null
  lastSyncAt: string | null
  lastError: string | null
  stored: number
  shown: number
}

type LocationOption = { accountName: string; accountTitle: string; locationName: string; title: string; address: string }

type Review = {
  id: number
  reviewer_name: string | null
  reviewer_photo_url: string | null
  is_anonymous: boolean
  rating: number
  comment: string | null
  reply: string | null
  review_created_at: string | null
  is_visible: boolean
  is_featured: boolean
  admin_override: boolean
}

type Filter = 'all' | 'shown' | 'hidden' | 'featured'

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`h-4 w-4 ${i <= value ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export default function GoogleReviews() {
  const { notify } = useToast()
  const apiBase = getApiBaseUrl()
  const [status, setStatus] = useState<Status | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'' | 'connect' | 'sync' | 'disconnect' | 'locations' | 'select'>('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [locations, setLocations] = useState<LocationOption[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [stars, setStars] = useState<number | 0>(0)
  const [copied, setCopied] = useState(false)

  const send = useCallback(async (path: string, method = 'GET', body?: unknown) => {
    const res = await fetch(`${apiBase}/admin/google-reviews${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
    return data
  }, [apiBase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s: Status = await send('/status')
      setStatus(s)
      setReviews(s.location ? await send('/reviews') : [])
    } catch (err) {
      notify('error', `Failed to load Google reviews: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [send, notify])

  useEffect(() => { load() }, [load])

  // Back from Google sign-in: ?google=connected | ?google=error&reason=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('google')
    if (!result) return
    if (result === 'connected') notify('success', 'Google connected')
    else notify('error', params.get('reason') || 'Google sign-in failed')
    params.delete('google')
    params.delete('reason')
    const q = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
  }, [notify])

  const connect = async () => {
    setBusy('connect')
    try {
      const { url } = await send('/connect', 'POST')
      window.location.href = url
    } catch (err) {
      notify('error', (err as Error).message)
      setBusy('')
    }
  }

  const sync = async () => {
    setBusy('sync')
    try {
      const r = await send('/sync', 'POST')
      notify('success', `Synced ${r.synced} review${r.synced === 1 ? '' : 's'}${r.removed ? `, removed ${r.removed} deleted on Google` : ''}`)
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
      await load()
    } finally {
      setBusy('')
    }
  }

  const loadLocations = async () => {
    setBusy('locations')
    try {
      setLocations(await send('/locations'))
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const selectLocation = async (loc: LocationOption) => {
    setBusy('select')
    try {
      const r = await send('/location', 'PUT', { accountName: loc.accountName, locationName: loc.locationName, title: loc.title })
      notify('success', `Using ${loc.title}: ${r.synced} review${r.synced === 1 ? '' : 's'} synced`)
      setLocations(null)
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
      await load()
    } finally {
      setBusy('')
    }
  }

  const disconnect = async () => {
    if (!confirm('Disconnect Google? The Happy customers section will be hidden until you connect again.')) return
    setBusy('disconnect')
    try {
      await send('/disconnect', 'POST')
      notify('success', 'Google disconnected')
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const update = async (r: Review, body: Partial<Pick<Review, 'is_visible' | 'is_featured'>>) => {
    setBusyId(r.id)
    try {
      const next = await send(`/reviews/${r.id}`, 'PATCH', body)
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...next } : x)))
      setStatus((s) => s && { ...s, shown: s.shown + (next.is_visible === r.is_visible ? 0 : next.is_visible ? 1 : -1) })
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const copyRedirect = async () => {
    if (!status) return
    try {
      await navigator.clipboard.writeText(status.redirectUri)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      notify('error', 'Copy failed. Select the text and copy it manually.')
    }
  }

  const visibleReviews = useMemo(() => reviews.filter((r) => {
    if (stars && r.rating !== stars) return false
    if (filter === 'shown') return r.is_visible
    if (filter === 'hidden') return !r.is_visible
    if (filter === 'featured') return r.is_featured
    return true
  }), [reviews, filter, stars])

  const setupDone = !!status?.configured && !!status?.encryptionReady

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="admin-page-header">
        <div>
          <h1
            className="mb-2 text-2xl font-light tracking-[0.15em] sm:text-3xl"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}
          >
            Google reviews
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Reviews from your Google Business Profile, synced daily. Choose which ones appear in the homepage's Happy customers section.
          </p>
        </div>
        {status?.connected && status.location && (
          <button onClick={sync} disabled={!!busy} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
          </button>
        )}
      </div>

      {loading && !status ? (
        <div className="metric-card text-sm text-gray-500">Loading…</div>
      ) : !status ? null : (
        <>
          {/* Setup: shown until the backend has OAuth credentials and an encryption key */}
          {!setupDone && (
            <div className="metric-card space-y-3 text-sm text-gray-700">
              <div className="font-medium text-gray-900">One-time setup</div>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  In <a className="text-blue-600 hover:underline" href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a>, use the project for NEFOL and request Business Profile API access with the{' '}
                  <a className="text-blue-600 hover:underline" href="https://developers.google.com/my-business/content/prereqs" target="_blank" rel="noreferrer">access request form</a>.
                  Google reviews the request, usually within a few days to a few weeks.
                </li>
                <li>Enable these APIs: <span className="font-medium">Google My Business API</span>, <span className="font-medium">My Business Account Management API</span> and <span className="font-medium">My Business Business Information API</span>.</li>
                <li>
                  Create an OAuth client ID (type: Web application) and add this authorised redirect URI:
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded bg-gray-100 px-2 py-1 text-xs">{status.redirectUri}</code>
                    <button onClick={copyRedirect} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </li>
                <li>
                  In the backend <code className="rounded bg-gray-100 px-1">.env</code>, set{' '}
                  {!status.configured && <><code className="rounded bg-gray-100 px-1">GOOGLE_BUSINESS_CLIENT_ID</code> and <code className="rounded bg-gray-100 px-1">GOOGLE_BUSINESS_CLIENT_SECRET</code>{!status.encryptionReady && ' plus '}</>}
                  {!status.encryptionReady && <code className="rounded bg-gray-100 px-1">ENCRYPTION_KEY</code>}
                  , then restart the backend.
                </li>
              </ol>
            </div>
          )}

          {/* Connection */}
          <div className="metric-card">
            {!status.connected ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700">
                  <div className="font-medium text-gray-900">Not connected</div>
                  Sign in with the Google account that owns or manages the NEFOL Business Profile.
                </div>
                <button onClick={connect} disabled={!setupDone || !!busy} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50" title={setupDone ? undefined : 'Finish the setup steps first'}>
                  {busy === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Connect Google
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium text-gray-900">Connected{status.connectedEmail ? ` as ${status.connectedEmail}` : ''}</div>
                    {status.location ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" /> {status.location.title || status.location.locationName}
                        {status.mapsUrl && (
                          <a href={status.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                            Maps <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 text-amber-700">Choose which Business Profile location to show.</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={loadLocations} disabled={!!busy} className="btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50">
                      {busy === 'locations' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} {status.location ? 'Change location' : 'Choose location'}
                    </button>
                    <button onClick={disconnect} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <Unlink className="h-4 w-4" /> Disconnect
                    </button>
                  </div>
                </div>

                {status.location && (
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Google rating</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-gray-900">
                        {status.rating != null ? status.rating.toFixed(1) : '–'} {status.rating != null && <Stars value={Math.round(status.rating)} />}
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Reviews on Google</div>
                      <div className="mt-0.5 text-lg font-semibold text-gray-900">{status.totalReviews}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Shown on site</div>
                      <div className="mt-0.5 text-lg font-semibold text-gray-900">{status.shown} <span className="text-sm font-normal text-gray-500">of {status.stored}</span></div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Last sync</div>
                      <div className="mt-0.5 text-sm font-medium text-gray-900">{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('en-IN') : 'Never'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {status.lastError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Last sync failed: {status.lastError}</div>
            )}
          </div>

          {/* Reviews */}
          {status.location && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'shown', 'hidden', 'featured'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full border px-3 py-1 text-sm capitalize ${filter === f ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {f}
                  </button>
                ))}
                <select value={stars} onChange={(e) => setStars(Number(e.target.value))} className="ml-auto rounded-lg border border-gray-300 px-2 py-1.5 text-sm" aria-label="Filter by stars">
                  <option value={0}>All ratings</option>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                New 4–5 star reviews with a comment are shown automatically. Featured reviews come first on the site. Your choices are kept when reviews sync again.
              </p>

              {visibleReviews.length === 0 ? (
                <div className="metric-card text-sm text-gray-500">{reviews.length === 0 ? 'No reviews synced yet. Click Sync now.' : 'No reviews match this filter.'}</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {visibleReviews.map((r) => (
                    <div key={r.id} className={`flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row ${r.is_visible ? '' : 'bg-gray-50'}`}>
                      <div className="flex min-w-0 flex-1 gap-3">
                        {r.reviewer_photo_url ? (
                          <img src={r.reviewer_photo_url} alt="" referrerPolicy="no-referrer" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                            {(r.reviewer_name || 'G').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                            <span className="font-medium text-gray-900">{r.reviewer_name || 'A Google user'}</span>
                            <Stars value={r.rating} />
                            <span className="text-xs text-gray-500">{fmtDate(r.review_created_at)}</span>
                            {r.is_featured && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Featured</span>}
                          </div>
                          {r.comment ? (
                            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.comment}</p>
                          ) : (
                            <p className="mt-1 text-sm italic text-gray-400">Rating only, no comment</p>
                          )}
                          {r.reply && <p className="mt-2 border-l-2 border-gray-200 pl-3 text-xs text-gray-500"><span className="font-medium">Your reply:</span> {r.reply}</p>}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-start gap-2">
                        <button
                          onClick={() => update(r, { is_visible: !r.is_visible })}
                          disabled={busyId === r.id}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs disabled:opacity-50 ${r.is_visible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                          title={r.is_visible ? 'Shown on the site. Click to hide.' : 'Hidden. Click to show on the site.'}
                        >
                          {r.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {r.is_visible ? 'Shown' : 'Hidden'}
                        </button>
                        <button
                          onClick={() => update(r, { is_featured: !r.is_featured })}
                          disabled={busyId === r.id}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs disabled:opacity-50 ${r.is_featured ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}
                          title={r.is_featured ? 'Remove from the top' : 'Show first on the site'}
                        >
                          {r.is_featured ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {r.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Location picker */}
      {locations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => busy !== 'select' && setLocations(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Choose your Business Profile location</h3>
            {locations.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">This Google account doesn't manage any Business Profile locations. Disconnect and sign in with the account that owns the NEFOL profile.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {locations.map((loc) => (
                  <button
                    key={loc.locationName}
                    onClick={() => selectLocation(loc)}
                    disabled={busy === 'select'}
                    className={`w-full rounded-lg border p-3 text-left text-sm hover:border-gray-900 disabled:opacity-50 ${status?.location?.locationName === loc.locationName ? 'border-gray-900' : 'border-gray-200'}`}
                  >
                    <div className="font-medium text-gray-900">{loc.title}</div>
                    {loc.address && <div className="text-xs text-gray-500">{loc.address}</div>}
                    {loc.accountTitle && <div className="text-xs text-gray-400">Account: {loc.accountTitle}</div>}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              {busy === 'select' && <span className="inline-flex items-center gap-1 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Syncing reviews…</span>}
              <button onClick={() => setLocations(null)} disabled={busy === 'select'} className="btn-secondary disabled:opacity-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
