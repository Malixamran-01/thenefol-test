import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { getHeaders, getSessionId } from '../utils/session'
import { useAuth } from '../contexts/AuthContext'
import PricingDisplay from './PricingDisplay'
import { useProductReviewStats } from '../hooks/useProductReviewStats'
import { getProductRating, getProductReviewCount, hasVerifiedReviews } from '../utils/product_reviews'
import VerifiedBadge from './VerifiedBadge'

interface RecentlyViewedProps {
  limit?: number
  className?: string
}

export default function RecentlyViewed({ 
  limit = 8,
  className = '' 
}: RecentlyViewedProps) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const productsPerPage = 4
  const { isAuthenticated } = useAuth()
  
  // Get all product slugs for batch fetching review stats
  const productSlugs = useMemo(() => {
    return products.map(p => p.slug || '').filter(slug => slug)
  }, [products])
  
  // Fetch review stats for all products
  const { stats: reviewStats } = useProductReviewStats(productSlugs)
  
  // Calculate pagination
  const totalPages = Math.ceil(products.length / productsPerPage)
  const startIndex = currentPage * productsPerPage
  const endIndex = startIndex + productsPerPage
  const visibleProducts = products.slice(startIndex, endIndex)
  
  const canGoPrevious = currentPage > 0
  const canGoNext = currentPage < totalPages - 1
  
  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentPage(prev => prev - 1)
    }
  }
  
  const handleNext = () => {
    if (canGoNext) {
      setCurrentPage(prev => prev + 1)
    }
  }

  useEffect(() => {
    fetchRecentlyViewed()
    setCurrentPage(0) // Reset to first page when products change
    
    // Sync localStorage with backend
    syncLocalStorageToBackend()
  }, [isAuthenticated])

  const syncLocalStorageToBackend = async () => {
    try {
      const localViewed = JSON.parse(localStorage.getItem('recently_viewed') || '[]')
      if (localViewed.length === 0) return

      const apiBase = getApiBase()
      for (const productId of localViewed.slice(0, 10)) {
        try {
          await fetch(`${apiBase}/api/products/${productId}/view`, {
            method: 'POST',
            credentials: 'include',
            headers: getHeaders(),
            body: JSON.stringify({ source: 'localStorage_sync' })
          })
        } catch (err) {
          console.error('Failed to sync product view:', err)
        }
      }
    } catch (error) {
      console.error('Failed to sync localStorage:', error)
    }
  }

  const normalizeImageUrl = (imageUrl: string | undefined): string => {
    if (!imageUrl) return ''
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl
    const apiBase = getApiBase()
    const base = apiBase.replace(/\/$/, '')
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
    return `${base}${path}`
  }

  const fetchRecentlyViewed = async () => {
    try {
      setLoading(true)
      const apiBase = getApiBase()
      
      // First try from localStorage
      const localViewed = JSON.parse(localStorage.getItem('recently_viewed') || '[]')
      
      // Then fetch from backend if authenticated
      if (isAuthenticated) {
        const response = await fetch(`${apiBase}/api/recommendations/recently-viewed?limit=${limit}`, {
          credentials: 'include',
          headers: getHeaders()
        })

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            // Normalize image URLs
            const normalizedProducts = data.map((product: any) => ({
              ...product,
              listImage: normalizeImageUrl(product.list_image || product.listImage)
            }))
            setProducts(normalizedProducts)
            return
          }
        }
      }

      // Fallback to localStorage data
      if (localViewed.length > 0) {
        const apiBase = getApiBase()
        const productPromises = localViewed.slice(0, limit).map(async (productId: string) => {
          try {
            const res = await fetch(`${apiBase}/api/products/${productId}`, {
              credentials: 'include',
              headers: getHeaders()
            })
            if (res.ok) {
              const product = await res.json()
              // Normalize image URL
              return {
                ...product,
                listImage: normalizeImageUrl(product.list_image || product.listImage)
              }
            }
          } catch (err) {
            console.error('Failed to fetch product:', err)
          }
          return null
        })

        const fetchedProducts = (await Promise.all(productPromises)).filter(Boolean)
        setProducts(fetchedProducts)
      }
    } catch (error) {
      console.error('Failed to fetch recently viewed:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateLocalStorage = (productId: string | number) => {
    try {
      const current = JSON.parse(localStorage.getItem('recently_viewed') || '[]')
      const updated = [String(productId), ...current.filter((id: string) => id !== String(productId))].slice(0, 20)
      localStorage.setItem('recently_viewed', JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update localStorage:', error)
    }
  }

  useEffect(() => {
    // Listen for product views
    const handleProductView = (e: CustomEvent) => {
      const productId = e.detail?.productId
      if (productId) {
        updateLocalStorage(productId)
        fetchRecentlyViewed()
      }
    }

    window.addEventListener('product-viewed' as any, handleProductView as EventListener)
    return () => {
      window.removeEventListener('product-viewed' as any, handleProductView as EventListener)
    }
  }, [])

  if (loading || products.length === 0) return null

  return (
    <section className={`py-8 md:py-12 ${className}`}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-2xl md:text-3xl font-serif mb-6" style={{color: '#1B4965'}}>
          Recently Viewed
        </h2>
        
        <div className="relative">
          <button
            onClick={handlePrevious}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 ${
              canGoPrevious ? 'opacity-100 hover:scale-110 cursor-pointer' : 'opacity-0 pointer-events-none'
            }`}
            style={{backgroundColor: '#fff'}}
            aria-label="Previous"
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="w-6 h-6" style={{color: '#1B4965'}} />
          </button>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleProducts.map((product) => {
            const imageUrl = product.listImage || product.list_image || (product.pdp_images && product.pdp_images[0]) || ''
            const normalizedImageUrl = normalizeImageUrl(imageUrl)
            
            return (
            <a
              key={product.id || product.slug}
              href={`#/user/product/${product.slug}`}
              className="bg-white rounded-lg shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {normalizedImageUrl ? (
                <div className="relative overflow-hidden aspect-square bg-gray-100">
                  <img
                    src={normalizedImageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      // Hide image on error and show placeholder
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="relative overflow-hidden aspect-square bg-gray-100 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-medium mb-2 line-clamp-2" style={{color: '#1B4965'}}>
                  {product.title}
                </h3>
                {(() => {
                  const slug = product.slug || ''
                  // Use database stats if available, otherwise fallback to static
                  const dbStats = reviewStats[slug]
                  const rating = dbStats?.average_rating > 0 ? dbStats.average_rating : getProductRating(slug)
                  const reviewCount = dbStats?.review_count > 0 ? dbStats.review_count : getProductReviewCount(slug)
                  const hasVerified = dbStats?.verified_count > 0 || hasVerifiedReviews(slug)
                  
                  if (rating > 0) {
                    return (
                      <div className="flex items-center mb-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => {
                            const filled = i < Math.round(rating)
                            return (
                              <svg key={i} className={`w-3 h-3 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )
                          })}
                        </div>
                        <span className="text-xs ml-1 font-light" style={{color: '#999'}}>{rating.toFixed(1)} ({reviewCount})</span>
                        {hasVerified && (
                          <VerifiedBadge size="sm" className="ml-1" />
                        )}
                      </div>
                    )
                  }
                  return null
                })()}
                <PricingDisplay product={product} />
              </div>
            </a>
            )
          })}
          </div>
          
          <button
            onClick={handleNext}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 ${
              canGoNext ? 'opacity-100 hover:scale-110 cursor-pointer' : 'opacity-0 pointer-events-none'
            }`}
            style={{backgroundColor: '#fff'}}
            aria-label="Next"
            disabled={!canGoNext}
          >
            <ChevronRight className="w-6 h-6" style={{color: '#1B4965'}} />
          </button>
        </div>
      </div>
    </section>
  )
}

