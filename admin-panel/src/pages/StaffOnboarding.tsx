import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '../utils/apiUrl'

/** Keep in sync with backend STAFF_TERMS_VERSION / staffOnboarding config (for user-visible version label). */
export const STAFF_TERMS_VERSION_LABEL = '1.0'

const STAFF_AGREEMENT_INTRO = `By accepting this agreement, you acknowledge that you are being granted access to NEFOL’s admin panel and internal business data. You agree to:`

const STAFF_AGREEMENT_BULLETS = [
  'Use admin access only for authorized work and keep credentials confidential.',
  'Protect customer and business data, and follow applicable privacy and security practices.',
  'Not share your login, bypass security controls, or access data outside your responsibilities.',
  'Follow instructions from NEFOL administrators regarding access, roles, and conduct.',
]

export default function StaffOnboarding() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [tokenChecked, setTokenChecked] = useState(false)
  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    phone: '',
    jobTitle: '',
    password: '',
    confirm: '',
  })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const apiBase = getApiBaseUrl()

  useEffect(() => {
    if (!token) {
      setTokenChecked(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase}/staff/invite/status?token=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data.valid && data.email) {
          setInviteEmail(data.email)
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTokenChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, apiBase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('This link is missing a valid token.')
      return
    }
    if (!agreeTerms) {
      setError('You must accept the staff and admin access agreement.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/staff/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: form.name,
          password: form.password,
          agreeToTerms: true,
          dateOfBirth: form.dateOfBirth,
          phone: form.phone || undefined,
          jobTitle: form.jobTitle || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Something went wrong')
        return
      }
      navigate('/admin/login?onboarded=1')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6">
        <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white">Admin onboarding</h1>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Complete your profile, review the agreement, and set your password. Your email was verified from your invite link.
        </p>

        {!token && (
          <p className="text-sm text-red-600 text-center">This onboarding link is invalid. Ask your administrator for a new invite.</p>
        )}

        {token && tokenChecked && !inviteEmail && (
          <p className="text-sm text-red-600 text-center">This invitation is invalid or has expired.</p>
        )}

        {inviteEmail && (
          <p className="text-sm text-center text-gray-700 dark:text-gray-300">
            Invited email: <strong>{inviteEmail}</strong>
          </p>
        )}

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Full legal name"
            value={form.name}
            required
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date of birth</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={form.dateOfBirth}
              required
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </div>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Job title / role (optional)"
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
          />

          <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-800/50 max-h-48 overflow-y-auto text-sm text-gray-700 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-white mb-2">
              Staff &amp; admin access agreement (v{STAFF_TERMS_VERSION_LABEL})
            </p>
            <p className="mb-2">{STAFF_AGREEMENT_INTRO}</p>
            <ul className="list-disc pl-5 space-y-1">
              {STAFF_AGREEMENT_BULLETS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              NEFOL may update this agreement; continued use after notice constitutes acceptance of reasonable updates.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>I have read and agree to the staff and admin access agreement above.</span>
          </label>

          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Password (min 8 characters)"
            value={form.password}
            required
            minLength={8}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Confirm password"
            value={form.confirm}
            required
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />

          <button
            type="submit"
            disabled={loading || !token || !inviteEmail}
            className="w-full py-2 px-4 bg-gray-900 text-white rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Creating your account…' : 'Create account & finish onboarding'}
          </button>
        </form>
      </div>
    </div>
  )
}
