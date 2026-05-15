import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getApiBase } from '../utils/apiBase'

interface User {
  id: number
  unique_user_id?: string
  name: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  profile_photo?: string
  loyalty_points: number
  total_orders: number
  member_since: string
  is_verified: boolean
  email_edited?: boolean
  phone_edited?: boolean
}

interface SignupData {
  name: string
  email: string
  password: string
  phone: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
}

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithWhatsApp: (phone: string, otp: string) => Promise<boolean>
  loginWithGoogle: (accessToken: string) => Promise<boolean>
  loginWithFacebook: (accessToken: string, userID: string) => Promise<boolean>
  signup: (userData: SignupData) => Promise<boolean>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AUTH_CONTEXT_DEFAULT: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async () => false,
  loginWithWhatsApp: async () => false,
  loginWithGoogle: async () => false,
  loginWithFacebook: async () => false,
  signup: async () => false,
  logout: () => {},
  updateProfile: async () => false,
  refreshUser: async () => {},
}

const AuthContext = createContext(AUTH_CONTEXT_DEFAULT)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const userRef = useRef<User | null>(null)
  userRef.current = user

  const checkAuth = useCallback(async () => {
    const myId = ++requestIdRef.current
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (myId !== requestIdRef.current) return

        if (response.ok) {
          const nextUser = await response.json()
          setUser(nextUser)
          setIsAuthenticated(true)
          localStorage.setItem('user', JSON.stringify(nextUser))
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
          setIsAuthenticated(false)
        }
      }
    } catch (err) {
      if (myId !== requestIdRef.current) return
      console.error('Auth check failed:', err)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      if (myId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const myId = ++requestIdRef.current
    setError(null)
    setIsLoading(true)

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (myId !== requestIdRef.current) return false

      if (response.ok) {
        const data = await response.json()
        const { user: nextUser, token } = data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(nextUser))
        setUser(nextUser)
        setIsAuthenticated(true)
        return true
      }

      const errorData = await response.json()
      setError(errorData.message || 'Login failed')
      return false
    } catch {
      if (myId !== requestIdRef.current) return false
      setError('Network error. Please try again.')
      return false
    } finally {
      if (myId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const loginWithWhatsApp = useCallback(async (phone: string, otp: string): Promise<boolean> => {
    const myId = ++requestIdRef.current
    setError(null)
    setIsLoading(true)

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/verify-otp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })

      if (myId !== requestIdRef.current) return false

      if (response.ok) {
        const data = await response.json()
        const { user: nextUser, token } = data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(nextUser))
        setUser(nextUser)
        setIsAuthenticated(true)
        return true
      }

      const errorData = await response.json()
      setError(errorData.message || 'Login failed')
      return false
    } catch {
      if (myId !== requestIdRef.current) return false
      setError('Network error. Please try again.')
      return false
    } finally {
      if (myId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const loginWithGoogle = useCallback(async (accessToken: string): Promise<boolean> => {
    const myId = ++requestIdRef.current
    setError(null)
    setIsLoading(true)

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })

      if (myId !== requestIdRef.current) return false

      if (response.ok) {
        const data = await response.json()
        const { user: nextUser, token } = data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(nextUser))
        setUser(nextUser)
        setIsAuthenticated(true)
        return true
      }

      const errorData = await response.json()
      setError(errorData.error || errorData.message || 'Google login failed')
      return false
    } catch {
      if (myId !== requestIdRef.current) return false
      setError('Network error. Please try again.')
      return false
    } finally {
      if (myId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const loginWithFacebook = useCallback(
    async (accessToken: string, userID: string): Promise<boolean> => {
      const myId = ++requestIdRef.current
      setError(null)
      setIsLoading(true)

      try {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/auth/facebook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, userID }),
        })

        if (myId !== requestIdRef.current) return false

        if (response.ok) {
          const data = await response.json()
          const { user: nextUser, token } = data
          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify(nextUser))
          setUser(nextUser)
          setIsAuthenticated(true)
          return true
        }

        const errorData = await response.json()
        setError(errorData.error || errorData.message || 'Facebook login failed')
        return false
      } catch {
        if (myId !== requestIdRef.current) return false
        setError('Network error. Please try again.')
        return false
      } finally {
        if (myId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  const signup = useCallback(async (userData: SignupData): Promise<boolean> => {
    const myId = ++requestIdRef.current
    setError(null)
    setIsLoading(true)

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (myId !== requestIdRef.current) return false

      if (response.ok) {
        const data = await response.json()
        const { user: nextUser, token } = data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(nextUser))
        setUser(nextUser)
        setIsAuthenticated(true)
        return true
      }

      const errorData = await response.json()
      setError(errorData.message || 'Signup failed')
      return false
    } catch {
      if (myId !== requestIdRef.current) return false
      setError('Network error. Please try again.')
      return false
    } finally {
      if (myId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const logout = useCallback(() => {
    requestIdRef.current += 1
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
    window.location.hash = '#/user/login'
    window.location.reload()
  }, [])

  const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
    const currentUser = userRef.current
    if (!currentUser) return false

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        return true
      }
      return false
    } catch (err) {
      console.error('Profile update failed:', err)
      return false
    }
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('token')
    if (!token) return

    const myId = ++requestIdRef.current

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (myId !== requestIdRef.current) return

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (err) {
      if (myId !== requestIdRef.current) return
      console.error('Failed to refresh user data:', err)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      loginWithWhatsApp,
      loginWithGoogle,
      loginWithFacebook,
      signup,
      logout,
      updateProfile,
      refreshUser,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      loginWithWhatsApp,
      loginWithGoogle,
      loginWithFacebook,
      signup,
      logout,
      updateProfile,
      refreshUser,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === AUTH_CONTEXT_DEFAULT) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
