import { useState, useEffect, useCallback } from 'react'
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

// Global cache to store review stats across components
const statsCache: ReviewStatsMap = {}
const pendingRequests: Map<string, Promise<ReviewStats>> = new Map()

export function useProductReviewStats(slugs: string[]) {
  const [stats, setStats] = useState<ReviewStatsMap>({})
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async (productSlugs: string[]) => {
    // Filter out slugs that are already in cache
    const slugsToFetch = productSlugs.filter(slug => !statsCache[slug])
    
    if (slugsToFetch.length === 0) {
      // All stats are in cache
      const cachedStats: ReviewStatsMap = {}
      productSlugs.forEach(slug => {
        if (statsCache[slug]) {
          cachedStats[slug] = statsCache[slug]
        }
      })
      setStats(cachedStats)
      setLoading(false)
      return
    }

    // Check if there are pending requests for any of these slugs
    const pendingSlugs = slugsToFetch.filter(slug => pendingRequests.has(slug))
    const newSlugs = slugsToFetch.filter(slug => !pendingRequests.has(slug))

    if (newSlugs.length > 0) {
      setLoading(true)
      
      try {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/product-reviews/stats/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slugs: newSlugs }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch review stats')
        }

        const data = await response.json()
        
        // Update cache
        Object.keys(data).forEach(slug => {
          statsCache[slug] = data[slug]
        })

        // Remove from pending requests
        newSlugs.forEach(slug => pendingRequests.delete(slug))

        // Combine cached stats with newly fetched stats
        const allStats: ReviewStatsMap = {}
        productSlugs.forEach(slug => {
          if (statsCache[slug]) {
            allStats[slug] = statsCache[slug]
          } else {
            // Fallback for missing stats
            allStats[slug] = {
              product_id: null,
              slug,
              average_rating: 0,
              review_count: 0,
              verified_count: 0
            }
          }
        })

        setStats(allStats)
      } catch (error) {
        console.error('Failed to fetch review stats:', error)
        // Set fallback stats
        const fallbackStats: ReviewStatsMap = {}
        productSlugs.forEach(slug => {
          fallbackStats[slug] = {
            product_id: null,
            slug,
            average_rating: 0,
            review_count: 0,
            verified_count: 0
          }
        })
        setStats(fallbackStats)
      } finally {
        setLoading(false)
      }
    } else {
      // Wait for pending requests
      const pendingPromises = pendingSlugs.map(slug => pendingRequests.get(slug)!)
      await Promise.all(pendingPromises)
      
      // Retry after pending requests complete
      setTimeout(() => fetchStats(productSlugs), 100)
    }
  }, [])

  useEffect(() => {
    if (slugs.length > 0) {
      fetchStats(slugs)
    } else {
      setLoading(false)
    }
  }, [slugs.join(','), fetchStats])

  // Function to get stats for a specific slug
  const getStats = useCallback((slug: string): ReviewStats => {
    return stats[slug] || {
      product_id: null,
      slug,
      average_rating: 0,
      review_count: 0,
      verified_count: 0
    }
  }, [stats])

  return { stats, loading, getStats }
}

// Hook for single product
export function useProductReviewStat(slug: string) {
  const { stats, loading, getStats } = useProductReviewStats([slug])
  return {
    stats: getStats(slug),
    loading
  }
}

// Utility function to get cached stats (for use outside React components)
export function getCachedReviewStats(slug: string): ReviewStats {
  return statsCache[slug] || {
    product_id: null,
    slug,
    average_rating: 0,
    review_count: 0,
    verified_count: 0
  }
}

// Function to invalidate cache (call this when a new review is submitted)
export function invalidateReviewStatsCache(slug?: string) {
  if (slug) {
    delete statsCache[slug]
  } else {
    Object.keys(statsCache).forEach(key => delete statsCache[key])
  }
}

