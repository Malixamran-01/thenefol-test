import React, { useState, useEffect } from 'react'
import { ArrowLeft, Video, Lock, CheckCircle, X, Plus, Trash2, Instagram, ExternalLink, RefreshCw } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

const AFFILIATE_VIEWS_THRESHOLD = 10_000
const AFFILIATE_LIKES_THRESHOLD = 500

const NEFOL_KEYWORDS = ['#nefol', '#neföl', 'nefol', 'neföl']

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

interface ReelInput {
  reel_url: string
  instagram_handle: string
}

interface Reel {
  id: number
  reel_url: string
  instagram_username: string
  views_count: number
  likes_count: number
  caption_ok: boolean
  date_ok: boolean
  rejection_reason?: string
  reel_posted_at?: string
}

export default function Collab() {
  const { isAuthenticated, user } = useAuth()
  const [showForm, setShowForm] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<CollabStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [reelInputs, setReelInputs] = useState<ReelInput[]>([{ reel_url: '', instagram_handle: '' }])
  const [submittingReel, setSubmittingReel] = useState(false)
  const [reelError, setReelError] = useState('')
  const [reels, setReels] = useState<Reel[]>([])
  const [instagramHandles, setInstagramHandles] = useState<string[]>([''])
  const [igConnecting, setIgConnecting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    followers: '',
    platform: '',
    agreeTerms: false,
  })

  // Check for OAuth result params in URL
  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('ig_connected=1')) {
      // Remove param from URL cleanly
      window.location.hash = '/user/collab'
      // Will refetch below
    }
    if (hash.includes('ig_error=')) {
      const match = hash.match(/ig_error=([^&]+)/)
      if (match) {
        const msg = decodeURIComponent(match[1])
        setReelError(`Instagram connection failed: ${msg}`)
        window.location.hash = '/user/collab'
      }
    }
  }, [])

  const fetchStatus = async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const token = localStorage.getItem('token')
      const queryEmail = user?.email ? `?email=${encodeURIComponent(user.email)}` : ''
      const res = await fetch(`${getApiBase()}/api/collab/status${queryEmail}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
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
        setReels(Array.isArray(data.reels) ? data.reels : [])

        if (handles.length > 0) {
          setInstagramHandles(handles)
          setReelInputs([{ reel_url: '', instagram_handle: handles[0] }])
        }
        if (data.id) {
          setSubmitted(true)
          setShowForm(false)
        }
      }
    } catch (e) {
      console.error('Collab status fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [isAuthenticated, user?.email])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedHandles = instagramHandles
      .map((h) => h.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean)
    if (!formData.name || !formData.email || !formData.phone || normalizedHandles.length === 0) {
      alert('Please fill required fields: Name, Email, Phone, and at least one Instagram handle.')
      return
    }
    if (!formData.agreeTerms) { alert('Please agree to the terms.'); return }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${getApiBase()}/api/collab/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          ...formData,
          instagram: normalizedHandles[0],
          instagram_handles: normalizedHandles,
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        const appId = data?.application?.id
        setSubmitted(true)
        setShowForm(false)
        setStatus((s) =>
          s
            ? { ...s, id: appId || s.id, hasApplication: true, status: 'pending', instagramHandles: normalizedHandles }
            : {
                id: appId,
                status: 'pending',
                hasApplication: true,
                totalViews: 0,
                totalLikes: 0,
                progressPercent: 0,
                affiliateUnlocked: false,
                instagramHandles: normalizedHandles,
                instagramConnected: false,
                igUsername: null,
                collabJoinedAt: new Date().toISOString(),
              }
        )
        setReelInputs([{ reel_url: '', instagram_handle: normalizedHandles[0] }])
        alert('Application submitted! Please connect your Instagram account using the button below.')
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err?.message || 'Failed to submit.')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to submit. Please try again.')
    }
  }

  const handleConnectInstagram = () => {
    if (!status?.id) { alert('Submit your collab application first.'); return }
    setIgConnecting(true)
    window.location.href = `${getApiBase()}/api/instagram/connect?collab_id=${status.id}`
  }

  const handleDisconnectInstagram = async () => {
    if (!status?.id || !confirm('Disconnect your Instagram account from this collab?')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`${getApiBase()}/api/instagram/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ collab_id: status.id }),
      })
      setStatus((s) => s ? { ...s, instagramConnected: false, igUsername: null } : s)
    } catch (e) {
      alert('Failed to disconnect. Please try again.')
    }
  }

  const handleReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setReelError('')
    if (!status?.id) { setReelError('Submit your collab application first.'); return }
    if (!isApproved) { setReelError('Waiting for admin approval.'); return }
    if (!status.instagramConnected) {
      setReelError('Connect your Instagram account first using the button above.')
      return
    }

    const payload = reelInputs
      .map((r) => ({
        reel_url: r.reel_url.trim(),
        instagram_handle: r.instagram_handle.trim().replace(/^@/, '').toLowerCase(),
      }))
      .filter((r) => r.reel_url)

    if (payload.length === 0) { setReelError('Add at least one reel link.'); return }

    const invalid = payload.find((r) => !r.reel_url || !r.instagram_handle)
    if (invalid) { setReelError('Each row needs both a handle and reel URL.'); return }

    const badUrl = payload.find((r) => !r.reel_url.includes('instagram.com') && !r.reel_url.includes('instagr.am'))
    if (badUrl) { setReelError('All links must be valid Instagram reel URLs.'); return }

    const noShortcode = payload.find((r) => !/\/reel\/[A-Za-z0-9_-]+/.test(r.reel_url))
    if (noShortcode) { setReelError('Please use direct reel URLs (e.g. https://www.instagram.com/reel/...)'); return }

    setSubmittingReel(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ collab_id: status.id, reel_urls: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus((s) =>
          s
            ? {
                ...s,
                totalViews: data.total_views ?? s.totalViews,
                totalLikes: data.total_likes ?? s.totalLikes,
                progressPercent: data.progress ?? s.progressPercent,
                affiliateUnlocked: !!data.affiliate_unlocked,
              }
            : null
        )
        setReelInputs([{ reel_url: '', instagram_handle: status.instagramHandles[0] || '' }])
        await fetchStatus()
      } else {
        setReelError(data?.message || 'Could not submit reel.')
      }
    } catch {
      setReelError('Request failed. Please try again.')
    } finally {
      setSubmittingReel(false)
    }
  }

  const progress = status?.progressPercent ?? 0
  const affiliateUnlocked = status?.affiliateUnlocked ?? false
  const isApproved = status?.status === 'approved'

  const pageBg = '#F4F9F9'
  const cardBg = '#FFFFFF'
  const cardShadow = '0 2px 12px rgba(14, 39, 48, 0.06)'
  const borderColor = '#E8E4DE'
  const textPrimary = '#1a1a1a'
  const textMuted = '#6b7280'
  const accent = '#4B97C9'
  const igPink = '#E1306C'

  const addInstagramHandle = () => setInstagramHandles((prev) => [...prev, ''])
  const removeInstagramHandle = (index: number) => setInstagramHandles((prev) => prev.filter((_, idx) => idx !== index))
  const updateInstagramHandle = (index: number, value: string) =>
    setInstagramHandles((prev) => prev.map((item, idx) => (idx === index ? value : item)))

  const addReelInput = () =>
    setReelInputs((prev) => [...prev, { reel_url: '', instagram_handle: status?.instagramHandles?.[0] || '' }])
  const removeReelInput = (index: number) =>
    setReelInputs((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)))
  const updateReelInput = (index: number, patch: Partial<ReelInput>) =>
    setReelInputs((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)))

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen py-16 px-4" style={{ backgroundColor: pageBg }}>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: textPrimary }}>Sign in to apply for Collab</h1>
          <p className="mb-6" style={{ color: textMuted }}>You need to be signed in to join our creator collab program.</p>
          <a
            href="#/user/login"
            onClick={() => sessionStorage.setItem('post_login_redirect', '#/user/collab')}
            className="inline-block rounded-xl px-6 py-3 font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent, color: '#fff' }}
          >
            Sign in
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:py-16" style={{ backgroundColor: pageBg, fontFamily: 'var(--font-body-family)' }}>
      <div className="mx-auto max-w-2xl">
        <a href="#/user/" className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80" style={{ color: textMuted }}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </a>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight" style={{ color: textPrimary, fontFamily: 'var(--font-heading-family)' }}>
          Creator Collab Program
        </h1>
        <p className="mb-8 text-base sm:text-lg leading-relaxed" style={{ color: textMuted }}>
          Create reels featuring NEFOL products, submit reel links, and track your progress toward the Affiliate Program.
          Reach <strong>10,000 views</strong> and <strong>500 likes</strong> combined across your reels to unlock Affiliate status.
        </p>

        {/* Requirements callout */}
        <div className="mb-8 p-4 rounded-xl text-sm" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          <strong>Reel Requirements:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            <li>Reel must be posted <strong>after</strong> you join the collab program</li>
            <li>Caption or hashtags must include <strong>#nefol</strong> or <strong>#neföl</strong></li>
            <li>Reel must be from your <strong>connected Instagram account</strong></li>
          </ul>
        </div>

        {loading ? (
          <div className="py-16 text-center" style={{ color: textMuted }}>Loading...</div>
        ) : (
          <>
            {/* Status banner */}
            {!showForm && status?.hasApplication && (
              <section
                className="mb-6 p-5 rounded-2xl flex items-start gap-4"
                style={{
                  backgroundColor: status.status === 'approved' ? '#f0fdf4' : status.status === 'rejected' ? '#fef2f2' : '#fff9eb',
                  border: `1px solid ${status.status === 'approved' ? '#bbf7d0' : status.status === 'rejected' ? '#fecaca' : '#f5d48b'}`,
                }}
              >
                {status.status === 'approved'
                  ? <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-600" />
                  : status.status === 'rejected'
                  ? <X className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
                  : <Video className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" />}
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: status.status === 'approved' ? '#166534' : status.status === 'rejected' ? '#991b1b' : '#8a5a00' }}>
                    {status.status === 'approved' ? 'Application Approved!'
                      : status.status === 'rejected' ? 'Application Rejected'
                      : 'Application Pending Review'}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: status.status === 'approved' ? '#166534' : status.status === 'rejected' ? '#991b1b' : '#8a5a00' }}>
                    {status.status === 'approved'
                      ? 'Connect your Instagram account and start submitting reel links.'
                      : status.status === 'rejected'
                      ? 'Your application was rejected. You may re-apply below.'
                      : "We'll review your application and reach out on Instagram."}
                  </p>
                  {status.status === 'rejected' && (
                    <button onClick={() => { setShowForm(true); setSubmitted(false) }} className="mt-2 text-sm font-medium underline" style={{ color: '#991b1b' }}>
                      Re-apply
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Application form */}
            {showForm && (
              <section className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: textPrimary }}>Step 1 — Your details</h2>
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {[
                      { label: 'Name *', name: 'name', type: 'text', placeholder: 'Your full name' },
                      { label: 'Email *', name: 'email', type: 'email', placeholder: 'you@email.com' },
                      { label: 'Phone *', name: 'phone', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>{field.label}</label>
                        <input
                          type={field.type}
                          name={field.name}
                          value={(formData as any)[field.name]}
                          onChange={handleInputChange}
                          required
                          placeholder={field.placeholder}
                          className="w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9]"
                          style={{ borderColor: '#E5E2DC', color: textPrimary }}
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Instagram handle(s) *</label>
                      <div className="space-y-2">
                        {instagramHandles.map((handle, index) => (
                          <div key={`handle-${index}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="@username"
                              value={handle}
                              onChange={(e) => updateInstagramHandle(index, e.target.value)}
                              required={index === 0}
                              className="w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9] placeholder:text-gray-400"
                              style={{ borderColor: '#E5E2DC', color: textPrimary }}
                            />
                            {instagramHandles.length > 1 && (
                              <button type="button" onClick={() => removeInstagramHandle(index)} className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: '#E5E2DC', color: textMuted }}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            {index === instagramHandles.length - 1 && (
                              <button type="button" onClick={addInstagramHandle} className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: '#E5E2DC', color: accent }}>
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {[
                      { label: 'Follower count (approx)', name: 'followers', placeholder: 'e.g. 5000' },
                      { label: 'Primary platform', name: 'platform', placeholder: 'e.g. Reels, Stories' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>{field.label}</label>
                        <input
                          type="text"
                          name={field.name}
                          placeholder={field.placeholder}
                          value={(formData as any)[field.name]}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9] placeholder:text-gray-400"
                          style={{ borderColor: '#E5E2DC', color: textPrimary }}
                        />
                      </div>
                    ))}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleInputChange} className="mt-1 rounded" />
                      <span className="text-sm leading-relaxed" style={{ color: textMuted }}>
                        I agree to be contacted for collab on Instagram and to create content featuring NEFOL products. I understand reels must include #nefol or #neföl in the caption.
                      </span>
                    </label>

                    <button type="submit" className="w-full rounded-xl px-4 py-3.5 font-semibold text-[15px] transition-opacity hover:opacity-90" style={{ backgroundColor: accent, color: '#fff' }}>
                      Submit Collab Application
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <span className="text-[15px]" style={{ color: textPrimary }}>Application submitted. Connect your Instagram below.</span>
                  </div>
                )}
              </section>
            )}

            {/* Step 2: Connect Instagram */}
            {submitted && (
              <section className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: textPrimary }}>
                  <Instagram className="h-5 w-5" style={{ color: igPink }} />
                  Step 2 — Connect your Instagram account
                </h2>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: textMuted }}>
                  Connect your <strong>Instagram Professional/Creator</strong> account linked to a Facebook Page. This is required to verify your reels and fetch real view/like data.
                </p>

                {status?.instagramConnected && status.igUsername ? (
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-sm text-emerald-800">Connected as @{status.igUsername}</p>
                        <a
                          href={`https://www.instagram.com/${status.igUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-700 underline flex items-center gap-1"
                        >
                          View profile <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectInstagram}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={handleConnectInstagram}
                      disabled={igConnecting}
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: igPink, color: '#fff' }}
                    >
                      <Instagram className="h-5 w-5" />
                      {igConnecting ? 'Redirecting...' : 'Connect Instagram Account'}
                    </button>
                    <p className="mt-3 text-xs" style={{ color: textMuted }}>
                      Requires a Professional/Creator Instagram account linked to a Facebook Page. You'll be redirected to Meta's login.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Step 3: Submit Reels */}
            {submitted && (
              <section className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
                {!isApproved && (
                  <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#f5d48b', backgroundColor: '#fff9eb', color: '#8a5a00' }}>
                    {status?.status === 'rejected'
                      ? 'Your application was rejected. Please re-apply.'
                      : 'Waiting for admin approval. Once approved, you can start submitting reels.'}
                  </div>
                )}

                {isApproved && !status?.instagramConnected && (
                  <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#991b1b' }}>
                    Connect your Instagram account (Step 2) before submitting reels.
                  </div>
                )}

                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: textPrimary }}>
                  <Video className="h-5 w-5" style={{ color: accent }} />
                  Step 3 — Submit your reel links
                </h2>

                <div className="mb-4 p-3 rounded-xl text-xs" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: textMuted }}>
                  <strong>Rules:</strong> Reel must be posted after {status?.collabJoinedAt ? new Date(status.collabJoinedAt).toLocaleDateString() : 'joining'} · Caption must include {NEFOL_KEYWORDS.filter(k => k.startsWith('#')).join(' or ')} · Must be from your connected IG account
                </div>

                <form onSubmit={handleReelSubmit} className="space-y-4">
                  {reelInputs.map((row, index) => (
                    <div key={`reel-${index}`} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2">
                      <select
                        value={row.instagram_handle}
                        onChange={(e) => updateReelInput(index, { instagram_handle: e.target.value })}
                        disabled={!isApproved}
                        className="rounded-xl border px-3 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9]"
                        style={{ borderColor: '#E5E2DC', color: textPrimary }}
                      >
                        <option value="">Select handle</option>
                        {(status?.instagramHandles || []).map((handle) => (
                          <option key={handle} value={handle}>@{handle}</option>
                        ))}
                      </select>
                      <input
                        type="url"
                        placeholder="https://www.instagram.com/reel/..."
                        value={row.reel_url}
                        onChange={(e) => updateReelInput(index, { reel_url: e.target.value })}
                        disabled={!isApproved}
                        className="w-full rounded-xl border px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9] placeholder:text-gray-400"
                        style={{ borderColor: '#E5E2DC', color: textPrimary }}
                      />
                      <div className="flex items-center gap-2">
                        {reelInputs.length > 1 && (
                          <button type="button" onClick={() => removeReelInput(index)} disabled={!isApproved} className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: '#E5E2DC', color: textMuted }}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {index === reelInputs.length - 1 && (
                          <button type="button" onClick={addReelInput} disabled={!isApproved} className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: '#E5E2DC', color: accent }}>
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {reelError && (
                    <p className="text-sm text-red-600 flex items-start gap-2">
                      <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {reelError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReel || !isApproved || !status?.instagramConnected}
                    className="rounded-xl px-5 py-2.5 font-medium text-[15px] disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent, color: '#fff' }}
                  >
                    {!isApproved ? 'Waiting for Approval' : !status?.instagramConnected ? 'Connect Instagram First' : submittingReel ? 'Verifying with Instagram...' : 'Submit Reel'}
                  </button>
                </form>

                {/* Submitted reels list */}
                {reels.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Submitted Reels ({reels.length})</h3>
                      <button onClick={fetchStatus} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700">
                        <RefreshCw className="h-3 w-3" /> Refresh
                      </button>
                    </div>
                    {reels.map((reel) => (
                      <div key={reel.id} className="p-3 rounded-xl border text-xs" style={{ borderColor: borderColor, backgroundColor: '#fafafa' }}>
                        <div className="flex items-start justify-between gap-2">
                          <a href={reel.reel_url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate flex-1">
                            {reel.reel_url}
                          </a>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                            reel.caption_ok && reel.date_ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {reel.caption_ok && reel.date_ok ? 'Eligible' : 'Not eligible'}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1.5 text-gray-600">
                          <span>👁 {(reel.views_count || 0).toLocaleString()} views</span>
                          <span>❤️ {(reel.likes_count || 0).toLocaleString()} likes</span>
                          <span>@{reel.instagram_username}</span>
                        </div>
                        {(!reel.caption_ok || !reel.date_ok) && (
                          <p className="mt-1 text-red-600">
                            {!reel.date_ok ? 'Posted before you joined collab.' : ''}
                            {!reel.caption_ok ? ' Caption missing #nefol or #neföl.' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Progress section */}
            <section className="p-6 sm:p-8 rounded-2xl" style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: textPrimary }}>
                {affiliateUnlocked
                  ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                  : <Lock className="h-5 w-5 text-amber-500" />}
                Progress to Affiliate
              </h2>

              {/* Views progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: textMuted }}>
                  <span>Views</span>
                  <span>{(status?.totalViews ?? 0).toLocaleString()} / {AFFILIATE_VIEWS_THRESHOLD.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E4DE' }}>
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, ((status?.totalViews ?? 0) / AFFILIATE_VIEWS_THRESHOLD) * 100)}%`,
                      backgroundColor: affiliateUnlocked ? '#10b981' : accent,
                    }}
                  />
                </div>
              </div>

              {/* Likes progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: textMuted }}>
                  <span>Likes</span>
                  <span>{(status?.totalLikes ?? 0).toLocaleString()} / {AFFILIATE_LIKES_THRESHOLD.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E4DE' }}>
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, ((status?.totalLikes ?? 0) / AFFILIATE_LIKES_THRESHOLD) * 100)}%`,
                      backgroundColor: affiliateUnlocked ? '#10b981' : '#e879a0',
                    }}
                  />
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#E8E4DE' }}>
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, progress)}%`,
                    backgroundColor: affiliateUnlocked ? '#10b981' : accent,
                  }}
                />
              </div>

              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {affiliateUnlocked
                  ? 'Affiliate Program unlocked! You can now apply from Join Us.'
                  : `Reach ${AFFILIATE_VIEWS_THRESHOLD.toLocaleString()} views AND ${AFFILIATE_LIKES_THRESHOLD.toLocaleString()} likes across eligible reels to unlock Affiliate.`}
              </p>
              {!affiliateUnlocked && (status?.totalViews ?? 0) > 0 && (
                <p className="text-xs mt-1" style={{ color: textMuted }}>
                  Only reels posted after joining with #nefol in the caption count toward your milestone.
                </p>
              )}
              {affiliateUnlocked && (
                <a
                  href="#/user/affiliate-partner"
                  onClick={() => sessionStorage.setItem('affiliate_referrer', 'home')}
                  className="inline-block mt-5 rounded-xl px-5 py-2.5 font-medium text-[15px] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent, color: '#fff' }}
                >
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
