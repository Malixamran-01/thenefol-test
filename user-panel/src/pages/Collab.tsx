import React, { useState, useEffect } from 'react'
import { ArrowLeft, Video, Lock, CheckCircle, X, Plus, Trash2 } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

const AFFILIATE_VIEWS_THRESHOLD = 1000
const AFFILIATE_LIKES_THRESHOLD = 100

interface CollabStatus {
  id?: number
  hasApplication: boolean
  hasReel: boolean
  totalViews: number
  totalLikes: number
  progressPercent: number
  affiliateUnlocked: boolean
  instagramHandles: string[]
}

interface ReelInput {
  reel_url: string
  instagram_handle: string
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
  const [instagramHandles, setInstagramHandles] = useState<string[]>([''])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    followers: '',
    platform: '',
    agreeTerms: false,
  })

  useEffect(() => {
    const fetchStatus = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }
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
            hasApplication: !!data.id,
            hasReel: (data.total_views ?? 0) > 0 || (data.total_likes ?? 0) > 0,
            totalViews: data.total_views ?? 0,
            totalLikes: data.total_likes ?? 0,
            progressPercent: data.progress ?? 0,
            affiliateUnlocked: !!data.affiliate_unlocked,
            instagramHandles: handles,
          })
          if (handles.length > 0) {
            setInstagramHandles(handles)
            setReelInputs([{ reel_url: '', instagram_handle: handles[0] }])
          }
          setSubmitted(!!data.id)
        }
      } catch (e) {
        console.error('Collab status fetch failed:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [isAuthenticated, user?.email])

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
    if (!formData.agreeTerms) {
      alert('Please agree to the terms.')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${getApiBase()}/api/collab/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        setStatus((s) =>
          s
            ? { ...s, id: appId || s.id, hasApplication: true, instagramHandles: normalizedHandles }
            : {
                id: appId,
                hasApplication: true,
                hasReel: false,
                totalViews: 0,
                totalLikes: 0,
                progressPercent: 0,
                affiliateUnlocked: false,
                instagramHandles: normalizedHandles,
              }
        )
        setReelInputs([{ reel_url: '', instagram_handle: normalizedHandles[0] }])
        alert('Collab application submitted! We will reach out on Instagram soon. Next: create your reel and add the link below.')
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err?.message || 'Failed to submit.')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to submit. Please try again.')
    }
  }

  const handleReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setReelError('')
    if (!status?.id) {
      setReelError('Please submit collab application first.')
      return
    }
    const payload = reelInputs
      .map((r) => ({
        reel_url: r.reel_url.trim(),
        instagram_handle: r.instagram_handle.trim().replace(/^@/, '').toLowerCase(),
      }))
      .filter((r) => r.reel_url || r.instagram_handle)

    if (payload.length === 0) {
      setReelError('Please add at least one reel link.')
      return
    }

    const invalid = payload.find((r) => !r.reel_url || !r.instagram_handle)
    if (invalid) {
      setReelError('Each reel row needs both a handle and reel URL.')
      return
    }

    const badUrl = payload.find((r) => !r.reel_url.includes('instagram.com') && !r.reel_url.includes('instagr.am'))
    if (badUrl) {
      setReelError('All links must be valid Instagram reel URLs.')
      return
    }
    setSubmittingReel(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          collab_id: status.id,
          reel_urls: payload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus((s) =>
          s
            ? {
                ...s,
                hasReel: true,
                totalViews: data.total_views ?? s.totalViews,
                totalLikes: data.total_likes ?? s.totalLikes,
                progressPercent: data.progress ?? s.progressPercent,
              }
            : null
        )
        const defaultHandle = status.instagramHandles[0] || ''
        setReelInputs([{ reel_url: '', instagram_handle: defaultHandle }])
      } else {
        setReelError(data?.message || 'Could not verify reel. Ensure it is from the same Instagram account you registered.')
      }
    } catch {
      setReelError('Request failed. Please try again.')
    } finally {
      setSubmittingReel(false)
    }
  }

  const progress = status?.progressPercent ?? 0
  const affiliateUnlocked = status?.affiliateUnlocked ?? false

  const pageBg = 'var(--arctic-blue-background)'
  const cardBg = '#FFFFFF'
  const cardShadow = '0 2px 12px rgba(14, 39, 48, 0.06)'
  const borderColor = '#E8E4DE'
  const textPrimary = '#1a1a1a'
  const textMuted = '#6b7280'
  const accent = '#4B97C9'
  const inputBg = '#FFFFFF'
  const inputBorder = '#E5E2DC'

  const addInstagramHandle = () => setInstagramHandles((prev) => [...prev, ''])
  const removeInstagramHandle = (index: number) =>
    setInstagramHandles((prev) => prev.filter((_, idx) => idx !== index))
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
      <main className="min-h-screen py-16 px-4" style={{ backgroundColor: pageBg, fontFamily: 'var(--font-body-family)' }}>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: textPrimary }}>Sign in to apply for Collab</h1>
          <p className="mb-6" style={{ color: textMuted }}>
            You need to be signed in to join our creator collab program.
          </p>
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
        <a
          href="#/user/"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80"
          style={{ color: textMuted }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </a>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight" style={{ color: textPrimary, fontFamily: 'var(--font-heading-family)' }}>
          Creator Collab Program
        </h1>
        <p className="mb-10 text-base sm:text-lg leading-relaxed" style={{ color: textMuted }}>
          Fill out your info, create a reel with our products, and add the link. As views and likes grow, you unlock the Affiliate Program.
        </p>

        {loading ? (
          <div className="py-16 text-center" style={{ color: textMuted }}>Loading...</div>
        ) : (
          <>
            {/* Collab form */}
            {showForm && (
              <section
                className="mb-8 p-6 sm:p-8 rounded-2xl"
                style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}
              >
                <h2 className="text-lg font-semibold mb-6" style={{ color: textPrimary, letterSpacing: '0.02em' }}>
                  Step 1 — Your details
                </h2>
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>
                        Instagram handle(s) *
                      </label>
                      <div className="space-y-2">
                        {instagramHandles.map((handle, index) => (
                          <div key={`handle-${index}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="@username"
                              value={handle}
                              onChange={(e) => updateInstagramHandle(index, e.target.value)}
                              required={index === 0}
                              className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0 placeholder:text-gray-400"
                              style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                            />
                            {instagramHandles.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeInstagramHandle(index)}
                                className="p-2 rounded-lg border hover:bg-gray-50"
                                style={{ borderColor: inputBorder, color: textMuted }}
                                aria-label="Remove Instagram handle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            {index === instagramHandles.length - 1 && (
                              <button
                                type="button"
                                onClick={addInstagramHandle}
                                className="p-2 rounded-lg border hover:bg-gray-50"
                                style={{ borderColor: inputBorder, color: accent }}
                                aria-label="Add Instagram handle"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Follower count (approx)</label>
                      <input
                        type="text"
                        name="followers"
                        placeholder="e.g. 5000"
                        value={formData.followers}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0 placeholder:text-gray-400"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>Primary platform</label>
                      <input
                        type="text"
                        name="platform"
                        placeholder="e.g. Reels, Stories"
                        value={formData.platform}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0 placeholder:text-gray-400"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      />
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleInputChange}
                        className="mt-1 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9]"
                      />
                      <span className="text-sm leading-relaxed" style={{ color: textMuted }}>
                        I agree to be contacted for collab on Instagram and to create content featuring NEFOL products.
                      </span>
                    </label>
                    <button
                      type="submit"
                      className="w-full rounded-xl px-4 py-3.5 font-semibold text-[15px] transition-opacity hover:opacity-90"
                      style={{ backgroundColor: accent, color: '#fff' }}
                    >
                      Submit Collab Application
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <span className="text-[15px]" style={{ color: textPrimary }}>Application submitted. Next: add your reel link below.</span>
                  </div>
                )}
              </section>
            )}

            {/* Reel submission */}
            {submitted && (
              <section
                className="mb-8 p-6 sm:p-8 rounded-2xl"
                style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}
              >
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: textPrimary, letterSpacing: '0.02em' }}>
                  <Video className="h-5 w-5" style={{ color: accent }} />
                  Step 2 — Add your reel links
                </h2>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: textMuted }}>
                  Add one or multiple reel links. Each reel must map to one of your registered Instagram handles. Views and likes are compounded for affiliate milestones.
                </p>
                <form onSubmit={handleReelSubmit} className="space-y-4">
                  {reelInputs.map((row, index) => (
                    <div key={`reel-${index}`} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2">
                      <select
                        value={row.instagram_handle}
                        onChange={(e) => updateReelInput(index, { instagram_handle: e.target.value })}
                        className="rounded-xl border px-3 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4B97C9]"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      >
                        <option value="">Select handle</option>
                        {(status?.instagramHandles || []).map((handle) => (
                          <option key={handle} value={handle}>
                            @{handle}
                          </option>
                        ))}
                      </select>
                      <input
                        type="url"
                        placeholder="https://www.instagram.com/reel/..."
                        value={row.reel_url}
                        onChange={(e) => updateReelInput(index, { reel_url: e.target.value })}
                        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B97C9] focus:ring-offset-0 placeholder:text-gray-400"
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }}
                      />
                      <div className="flex items-center gap-2">
                        {reelInputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReelInput(index)}
                            className="p-2 rounded-lg border hover:bg-gray-50"
                            style={{ borderColor: inputBorder, color: textMuted }}
                            aria-label="Remove reel input"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {index === reelInputs.length - 1 && (
                          <button
                            type="button"
                            onClick={addReelInput}
                            className="p-2 rounded-lg border hover:bg-gray-50"
                            style={{ borderColor: inputBorder, color: accent }}
                            aria-label="Add reel input"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {reelError && (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <X className="h-4 w-4 flex-shrink-0" />
                      {reelError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submittingReel}
                    className="rounded-xl px-5 py-2.5 font-medium text-[15px] disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent, color: '#fff' }}
                  >
                    {submittingReel ? 'Verifying...' : 'Submit Reel'}
                  </button>
                </form>
                {((status?.totalViews ?? 0) > 0 || (status?.totalLikes ?? 0) > 0) && (
                  <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: '#0E2730', color: '#fff' }}>
                    <p className="text-sm font-medium">
                      Total Views: {status?.totalViews ?? 0}/{AFFILIATE_VIEWS_THRESHOLD} · Total Likes: {status?.totalLikes ?? 0}/{AFFILIATE_LIKES_THRESHOLD}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Progress to Affiliate */}
            <section
              className="p-6 sm:p-8 rounded-2xl"
              style={{ backgroundColor: cardBg, boxShadow: cardShadow, border: `1px solid ${borderColor}` }}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: textPrimary, letterSpacing: '0.02em' }}>
                {affiliateUnlocked ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-amber-500" />}
                Progress to Affiliate
              </h2>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E4DE' }}>
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, progress)}%`,
                    backgroundColor: affiliateUnlocked ? '#10b981' : accent,
                  }}
                />
              </div>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: textMuted }}>
                {affiliateUnlocked
                  ? 'Affiliate Program unlocked! You can now apply from Join Us.'
                  : `Reach ${AFFILIATE_VIEWS_THRESHOLD} views and ${AFFILIATE_LIKES_THRESHOLD} likes to unlock Affiliate. Current: ${status?.totalViews ?? 0}/${AFFILIATE_VIEWS_THRESHOLD} views and ${status?.totalLikes ?? 0}/${AFFILIATE_LIKES_THRESHOLD} likes.`}
              </p>
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
