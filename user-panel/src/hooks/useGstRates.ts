import { useEffect, useMemo, useState } from 'react'
import { getApiBase } from '../utils/apiBase'

type RateInfo = { rate: number; isDefault?: boolean; upcoming?: { rate: number; effective_at: string } | null }

/** Re-check at most this far ahead even when a change is scheduled further out. */
const MAX_WAIT_MS = 6 * 60 * 60 * 1000

/**
 * GST rate in force now for each product id (set per product in the admin panel), from
 * GET /api/gst/rates. When a scheduled change is coming up, the rates are fetched again just
 * after it takes effect, so a cart left open over midnight shows the new rate.
 * Products the backend doesn't know (or while loading) are missing from the map.
 */
export function useGstRates(productIds: number[]): Record<number, number> {
  const key = useMemo(
    () =>
      [...new Set(productIds.filter((n) => Number.isInteger(n) && n > 0))]
        .sort((a, b) => a - b)
        .join(','),
    [productIds]
  )
  const [rates, setRates] = useState<Record<number, number>>({})
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/gst/rates?ids=${key}`)
        if (!res.ok) return
        const data = (await res.json()) as { rates?: Record<string, RateInfo> }
        if (cancelled) return
        const next: Record<number, number> = {}
        let soonest = Infinity
        for (const [id, info] of Object.entries(data.rates || {})) {
          if (typeof info?.rate === 'number') next[Number(id)] = info.rate
          const t = info?.upcoming ? new Date(info.upcoming.effective_at).getTime() : NaN
          if (Number.isFinite(t) && t < soonest) soonest = t
        }
        setRates(next)
        if (Number.isFinite(soonest)) {
          const wait = Math.min(Math.max(soonest - Date.now() + 1500, 1000), MAX_WAIT_MS)
          timer = setTimeout(() => setRefreshTick((n) => n + 1), wait)
        }
      } catch (err) {
        console.error('Failed to load GST rates:', err)
      }
    })()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [key, refreshTick])

  return rates
}
