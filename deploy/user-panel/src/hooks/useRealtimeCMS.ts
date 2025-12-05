import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { cmsService, CMSPageData } from '../services/cms'

interface CMSUpdateEvent {
  event: string
  data: any
  timestamp: number
}

/**
 * Real-time CMS Hook
 * Automatically updates content when changes are made in admin panel
 * 
 * Usage:
 * ```tsx
 * const { content, loading } = useRealtimeCMS('home')
 * ```
 */
export function useRealtimeCMS(pageName: string) {
  const [content, setContent] = useState<CMSPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [socket, setSocket] = useState<Socket | null>(null)

  // Load initial content
  const loadContent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await cmsService.getPageContent(pageName)
      setContent(data)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [pageName])

  // Refresh specific section
  const refreshSection = useCallback(async (sectionKey: string) => {
    try {
      const section = await cmsService.getSection(pageName, sectionKey)
      if (section && content) {
        setContent({
          ...content,
          sections: content.sections.map(s => 
            s.section_key === sectionKey ? section : s
          )
        })
        setLastUpdate(new Date())
      }
    } catch (err) {
      console.error('Failed to refresh section:', err)
    }
  }, [pageName, content])

  // Initial load
  useEffect(() => {
    loadContent()
  }, [loadContent])

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://thenefol.com/api'
    
    const socketConnection = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10
    })

    socketConnection.on('connect', () => {
      console.log('✅ Real-time CMS connected')
    })

    socketConnection.on('disconnect', () => {
      console.log('❌ Real-time CMS disconnected')
    })

    // Listen for CMS updates
    socketConnection.on('cms-update', async (update: CMSUpdateEvent) => {
      console.log('📡 CMS Update received:', update.event, update.data)

      // Check if update is relevant to current page
      const isRelevant = update.data.page_name === pageName

      switch (update.event) {
        case 'page_updated':
          if (isRelevant) {
            console.log('🔄 Refreshing page content...')
            await loadContent()
          }
          break

        case 'section_created':
        case 'section_updated':
          if (isRelevant) {
            console.log('🔄 Refreshing section:', update.data.section_key)
            await refreshSection(update.data.section_key)
          }
          break

        case 'section_deleted':
          if (isRelevant) {
            console.log('🔄 Reloading page after section deletion')
            await loadContent()
          }
          break

        case 'setting_updated':
        case 'setting_created':
          // Settings are global, refresh regardless
          console.log('🔄 Settings updated, refreshing...')
          await loadContent()
          break
      }
    })

    setSocket(socketConnection)

    return () => {
      socketConnection.disconnect()
    }
  }, [pageName, loadContent, refreshSection])

  return {
    content,
    loading,
    error,
    lastUpdate,
    isConnected: socket?.connected || false,
    refresh: loadContent
  }
}

/**
 * Simple real-time section hook
 * For components that only need one section
 */
export function useRealtimeSection(pageName: string, sectionKey: string) {
  const { content, loading, error, lastUpdate, isConnected } = useRealtimeCMS(pageName)
  
  const section = content?.sections.find(s => s.section_key === sectionKey) || null

  return {
    section,
    loading,
    error,
    lastUpdate,
    isConnected
  }
}

/**
 * Real-time settings hook
 * For global settings that update across all pages
 */
export function useRealtimeSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState<Socket | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const data = await cmsService.getSettings()
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://thenefol.com/api'
    
    const socketConnection = io(API_BASE, {
      transports: ['websocket', 'polling']
    })

    socketConnection.on('cms-update', async (update: CMSUpdateEvent) => {
      if (update.event === 'setting_updated' || update.event === 'setting_created') {
        console.log('⚙️ Settings updated, refreshing...')
        await loadSettings()
      }
    })

    setSocket(socketConnection)

    return () => {
      socketConnection.disconnect()
    }
  }, [loadSettings])

  return {
    settings,
    loading,
    isConnected: socket?.connected || false,
    getSetting: (key: string, defaultValue: any = null) => settings[key] || defaultValue
  }
}

