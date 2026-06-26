import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

declare global {
  interface Window { google?: any; FB?: any; fbAsyncInit?: () => void }
}

const ACCENT = 'rgb(75, 151, 201)'
const ACCENT_HOVER = 'rgb(60, 120, 160)'

export default function SignupPage() {
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [oauthError, setOauthError]   = useState('')
  const [googleReady, setGoogleReady] = useState(false)

  const { signup, loginWithGoogle, loginWithFacebook, error: authError } = useAuth()

  const redirectAfterSignup = () => {
    const dest = sessionStorage.getItem('post_login_redirect')
    if (dest) { sessionStorage.removeItem('post_login_redirect'); window.location.hash = dest }
    else window.location.hash = '#/user/'
  }

  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true; s.defer = true
    s.onload = () => setGoogleReady(true)
    document.body.appendChild(s)
    return () => { if (document.body.contains(s)) document.body.removeChild(s) }
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setOauthError('')

    if (!name.trim()) { setError('Please enter your name'); return }
    if (password !== confirmPwd) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      const ok = await signup({ name, email, password, phone: '', address: { street: '', city: '', state: '', zip: '' } })
      if (ok) redirectAfterSignup()
      else setError(authError || 'Signup failed. Please try again.')
    } catch { setError('Signup failed. Please try again.') }
    finally { setLoading(false) }
  }

  const handleGoogle = () => {
    if (!window.google) return
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: '269814794814-bbq2slkc637hnh7dqbchb6l3hu9b80j5.apps.googleusercontent.com',
      scope: 'email profile openid',
      callback: async (r: { access_token?: string; error?: string }) => {
        if (r.error || !r.access_token) { setOauthError('Google sign-up cancelled.'); return }
        setLoading(true); setOauthError('')
        try {
          const ok = await loginWithGoogle(r.access_token)
          if (ok) redirectAfterSignup(); else setOauthError(authError || 'Google signup failed.')
        } catch { setOauthError('Google signup failed.') }
        finally { setLoading(false) }
      }
    })
    client.requestAccessToken({ prompt: 'select_account' })
  }

  // Facebook — disabled
  // const handleFacebook = () => { ... }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-10 px-4 sm:px-6">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8">

          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.65rem]">
              Create account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Join NEFOL and start your beauty journey</p>
            <p className="mt-3 text-sm text-slate-600">
              Already have an account?{' '}
              <button type="button" onClick={() => (window.location.hash = '#/user/login')}
                className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-500">
                Sign in
              </button>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="mt-8 space-y-4">

            <div>
              <label htmlFor="su-name" className="mb-1.5 block text-xs font-medium text-slate-600">Full name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="su-name" type="text" autoComplete="name" required
                  value={name} onChange={e => setName(e.target.value)}
                  className={inputCls} placeholder="Your full name" />
              </div>
            </div>

            <div>
              <label htmlFor="su-email" className="mb-1.5 block text-xs font-medium text-slate-600">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="su-email" type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label htmlFor="su-password" className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="su-password" type={showPwd ? 'text' : 'password'} autoComplete="new-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={`${inputCls} !pr-10`} placeholder="Create a password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPwd ? 'Hide' : 'Show'}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="su-confirm" className="mb-1.5 block text-xs font-medium text-slate-600">Confirm password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="su-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required
                  value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  className={`${inputCls} !pr-10`} placeholder="Repeat your password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirm ? 'Hide' : 'Show'}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = ACCENT_HOVER }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = ACCENT }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {oauthError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-center text-sm text-red-800">
              {oauthError}
            </div>
          )}

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">or continue with</span>
            </div>
          </div>

          {/* Google */}
          <div className="grid grid-cols-1 gap-2.5">
            <button type="button" onClick={handleGoogle} disabled={loading || !googleReady}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            {/* Facebook — disabled
            <button type="button" onClick={handleFacebook} disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button> */}
          </div>

          {/* WhatsApp — disabled
          <div className="mt-7 ..."> ... </div> */}
        </div>
      </div>
    </div>
  )
}
