import React, { useState } from 'react'
import { authAPI } from '../services/api'
import PhoneInput from '../components/PhoneInput'

type RequestMethod = 'phone' | 'email'

export default function ResetPassword() {
  const [requestMethod, setRequestMethod] = useState<RequestMethod>('phone')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [requestEmail, setRequestEmail] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [loadingRequest, setLoadingRequest] = useState(false)

  const [resetEmail, setResetEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [loadingReset, setLoadingReset] = useState(false)

  const normalizePhone = () => {
    const cc = countryCode.replace(/[^0-9]/g, '')
    const digits = phone.replace(/\D/g, '')
    return `${cc}${digits}`
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestMessage('')
    setRequestError('')

    if (requestMethod === 'phone' && phone.trim().length < 6) {
      setRequestError('Please enter a valid phone number')
      return
    }
    if (requestMethod === 'email' && !requestEmail.trim()) {
      setRequestError('Please enter a valid email address')
      return
    }

    setLoadingRequest(true)
    try {
      if (requestMethod === 'phone') {
        await authAPI.requestPasswordReset({ phone: normalizePhone() })
      } else {
        await authAPI.requestPasswordReset({ email: requestEmail.trim() })
      }
      setRequestMessage('If an account exists, reset instructions have been sent.')
    } catch (err: any) {
      setRequestError(err?.message || 'Failed to request reset. Please try again.')
    } finally {
      setLoadingRequest(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage('')
    setResetError('')

    if (!resetEmail.trim() || !resetToken.trim()) {
      setResetError('Email and token are required')
      return
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match')
      return
    }

    setLoadingReset(true)
    try {
      await authAPI.resetPassword({
        email: resetEmail.trim(),
        token: resetToken.trim(),
        newPassword
      })
      setResetMessage('Password reset successful! You can now sign in with your new password.')
      setNewPassword('')
      setConfirmPassword('')
      setResetToken('')
    } catch (err: any) {
      setResetError(err?.message || 'Failed to reset password. Please check your token and try again.')
    } finally {
      setLoadingReset(false)
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <h1
            className="text-3xl sm:text-4xl font-light tracking-[0.15em]"
            style={{ fontFamily: 'var(--font-heading-family)' }}
          >
            Reset Password
          </h1>
          <p className="mt-3 text-sm text-slate-600 tracking-wide">
            Choose how you’d like to receive your password reset instructions and create a new password.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Request Reset Code</h2>
            <p className="text-sm text-slate-500 mb-4">
              Get a 6-digit code on WhatsApp or a reset link on your email.
            </p>

            <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setRequestMethod('phone')
                  setRequestError('')
                  setRequestMessage('')
                }}
                className={`flex-1 py-2 px-4 rounded-md text-xs font-light uppercase tracking-[0.1em] ${
                  requestMethod === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  setRequestMethod('email')
                  setRequestError('')
                  setRequestMessage('')
                }}
                className={`flex-1 py-2 px-4 rounded-md text-xs font-light uppercase tracking-[0.1em] ${
                  requestMethod === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email
              </button>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-4">
              {requestMethod === 'phone' ? (
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  onCountryCodeChange={setCountryCode}
                  defaultCountry={countryCode}
                  placeholder="Enter your WhatsApp number"
                  showLabel
                  label="WhatsApp Number"
                />
              ) : (
                <div>
                  <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              {requestError && <div className="text-sm text-red-600">{requestError}</div>}
              {requestMessage && <div className="text-sm text-green-600">{requestMessage}</div>}

              <button
                type="submit"
                disabled={loadingRequest}
                className="w-full rounded-md bg-slate-900 text-white py-3 text-xs font-light uppercase tracking-[0.15em] disabled:opacity-50"
              >
                {loadingRequest ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Set New Password</h2>
            <p className="text-sm text-slate-500 mb-4">
              Paste the token you received and choose a new password.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">
                  Reset Token
                </label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  placeholder="Paste the 64-character token"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {resetError && <div className="text-sm text-red-600">{resetError}</div>}
              {resetMessage && <div className="text-sm text-green-600">{resetMessage}</div>}

              <button
                type="submit"
                disabled={loadingReset}
                className="w-full rounded-md text-white py-3 text-xs font-light uppercase tracking-[0.15em] disabled:opacity-50"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                {loadingReset ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

