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
import { deferStateWork } from '../utils/deferStateWork'
import { NEFOL_HASH_ROUTE_CHANGE } from '../utils/hashRouteEvents'
import { useAuth } from './AuthContext'

export type BanState = {
  loading: boolean
  blocked: boolean
  banPublicMessage: string | null
  refresh: () => void
}

const BAN_CONTEXT_DEFAULT: BanState = {
  loading: false,
  blocked: false,
  banPublicMessage: null,
  refresh: () => {},
}

const NefolSocialBanContext = createContext(BAN_CONTEXT_DEFAULT)

export function NefolSocialBanProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated

  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [banPublicMessage, setBanPublicMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const applyUnauthenticated = useCallback(() => {
    requestIdRef.current += 1
    setLoading(false)
    setBlocked(false)
    setBanPublicMessage(null)
  }, [])

  const runCheck = useCallback(() => {
    if (!isAuthenticatedRef.current) {
      applyUnauthenticated()
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      applyUnauthenticated()
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
          setBanPublicMessage(
            typeof data.ban_public_message === 'string' ? data.ban_public_message : null
          )
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
  }, [applyUnauthenticated])

  const runCheckRef = useRef(runCheck)
  runCheckRef.current = runCheck

  const refresh = useCallback(() => {
    deferStateWork(() => runCheckRef.current())
  }, [])

  useEffect(() => {
    runCheck()
  }, [isAuthenticated, runCheck])

  useEffect(() => {
    const onRoute = () => {
      deferStateWork(() => runCheckRef.current())
    }
    window.addEventListener(NEFOL_HASH_ROUTE_CHANGE, onRoute)
    return () => window.removeEventListener(NEFOL_HASH_ROUTE_CHANGE, onRoute)
  }, [])

  const value = useMemo(
    () => ({ loading, blocked, banPublicMessage, refresh }),
    [loading, blocked, banPublicMessage, refresh]
  )

  return <NefolSocialBanContext.Provider value={value}>{children}</NefolSocialBanContext.Provider>
}

export function useNefolSocialBan(): BanState {
  return useContext(NefolSocialBanContext)
}
