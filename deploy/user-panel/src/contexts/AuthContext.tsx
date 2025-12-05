import React, { createContext, useContext, useEffect, useState } from 'react'
import { getApiBase } from '../utils/apiBase'

interface User {
  id: number
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
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithWhatsApp: (phone: string, otp: string) => Promise<boolean>
  signup: (userData: SignupData) => Promise<boolean>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<boolean>
  refreshUser: () => Promise<void>
}

interface SignupData {
  name: string
  email: string
  password: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        // Validate token with backend
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const user = await response.json()
          setUser(user)
          setIsAuthenticated(true)
          localStorage.setItem('user', JSON.stringify(user))
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
          setIsAuthenticated(false)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      setIsLoading(true)

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        const { user, token } = data

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        setUser(user)
        setIsAuthenticated(true)
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Login failed')
        return false
      }
    } catch (error) {
      setError('Network error. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithWhatsApp = async (phone: string, otp: string): Promise<boolean> => {
    try {
      setError(null)
      setIsLoading(true)

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/verify-otp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      })

      if (response.ok) {
        const data = await response.json()
        const { user, token } = data

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        setUser(user)
        setIsAuthenticated(true)
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Login failed')
        return false
      }
    } catch (error) {
      setError('Network error. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      setError(null)
      setIsLoading(true)

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        const data = await response.json()
        const { user, token } = data

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        setUser(user)
        setIsAuthenticated(true)
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Signup failed')
        return false
      }
    } catch (error) {
      setError('Network error. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
  }

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      if (!user) return false

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        return true
      }
      return false
    } catch (error) {
      console.error('Profile update failed:', error)
      return false
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithWhatsApp,
    signup,
    logout,
    updateProfile,
    refreshUser
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
