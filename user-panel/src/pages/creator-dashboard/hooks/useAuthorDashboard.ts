import { useEffect, useState } from 'react'
import { blogActivityAPI } from '../../../services/api'
import type { DashboardData } from '../types'

export function useAuthorDashboard(isAuthenticated: boolean) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    blogActivityAPI
      .getDashboard()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => console.error('[Dashboard]', e))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  return { data, loading }
}
