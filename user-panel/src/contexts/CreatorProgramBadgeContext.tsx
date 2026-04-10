import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

const CreatorProgramBadgeContext = createContext<CreatorProgramBadgeState | null>(null)

export function CreatorProgramBadgeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [total, setTotal] = useState(0)
  const [collab, setCollab] = useState(0)
  const [tasks, setTasks] = useState(0)
  const [affiliate, setAffiliate] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setTotal(0)
      setCollab(0)
      setTasks(0)
      setAffiliate(0)
      setRevenue(0)
      return
    }
    setLoading(true)
    try {
      const d = await creatorProgramAPI.getBadgeSummary()
      setTotal(d.total)
      setCollab(d.collab)
      setTasks(d.tasks)
      setAffiliate(d.affiliate)
      setRevenue(d.revenue)
    } catch {
      setTotal(0)
      setCollab(0)
      setTasks(0)
      setAffiliate(0)
      setRevenue(0)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const t = window.setInterval(() => void refresh(), 30_000)
    const onRefresh = () => void refresh()
    const onHash = () => void refresh()
    window.addEventListener(CREATOR_PROGRAM_BADGES_REFRESH, onRefresh)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.clearInterval(t)
      window.removeEventListener(CREATOR_PROGRAM_BADGES_REFRESH, onRefresh)
      window.removeEventListener('hashchange', onHash)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      total,
      collab,
      tasks,
      affiliate,
      revenue,
      loading,
      refresh,
    }),
    [total, collab, tasks, affiliate, revenue, loading, refresh]
  )

  return (
    <CreatorProgramBadgeContext.Provider value={value}>{children}</CreatorProgramBadgeContext.Provider>
  )
}

export function useCreatorProgramBadges(): CreatorProgramBadgeState {
  const ctx = useContext(CreatorProgramBadgeContext)
  if (ctx) return ctx
  return {
    total: 0,
    collab: 0,
    tasks: 0,
    affiliate: 0,
    revenue: 0,
    loading: false,
    refresh: () => {},
  }
}
