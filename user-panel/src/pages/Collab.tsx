import React, { useState, useEffect } from 'react'
import { ArrowLeft, Video, Lock, CheckCircle, X } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

const AFFILIATE_VIEWS_THRESHOLD = 1000
const AFFILIATE_LIKES_THRESHOLD = 100

interface CollabStatus {
  hasApplication: boolean
  hasReel: boolean
  totalViews: number
  totalLikes: number
  progressPercent: number
  affiliateUnlocked: boolean
}

export default function Collab() {
  const { isAuthenticated } = useAuth()
  const [showForm, setShowForm] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<CollabStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [reelLink, setReelLink] = useState('')
  const [submittingReel, setSubmittingReel] = useState(false)
  const [reelError, setReelError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
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
        const res = await fetch(`${getApiBase()}/api/collab/status`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
          setSubmitted(data?.hasApplication ?? false)
        }
      } catch (e) {
        console.error('Collab status fetch failed:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [isAuthenticated])

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
    if (!formData.name || !formData.email || !formData.phone || !formData.instagram) {
      alert('Please fill required fields: Name, Email, Phone, Instagram handle.')
      return
    }
    if (!formData.agreeTerms) {
      alert('Please agree to the terms.')
      return
    }
    try {
      const res = await fetch(`${getApiBase()}/api/collab/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSubmitted(true)
        setStatus((s) => (s ? { ...s, hasApplication: true } : null))
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
    if (!reelLink.trim()) {
      setReelError('Please enter your reel link.')
      return
    }
    if (!reelLink.includes('instagram.com') && !reelLink.includes('instagr.am')) {
      setReelError('Please enter a valid Instagram reel URL.')
      return
    }
    setSubmittingReel(true)
    try {
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reel_url: reelLink.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus((s) =>
          s
            ? {
                ...s,
                hasReel: true,
                totalViews: data.views ?? s.totalViews,
                totalLikes: data.likes ?? s.totalLikes,
                progressPercent: data.progressPercent ?? s.progressPercent,
              }
            : null
        )
        setReelLink('')
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

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen py-16 px-4" style={{ backgroundColor: 'var(--color-page-bg)' }}>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to apply for Collab</h1>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            You need to be signed in to join our creator collab program.
          </p>
          <a
            href="#/user/login"
            onClick={() => sessionStorage.setItem('post_login_redirect', '#/user/collab')}
            className="inline-block rounded-lg px-6 py-3 font-semibold"
            style={{ backgroundColor: 'var(--color-button-primary-bg)', color: 'var(--color-button-primary-text)' }}
          >
            Sign in
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      <div className="mx-auto max-w-2xl">
        <a href="#/user/" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </a>

        <h1 className="text-3xl font-bold mb-2">Creator Collab Program</h1>
        <p className="mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          Fill out your info, create a reel with our products, and add the link. As views and likes grow, you unlock the Affiliate Program.
        </p>

        {loading ? (
          <div className="py-12 text-center" style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
        ) : (
          <>
            {/* Collab form */}
            {showForm && (
              <section className="mb-10 p-6 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-bg)' }}>
                <h2 className="text-xl font-semibold mb-4">Step 1 — Your details</h2>
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border px-4 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border px-4 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border px-4 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Instagram handle *</label>
                      <input
                        type="text"
                        name="instagram"
                        placeholder="@username"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border px-4 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Follower count (approx)</label>
                      <input
                        type="text"
                        name="followers"
                        placeholder="e.g. 5000"
                        value={formData.followers}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border px-4 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Primary platform</label>
                      <input
                        type="text"
                        name="platform"
                        placeholder="e.g. Reels, Stories"
                        value={formData.platform}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border px-4 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                      <span className="text-sm">I agree to be contacted for collab on Instagram and to create content featuring NEFOL products.</span>
                    </label>
                    <button
                      type="submit"
                      className="w-full rounded-lg px-4 py-3 font-semibold"
                      style={{ backgroundColor: 'var(--color-button-primary-bg)', color: 'var(--color-button-primary-text)' }}
                    >
                      Submit Collab Application
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Application submitted. Next: add your reel link below.</span>
                  </div>
                )}
              </section>
            )}

            {/* Reel submission */}
            {submitted && (
              <section className="mb-10 p-6 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-bg)' }}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Step 2 — Add your reel link
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Create a reel with NEFOL products and paste the Instagram reel URL below. We verify it matches your registered account and track views and likes.
                </p>
                <form onSubmit={handleReelSubmit} className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://www.instagram.com/reel/..."
                    value={reelLink}
                    onChange={(e) => setReelLink(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  {reelError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <X className="h-4 w-4" />
                      {reelError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submittingReel}
                    className="rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-button-primary-bg)', color: 'var(--color-button-primary-text)' }}
                  >
                    {submittingReel ? 'Verifying...' : 'Submit Reel'}
                  </button>
                </form>
                {((status?.totalViews ?? status?.total_views ?? 0) > 0 || (status?.totalLikes ?? status?.total_likes ?? 0) > 0) && (
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-text-on-nav)' }}>
                    <p className="text-sm font-medium">
                      Views: {status?.totalViews ?? status?.total_views ?? 0} · Likes: {status?.totalLikes ?? status?.total_likes ?? 0}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Progress to Affiliate */}
            <section className="p-6 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-bg)' }}>
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                {affiliateUnlocked ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-amber-500" />}
                Progress to Affiliate
              </h2>
              <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, progress)}%`,
                    backgroundColor: affiliateUnlocked ? '#22c55e' : 'var(--color-button-primary-bg)',
                  }}
                />
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {affiliateUnlocked
                  ? 'Affiliate Program unlocked! You can now apply from Join Us.'
                  : `Reach ${AFFILIATE_VIEWS_THRESHOLD} views and ${AFFILIATE_LIKES_THRESHOLD} likes to unlock Affiliate.`}
              </p>
              {affiliateUnlocked && (
                <a
                  href="#/user/affiliate-partner"
                  onClick={() => sessionStorage.setItem('affiliate_referrer', 'home')}
                  className="inline-block mt-4 rounded-lg px-4 py-2 font-medium"
                  style={{ backgroundColor: 'var(--color-button-primary-bg)', color: 'var(--color-button-primary-text)' }}
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
