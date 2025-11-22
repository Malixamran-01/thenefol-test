import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, MessageCircle } from 'lucide-react'
import PhoneInput from '../components/PhoneInput'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [useOTP, setUseOTP] = useState(false)
  const [useWhatsAppLogin, setUseWhatsAppLogin] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [loginPhone, setLoginPhone] = useState('')
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  })
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, loginWithWhatsApp, signup, error: authError } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (useWhatsAppLogin) {
      // WhatsApp login flow
      if (!otpSent) {
        // Send OTP
        if (!loginPhone) {
          setError('Please enter your phone number')
          setLoading(false)
          return
        }

        try {
          // Format phone: remove + from country code and combine with phone number
          const countryCodeDigits = countryCode.replace(/[^0-9]/g, '')
          const phoneDigits = loginPhone.replace(/\D/g, '')
          const formattedPhone = `${countryCodeDigits}${phoneDigits}`
          console.log('📱 Sending login OTP to:', formattedPhone)
          await authAPI.sendOTPLogin(formattedPhone)
          setOtpSent(true)
          setOtpCountdown(600) // 10 minutes
          
          // Start countdown timer
          const timer = setInterval(() => {
            setOtpCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        } catch (err: any) {
          setError(err?.message || 'Failed to send OTP. Please try again.')
        } finally {
          setLoading(false)
        }
      } else {
        // Verify OTP and login
        if (!otp || otp.length !== 6) {
          setError('Please enter a valid 6-digit OTP')
          setLoading(false)
          return
        }

        try {
          const formattedPhone = `${countryCode}${loginPhone.replace(/\D/g, '')}`
          const success = await loginWithWhatsApp(formattedPhone, otp)
          if (!success) {
            setError(authError || 'Login failed')
          } else {
            // Redirect to home page
            window.location.hash = '#/user/'
          }
        } catch (err: any) {
          setError(err?.message || 'Invalid OTP or login failed. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    } else {
      // Regular email/password login
      try {
        const success = await login(email, password)
        if (!success) {
          setError(authError || 'Login failed')
        } else {
          // Redirect to home page
          window.location.hash = '#/user/'
        }
      } catch (err) {
        setError('Login failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (useOTP) {
      // OTP signup flow
      if (!otpSent) {
        // Send OTP
        if (!signupData.phone) {
          setError('Please enter your phone number')
          return
        }

        setLoading(true)
        try {
          // Format phone: remove + from country code and combine with phone number
          const countryCodeDigits = countryCode.replace(/[^0-9]/g, '')
          const phoneDigits = signupData.phone.replace(/\D/g, '')
          const formattedPhone = `${countryCodeDigits}${phoneDigits}`
          console.log('📱 Sending signup OTP to:', formattedPhone)
          await authAPI.sendOTP(formattedPhone)
          setOtpSent(true)
          setOtpCountdown(600) // 10 minutes
          
          // Start countdown timer
          const timer = setInterval(() => {
            setOtpCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        } catch (err: any) {
          setError(err?.message || 'Failed to send OTP. Please try again.')
        } finally {
          setLoading(false)
        }
      } else {
        // Verify OTP and create account
        if (!otp || otp.length !== 6) {
          setError('Please enter a valid 6-digit OTP')
          return
        }

        if (!signupData.name) {
          setError('Please enter your name')
          return
        }

        setLoading(true)
        try {
          const formattedPhone = `${countryCode}${signupData.phone.replace(/\D/g, '')}`
          const result = await authAPI.verifyOTPSignup({
            phone: formattedPhone,
            otp: otp,
            name: signupData.name,
            email: signupData.email || undefined,
            address: signupData.address
          })

          if (result.token && result.user) {
            localStorage.setItem('token', result.token)
            localStorage.setItem('user', JSON.stringify(result.user))
            // Redirect to home page
            window.location.hash = '#/user/'
          } else {
            setError('Signup failed. Please try again.')
          }
        } catch (err: any) {
          setError(err?.message || 'Invalid OTP or signup failed. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    } else {
      // Regular signup flow
      if (signupData.password !== signupData.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      setLoading(true)

      try {
        const success = await signup({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
          phone: `${countryCode}${signupData.phone.replace(/\D/g, '')}`,
          address: signupData.address
        })

        if (!success) {
          setError(authError || 'Signup failed')
        } else {
          // Redirect to home page
          window.location.hash = '#/user/'
        }
      } catch (err) {
        setError('Signup failed. Please try again.')
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
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            {isSignup ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p 
            className="mt-2 text-center text-sm font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            {isSignup ? 'Join Nefol and start your beauty journey' : 'Welcome back to Nefol'}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Toggle between login and signup */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2 px-4 rounded-md text-xs font-light transition-all duration-300 tracking-[0.1em] uppercase ${
                !isSignup
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ letterSpacing: '0.1em' }}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2 px-4 rounded-md text-xs font-light transition-all duration-300 tracking-[0.1em] uppercase ${
                isSignup
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ letterSpacing: '0.1em' }}
            >
              Sign Up
            </button>
          </div>

          {isSignup ? (
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Toggle between OTP and regular signup */}
              <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUseOTP(false)
                    setOtpSent(false)
                    setOtp('')
                    setError('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-xs font-light transition-all duration-300 tracking-[0.1em] uppercase ${
                    !useOTP
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ letterSpacing: '0.1em' }}
                >
                  Email Signup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseOTP(true)
                    setOtpSent(false)
                    setOtp('')
                    setError('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-xs font-light transition-all duration-300 tracking-[0.1em] uppercase ${
                    useOTP
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ letterSpacing: '0.1em' }}
                >
                  <MessageCircle className="inline-block w-3 h-3 mr-1" />
                  WhatsApp OTP
                </button>
              </div>

              {useOTP && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs font-light text-blue-800" style={{ letterSpacing: '0.02em' }}>
                    {otpSent 
                      ? 'Enter the 6-digit OTP sent to your WhatsApp number'
                      : 'Sign up quickly with WhatsApp OTP verification. No password required!'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={signupData.name}
                    onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {!useOTP && (
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      style={{ letterSpacing: '0.02em' }}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
              )}

              {useOTP && !otpSent && (
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      style={{ letterSpacing: '0.02em' }}
                      placeholder="Enter your email (optional)"
                    />
                  </div>
                </div>
              )}

              <div>
                <PhoneInput
                  value={signupData.phone}
                  onChange={(value) => setSignupData(prev => ({ ...prev, phone: value }))}
                  onCountryCodeChange={setCountryCode}
                  defaultCountry={countryCode}
                  placeholder="Enter your phone number"
                  required
                  showLabel
                  label="Phone Number"
                  disabled={otpSent}
                />
              </div>

              {useOTP && otpSent && (
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    Enter OTP
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
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
                      className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all text-center text-2xl tracking-widest"
                      style={{ letterSpacing: '0.1em' }}
                      placeholder="000000"
                    />
                  </div>
                  {otpCountdown > 0 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      OTP expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
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
                    className="text-xs text-slate-600 hover:text-slate-900 mt-2 underline"
                  >
                    Resend OTP
                  </button>
                </div>
              )}

              {!useOTP && (
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    Address
                  </label>
                <div className="relative mb-2">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={signupData.address.street}
                    onChange={(e) => setSignupData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="Street Address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    required
                    value={signupData.address.city}
                    onChange={(e) => setSignupData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    required
                    value={signupData.address.state}
                    onChange={(e) => setSignupData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="State"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={signupData.address.zip}
                  onChange={(e) => setSignupData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, zip: e.target.value }
                  }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                  style={{ letterSpacing: '0.02em' }}
                  placeholder="ZIP Code"
                />
                </div>
              )}

              {useOTP && !otpSent && (
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    Address (Optional)
                  </label>
                  <div className="relative mb-2">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={signupData.address.street}
                      onChange={(e) => setSignupData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      style={{ letterSpacing: '0.02em' }}
                      placeholder="Street Address (optional)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={signupData.address.city}
                      onChange={(e) => setSignupData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      style={{ letterSpacing: '0.02em' }}
                      placeholder="City (optional)"
                    />
                    <input
                      type="text"
                      value={signupData.address.state}
                      onChange={(e) => setSignupData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, state: e.target.value }
                      }))}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      style={{ letterSpacing: '0.02em' }}
                      placeholder="State (optional)"
                    />
                  </div>
                  <input
                    type="text"
                    value={signupData.address.zip}
                    onChange={(e) => setSignupData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, zip: e.target.value }
                    }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="ZIP Code (optional)"
                  />
                </div>
              )}

              {!useOTP && (
                <>
                  <div>
                    <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                      Password
                    </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={signupData.password}
                    onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="Confirm your password"
                  />
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
                  backgroundColor: 'var(--arctic-blue-primary)',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                {loading 
                  ? (useOTP && !otpSent ? 'Sending OTP...' : useOTP && otpSent ? 'Verifying...' : 'Creating Account...')
                  : (useOTP && !otpSent ? 'Send OTP via WhatsApp' : useOTP && otpSent ? 'Verify OTP & Sign Up' : 'Create Account')
                }
              </button>
            </form>
          ) : (
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
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
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
                            className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all text-center text-2xl tracking-widest"
                            style={{ letterSpacing: '0.1em' }}
                            placeholder="000000"
                          />
                        </div>
                        {otpCountdown > 0 && (
                          <p className="text-xs text-slate-500 mt-2 text-center">
                            OTP expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
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
                          className="text-xs text-slate-600 hover:text-slate-900 mt-2 underline"
                        >
                          Resend OTP
                        </button>
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
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        style={{ letterSpacing: '0.02em' }}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-light text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                        style={{ letterSpacing: '0.02em' }}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                  backgroundColor: 'var(--arctic-blue-primary)',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                {loading 
                  ? (useWhatsAppLogin && !otpSent ? 'Sending OTP...' : useWhatsAppLogin && otpSent ? 'Verifying...' : 'Signing In...')
                  : (useWhatsAppLogin && !otpSent ? 'Send OTP via WhatsApp' : useWhatsAppLogin && otpSent ? 'Verify OTP & Sign In' : 'Sign In')
                }
              </button>
            </form>
          )}

          <div className="text-center">
            <p className="text-sm font-light text-slate-600" style={{ letterSpacing: '0.02em' }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="font-light text-slate-900 hover:underline transition-all"
                style={{ letterSpacing: '0.05em' }}
              >
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}




