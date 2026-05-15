import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { creatorProgramAPI } from '../services/api'

export const CREATOR_PROGRAM_BADGES_REFRESH = 'creator-program-badges-refresh'

export type CreatorProgramBadgeState = {
  total: number
  collab: number
  tasks: number
  affiliate: number
  revenue: number
  loading: boolean
  refresh: () => void
}

type BadgeCounts = {
  total: number
  collab: number
  tasks: number
  affiliate: number
  revenue: number
}

const EMPTY_BADGES: BadgeCounts = {
  total: 0,
  collab: 0,
  tasks: 0,
  affiliate: 0,
  revenue: 0,
}

const BADGE_CONTEXT_DEFAULT: CreatorProgramBadgeState = {
  total: 0,
  collab: 0,
  tasks: 0,
  affiliate: 0,
  revenue: 0,
  loading: false,
  refresh: () => {},
}

const CreatorProgramBadgeContext = createContext(BADGE_CONTEXT_DEFAULT)

const POLL_INTERVAL_MS = 30_000

async function fetchBadges(): Promise<BadgeCounts> {
  const d = await creatorProgramAPI.getBadgeSummary()
  return {
    total: d.total,
    collab: d.collab,
    tasks: d.tasks,
    affiliate: d.affiliate,
    revenue: d.revenue,
  }
}

export function CreatorProgramBadgeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const requestIdRef = useRef(0)
  const [badges, setBadges] = useState<BadgeCounts>(EMPTY_BADGES)
  const [loading, setLoading] = useState(false)

  const runCheck = useCallback(async () => {
    if (!isAuthenticated) {
      requestIdRef.current += 1
      setBadges(EMPTY_BADGES)
      setLoading(false)
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)

    try {
      const data = await fetchBadges()
      if (id !== requestIdRef.current) return
      setBadges(data)
    } catch {
      if (id !== requestIdRef.current) return
      setBadges(EMPTY_BADGES)
    } finally {
      if (id === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [isAuthenticated])

  const runCheckRef = useRef(runCheck)
  runCheckRef.current = runCheck

  const refresh = useCallback(() => {
    void runCheckRef.current()
  }, [])

  useEffect(() => {
    void runCheck()
  }, [runCheck])

  useEffect(() => {
    const onRefreshEvent = () => {
      void runCheckRef.current()
    }

    const intervalId = window.setInterval(() => {
      void runCheckRef.current()
    }, POLL_INTERVAL_MS)

    window.addEventListener(CREATOR_PROGRAM_BADGES_REFRESH, onRefreshEvent)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener(CREATOR_PROGRAM_BADGES_REFRESH, onRefreshEvent)
    }
  }, [])

  const value = useMemo(
    () => ({
      total: badges.total,
      collab: badges.collab,
      tasks: badges.tasks,
      affiliate: badges.affiliate,
      revenue: badges.revenue,
      loading,
      refresh,
    }),
    [badges, loading, refresh]
  )

  return (
    <CreatorProgramBadgeContext.Provider value={value}>{children}</CreatorProgramBadgeContext.Provider>
  )
}

export function useCreatorProgramBadges(): CreatorProgramBadgeState {
  return useContext(CreatorProgramBadgeContext)
}
