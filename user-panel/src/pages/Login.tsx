import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Mail, Lock, Eye, EyeOff, MessageCircle } from 'lucide-react'
import PhoneInput from '../components/PhoneInput'

// Google OAuth
declare global {
  interface Window {
    google?: any
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [useWhatsAppLogin, setUseWhatsAppLogin] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [loginPhone, setLoginPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoaded, setGoogleLoaded] = useState(false)

  const otpTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { login, loginWithWhatsApp, loginWithGoogle, error: authError } = useAuth()

  // Load Google Sign-In script
  React.useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      setGoogleLoaded(true)
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '798899732644-k6v9e5o3p1uuikrfm8rlmq59n8icp5jc.apps.googleusercontent.com',
          callback: handleGoogleResponse
        })
      }
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // ✅ SINGLE SOURCE OF REDIRECT TRUTH
  const redirectAfterLogin = () => {
    const redirect = sessionStorage.getItem('post_login_redirect')
    if (redirect) {
      sessionStorage.removeItem('post_login_redirect')
      window.location.hash = redirect
    } else {
      window.location.hash = '#/user/'
    }
  }

  // Handle Google Sign-In response
  const handleGoogleResponse = async (response: any) => {
    try {
      setLoading(true)
      setError('')
      
      const success = await loginWithGoogle(response.credential)
      
      if (success) {
        redirectAfterLogin()
      } else {
        setError(authError || 'Google login failed')
      }
    } catch (err) {
      setError('Google login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Sign-In button click
  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt()
    }
  }

  const startOtpTimer = () => {
    if (otpTimerRef.current) clearInterval(otpTimerRef.current)
    setOtpCountdown(600)

    otpTimerRef.current = setInterval(() => {
      setOtpCountdown(prev => {
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

  // ---------------- LOGIN ----------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (useWhatsAppLogin) {
      if (!otpSent) {
        if (!loginPhone) {
          setError('Please enter your phone number')
          setLoading(false)
          return
        }

        try {
          const formattedPhone = formatPhone(loginPhone)
          await authAPI.sendOTPLogin(formattedPhone)
          setOtpSent(true)
          startOtpTimer()
        } catch (err: any) {
          setError(err?.message || 'Failed to send OTP.')
        } finally {
          setLoading(false)
        }
      } else {
        if (!otp || otp.length !== 6) {
          setError('Please enter a valid 6-digit OTP')
          setLoading(false)
          return
        }

        try {
          const formattedPhone = formatPhone(loginPhone)
          const success = await loginWithWhatsApp(formattedPhone, otp)

          if (!success) {
            setError(authError || 'Login failed')
          } else {
            redirectAfterLogin()
          }
        } catch (err: any) {
          setError(err?.message || 'Invalid OTP or login failed.')
        } finally {
          setLoading(false)
        }
      }
    } else {
      try {
        const success = await login(email, password)
        if (!success) {
          setError(authError || 'Login failed')
        } else {
          redirectAfterLogin()
        }
      } catch {
        setError('Login failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 
            className="mt-6 text-center text-3xl sm:text-4xl font-light tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Sign in to your account
          </h2>
          <p 
            className="mt-2 text-center text-sm font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Welcome back to NEFOL®
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {(
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Toggle between email/password and WhatsApp login */}
              <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUseWhatsAppLogin(false)
                    setOtpSent(false)
                    setOtp('')
                    setLoginPhone('')
                    setError('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-xs font-light transition-all duration-300 tracking-[0.1em] uppercase ${
                    !useWhatsAppLogin
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ letterSpacing: '0.1em' }}
                >
                  Email Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseWhatsAppLogin(true)
                    setOtpSent(false)
                    setOtp('')
                    setEmail('')
                    setPassword('')
                    setError('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-xs font-light transition-all duration-300 tracking-[0.1em] uppercase ${
                    useWhatsAppLogin
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ letterSpacing: '0.1em' }}
                >
                  <MessageCircle className="inline-block w-3 h-3 mr-1" />
                  WhatsApp Login
                </button>
              </div>

              {useWhatsAppLogin && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs font-light text-blue-800" style={{ letterSpacing: '0.02em' }}>
                    {otpSent 
                      ? 'Enter the 6-digit OTP sent to your WhatsApp number'
                      : 'Login quickly with WhatsApp OTP verification. No password required!'}
                  </p>
                </div>
              )}

              {useWhatsAppLogin ? (
                <>
                  {!otpSent ? (
                    <div>
                      <PhoneInput
                        value={loginPhone}
                        onChange={(value) => setLoginPhone(value)}
                        onCountryCodeChange={setCountryCode}
                        defaultCountry={countryCode}
                        placeholder="Enter your phone number"
                        required
                        showLabel
                        label="Phone Number"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                          Enter OTP
                        </label>
                        <div className="relative mb-3">
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={otp}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '')
                              setOtp(value)
                              setError('')
                            }}
                            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all text-center text-2xl tracking-widest"
                            style={{ letterSpacing: '0.1em' }}
                            placeholder="000000"
                          />
                        </div>
                        {otpCountdown > 0 && (
                          <p className="text-xs text-slate-500 mb-2 text-center">
                            OTP expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false)
                              setOtp('')
                              setOtpCountdown(0)
                              setError('')
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 underline"
                          >
                            Resend OTP
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white py-3 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        style={{ letterSpacing: '0.02em', paddingLeft: '3rem', paddingRight: '3rem' }}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white py-3 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        style={{ letterSpacing: '0.02em', paddingLeft: '3rem', paddingRight: '3rem' }}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          // Navigate via hash routing to in-app reset password page
                          window.location.hash = '#/user/reset-password'
                        }}
                        className="text-xs font-light text-slate-600 hover:text-slate-900 underline tracking-[0.08em]"
                        style={{ letterSpacing: '0.08em' }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="text-slate-600 bg-slate-50 p-3 rounded-md text-sm font-light" style={{ letterSpacing: '0.02em' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-6 border border-transparent text-xs font-light tracking-[0.15em] uppercase text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgb(75,151,201)',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'
                }}
              >
                {loading 
                  ? (useWhatsAppLogin && !otpSent ? 'Sending OTP...' : useWhatsAppLogin && otpSent ? 'Verifying...' : 'Signing In...')
                  : (useWhatsAppLogin && !otpSent ? 'Send OTP via WhatsApp' : useWhatsAppLogin && otpSent ? 'Verify OTP & Sign In' : 'Sign In')
                }
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-500 font-light tracking-[0.1em]">Or</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || !googleLoaded}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-slate-300 rounded-md text-sm font-light text-slate-700 transition-all duration-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ letterSpacing: '0.02em' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="text-center">
            <p className="text-sm font-light text-slate-600" style={{ letterSpacing: '0.02em' }}>
              Don't have an account?{' '}
              <button
                onClick={() => window.location.hash = '#/user/signup'}
                className="font-light text-slate-900 hover:underline transition-all"
                style={{ letterSpacing: '0.05em' }}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}