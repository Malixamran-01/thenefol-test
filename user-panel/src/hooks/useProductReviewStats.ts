import { useState, useEffect, useCallback, useRef } from 'react'
import { getApiBase } from '../utils/apiBase'

interface ReviewStats {
  product_id: number | null
  slug: string
  average_rating: number
  review_count: number
  verified_count: number
}

interface ReviewStatsMap {
  [slug: string]: ReviewStats
}

const statsCache: ReviewStatsMap = {}
const pendingRequests: Map<string, Promise<ReviewStats>> = new Map()

export function useProductReviewStats(slugs: string[]) {
  const [stats, setStats] = useState<ReviewStatsMap>({})
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)

  const slugsKey = slugs.filter(Boolean).join(',')

  const fetchStats = useCallback(async (productSlugs: string[], fetchId: number) => {
    const slugsToFetch = productSlugs.filter((slug) => slug && !statsCache[slug])

    if (slugsToFetch.length === 0) {
      if (fetchId !== requestIdRef.current) return
      const cachedStats: ReviewStatsMap = {}
      productSlugs.forEach((slug) => {
        if (statsCache[slug]) cachedStats[slug] = statsCache[slug]
      })
      setStats((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(cachedStats)) return prev
        return cachedStats
      })
      setLoading(false)
      return
    }

    const pendingSlugs = slugsToFetch.filter((slug) => pendingRequests.has(slug))
    const newSlugs = slugsToFetch.filter((slug) => !pendingRequests.has(slug))

    if (newSlugs.length > 0) {
      if (fetchId === requestIdRef.current) setLoading(true)

      try {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/product-reviews/stats/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugs: newSlugs }),
        })

        if (fetchId !== requestIdRef.current) return
        if (!response.ok) throw new Error('Failed to fetch review stats')

        const data = await response.json()
        Object.keys(data).forEach((slug) => {
          statsCache[slug] = data[slug]
        })
        newSlugs.forEach((slug) => pendingRequests.delete(slug))

        const allStats: ReviewStatsMap = {}
        productSlugs.forEach((slug) => {
          allStats[slug] = statsCache[slug] || {
            product_id: null,
            slug,
            average_rating: 0,
            review_count: 0,
            verified_count: 0,
          }
        })

        setStats((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(allStats)) return prev
          return allStats
        })
      } catch (error) {
        console.error('Failed to fetch review stats:', error)
        if (fetchId !== requestIdRef.current) return
        const fallbackStats: ReviewStatsMap = {}
        productSlugs.forEach((slug) => {
          fallbackStats[slug] = {
            product_id: null,
            slug,
            average_rating: 0,
            review_count: 0,
            verified_count: 0,
          }
        })
        setStats((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(fallbackStats)) return prev
          return fallbackStats
        })
      } finally {
        if (fetchId === requestIdRef.current) setLoading(false)
      }
    } else if (pendingSlugs.length > 0) {
      const pendingPromises = pendingSlugs.map((slug) => pendingRequests.get(slug)!)
      await Promise.all(pendingPromises)
      if (fetchId === requestIdRef.current) {
        void fetchStats(productSlugs, fetchId)
      }
    }
  }, [])

  useEffect(() => {
    const fetchId = ++requestIdRef.current
    if (slugsKey.length === 0) {
      setLoading(false)
      return
    }
    const productSlugs = slugsKey.split(',').filter(Boolean)
    void fetchStats(productSlugs, fetchId)
    return () => {
      requestIdRef.current += 1
    }
  }, [slugsKey, fetchStats])

  const getStats = useCallback(
    (slug: string): ReviewStats =>
      stats[slug] || {
        product_id: null,
        slug,
        average_rating: 0,
        review_count: 0,
        verified_count: 0,
      },
    [stats]
  )

  return { stats, loading, getStats }
}

export function useProductReviewStat(slug: string) {
  const { stats, loading, getStats } = useProductReviewStats([slug])
  return {
    stats: getStats(slug),
    loading,
  }
}

export function getCachedReviewStats(slug: string): ReviewStats {
  return (
    statsCache[slug] || {
      product_id: null,
      slug,
      average_rating: 0,
      review_count: 0,
      verified_count: 0,
    }
  )
}

export function invalidateReviewStatsCache(slug?: string) {
  if (slug) {
    delete statsCache[slug]
  } else {
    Object.keys(statsCache).forEach((key) => delete statsCache[key])
  }
}
