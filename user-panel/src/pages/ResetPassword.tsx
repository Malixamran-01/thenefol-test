import React, { useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFromEmailLink, setIsFromEmailLink] = useState(false)

  // Check if user came from email link (has token and email in URL)
  useEffect(() => {
    // For hash routing, we need to parse from hash instead of search
    const hash = window.location.hash
    let urlParams: URLSearchParams
    
    // Check if query params are in hash (hash routing) or in search (direct URL)
    if (hash.includes('?')) {
      // Hash routing: #/user/reset-password?token=...&email=...
      const hashParts = hash.split('?')
      urlParams = new URLSearchParams(hashParts[1] || '')
    } else {
      // Direct URL: /reset-password?token=...&email=...
      urlParams = new URLSearchParams(window.location.search)
    }
    
    const token = urlParams.get('token')
    const emailParam = urlParams.get('email')

    if (token && emailParam) {
      setIsFromEmailLink(true)
      setEmail(decodeURIComponent(emailParam))
      // Store token in state (we'll use it when submitting)
      ;(window as any).resetToken = token
    }
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Please enter a valid email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      await authAPI.requestPasswordReset({ email: email.trim() })
      // Mask email for privacy (show first 3 chars and domain)
      const emailParts = email.trim().split('@')
      const maskedEmail = emailParts[0].length > 3 
        ? `${emailParts[0].substring(0, 3)}***@${emailParts[1]}`
        : `${emailParts[0].substring(0, 1)}***@${emailParts[1]}`
      setMessage(`Link Sent to your Registered email id ${maskedEmail}`)
      // Don't clear email so user can see what they entered
    } catch (err: any) {
      setError(err?.message || 'Failed to request reset. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    // Get token from URL (support both hash routing and direct URL)
    const hash = window.location.hash
    let urlParams: URLSearchParams
    
    if (hash.includes('?')) {
      // Hash routing: #/user/reset-password?token=...&email=...
      const hashParts = hash.split('?')
      urlParams = new URLSearchParams(hashParts[1] || '')
    } else {
      // Direct URL: /reset-password?token=...&email=...
      urlParams = new URLSearchParams(window.location.search)
    }
    
    const token = urlParams.get('token') || (window as any).resetToken

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await authAPI.resetPassword({
        email: email.trim(),
        token: token,
        newPassword
      })
      setMessage('Password reset successful! Redirecting to login...')
      setNewPassword('')
      setConfirmPassword('')
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.hash = '#/user/login'
      }, 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The link may have expired. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1
            className="text-3xl sm:text-4xl font-light tracking-[0.15em] mb-3"
            style={{ fontFamily: 'var(--font-heading-family)' }}
          >
            Reset Password
          </h1>
          <p className="text-sm text-slate-600 tracking-wide">
            {isFromEmailLink 
              ? 'Enter your new password below.'
              : 'Enter your email address and we\'ll send you a reset link.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
          {isFromEmailLink ? (
            // Password reset form (when user comes from email link)
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Email is pre-filled from URL, no need to show it */}
              <div className="text-sm text-slate-600 mb-4">
                <p>Reset password for: <strong>{email}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-slate-200 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-slate-200 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
              {message && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md text-white py-3 text-xs font-light uppercase tracking-[0.15em] disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          ) : (
            // Email request form
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-200 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
              {message && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{message}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md text-white py-3 text-xs font-light uppercase tracking-[0.15em] disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

