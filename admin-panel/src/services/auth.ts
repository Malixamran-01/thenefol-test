// Authentication service for admin panel
import apiService from './api'

const getApiBaseUrl = () => {
  // Always use production URL - no environment variables
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If on production domain, use current domain
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      return `${window.location.protocol}//${window.location.host}/api`
    }
    // For any other domain, always use production URL
    // This ensures we never use local IPs or development URLs in production builds
    return 'https://thenefol.com/api'
  }
  // Default to production API URL
  return 'https://thenefol.com/api'
}

// Get API base URL at runtime, not build time
const getApiBaseUrlRuntime = () => getApiBaseUrl()

interface User {
  id: number
  email: string
  name: string
  role: string
  permissions: string[]
}

interface LoginCredentials {
  email: string
  password: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

class AuthService {
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading true
    error: null
  }

  private listeners: Set<(state: AuthState) => void> = new Set()

  constructor() {
    // Initialize auth state from localStorage on service creation
    this.initializeFromStorage()
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private normalizeUser(raw: any): User {
    if (!raw) {
      throw new Error('Invalid user payload')
    }
    const permissions = Array.isArray(raw.permissions)
      ? raw.permissions
      : typeof raw.permissions === 'string'
        ? raw.permissions.split(',').map((p: string) => p.trim()).filter(Boolean)
        : []
    const rolesArray = Array.isArray(raw.roles)
      ? raw.roles
      : typeof raw.roles === 'string'
        ? raw.roles.split(',').map((r: string) => r.trim()).filter(Boolean)
        : []
    return {
      id: raw.id,
      email: raw.email,
      name: raw.name || raw.email,
      role: raw.role || rolesArray[0] || 'admin',
      permissions
    }
  }

  // Initialize auth state from localStorage
  private initializeFromStorage() {
    try {
      const token = this.getToken()
      const userStr = localStorage.getItem('user')

      if (token && userStr) {
        const parsed = JSON.parse(userStr)
        const user = this.normalizeUser(parsed)
        this.authState = {
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      } else {
        // Initialize empty state for production
        this.initializeEmptyState()
      }
    } catch (error) {
      console.error('Failed to initialize auth from storage:', error)
      this.authState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to restore authentication'
      }
    }
  }

  // Initialize empty state for production
  private initializeEmptyState() {
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    }
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.authState }))
  }

  // Helper to check if two auth states are the same
  private areStatesEqual(state1: AuthState, state2: AuthState): boolean {
    if (state1.isAuthenticated !== state2.isAuthenticated) return false
    if (state1.isLoading !== state2.isLoading) return false
    if (state1.error !== state2.error) return false
    
    const user1 = state1.user
    const user2 = state2.user
    
    if (user1 === null && user2 === null) return true
    if (user1 === null || user2 === null) return false
    
    const perms1 = user1.permissions ? [...user1.permissions].sort() : []
    const perms2 = user2.permissions ? [...user2.permissions].sort() : []
    
    return (
      user1.id === user2.id &&
      user1.email === user2.email &&
      user1.role === user2.role &&
      user1.name === user2.name &&
      JSON.stringify(perms1) === JSON.stringify(perms2)
    )
  }

  // Update auth state
  private setAuthState(updates: Partial<AuthState>) {
    const newState = { ...this.authState, ...updates }
    // Only update and notify if the state actually changed
    if (!this.areStatesEqual(this.authState, newState)) {
      this.authState = newState
      this.notifyListeners()
    }
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<boolean> {
    try {
      this.setAuthState({ isLoading: true, error: null })

      // Call authentication API
      const apiBase = getApiBaseUrlRuntime()
      const response = await fetch(`${apiBase}/staff/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      if (response.ok) {
        const data = await response.json()
        const { user: rawUser, token } = data
        const user = this.normalizeUser(rawUser)

        // Store token in localStorage
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user', JSON.stringify(user))

        this.setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })

        return true
      } else {
        const errorData = await response.json().catch(() => ({}))
        this.setAuthState({
          isLoading: false,
          error: errorData.error || errorData.message || 'Login failed. Please check your credentials.'
        })
        return false
      }
    } catch (error) {
      this.setAuthState({
        isLoading: false,
        error: 'Login failed. Please check your credentials.'
      })
      return false
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      const token = this.getToken()
      const apiBase = getApiBaseUrlRuntime()
      if (token) {
        await fetch(`${apiBase}/staff/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {})
      }

      // Clear stored data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')

      this.setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Check if user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      this.setAuthState({ isLoading: true })
      
      const token = this.getToken()
      const userStr = localStorage.getItem('user')

      if (!token || !userStr) {
        this.setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
        return false
      }

      const user = JSON.parse(userStr)
      
      // Validate token with API
      const apiBase = getApiBaseUrlRuntime()
      const response = await fetch(`${apiBase}/staff/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const freshUser = this.normalizeUser(data.user || user)
        localStorage.setItem('user', JSON.stringify(freshUser))

        this.setAuthState({
          user: freshUser,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        return true
      } else {
        // Invalid token, clear storage
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        this.setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
        return false
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // Clear invalid data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      this.setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication check failed'
      })
      return false
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.authState.user
  }

  // Check if user has permission
  hasPermission(permission: string): boolean {
    const user = this.authState.user
    if (!user) return false
    const permissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : typeof (user as any).permissions === 'string'
        ? (user as any).permissions.split(',').map((p: string) => p.trim()).filter(Boolean)
        : []
    return permissions.includes(permission)
  }

  // Check if user has role
  hasRole(role: string): boolean {
    if (!this.authState.user) return false
    return this.authState.user.role === role
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<boolean> {
    try {
      if (!this.authState.user) return false

      const updatedUser = { ...this.authState.user, ...updates }
      
      // Store updated user data
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      this.setAuthState({ user: updatedUser })
      return true
    } catch (error) {
      console.error('Profile update error:', error)
      return false
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<boolean> {
    try {
      const token = this.getToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const apiBase = getApiBaseUrlRuntime()
      const response = await fetch(`${apiBase}/staff/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
      })

      if (response.ok) {
        return true
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.message || 'Failed to update password')
    } catch (error) {
      console.error('Password change error:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const authService = new AuthService()
export default authService
