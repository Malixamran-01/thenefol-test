// Socket.IO client service for real-time updates in user panel
import { io, Socket } from 'socket.io-client'

class UserSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Function[]> = new Map()
  private userId: string | null = null

  connect(userId?: string) {
    if (this.socket?.connected) return

    this.userId = userId || this.getUserIdFromStorage()

    // Determine socket URL based on runtime environment
    let socketUrl: string
    
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const protocol = window.location.protocol
      
      // CRITICAL: Production check FIRST - always use production domain
      if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
        // Production domain - always use WSS
        socketUrl = `wss://${hostname}/socket.io`
        console.log('🔌 [Socket] Production detected, using:', socketUrl)
      } else if (protocol === 'https:') {
        // If on HTTPS (any domain), use WSS with current hostname
        socketUrl = `wss://${hostname}/socket.io`
        console.log('🔌 [Socket] HTTPS detected, using WSS:', socketUrl)
      } else {
        // For HTTP (development only), use production WSS
        // This ensures we never use local IPs in production builds
        socketUrl = 'wss://thenefol.com/socket.io'
        console.log('🔌 [Socket] Non-production HTTP detected, using production WSS:', socketUrl)
      }
    } else {
      // Server-side fallback
      socketUrl = 'wss://thenefol.com/socket.io'
    }
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    this.socket.on('connect', () => {
      console.log('User connected to server:', this.socket?.id)
      
      // Join user-specific room
      if (this.userId) {
        this.socket?.emit('join-user', { 
          userId: this.userId,
          timestamp: new Date().toISOString()
        })
      }
      
      // Join general users room
      this.socket?.emit('join-users-room')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('User disconnected from server:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // Listen for cart sync updates
    this.socket.on('cart-sync', (data) => {
      console.log('Cart sync received:', data)
      this.notifyListeners('cart-sync', data)
    })

    // Listen for notifications
    this.socket.on('notification', (data) => {
      console.log('Notification received:', data)
      this.notifyListeners('notification', data)
    })

    // Listen for order updates
    this.socket.on('order-update', (data) => {
      console.log('Order update received:', data)
      this.notifyListeners('order-update', data)
    })

    // Listen for product updates
    this.socket.on('product-update', (data) => {
      console.log('Product update received:', data)
      this.notifyListeners('product-update', data)
    })

    // Listen for real-time messages
    this.socket.on('message', (data) => {
      console.log('Message received:', data)
      this.notifyListeners('message', data)
    })

    // Live chat events
    this.socket.on('live-chat:message', (data) => {
      this.notifyListeners('live-chat:message', data)
    })
    this.socket.on('live-chat:typing', (data) => {
      this.notifyListeners('live-chat:typing', data)
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Track page views
  trackPageView(page: string, additionalData?: any) {
    if (!this.socket?.connected) return

    const data = {
      page,
      userId: this.userId,
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      ...additionalData
    }

    console.log('Tracking page view:', data)
    this.socket.emit('page-view', data)
  }

  // Track cart updates
  trackCartUpdate(action: string, data: any) {
    if (!this.socket?.connected) return

    const trackData = {
      action,
      data,
      userId: this.userId,
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString()
    }

    console.log('Tracking cart update:', trackData)
    this.socket.emit('cart-update', trackData)
  }

  // Track user actions
  trackUserAction(action: string, data: any) {
    if (!this.socket?.connected) return

    const trackData = {
      action,
      data,
      userId: this.userId,
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      page: window.location.hash.replace('#', '') || '/'
    }

    console.log('Tracking user action:', trackData)
    this.socket.emit('user-action', trackData)
  }

  // Track product views
  trackProductView(productId: number | string, productName: string, additionalData?: any) {
    this.trackUserAction('product-view', {
      productId,
      productName,
      ...additionalData
    })
  }

  // Track search queries
  trackSearch(query: string, resultsCount: number) {
    this.trackUserAction('search', {
      query,
      resultsCount
    })
  }

  // Subscribe to specific update types
  subscribe(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)?.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(type)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // Notify all listeners for a specific type
  private notifyListeners(type: string, data: any) {
    const callbacks = this.listeners.get(type)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // Emit custom events
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Get user ID from localStorage
  private getUserIdFromStorage(): string | null {
    try {
      const user = localStorage.getItem('user')
      if (user) {
        const userData = JSON.parse(user)
        return userData.id?.toString() || null
      }
    } catch (error) {
      console.error('Failed to get user ID:', error)
    }
    return null
  }

  // Get or create session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }

  // Update user ID
  setUserId(userId: string) {
    this.userId = userId
    if (this.socket?.connected) {
      this.socket.emit('join-user', { 
        userId,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Export singleton instance
export const userSocketService = new UserSocketService()
export default userSocketService

