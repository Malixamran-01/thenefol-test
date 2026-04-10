import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Mail, Lock, Eye, EyeOff, MessageCircle } from 'lucide-react'
import PhoneInput from '../components/PhoneInput'

declare global {
  interface Window {
    google?: any
    FB?: any
    fbAsyncInit?: () => void
  }
}

const ACCENT = 'rgb(75,151,201)'
const ACCENT_HOVER = 'rgb(60,120,160)'

const googleIcon = (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const facebookIcon = (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [loginPhone, setLoginPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [waLoading, setWaLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [fbLoaded, setFbLoaded] = useState(false)

  const otpTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { login, loginWithWhatsApp, loginWithGoogle, loginWithFacebook, error: authError } = useAuth()

  const redirectAfterLogin = () => {
    const redirect = sessionStorage.getItem('post_login_redirect')
    if (redirect) {
      sessionStorage.removeItem('post_login_redirect')
      window.location.hash = redirect
    } else {
      window.location.hash = '#/user/'
    }
  }

  const handleGoogleResponse = React.useCallback(
    async (response: any) => {
      try {
        setLoading(true)
        setError('')
        const success = await loginWithGoogle(response.credential)
        if (success) redirectAfterLogin()
        else setError(authError || 'Google login failed')
      } catch {
        setError('Google login failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [loginWithGoogle, authError]
  )

  React.useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      setGoogleLoaded(true)
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '269814794814-bbq2slkc637hnh7dqbchb6l3hu9b80j5.apps.googleusercontent.com',
          callback: handleGoogleResponse,
        })
      }
    }
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [handleGoogleResponse])

  const handleGoogleSignIn = () => {
    if (window.google) window.google.accounts.id.prompt()
  }

  React.useEffect(() => {
    if (window.FB) {
      setFbLoaded(true)
    } else {
      const checkFB = setInterval(() => {
        if (window.FB) {
          setFbLoaded(true)
          clearInterval(checkFB)
        }
      }, 100)
      return () => clearInterval(checkFB)
    }
  }, [])

  const handleFacebookLogin = () => {
    if (!window.FB) {
      setError('Facebook SDK not loaded. Please refresh the page.')
      return
    }
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const { accessToken, userID } = response.authResponse
          void handleFacebookResponse(accessToken, userID)
        }
      },
      { scope: 'public_profile,email' }
    )
  }

  const handleFacebookResponse = async (accessToken: string, userID: string) => {
    try {
      setLoading(true)
      setError('')
      const success = await loginWithFacebook(accessToken, userID)
      if (success) redirectAfterLogin()
      else setError(authError || 'Facebook login failed')
    } catch {
      setError('Facebook login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startOtpTimer = () => {
    if (otpTimerRef.current) clearInterval(otpTimerRef.current)
    setOtpCountdown(600)
    otpTimerRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          if (otpTimerRef.current) clearInterval(otpTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatPhone = (phone: string) => {
    const cc = countryCode.replace(/[^0-9]/g, '')
    const num = phone.replace(/\D/g, '')
    return `${cc}${num}`
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const success = await login(email, password)
      if (!success) setError(authError || 'Login failed')
      else redirectAfterLogin()
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otpSent) {
      if (!loginPhone) {
        setError('Please enter your phone number')
        return
      }
      setWaLoading(true)
      try {
        const formattedPhone = formatPhone(loginPhone)
        await authAPI.sendOTPLogin(formattedPhone)
        setOtpSent(true)
        startOtpTimer()
      } catch (err: any) {
        setError(err?.message || 'Failed to send OTP.')
      } finally {
        setWaLoading(false)
      }
      return
    }
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }
    setWaLoading(true)
    try {
      const formattedPhone = formatPhone(loginPhone)
      const success = await loginWithWhatsApp(formattedPhone, otp)
      if (!success) setError(authError || 'Login failed')
      else redirectAfterLogin()
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP or login failed.')
    } finally {
      setWaLoading(false)
    }
  }

  const Divider = ({ label }: { label: string }) => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
        <span className="bg-white px-4 text-slate-400 font-light">{label}</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white py-10 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Sign in | Create account */}
        <div className="flex rounded-xl bg-slate-100/90 p-1.5 mb-8 shadow-sm ring-1 ring-slate-200/60">
          <div
            className="flex-1 py-2.5 px-3 rounded-lg text-center text-xs font-light tracking-[0.12em] uppercase bg-white text-slate-900 shadow-sm"
            style={{ letterSpacing: '0.12em' }}
          >
            Sign in
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/user/signup'
            }}
            className="flex-1 py-2.5 px-3 rounded-lg text-center text-xs font-light tracking-[0.12em] uppercase text-slate-600 hover:text-slate-900 transition-colors"
            style={{ letterSpacing: '0.12em' }}
          >
            Create account
          </button>
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-2xl sm:text-3xl font-light tracking-[0.12em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
            }}
          >
            Welcome back
          </h1>
          <p className="mt-2 text-sm font-light text-slate-500 tracking-wide">Sign in to NEFOL® — pick any method below</p>
        </div>

        {error && (
          <div className="mb-6 text-slate-700 bg-rose-50 border border-rose-100 p-3 rounded-lg text-sm font-light">{error}</div>
        )}

        {/* Quick sign-in: Google + Facebook */}
        <p className="text-[10px] font-light uppercase tracking-[0.2em] text-slate-400 mb-3 text-center">Continue with</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !googleLoaded}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-sm font-light text-slate-700 bg-white hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
          >
            {googleIcon}
            Google
          </button>
          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={loading || !fbLoaded}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-sm font-light text-slate-700 bg-white hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
          >
            {facebookIcon}
            Facebook
          </button>
        </div>

        {/* WhatsApp — own card */}
        <div className="mt-6 rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-emerald-50/40">
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-800 tracking-wide">WhatsApp</p>
              <p className="text-[11px] text-slate-500 font-light">We’ll send a one-time code — no password</p>
            </div>
          </div>
          <form onSubmit={handleWhatsAppSubmit} className="p-4 space-y-4">
            {!otpSent ? (
              <PhoneInput
                value={loginPhone}
                onChange={setLoginPhone}
                onCountryCodeChange={setCountryCode}
                defaultCountry={countryCode}
                placeholder="Mobile number"
                required
                showLabel
                label="Phone number"
              />
            ) : (
              <>
                <div>
                  <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">Enter code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ''))
                      setError('')
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-center text-2xl tracking-[0.35em] font-light text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="••••••"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  {otpCountdown > 0 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Code expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false)
                      setOtp('')
                      setOtpCountdown(0)
                      setError('')
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 underline mt-2 w-full text-center"
                  >
                    Use a different number
                  </button>
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={waLoading}
              className="w-full py-3 rounded-lg text-xs font-light tracking-[0.12em] uppercase text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: ACCENT, letterSpacing: '0.12em' }}
              onMouseEnter={(e) => {
                if (!waLoading) e.currentTarget.style.backgroundColor = ACCENT_HOVER
              }}
              onMouseLeave={(e) => {
                if (!waLoading) e.currentTarget.style.backgroundColor = ACCENT
              }}
            >
              {waLoading
                ? otpSent
                  ? 'Verifying…'
                  : 'Sending…'
                : otpSent
                  ? 'Verify & sign in'
                  : 'Send WhatsApp code'}
            </button>
          </form>
        </div>

        <Divider label="or email" />

        {/* Email + password */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-3 text-sm font-light text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 pl-10 pr-3"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-light text-slate-600 mb-2 uppercase tracking-[0.1em]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-3 text-sm font-light text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 pl-10 pr-11"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/user/reset-password'
                }}
                className="text-xs font-light text-slate-600 hover:text-slate-900 underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg text-xs font-light tracking-[0.15em] uppercase text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: ACCENT, letterSpacing: '0.15em' }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = ACCENT_HOVER
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = ACCENT
            }}
          >
            {loading ? 'Signing in…' : 'Sign in with email'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-light text-slate-500">
          New here?{' '}
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/user/signup'
            }}
            className="text-slate-900 underline underline-offset-2 hover:text-slate-700"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  )
}
