import React, { useState, useEffect } from 'react'
import { ArrowLeft, Video, Lock, CheckCircle, X, Instagram, ExternalLink, RefreshCw, Play, Heart, AlertCircle, Loader2 } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

const AFFILIATE_VIEWS_THRESHOLD = 10_000
const AFFILIATE_LIKES_THRESHOLD = 500

interface CollabStatus {
  id?: number
  status?: 'pending' | 'approved' | 'rejected'
  hasApplication: boolean
  totalViews: number
  totalLikes: number
  progressPercent: number
  affiliateUnlocked: boolean
  instagramHandles: string[]
  instagramConnected: boolean
  igUsername: string | null
  collabJoinedAt: string | null
}

interface SyncedReel {
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
  already_submitted: boolean
}

interface SubmittedReel {
  id: number
  reel_url: string
  instagram_username: string
  views_count: number
  likes_count: number
  caption_ok: boolean
  date_ok: boolean
  reel_posted_at?: string
  insights_pending?: boolean
}

export default function Collab() {
  const { isAuthenticated, user } = useAuth()
  const [showForm, setShowForm] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<CollabStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittedReels, setSubmittedReels] = useState<SubmittedReel[]>([])
  const [igConnecting, setIgConnecting] = useState(false)

  // Reel sync state
  const [syncedReels, setSyncedReels] = useState<SyncedReel[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [selectedReels, setSelectedReels] = useState<Set<string>>(new Set())
  const [submittingSelected, setSubmittingSelected] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success?: string; error?: string } | null>(null)

  const [instagramHandles, setInstagramHandles] = useState<string[]>([''])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    followers: '',
    platform: '',
    agreeTerms: false,
  })

  // Handle OAuth return params in URL hash
  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('ig_connected=1')) {
      window.location.hash = '/user/collab'
    }
    if (hash.includes('ig_error=')) {
      const match = hash.match(/ig_error=([^&]+)/)
      if (match) {
        setSyncError(`Instagram connection failed: ${decodeURIComponent(match[1])}`)
        window.location.hash = '/user/collab'
      }
    }
  }, [])

  const token = () => localStorage.getItem('token') || ''
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
  })

  const fetchStatus = async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const queryEmail = user?.email ? `?email=${encodeURIComponent(user.email)}` : ''
      const res = await fetch(`${getApiBase()}/api/collab/status${queryEmail}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const handles = Array.isArray(data.instagram_handles)
          ? data.instagram_handles
          : (data.instagram || '').split(',').map((h: string) => h.trim()).filter(Boolean)

        setStatus({
          id: data.id,
          status: data.status,
          hasApplication: !!data.id,
          totalViews: data.total_views ?? 0,
          totalLikes: data.total_likes ?? 0,
          progressPercent: data.progress ?? 0,
          affiliateUnlocked: !!data.affiliate_unlocked,
          instagramHandles: handles,
          instagramConnected: !!data.instagram_connected,
          igUsername: data.ig_username || null,
          collabJoinedAt: data.collab_joined_at || null,
        })
        setSubmittedReels(Array.isArray(data.reels) ? data.reels : [])
        if (handles.length > 0) setInstagramHandles(handles)
        if (data.id) { setSubmitted(true); setShowForm(false) }
      }
    } catch (e) {
      console.error('Collab status fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [isAuthenticated, user?.email])

  // ── Application form ───────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const handles = instagramHandles.map((h) => h.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
    if (!formData.name || !formData.email || !formData.phone || !handles.length) {
      return alert('Please fill in: Name, Email, Phone, and at least one Instagram handle.')
    }
    if (!formData.agreeTerms) return alert('Please agree to the terms.')

    const res = await fetch(`${getApiBase()}/api/collab/apply`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...formData, instagram: handles[0], instagram_handles: handles }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const appId = data?.application?.id
      setSubmitted(true)
      setShowForm(false)
      setStatus((s) => s ? { ...s, id: appId || s.id, hasApplication: true, status: 'pending', instagramHandles: handles }
        : { id: appId, status: 'pending', hasApplication: true, totalViews: 0, totalLikes: 0,
            progressPercent: 0, affiliateUnlocked: false, instagramHandles: handles,
            instagramConnected: false, igUsername: null, collabJoinedAt: new Date().toISOString() })
    } else {
      alert(data?.message || 'Failed to submit. Please try again.')
    }
  }

  // ── Instagram connect ──────────────────────────────────────────────────────
  const handleConnectInstagram = () => {
    if (!status?.id) return alert('Submit your collab application first.')
    setIgConnecting(true)
    window.location.href = `${getApiBase()}/api/instagram/connect?collab_id=${status.id}`
  }

  const handleDisconnectInstagram = async () => {
    if (!status?.id || !confirm('Disconnect Instagram from this collab?')) return
    await fetch(`${getApiBase()}/api/instagram/disconnect`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ collab_id: status.id }),
    })
    setStatus((s) => s ? { ...s, instagramConnected: false, igUsername: null } : s)
    setSyncedReels([])
    setSelectedReels(new Set())
  }

  // ── Reel sync + submit ─────────────────────────────────────────────────────
  const syncReels = async () => {
    if (!status?.id) return
    setSyncing(true)
    setSyncError('')
    setSyncedReels([])
    setSelectedReels(new Set())
    setSubmitResult(null)

    try {
      const res = await fetch(
        `${getApiBase()}/api/instagram/reels?collab_id=${status.id}`,
        { headers: authHeaders() }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSyncError(data?.message || 'Failed to sync reels.'); return }

      const reels: SyncedReel[] = data.reels || []
      setSyncedReels(reels)

      // Auto-select all eligible, not-yet-submitted reels
      const autoSelect = new Set<string>()
      reels.forEach((r) => { if (r.eligible && !r.already_submitted) autoSelect.add(r.media_id) })
      setSelectedReels(autoSelect)

      if (reels.length === 0) setSyncError('No reels found on your Instagram account.')
    } catch {
      setSyncError('Could not reach Instagram. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const toggleSelect = (mediaId: string) => {
    setSelectedReels((prev) => {
      const next = new Set(prev)
      next.has(mediaId) ? next.delete(mediaId) : next.add(mediaId)
      return next
    })
  }

  const submitSelected = async () => {
    if (!status?.id || selectedReels.size === 0) return
    setSubmittingSelected(true)
    setSubmitResult(null)

    // Pass pre-fetched data to avoid double API call
    const toSubmit = syncedReels
      .filter((r) => selectedReels.has(r.media_id))
      .map((r) => ({
        reel_url: r.reel_url,
        instagram_handle: status.igUsername || status.instagramHandles[0] || '',
        prefetched: {
          views:       r.views,
          likes:       r.likes,
          postedAt:    r.timestamp,
          caption:     r.caption,
          caption_ok:  r.caption_ok,
          date_ok:     r.date_ok,
        },
      }))

    try {
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ collab_id: status.id, reel_urls: toSubmit }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSubmitResult({ success: `${selectedReels.size} reel${selectedReels.size > 1 ? 's' : ''} submitted!` })
        setStatus((s) => s ? { ...s, totalViews: data.total_views ?? s.totalViews, totalLikes: data.total_likes ?? s.totalLikes,
            progressPercent: data.progress ?? s.progressPercent, affiliateUnlocked: !!data.affiliate_unlocked } : s)
        await fetchStatus()
        setSyncedReels([])
        setSelectedReels(new Set())
      } else {
        setSubmitResult({ error: data?.message || 'Submission failed.' })
      }
    } catch {
      setSubmitResult({ error: 'Request failed. Please try again.' })
    } finally {
      setSubmittingSelected(false)
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const isApproved = status?.status === 'approved'
  const progress = status?.progressPercent ?? 0
  const affiliateUnlocked = status?.affiliateUnlocked ?? false

  const eligibleCount = syncedReels.filter((r) => r.eligible && !r.already_submitted).length
  const ineligibleCount = syncedReels.filter((r) => !r.eligible).length

  // ── Styles ──────────────────────────────────────────────────────────────────
  const pageBg = '#F4F9F9'
  const cardBg = '#FFFFFF'
  const cardShadow = '0 2px 12px rgba(14,39,48,0.06)'
  const borderColor = '#E8E4DE'
  const textPrimary = '#1a1a1a'
  const textMuted = '#6b7280'
  const accent = '#4B97C9'
  const igPink = '#E1306C'

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen py-16 px-4" style={{ backgroundColor: pageBg }}>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: textPrimary }}>Sign in to apply for Collab</h1>
          <p className="mb-6" style={{ color: textMuted }}>You need to be signed in to join our creator collab program.</p>
          <a href="#/user/login" onClick={() => sessionStorage.setItem('post_login_redirect', '#/user/collab')}
            className="inline-block rounded-xl px-6 py-3 font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent, color: '#fff' }}>Sign in</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:py-16" style={{ backgroundColor: pageBg, fontFamily: 'var(--font-body-family)' }}>
      <div className="mx-auto max-w-2xl">
        <a href="#/user/" className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80" style={{ color: textMuted }}>
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </a>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight" style={{ color: textPrimary, fontFamily: 'var(--font-heading-family)' }}>
          Creator Collab Program
        </h1>
        <p className="mb-6 text-base sm:text-lg leading-relaxed" style={{ color: textMuted }}>
          Post reels featuring NEFOL products, sync from your Instagram, and track progress toward the Affiliate Program.
          Reach <strong>10,000 views</strong> and <strong>500 likes</strong> combined to unlock Affiliate status.
        </p>

        {/* Requirements callout */}
        <div className="mb-8 p-4 rounded-xl text-sm" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          <strong>Reel rules:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            <li>Posted <strong>after</strong> you join the collab program</li>
            <li>Caption must include <strong>#nefol</strong> or <strong>#neföl</strong></li>
            <li>From your <strong>connected Instagram account</strong></li>
          </ul>
        </div>

        {loading ? (
          <div className="py-16 text-center" style={{ color: textMuted }}>Loading...</div>
        ) : (
          <>
            {/* Status banner */}
            {!showForm && status?.hasApplication && (
              <section className="mb-6 p-5 rounded-2xl flex items-start gap-4"
                style={{
                  backgroundColor: status.status === 'approved' ? '#f0fdf4' : status.status === 'rejected' ? '#fef2f2' : '#fff9eb',
                  border: `1px solid ${status.status === 'approved' ? '#bbf7d0' : status.status === 'rejected' ? '#fecaca' : '#f5d48b'}`,
                }}>
                {status.status === 'approved' ? <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-600" />
                  : status.status === 'rejected' ? <X className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
                  : <Video className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" />}
                <div className="flex-1">
                  <p className="font-semibold text-sm"
                    style={{ color: status.status === 'approved' ? '#166534' : status.status === 'rejected' ? '#991b1b' : '#8a5a00' }}>
                    {status.status === 'approved' ? 'Application Approved!'
                      : status.status === 'rejected' ? 'Application Rejected'
                      : 'Application Pending Review'}
                  </p>
                  <p className="text-sm mt-0.5"
                    style={{ color: status.status === 'approved' ? '#166534' : status.status === 'rejected' ? '#991b1b' : '#8a5a00' }}>
                    {status.status === 'approved'
                      ? 'Connect your Instagram and sync reels below.'
                      : status.status === 'rejected' ? 'Your application was rejected.'
                      : "We'll review your application and reach out on Instagram."}
                  </p>
                  {status.status === 'rejected' && (
                    <button onClick={() => { setShowForm(true); setSubmitted(false) }}
                      className="mt-2 text-sm font-medium underline" style={{ color: '#991b1b' }}>Re-apply</button>
                  )}
                </div>
              </section>
            )}

            {/* Step 1: Application form */}
            {showForm && (
              <section className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: textPrimary }}>Step 1 — Your details</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {[
                    { label: 'Name *', name: 'name', type: 'text', placeholder: 'Your full name' },
                    { label: 'Email *', name: 'email', type: 'email', placeholder: 'you@email.com' },
                    { label: 'Phone *', name: 'phone', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>{field.label}</label>
                      <input type={field.type} name={field.name} value={(formData as any)[field.name]}
                        onChange={handleInputChange} required placeholder={field.placeholder}
                        className="w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9]"
                        style={{ borderColor: '#E5E2DC', color: textPrimary }} />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Instagram handle(s) *</label>
                    <div className="space-y-2">
                      {instagramHandles.map((handle, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="text" placeholder="@username" value={handle}
                            onChange={(e) => setInstagramHandles((p) => p.map((h, i) => i === idx ? e.target.value : h))}
                            required={idx === 0}
                            className="w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9]"
                            style={{ borderColor: '#E5E2DC', color: textPrimary }} />
                          {instagramHandles.length > 1 && (
                            <button type="button" onClick={() => setInstagramHandles((p) => p.filter((_, i) => i !== idx))}
                              className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: '#E5E2DC', color: textMuted }}>
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setInstagramHandles((p) => [...p, ''])}
                        className="text-sm flex items-center gap-1 mt-1 hover:opacity-80" style={{ color: accent }}>
                        + Add another handle
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleInputChange} className="mt-1 rounded" />
                    <span className="text-sm leading-relaxed" style={{ color: textMuted }}>
                      I agree to create content featuring NEFOL products and include <strong>#nefol</strong> in my reel captions.
                    </span>
                  </label>

                  <button type="submit" className="w-full rounded-xl px-4 py-3.5 font-semibold text-[15px] transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent, color: '#fff' }}>Submit Collab Application</button>
                </form>
              </section>
            )}

            {/* Step 2: Connect Instagram */}
            {submitted && (
              <section className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: textPrimary }}>
                  <Instagram className="h-5 w-5" style={{ color: igPink }} />
                  Step 2 — Connect Instagram
                </h2>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: textMuted }}>
                  Connect your Instagram <strong>Creator</strong> or <strong>Business</strong> account — no Facebook account or Page needed. We use this to sync your reels and verify views &amp; likes automatically.
                </p>

                {status?.instagramConnected && status.igUsername ? (
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-sm text-emerald-800">Connected as @{status.igUsername}</p>
                        <a href={`https://www.instagram.com/${status.igUsername}`} target="_blank" rel="noreferrer"
                          className="text-xs text-emerald-700 underline flex items-center gap-1">
                          View profile <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <button onClick={handleDisconnectInstagram} className="text-xs text-red-500 hover:text-red-700 underline">Disconnect</button>
                  </div>
                ) : (
                  <button onClick={handleConnectInstagram} disabled={igConnecting}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: igPink, color: '#fff' }}>
                    <Instagram className="h-5 w-5" />
                    {igConnecting ? 'Redirecting...' : 'Connect Instagram Account'}
                  </button>
                )}

                {syncError && syncError.includes('connection failed') && (
                  <p className="mt-3 text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {syncError}
                  </p>
                )}
              </section>
            )}

            {/* Step 3: Sync & Pick Reels */}
            {submitted && (
              <section className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: textPrimary }}>
                  <Video className="h-5 w-5" style={{ color: accent }} />
                  Step 3 — Sync &amp; submit reels
                </h2>

                {!isApproved && (
                  <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#f5d48b', backgroundColor: '#fff9eb', color: '#8a5a00' }}>
                    Waiting for admin approval before reels can be submitted.
                  </div>
                )}

                {isApproved && !status?.instagramConnected && (
                  <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#991b1b' }}>
                    Connect your Instagram account (Step 2) first.
                  </div>
                )}

                {isApproved && status?.instagramConnected && (
                  <>
                    <p className="text-sm mb-5 leading-relaxed" style={{ color: textMuted }}>
                      Click <strong>Sync from Instagram</strong> to fetch your reels. We'll automatically check which ones are eligible, then you select and submit.
                    </p>

                    <button onClick={syncReels} disabled={syncing}
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium text-[15px] transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: accent, color: '#fff' }}>
                      {syncing
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing from Instagram...</>
                        : <><RefreshCw className="h-4 w-4" /> Sync from Instagram</>}
                    </button>

                    {syncError && !syncError.includes('connection failed') && (
                      <p className="mt-3 text-sm text-red-600 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {syncError}
                      </p>
                    )}

                    {/* Synced reels picker */}
                    {syncedReels.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-medium" style={{ color: textPrimary }}>
                            {eligibleCount > 0 && (
                              <span className="text-emerald-700">{eligibleCount} eligible reel{eligibleCount > 1 ? 's' : ''}</span>
                            )}
                            {eligibleCount > 0 && ineligibleCount > 0 && <span style={{ color: textMuted }}> · </span>}
                            {ineligibleCount > 0 && (
                              <span style={{ color: textMuted }}>{ineligibleCount} not eligible</span>
                            )}
                          </div>
                          <div className="flex gap-3 text-xs" style={{ color: accent }}>
                            <button onClick={() => {
                              const eligible = syncedReels.filter((r) => r.eligible && !r.already_submitted).map((r) => r.media_id)
                              setSelectedReels(new Set(eligible))
                            }}>Select all eligible</button>
                            <span style={{ color: borderColor }}>|</span>
                            <button onClick={() => setSelectedReels(new Set())}>Clear</button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                          {syncedReels.map((reel) => {
                            const isSelected = selectedReels.has(reel.media_id)
                            const isDisabled = reel.already_submitted || !reel.eligible

                            return (
                              <div
                                key={reel.media_id}
                                onClick={() => !isDisabled && toggleSelect(reel.media_id)}
                                className={`relative rounded-xl border p-3 transition-all ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                                style={{
                                  borderColor: isSelected ? accent : reel.eligible ? '#bbf7d0' : '#fecaca',
                                  backgroundColor: isSelected ? '#eff8ff' : reel.eligible ? '#f0fdf4' : '#fef2f2',
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Thumbnail */}
                                  <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
                                    {reel.thumbnail_url
                                      ? <img src={reel.thumbnail_url} alt="reel" className="w-full h-full object-cover" />
                                      : <div className="w-full h-full flex items-center justify-center"><Play className="h-6 w-6 text-gray-400" /></div>}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {/* Selection indicator */}
                                      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center
                                        ${isSelected ? 'border-[#4B97C9] bg-[#4B97C9]' : 'border-gray-300 bg-white'}`}>
                                        {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                      </div>

                                      {reel.already_submitted ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Already submitted</span>
                                      ) : reel.eligible ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Eligible</span>
                                      ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Not eligible</span>
                                      )}

                                      <span className="text-[10px] ml-auto" style={{ color: textMuted }}>
                                        {new Date(reel.timestamp).toLocaleDateString()}
                                      </span>
                                    </div>

                                    {/* Caption preview */}
                                    {reel.caption && (
                                      <p className="text-xs truncate mb-1.5" style={{ color: textMuted }}>{reel.caption}</p>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs" style={{ color: textMuted }}>
                                      <span className="flex items-center gap-1"><Play className="h-3 w-3" />{reel.views.toLocaleString()}</span>
                                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{reel.likes.toLocaleString()}</span>
                                      <a href={reel.reel_url} target="_blank" rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 ml-auto underline" style={{ color: accent }}>
                                        <ExternalLink className="h-3 w-3" /> View
                                      </a>
                                    </div>

                                    {/* Ineligibility reason */}
                                    {!reel.eligible && !reel.already_submitted && (
                                      <p className="text-[10px] mt-1.5 text-red-600">
                                        {!reel.date_ok && 'Posted before you joined collab. '}
                                        {!reel.caption_ok && 'Caption missing #nefol or #neföl.'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Submit button */}
                        {selectedReels.size > 0 && (
                          <div className="mt-4 flex items-center gap-4">
                            <button onClick={submitSelected} disabled={submittingSelected}
                              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium text-[15px] transition-opacity hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: '#10b981', color: '#fff' }}>
                              {submittingSelected
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                                : <>Submit {selectedReels.size} selected reel{selectedReels.size > 1 ? 's' : ''}</>}
                            </button>
                            <span className="text-sm" style={{ color: textMuted }}>
                              {selectedReels.size} selected
                            </span>
                          </div>
                        )}

                        {submitResult && (
                          <div className={`mt-3 rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${submitResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {submitResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            {submitResult.success || submitResult.error}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Already submitted reels */}
                {submittedReels.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                        Submitted reels ({submittedReels.length})
                      </h3>
                      <button onClick={fetchStatus} className="text-xs flex items-center gap-1" style={{ color: textMuted }}>
                        <RefreshCw className="h-3 w-3" /> Refresh
                      </button>
                    </div>

                    {/* Pending banner */}
                    {submittedReels.some((r) => r.insights_pending) && (
                      <div className="mb-3 p-3 rounded-xl flex items-start gap-2 text-xs"
                        style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>{submittedReels.filter((r) => r.insights_pending).length} reel{submittedReels.filter((r) => r.insights_pending).length > 1 ? 's' : ''} still syncing</strong> — Instagram's API takes time to make insights available for new posts. Metrics update automatically every 8 hours.
                        </span>
                      </div>
                    )}

                    {submittedReels.map((reel) => (
                      <div key={reel.id} className="mb-2 p-3 rounded-xl border text-xs"
                        style={{
                          borderColor: reel.insights_pending ? '#fde68a' : reel.caption_ok && reel.date_ok ? '#bbf7d0' : '#fecaca',
                          backgroundColor: reel.insights_pending ? '#fffbeb' : reel.caption_ok && reel.date_ok ? '#f0fdf4' : '#fef2f2',
                        }}>
                        <div className="flex items-start justify-between gap-2">
                          <a href={reel.reel_url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate flex-1">{reel.reel_url}</a>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {reel.insights_pending ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">Syncing</span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${reel.caption_ok && reel.date_ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {reel.caption_ok && reel.date_ok ? 'Eligible' : 'Not eligible'}
                              </span>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm('Remove this reel from your submission?')) return
                                await fetch(`${getApiBase()}/api/collab/reels/${reel.id}`, {
                                  method: 'DELETE', headers: authHeaders(),
                                  body: JSON.stringify({ collab_id: status?.id }),
                                })
                                await fetchStatus()
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove reel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-1.5 text-gray-600">
                          {reel.insights_pending ? (
                            <span className="italic text-amber-600">Metrics syncing... check back in a few hours</span>
                          ) : (
                            <>
                              <span>👁 {(reel.views_count || 0).toLocaleString()}</span>
                              <span>❤️ {(reel.likes_count || 0).toLocaleString()}</span>
                              <span>@{reel.instagram_username}</span>
                            </>
                          )}
                        </div>
                        {!reel.insights_pending && (!reel.caption_ok || !reel.date_ok) && (
                          <p className="mt-1 text-red-600">
                            {!reel.date_ok && '• Posted before you joined collab. '}
                            {!reel.caption_ok && '• Caption missing #nefol or #neföl.'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Progress */}
            <section className="p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: textPrimary }}>
                {affiliateUnlocked ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-amber-500" />}
                Progress to Affiliate
              </h2>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: textMuted }}>
                  <span>Views</span>
                  <span>{(status?.totalViews ?? 0).toLocaleString()} / {AFFILIATE_VIEWS_THRESHOLD.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E4DE' }}>
                  <div className="h-full transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, ((status?.totalViews ?? 0) / AFFILIATE_VIEWS_THRESHOLD) * 100)}%`, backgroundColor: affiliateUnlocked ? '#10b981' : accent }} />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: textMuted }}>
                  <span>Likes</span>
                  <span>{(status?.totalLikes ?? 0).toLocaleString()} / {AFFILIATE_LIKES_THRESHOLD.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E4DE' }}>
                  <div className="h-full transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, ((status?.totalLikes ?? 0) / AFFILIATE_LIKES_THRESHOLD) * 100)}%`, backgroundColor: affiliateUnlocked ? '#10b981' : igPink }} />
                </div>
              </div>

              <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#E8E4DE' }}>
                <div className="h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, progress)}%`, backgroundColor: affiliateUnlocked ? '#10b981' : accent }} />
              </div>

              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {affiliateUnlocked
                  ? 'Affiliate Program unlocked! You can now apply from Join Us.'
                  : `Reach ${AFFILIATE_VIEWS_THRESHOLD.toLocaleString()} views AND ${AFFILIATE_LIKES_THRESHOLD.toLocaleString()} likes across eligible reels.`}
              </p>
              {affiliateUnlocked && (
                <a href="#/user/affiliate-partner"
                  className="inline-block mt-5 rounded-xl px-5 py-2.5 font-medium text-[15px] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent, color: '#fff' }}>
                  Go to Affiliate Partner
                </a>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
