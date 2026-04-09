import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from './AuthContext'

type BanState = {
  loading: boolean
  blocked: boolean
  banPublicMessage: string | null
  refresh: () => void
}

const NefolSocialBanContext = createContext<BanState | null>(null)

export function NefolSocialBanProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [banPublicMessage, setBanPublicMessage] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const onHash = () => refresh()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [refresh])

  useEffect(() => {
    let cancelled = false

    if (!isAuthenticated) {
      setLoading(false)
      setBlocked(false)
      setBanPublicMessage(null)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      setBlocked(false)
      setBanPublicMessage(null)
      return
    }

    setLoading(true)

    void (async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/blog/authors/me`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const data = await r.json().catch(() => ({}))
        if (cancelled) return

        if (r.status === 403 && data?.code === 'AUTHOR_BANNED') {
          setBlocked(true)
          setBanPublicMessage(typeof data.ban_public_message === 'string' ? data.ban_public_message : null)
        } else {
          setBlocked(false)
          setBanPublicMessage(null)
        }
      } catch {
        if (!cancelled) {
          setBlocked(false)
          setBanPublicMessage(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, tick])

  const value = useMemo(
    () => ({ loading, blocked, banPublicMessage, refresh }),
    [loading, blocked, banPublicMessage, refresh]
  )

  return <NefolSocialBanContext.Provider value={value}>{children}</NefolSocialBanContext.Provider>
}

export function useNefolSocialBan(): BanState {
  const ctx = useContext(NefolSocialBanContext)
  if (!ctx) {
    return {
      loading: false,
      blocked: false,
      banPublicMessage: null,
      refresh: () => {},
    }
  }
  return ctx
}
