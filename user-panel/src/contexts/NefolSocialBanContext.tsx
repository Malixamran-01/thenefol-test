import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getApiBase } from '../utils/apiBase'
import { NEFOL_HASH_ROUTE_CHANGE } from '../utils/hashRouteEvents'
import { useAuth } from './AuthContext'

type BanState = {
  loading: boolean
  blocked: boolean
  banPublicMessage: string | null
  refresh: () => void
}

const NefolSocialBanContext = createContext<BanState | null>(null)

/**
 * Ban status for NEFOL Social authors. Uses a monotonic request id so overlapping fetches
 * do not apply stale results. Route changes refresh via `NEFOL_HASH_ROUTE_CHANGE` from App.
 */
export function NefolSocialBanProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [banPublicMessage, setBanPublicMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const runCheck = useCallback(() => {
    if (!isAuthenticated) {
      requestIdRef.current += 1
      setLoading(false)
      setBlocked(false)
      setBanPublicMessage(null)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      requestIdRef.current += 1
      setLoading(false)
      setBlocked(false)
      setBanPublicMessage(null)
      return
    }

    const myId = ++requestIdRef.current
    setLoading(true)

    void (async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/blog/authors/me`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const data = await r.json().catch(() => ({}))
        if (myId !== requestIdRef.current) return

        if (r.status === 403 && data?.code === 'AUTHOR_BANNED') {
          setBlocked(true)
          setBanPublicMessage(typeof data.ban_public_message === 'string' ? data.ban_public_message : null)
        } else {
          setBlocked(false)
          setBanPublicMessage(null)
        }
      } catch {
        if (myId !== requestIdRef.current) return
        setBlocked(false)
        setBanPublicMessage(null)
      } finally {
        if (myId === requestIdRef.current) {
          setLoading(false)
        }
      }
    })()
  }, [isAuthenticated])

  const refresh = useCallback(() => {
    runCheck()
  }, [runCheck])

  useEffect(() => {
    runCheck()
  }, [runCheck])

  useEffect(() => {
    const onRoute = () => runCheck()
    window.addEventListener(NEFOL_HASH_ROUTE_CHANGE, onRoute)
    return () => window.removeEventListener(NEFOL_HASH_ROUTE_CHANGE, onRoute)
  }, [runCheck])

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
