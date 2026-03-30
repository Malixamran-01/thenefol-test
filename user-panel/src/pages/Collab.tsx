import React, { useState, useEffect } from 'react'
import {
  ArrowLeft, Video, Lock, CheckCircle, X, Instagram, ExternalLink,
  RefreshCw, Play, Heart, AlertCircle, Loader2, Eye, Sparkles, TrendingUp,
  Clapperboard, Zap, ChevronRight, Star, Award
} from 'lucide-react'
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

// Circular SVG progress ring
function Ring({ pct, color, size = 80, stroke = 7 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(1, pct) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

export default function Collab() {
  const { isAuthenticated, user } = useAuth()
  const [showForm, setShowForm] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<CollabStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittedReels, setSubmittedReels] = useState<SubmittedReel[]>([])
  const [igConnecting, setIgConnecting] = useState(false)

  const [syncedReels, setSyncedReels] = useState<SyncedReel[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [selectedReels, setSelectedReels] = useState<Set<string>>(new Set())
  const [submittingSelected, setSubmittingSelected] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success?: string; error?: string } | null>(null)

  const [instagramHandles, setInstagramHandles] = useState<string[]>([''])
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', followers: '', agreeTerms: false })

  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('ig_connected=1')) window.location.hash = '/user/collab'
    if (hash.includes('ig_error=')) {
      const match = hash.match(/ig_error=([^&]+)/)
      if (match) { setSyncError(`Instagram connection failed: ${decodeURIComponent(match[1])}`); window.location.hash = '/user/collab' }
    }
  }, [])

  const token = () => localStorage.getItem('token') || ''
  const authHeaders = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) })

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
          id: data.id, status: data.status, hasApplication: !!data.id,
          totalViews: data.total_views ?? 0, totalLikes: data.total_likes ?? 0,
          progressPercent: data.progress ?? 0, affiliateUnlocked: !!data.affiliate_unlocked,
          instagramHandles: handles, instagramConnected: !!data.instagram_connected,
          igUsername: data.ig_username || null, collabJoinedAt: data.collab_joined_at || null,
        })
        setSubmittedReels(Array.isArray(data.reels) ? data.reels : [])
        if (handles.length > 0) setInstagramHandles(handles)
        if (data.id) { setSubmitted(true); setShowForm(false) }
      }
    } catch (e) { console.error('Collab status fetch failed:', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStatus() }, [isAuthenticated, user?.email])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const handles = instagramHandles.map((h) => h.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
    if (!formData.name || !formData.email || !formData.phone || !handles.length)
      return alert('Please fill in: Name, Email, Phone, and at least one Instagram handle.')
    if (!formData.agreeTerms) return alert('Please agree to the terms.')
    const res = await fetch(`${getApiBase()}/api/collab/apply`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ ...formData, instagram: handles[0], instagram_handles: handles }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setSubmitted(true); setShowForm(false)
      setStatus((s) => s
        ? { ...s, id: data?.application?.id || s.id, hasApplication: true, status: 'pending', instagramHandles: handles }
        : { id: data?.application?.id, status: 'pending', hasApplication: true, totalViews: 0, totalLikes: 0,
            progressPercent: 0, affiliateUnlocked: false, instagramHandles: handles,
            instagramConnected: false, igUsername: null, collabJoinedAt: new Date().toISOString() })
    } else { alert(data?.message || 'Failed to submit. Please try again.') }
  }

  const handleConnectInstagram = () => {
    if (!status?.id) return alert('Submit your collab application first.')
    setIgConnecting(true)
    window.location.href = `${getApiBase()}/api/instagram/connect?collab_id=${status.id}`
  }

  const handleDisconnectInstagram = async () => {
    if (!status?.id || !confirm('Disconnect Instagram from this collab?')) return
    await fetch(`${getApiBase()}/api/instagram/disconnect`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ collab_id: status.id }) })
    setStatus((s) => s ? { ...s, instagramConnected: false, igUsername: null } : s)
    setSyncedReels([]); setSelectedReels(new Set())
  }

  const syncReels = async () => {
    if (!status?.id) return
    setSyncing(true); setSyncError(''); setSyncedReels([]); setSelectedReels(new Set()); setSubmitResult(null)
    try {
      const res = await fetch(`${getApiBase()}/api/instagram/reels?collab_id=${status.id}`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSyncError(data?.message || 'Failed to sync reels.'); return }
      const reels: SyncedReel[] = data.reels || []
      setSyncedReels(reels)
      const autoSelect = new Set<string>()
      reels.forEach((r) => { if (r.eligible && !r.already_submitted) autoSelect.add(r.media_id) })
      setSelectedReels(autoSelect)
      if (reels.length === 0) setSyncError('No reels found on your Instagram account.')
    } catch { setSyncError('Could not reach Instagram. Please try again.') }
    finally { setSyncing(false) }
  }

  const toggleSelect = (mediaId: string) => {
    setSelectedReels((prev) => { const n = new Set(prev); n.has(mediaId) ? n.delete(mediaId) : n.add(mediaId); return n })
  }

  const submitSelected = async () => {
    if (!status?.id || selectedReels.size === 0) return
    setSubmittingSelected(true); setSubmitResult(null)
    const toSubmit = syncedReels.filter((r) => selectedReels.has(r.media_id)).map((r) => ({
      reel_url: r.reel_url,
      instagram_handle: status.igUsername || status.instagramHandles[0] || '',
      prefetched: { views: r.views, likes: r.likes, postedAt: r.timestamp, caption: r.caption, caption_ok: r.caption_ok, date_ok: r.date_ok },
    }))
    try {
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ collab_id: status.id, reel_urls: toSubmit }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSubmitResult({ success: `${selectedReels.size} reel${selectedReels.size > 1 ? 's' : ''} submitted!` })
        setStatus((s) => s ? { ...s, totalViews: data.total_views ?? s.totalViews, totalLikes: data.total_likes ?? s.totalLikes, progressPercent: data.progress ?? s.progressPercent, affiliateUnlocked: !!data.affiliate_unlocked } : s)
        await fetchStatus(); setSyncedReels([]); setSelectedReels(new Set())
      } else { setSubmitResult({ error: data?.message || 'Submission failed.' }) }
    } catch { setSubmitResult({ error: 'Request failed. Please try again.' }) }
    finally { setSubmittingSelected(false) }
  }

  const isApproved = status?.status === 'approved'
  const totalViews = status?.totalViews ?? 0
  const totalLikes = status?.totalLikes ?? 0
  const affiliateUnlocked = status?.affiliateUnlocked ?? false
  const viewsPct = Math.min(1, totalViews / AFFILIATE_VIEWS_THRESHOLD)
  const likesPct = Math.min(1, totalLikes / AFFILIATE_LIKES_THRESHOLD)
  const eligibleCount = syncedReels.filter((r) => r.eligible && !r.already_submitted).length
  const ineligibleCount = syncedReels.filter((r) => !r.eligible).length

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--arctic-blue-background, #F4F9F9)' }}>
        <div className="text-center max-w-md">
          <Clapperboard className="h-10 w-10 mx-auto mb-6" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
          <h1 className="text-3xl font-light mb-3 tracking-[0.12em]" style={{ fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}>Creator Collab</h1>
          <p className="text-sm font-light tracking-wide mb-8" style={{ color: '#888', letterSpacing: '0.04em' }}>Sign in to join our creator program and track your affiliate progress.</p>
          <a href="#/user/login" onClick={() => sessionStorage.setItem('post_login_redirect', '#/user/collab')}
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-light tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--arctic-blue-primary, #4B97C9)', color: '#fff', letterSpacing: '0.1em' }}>
            Sign in <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--arctic-blue-background, #F4F9F9)', fontFamily: 'var(--font-body-family)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b" style={{ borderColor: '#eee' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <a href="#/user/" className="inline-flex items-center gap-1.5 text-xs font-light tracking-widest uppercase mb-10 transition-colors hover:opacity-60"
            style={{ color: '#aaa', letterSpacing: '0.1em' }}>
            <ArrowLeft className="h-3 w-3" /> Back
          </a>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border"
                style={{ borderColor: '#e8f4fb', backgroundColor: '#f0f8fd' }}>
                <Clapperboard className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase font-medium mb-1" style={{ color: '#bbb' }}>Nefol</p>
                <h1 className="text-2xl sm:text-3xl font-light tracking-[0.12em]"
                  style={{ fontFamily: 'var(--font-heading-family)', color: '#1a1a1a', letterSpacing: '0.12em' }}>
                  Creator Collab Program
                </h1>
                <p className="text-xs font-light tracking-wide mt-1.5" style={{ color: '#999', letterSpacing: '0.04em' }}>
                  Post reels featuring NEFOL · Reach 10K views &amp; 500 likes · Unlock Affiliate
                </p>
              </div>
            </div>

            {/* Status pill */}
            {submitted && status && (
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide ${
                  affiliateUnlocked ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : status.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  {affiliateUnlocked ? <><Award className="h-3.5 w-3.5" /> Affiliate Unlocked</>
                    : status.status === 'approved' ? <><CheckCircle className="h-3.5 w-3.5" /> Approved</>
                    : status.status === 'rejected' ? <><X className="h-3.5 w-3.5" /> Not Approved</>
                    : <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pending Review</>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">

          {/* ── Application form (not yet applied) ─────────────────────────── */}
          {showForm && (
            <div className="max-w-xl mx-auto">
              {/* Requirements */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: <Clapperboard className="h-4 w-4" />, label: 'Post after joining', color: '#4B97C9' },
                  { icon: <Zap className="h-4 w-4" />, label: 'Include #nefol', color: '#E1306C' },
                  { icon: <TrendingUp className="h-4 w-4" />, label: '10K views + 500 likes', color: '#10b981' },
                ].map((r) => (
                  <div key={r.label} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: r.color + '15', color: r.color }}>
                      {r.icon}
                    </div>
                    <p className="text-xs text-gray-600 leading-tight font-medium">{r.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-heading-family)' }}>Apply to join</h2>
                <p className="text-sm text-gray-500 mb-7">Fill in your details and we'll review your application within 2-3 days.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { label: 'Full name', name: 'name', type: 'text', placeholder: 'Your name' },
                      { label: 'Email', name: 'email', type: 'email', placeholder: 'you@email.com' },
                      { label: 'Phone', name: 'phone', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                    ].map((f) => (
                      <div key={f.name} className={f.name === 'name' ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{f.label}</label>
                        <input type={f.type} name={f.name} value={(formData as any)[f.name]} onChange={handleInputChange}
                          placeholder={f.placeholder} required
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all" />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Instagram handle(s)</label>
                    <div className="space-y-2">
                      {instagramHandles.map((handle, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="username" value={handle}
                              onChange={(e) => setInstagramHandles((p) => p.map((h, i) => i === idx ? e.target.value : h))}
                              required={idx === 0}
                              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all" />
                          </div>
                          {instagramHandles.length > 1 && (
                            <button type="button" onClick={() => setInstagramHandles((p) => p.filter((_, i) => i !== idx))}
                              className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setInstagramHandles((p) => [...p, ''])}
                        className="text-xs font-medium text-[#4B97C9] hover:opacity-80 transition-opacity">
                        + Add another handle
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer select-none p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleInputChange} className="mt-0.5 h-4 w-4 rounded accent-[#4B97C9]" />
                    <span className="text-sm text-gray-600 leading-relaxed">
                      I agree to create content featuring NEFOL products and include <strong className="text-gray-800">#nefol</strong> in my reel captions.
                    </span>
                  </label>

                  <button type="submit"
                    className="w-full rounded-xl py-3.5 font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, #4B97C9, #357aad)' }}>
                    Submit Application
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── Dashboard (after applying) ──────────────────────────────────── */}
          {submitted && status && (
            <div className="space-y-5">

              {/* Rejected banner */}
              {status.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 text-sm">Application not approved</p>
                    <p className="text-red-600 text-xs mt-0.5">You can re-apply with updated details.</p>
                  </div>
                  <button onClick={() => { setShowForm(true); setSubmitted(false) }}
                    className="text-xs font-semibold text-red-700 underline flex-shrink-0">Re-apply</button>
                </div>
              )}

              {/* Top row: Progress + IG Connection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Views progress */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <Ring pct={viewsPct} color="#4B97C9" size={72} stroke={6} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-[#4B97C9]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Views</p>
                    <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">of {AFFILIATE_VIEWS_THRESHOLD.toLocaleString()}</p>
                  </div>
                </div>

                {/* Likes progress */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <Ring pct={likesPct} color="#E1306C" size={72} stroke={6} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-[#E1306C]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Likes</p>
                    <p className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">of {AFFILIATE_LIKES_THRESHOLD.toLocaleString()}</p>
                  </div>
                </div>

                {/* IG Connection */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Instagram</p>
                  {status.instagramConnected && status.igUsername ? (
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                          <Instagram className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">@{status.igUsername}</p>
                          <p className="text-xs text-emerald-600">Connected</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a href={`https://www.instagram.com/${status.igUsername}`} target="_blank" rel="noreferrer"
                          className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700 transition-colors">
                          <ExternalLink className="h-3 w-3" /> Profile
                        </a>
                        <button onClick={handleDisconnectInstagram} className="text-xs text-red-400 hover:text-red-600 transition-colors">Disconnect</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 mb-3 leading-relaxed">Connect your Creator or Business account to sync reels.</p>
                      <button onClick={handleConnectInstagram} disabled={igConnecting || !status.id}
                        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366)' }}>
                        <Instagram className="h-4 w-4" />
                        {igConnecting ? 'Redirecting...' : 'Connect Instagram'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Affiliate unlocked banner */}
              {affiliateUnlocked && (
                <div className="rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-lg">Affiliate Program Unlocked!</p>
                    <p className="text-amber-100 text-sm">You've hit the milestone. Apply for affiliate partnership now.</p>
                  </div>
                  <a href="#/user/affiliate-partner"
                    className="flex-shrink-0 bg-white rounded-xl px-5 py-2.5 text-sm font-bold text-amber-700 hover:opacity-90 transition-opacity">
                    Apply Now
                  </a>
                </div>
              )}

              {/* Pending approval notice */}
              {status.status === 'pending' && (
                <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Application under review</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">We'll review your application and reach out on Instagram within 2-3 days. You can connect your Instagram account now while you wait.</p>
                  </div>
                </div>
              )}

              {/* Reels section — only when approved */}
              {isApproved && status.instagramConnected && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#4B97C9]/10 flex items-center justify-center">
                        <Video className="h-4 w-4 text-[#4B97C9]" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-base">Sync Reels</h2>
                        <p className="text-xs text-gray-400">Fetch from Instagram and submit eligible reels</p>
                      </div>
                    </div>
                    <button onClick={syncReels} disabled={syncing}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #4B97C9, #357aad)' }}>
                      {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</> : <><RefreshCw className="h-4 w-4" /> Sync from Instagram</>}
                    </button>
                  </div>

                  {syncError && !syncError.includes('connection failed') && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" /> {syncError}
                    </div>
                  )}

                  {/* Picker */}
                  {syncedReels.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 text-xs">
                          {eligibleCount > 0 && <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{eligibleCount} eligible</span>}
                          {ineligibleCount > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">{ineligibleCount} ineligible</span>}
                        </div>
                        <div className="flex gap-3 text-xs font-medium text-[#4B97C9]">
                          <button onClick={() => setSelectedReels(new Set(syncedReels.filter((r) => r.eligible && !r.already_submitted).map((r) => r.media_id)))}>Select all</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setSelectedReels(new Set())} className="text-gray-400">Clear</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                        {syncedReels.map((reel) => {
                          const isSelected = selectedReels.has(reel.media_id)
                          const isDisabled = reel.already_submitted || !reel.eligible
                          return (
                            <div key={reel.media_id} onClick={() => !isDisabled && toggleSelect(reel.media_id)}
                              className={`relative rounded-2xl overflow-hidden border transition-all ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'} ${isSelected ? 'border-[#4B97C9] ring-2 ring-[#4B97C9]/30' : 'border-gray-100'}`}>

                              {/* Thumbnail */}
                              <div className="relative h-32 bg-gray-100">
                                {reel.thumbnail_url
                                  ? <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center bg-gray-100"><Play className="h-8 w-8 text-gray-300" /></div>}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                {/* Top-right badge */}
                                <div className="absolute top-2 right-2">
                                  {reel.already_submitted
                                    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">Submitted</span>
                                    : reel.eligible
                                    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">Eligible</span>
                                    : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">Ineligible</span>}
                                </div>

                                {/* Checkbox */}
                                {!isDisabled && (
                                  <div className="absolute top-2 left-2">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#4B97C9] border-[#4B97C9]' : 'bg-white/80 border-white/80'}`}>
                                      {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                  </div>
                                )}

                                {/* Bottom stats overlay */}
                                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs font-medium">
                                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{reel.views.toLocaleString()}</span>
                                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{reel.likes.toLocaleString()}</span>
                                  <span className="ml-auto">{new Date(reel.timestamp).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {/* Caption + reason */}
                              <div className="px-3 py-2.5">
                                {reel.caption
                                  ? <p className="text-xs text-gray-600 truncate">{reel.caption}</p>
                                  : <p className="text-xs text-gray-400 italic">No caption</p>}
                                {!reel.eligible && !reel.already_submitted && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {!reel.date_ok && 'Posted before joining. '}
                                    {!reel.caption_ok && 'Missing #nefol.'}
                                  </p>
                                )}
                                <a href={reel.reel_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-[#4B97C9] flex items-center gap-0.5 mt-1 hover:opacity-80">
                                  <ExternalLink className="h-2.5 w-2.5" /> View on Instagram
                                </a>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {selectedReels.size > 0 && (
                        <div className="mt-4 flex items-center gap-4">
                          <button onClick={submitSelected} disabled={submittingSelected}
                            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            {submittingSelected
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                              : <><CheckCircle className="h-4 w-4" /> Submit {selectedReels.size} reel{selectedReels.size > 1 ? 's' : ''}</>}
                          </button>
                          <span className="text-sm text-gray-400">{selectedReels.size} selected</span>
                        </div>
                      )}

                      {submitResult && (
                        <div className={`mt-3 rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${submitResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {submitResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          {submitResult.success || submitResult.error}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Submitted reels */}
              {submittedReels.length > 0 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-base">Submitted Reels</h2>
                        <p className="text-xs text-gray-400">{submittedReels.length} reel{submittedReels.length > 1 ? 's' : ''} tracking</p>
                      </div>
                    </div>
                    <button onClick={fetchStatus} className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </div>

                  {submittedReels.some((r) => r.insights_pending) && (
                    <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-800">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                      <span><strong>{submittedReels.filter((r) => r.insights_pending).length} reel{submittedReels.filter((r) => r.insights_pending).length > 1 ? 's' : ''} still syncing</strong> — metrics update automatically every 8 hours.</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {submittedReels.map((reel) => {
                      const eligible = reel.caption_ok && reel.date_ok
                      return (
                        <div key={reel.id} className="flex items-center gap-4 rounded-2xl px-4 py-3.5 border"
                          style={{ borderColor: reel.insights_pending ? '#fde68a' : eligible ? '#d1fae5' : '#fecaca', backgroundColor: reel.insights_pending ? '#fffbeb' : eligible ? '#f0fdf4' : '#fef2f2' }}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reel.insights_pending ? 'bg-amber-400 animate-pulse' : eligible ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          <div className="flex-1 min-w-0">
                            <a href={reel.reel_url} target="_blank" rel="noreferrer"
                              className="text-xs font-medium text-[#4B97C9] underline truncate block">{reel.reel_url}</a>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {reel.insights_pending
                                ? <span className="italic text-amber-600">Syncing metrics...</span>
                                : <><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(reel.views_count || 0).toLocaleString()}</span>
                                   <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{(reel.likes_count || 0).toLocaleString()}</span>
                                   <span>@{reel.instagram_username}</span></>}
                            </div>
                            {!reel.insights_pending && !eligible && (
                              <p className="text-[10px] text-red-500 mt-0.5">
                                {!reel.date_ok && 'Posted before joining. '}
                                {!reel.caption_ok && 'Missing #nefol.'}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {reel.insights_pending
                              ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Syncing</span>
                              : <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{eligible ? 'Eligible' : 'Ineligible'}</span>}
                            <button
                              onClick={async () => {
                                if (!confirm('Remove this reel?')) return
                                await fetch(`${getApiBase()}/api/collab/reels/${reel.id}`, { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ collab_id: status?.id }) })
                                await fetchStatus()
                              }}
                              className="text-gray-300 hover:text-red-400 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Requirements reminder */}
              <div className="rounded-3xl p-6 border border-gray-100 bg-white shadow-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Eligibility rules</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: <Clapperboard className="h-4 w-4 text-[#4B97C9]" />, title: 'Timing', desc: 'Reel must be posted after your collab approval date', bg: '#eff8ff' },
                    { icon: <Zap className="h-4 w-4 text-[#E1306C]" />, title: 'Caption', desc: 'Must include #nefol or #neföl in the caption or hashtags', bg: '#fff0f5' },
                    { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, title: 'Target', desc: '10,000 views + 500 likes unlocks Affiliate status', bg: '#f0fdf4' },
                  ].map((r) => (
                    <div key={r.title} className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: r.bg }}>
                      <div className="flex-shrink-0 mt-0.5">{r.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 mb-0.5">{r.title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {syncError && syncError.includes('connection failed') && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-2xl border border-red-100">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {syncError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
