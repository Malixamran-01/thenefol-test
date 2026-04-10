import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Mail, Lock, User, Eye, EyeOff, MessageCircle } from 'lucide-react'
import PhoneInput from '../components/PhoneInput'

declare global {
  interface Window {
    google?: any
    FB?: any
    fbAsyncInit?: () => void
  }
}

const ACCENT = 'rgb(75, 151, 201)'
const ACCENT_HOVER = 'rgb(60, 120, 160)'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [waOtpSent, setWaOtpSent] = useState(false)
  const [waOtp, setWaOtp] = useState('')
  const [waOtpCountdown, setWaOtpCountdown] = useState(0)
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [waError, setWaError] = useState('')
  const [oauthError, setOauthError] = useState('')
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [fbLoaded, setFbLoaded] = useState(false)

  const waTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: { street: '', city: '', state: '', zip: '' }
  })

  const { signup, loginWithGoogle, loginWithFacebook, error: authError } = useAuth()

  const redirectAfterSignup = () => {
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
          redirectAfterSignup()
        } else {
          setOauthError(authError || 'Google signup failed')
        }
      } catch {
        setOauthError('Google signup failed. Please try again.')
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
          callback: handleGoogleResponse
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

  const handleGoogleSignUp = () => {
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

  const handleFacebookSignUp = () => {
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
        redirectAfterSignup()
      } else {
        setOauthError(authError || 'Facebook signup failed')
      }
    } catch {
      setOauthError('Facebook signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startWaOtpTimer = () => {
    if (waTimerRef.current) clearInterval(waTimerRef.current)
    setWaOtpCountdown(600)

    waTimerRef.current = setInterval(() => {
      setWaOtpCountdown((prev) => {
        if (prev <= 1) {
          if (waTimerRef.current) clearInterval(waTimerRef.current)
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

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setOauthError('')
    setWaError('')

    if (!signupData.name.trim()) {
      setEmailError('Please enter your name')
      return
    }

    if (signupData.password !== signupData.confirmPassword) {
      setEmailError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const success = await signup({
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        phone: '',
        address: { street: '', city: '', state: '', zip: '' }
      })

      if (!success) {
        setEmailError(authError || 'Signup failed')
      } else {
        redirectAfterSignup()
      }
    } catch {
      setEmailError('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaError('')
    setEmailError('')
    setOauthError('')
    setLoading(true)

    if (!waOtpSent) {
      if (!signupData.phone) {
        setWaError('Please enter your phone number')
        setLoading(false)
        return
      }

      try {
        const formattedPhone = formatPhone(signupData.phone)
        await authAPI.sendOTP(formattedPhone)
        setWaOtpSent(true)
        startWaOtpTimer()
      } catch (err: any) {
        setWaError(err?.message || 'Failed to send OTP.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!waOtp || waOtp.length !== 6) {
      setWaError('Please enter a valid 6-digit OTP')
      setLoading(false)
      return
    }

    if (!signupData.name.trim()) {
      setWaError('Please enter your name')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const formattedPhone = formatPhone(signupData.phone)

      const result = await authAPI.verifyOTPSignup({
        phone: formattedPhone,
        otp: waOtp,
        name: signupData.name,
        email: undefined,
        address: {
          street: '',
          city: '',
          state: '',
          zip: ''
        }
      })

      if (result?.token && result?.user) {
        localStorage.setItem('token', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        redirectAfterSignup()
      } else {
        setWaError('Signup failed. Please try again.')
      }
    } catch (err: any) {
      setWaError(err?.message || 'Invalid OTP or signup failed.')
    } finally {
      setLoading(false)
    }
  }

  const resetWhatsAppSignup = () => {
    setWaOtpSent(false)
    setWaOtp('')
    setWaOtpCountdown(0)
    setWaError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8">
          <div className="text-center">
            <h1
              className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.65rem]"
              style={{ fontFamily: 'var(--font-heading-family, inherit)' }}
            >
              Create account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Join NEFOL® and start your beauty journey</p>
            <p className="mt-3 text-sm text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => (window.location.hash = '#/user/login')}
                className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-500"
              >
                Sign in
              </button>
            </p>
          </div>

          <div className="mt-8">
            <label htmlFor="signup-name" className="mb-1.5 block text-xs font-medium text-slate-600">
              Full name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                value={signupData.name}
                onChange={(e) => setSignupData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Email signup */}
          <form onSubmit={handleEmailSignup} className="mt-6 space-y-4">
            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium text-slate-600">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium text-slate-600">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Create a password"
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

            <div>
              <label htmlFor="signup-confirm" className="mb-1.5 block text-xs font-medium text-slate-600">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {oauthError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-center text-sm text-red-800">
              {oauthError}
            </div>
          )}

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
              onClick={handleFacebookSignUp}
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

          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
                <MessageCircle className="h-4 w-4 text-[#128C7E]" aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">WhatsApp OTP</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Sign up with your number—we’ll send a code to WhatsApp. No password needed.
                </p>
              </div>
            </div>

            <form onSubmit={handleWhatsAppSignup} className="mt-4 space-y-3">
              {!waOtpSent ? (
                <PhoneInput
                  value={signupData.phone}
                  onChange={(value) => setSignupData((prev) => ({ ...prev, phone: value }))}
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
                      value={waOtp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setWaOtp(value)
                        setWaError('')
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-xl tracking-[0.35em] text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="••••••"
                    />
                    {waOtpCountdown > 0 && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        Code expires in {Math.floor(waOtpCountdown / 60)}:
                        {(waOtpCountdown % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={resetWhatsAppSignup}
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
                  ? waOtpSent
                    ? 'Verifying…'
                    : 'Sending…'
                  : waOtpSent
                    ? 'Verify and create account'
                    : 'Send code via WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
