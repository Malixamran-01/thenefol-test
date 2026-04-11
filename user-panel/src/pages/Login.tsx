import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import PhoneInput from '../components/PhoneInput'

// Google OAuth
declare global {
  interface Window {
    google?: any
    FB?: any
    fbAsyncInit?: () => void
  }
}

const ACCENT = 'rgb(75, 151, 201)'
const ACCENT_HOVER = 'rgb(60, 120, 160)'

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
  const [emailError, setEmailError] = useState('')
  const [waError, setWaError] = useState('')
  const [oauthError, setOauthError] = useState('')
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
        setOauthError('')
        setEmailError('')
        setWaError('')

        const success = await loginWithGoogle(response.credential)

        if (success) {
          redirectAfterLogin()
        } else {
          setOauthError(authError || 'Google login failed')
        }
      } catch {
        setOauthError('Google login failed. Please try again.')
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
    script.onerror = () => {
      console.error('Failed to load Google SDK')
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [handleGoogleResponse])

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt()
    }
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
      setOauthError('Facebook SDK not loaded. Please refresh the page.')
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
      setOauthError('')
      setEmailError('')
      setWaError('')

      const success = await loginWithFacebook(accessToken, userID)

      if (success) {
        redirectAfterLogin()
      } else {
        setOauthError(authError || 'Facebook login failed')
      }
    } catch {
      setOauthError('Facebook login failed. Please try again.')
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
    setEmailError('')
    setOauthError('')
    setWaError('')
    setLoading(true)
    try {
      const success = await login(email, password)
      if (!success) {
        setEmailError(authError || 'Login failed')
      } else {
        redirectAfterLogin()
      }
    } catch {
      setEmailError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaError('')
    setEmailError('')
    setOauthError('')
    setLoading(true)

    if (!otpSent) {
      if (!loginPhone) {
        setWaError('Please enter your phone number')
        setLoading(false)
        return
      }

      try {
        const formattedPhone = formatPhone(loginPhone)
        await authAPI.sendOTPLogin(formattedPhone)
        setOtpSent(true)
        startOtpTimer()
      } catch (err: any) {
        setWaError(err?.message || 'Failed to send OTP.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!otp || otp.length !== 6) {
      setWaError('Please enter a valid 6-digit OTP')
      setLoading(false)
      return
    }

    try {
      const formattedPhone = formatPhone(loginPhone)
      const success = await loginWithWhatsApp(formattedPhone, otp)

      if (!success) {
        setWaError(authError || 'Login failed')
      } else {
        redirectAfterLogin()
      }
    } catch (err: any) {
      setWaError(err?.message || 'Invalid OTP or login failed.')
    } finally {
      setLoading(false)
    }
  }

  const resetWhatsApp = () => {
    setOtpSent(false)
    setOtp('')
    setOtpCountdown(0)
    setWaError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-10 px-4 sm:px-6">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8">
          {/* Header */}
          <div className="text-center">
            <h1
              className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.65rem]"
              style={{ fontFamily: 'var(--font-heading-family, inherit)' }}
            >
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Welcome back to NEFOL®</p>
            <p className="mt-3 text-sm text-slate-600">
              New here?{' '}
              <button
                type="button"
                onClick={() => (window.location.hash = '#/user/signup')}
                className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-500"
              >
                Create an account
              </button>
            </p>
          </div>

          {/* Email + password */}
          <form onSubmit={handleEmailLogin} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-slate-600">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 !py-2.5 !pl-12 !pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-medium text-slate-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => (window.location.hash = '#/user/reset-password')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 !py-2.5 !pl-12 !pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {emailError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{emailError}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={(e) => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT_HOVER
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
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

          {/* Google + Facebook */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || !googleLoaded}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={loading || !fbLoaded}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#1877F2"
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                />
              </svg>
              Facebook
            </button>
          </div>

          {/* WhatsApp — always visible, no tabs */}
          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#25D366]" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.672.15-.198.297-.768.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.672-1.62-.921-2.221-.242-.58-.487-.502-.672-.512l-.573-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 3.505h-.004a8.348 8.348 0 01-4.258-1.157l-.305-.181-3.172.832.847-3.094-.199-.317a8.345 8.345 0 01-1.277-4.43c.001-4.602 3.745-8.346 8.35-8.346 2.233 0 4.332.87 5.912 2.449a8.303 8.303 0 012.444 5.898c-.003 4.602-3.747 8.345-8.348 8.345M20.52 3.48A11.815 11.815 0 0012.057 0C5.495 0 .16 5.335.157 11.897c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.631a11.88 11.88 0 005.71 1.455h.005c6.56 0 11.895-5.335 11.898-11.897A11.821 11.821 0 0020.52 3.48"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">WhatsApp OTP</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  We’ll send a 6-digit code to your WhatsApp. No password needed.
                </p>
              </div>
            </div>

            <form onSubmit={handleWhatsAppLogin} className="mt-4 space-y-3">
              {!otpSent ? (
                <PhoneInput
                  value={loginPhone}
                  onChange={(value) => setLoginPhone(value)}
                  onCountryCodeChange={setCountryCode}
                  defaultCountry={countryCode}
                  placeholder="Phone number"
                  required
                  showLabel
                  label="Mobile number"
                />
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Enter OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setOtp(value)
                        setWaError('')
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-xl tracking-[0.35em] text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="••••••"
                    />
                    {otpCountdown > 0 && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        Code expires in {Math.floor(otpCountdown / 60)}:
                        {(otpCountdown % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={resetWhatsApp}
                        className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
                      >
                        Use a different number
                      </button>
                    </div>
                  </div>
                </>
              )}

              {waError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{waError}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border border-[#128C7E]/30 bg-white py-2.5 text-sm font-semibold text-[#075E54] transition hover:bg-[#25D366]/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? otpSent
                    ? 'Verifying…'
                    : 'Sending…'
                  : otpSent
                    ? 'Verify and sign in'
                    : 'Send code via WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
