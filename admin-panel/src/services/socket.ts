// Socket.IO client service for real-time updates
import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Function[]> = new Map()
  private isConnecting: boolean = false

  connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.socket?.connected || this.isConnecting) return

    this.isConnecting = true
    const socketHost = (import.meta.env.VITE_BACKEND_HOST as string) || (import.meta.env.VITE_API_HOST as string) || 'localhost'
    const socketPort = (import.meta.env.VITE_BACKEND_PORT as string) || (import.meta.env.VITE_API_PORT as string) || '2000'
    const socketUrl = import.meta.env.VITE_API_URL || `http://${socketHost}:${socketPort}`
    
    // If socket exists but not connected, clean it up first
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5
    })

    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.isConnecting = false
      // Join admin panel room
      this.socket?.emit('join-admin')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      this.isConnecting = false
    })

    this.socket.on('update', (data) => {
      console.log('Received update:', data)
      // Notify listeners with the full data object, not just data.data
      this.notifyListeners('update', data)
      // Also notify with specific type for backward compatibility
      if (data.type) {
        this.notifyListeners(data.type, data.data || data)
      }
    })

    // Live chat events passthrough
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
      const wasConnected = this.socket.connected
      // Remove all listeners before disconnecting to prevent memory leaks
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.isConnecting = false
      if (wasConnected) {
        console.log('Socket disconnected')
      }
    }
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

  // Emit events to server
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// Export singleton instance
export const socketService = new SocketService()
export default socketService


