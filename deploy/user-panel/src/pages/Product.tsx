import { useEffect, useState, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import type { Product } from '../types'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'
import { userSocketService } from '../services/socket'
import { api, productQuestionsAPI } from '../services/api'
import { getHeaders } from '../utils/session'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StickyAddToCart from '../components/StickyAddToCart'
import ShareProduct from '../components/ShareProduct'
import ImageZoom from '../components/ImageZoom'
import VerifiedBadge from '../components/VerifiedBadge'
const RelatedProductsCarousel = lazy(() => import('../components/RelatedProductsCarousel'))
const RecentlyViewed = lazy(() => import('../components/RecentlyViewed'))
import { productReviews, getProductReviews, getProductRating, getProductReviewCount, hasVerifiedReviews } from '../utils/product_reviews'
import { useProductReviewStats } from '../hooks/useProductReviewStats'
import { pixelEvents, formatProductData } from '../utils/metaPixel'

// CSV data cache - shared across all product page instances
let csvDataCache: any[] | null = null
let csvDataCacheTime: number = 0
const CSV_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function ProductPage() {
  const [product, setProduct] = useState<Product | null>(null)
  const [csvProduct, setCsvProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({})
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showImageZoom, setShowImageZoom] = useState(false)
  const [zoomImageIndex, setZoomImageIndex] = useState(0)
  const [viewStartTime, setViewStartTime] = useState<number>(Date.now())
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [dbReviews, setDbReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsToShow, setReviewsToShow] = useState(5)
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)
  const hasLoaded = useRef(false)
  const [hoverZoom, setHoverZoom] = useState({ show: false, x: 0, y: 0 })
  const mainImageRef = useRef<HTMLDivElement>(null)
  
  // Delivery availability state
  const [deliveryPincode, setDeliveryPincode] = useState('')
  const [checkingDelivery, setCheckingDelivery] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  
  // Use cart context and auth
  const cartContext = useCart()
  const { isAuthenticated, user } = useAuth()
  
  // Safely access cart methods
  const addItem = cartContext?.addItem

  // Check delivery availability function
  const checkDeliveryAvailability = async () => {
    if (deliveryPincode.length !== 6) {
      setDeliveryError('Please enter a valid 6-digit pincode')
      return
    }

    setCheckingDelivery(true)
    setDeliveryError(null)
    setDeliveryInfo(null)

    try {
      const apiBase = getApiBase()
      const response = await fetch(
        `${apiBase}/api/public/shiprocket/serviceability?delivery_postcode=${encodeURIComponent(deliveryPincode)}&cod=0&weight=0.5`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to check delivery availability')
      }

      const data = await response.json()
      setDeliveryInfo(data)
    } catch (err: any) {
      setDeliveryError(err.message || 'Unable to check delivery. Please try again later.')
      setDeliveryInfo(null)
    } finally {
      setCheckingDelivery(false)
    }
  }

  // Calculate delivery date helper
  const calculateDeliveryDate = (days: number): string => {
    const today = new Date()
    const deliveryDate = new Date(today)
    deliveryDate.setDate(today.getDate() + days)
    return deliveryDate.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Track view duration on unmount
  useEffect(() => {
    return () => {
      if (product?.id && viewStartTime) {
        const viewDuration = Math.floor((Date.now() - viewStartTime) / 1000)
        if (viewDuration > 0) {
          api.recommendations.trackProductView(product.id, {
            viewDuration,
            source: 'product_page_exit'
          }).catch(err => console.error('Failed to track view duration:', err))
        }
      }
    }
  }, [product?.id, viewStartTime])

  // Helper function to get or fetch CSV data (with caching)
  const getCsvData = useCallback(async (apiBase: string): Promise<any[]> => {
    const now = Date.now()
    // Use cached data if available and not expired
    if (csvDataCache && (now - csvDataCacheTime) < CSV_CACHE_DURATION) {
      // Using cached CSV data
      return csvDataCache
    }
    
    try {
      // Fetching CSV data
      const csvRes = await fetch(`${apiBase}/api/products-csv`)
      if (csvRes.ok) {
        const csvData = await csvRes.json()
        csvDataCache = csvData
        csvDataCacheTime = now
        // CSV Data loaded and cached
        return csvData
      }
    } catch (error) {
      console.error('Failed to fetch CSV data:', error)
    }
    return []
  }, [])

  // Extract load function to reuse it - optimized with parallel fetching
  const loadProduct = useCallback(async (slug: string) => {
      if (!slug) return
      
      // Prevent duplicate loading
      if (loading && product?.slug === slug) return
      
      const apiBase = getApiBase()
      
      // Loading product data for slug
      
      // Helper functions
      const toAbs = (u?: string) => {
        if (!u || typeof u !== 'string') return ''
        if (/^https?:\/\//i.test(u)) return u
        const base = apiBase.replace(/\/$/, '')
        const path = u.startsWith('/') ? u : `/${u}`
        return `${base}${path}`
      }
      
      // Optimize image URL - prefer WebP format for better performance
      const getOptimizedImage = (imageUrl: string): string => {
        if (!imageUrl) return ''
        // If already WebP or AVIF, return as is
        if (/\.(webp|avif)$/i.test(imageUrl)) return toAbs(imageUrl)
        // Try WebP version first (browser will fallback to original if not found)
        const webpUrl = imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp')
        return toAbs(webpUrl)
      }
      
      const normalizePdpImages = (images: any, listImage: string): string[] => {
        if (!images || !Array.isArray(images)) return [toAbs(listImage || '')]
        const normalized = images
          .map((img: any) => {
            if (!img) return ''
            if (typeof img === 'string') return toAbs(img)
            if (typeof img === 'object' && typeof img.url === 'string') return toAbs(img.url)
            return ''
          })
          .filter((u: string) => u && u.trim().length > 0)
        // Deduplicate by URL
        return [...new Map(normalized.map((url, idx) => [url, idx])).keys()]
      }

      const normalizeBannerImages = (images: any): string[] => {
        if (!images || !Array.isArray(images)) return []
        const normalized = images
          .map((img: any) => {
            if (!img) return ''
            if (typeof img === 'string') return toAbs(img)
            if (typeof img === 'object' && typeof img.url === 'string') return toAbs(img.url)
            return ''
          })
          .filter((u: string) => u && u.trim().length > 0)
        // Deduplicate by URL
        return [...new Map(normalized.map((url, idx) => [url, idx])).keys()]
      }
      
      // Fetch product and CSV data in parallel with caching
      try {
        setLoading(true)
        const [productRes, csvData] = await Promise.all([
          fetch(`${apiBase}/api/products/slug/${slug}`, { 
            credentials: 'include',
            cache: 'default' // Allow browser caching
          }),
          getCsvData(apiBase)
        ])
        
        if (productRes.ok) {
          const data = await productRes.json()
          // Database product found
          
          if (data) {
            const item: Product = {
              id: data.id,
              slug: data.slug,
              title: data.title,
              category: data.category,
              price: data.price,
              listImage: toAbs(data.list_image || ''),
              pdpImages: normalizePdpImages(data.pdp_images, data.list_image),
              bannerImages: normalizeBannerImages(data.banner_images),
              description: data.description || '',
              details: data.details
            }
            setProduct(item)
            // Product set from database
            
            // Reset reviews to show to 5 for new product
            setReviewsToShow(5)
            
            // Track product view (non-blocking)
            if (item.id) {
              // Fire and forget tracking calls
              Promise.all([
                Promise.resolve(userSocketService.trackProductView(item.id, item.title, {
                  category: item.category,
                  price: item.price
                })),
                api.recommendations.trackProductView(item.id, {
                  source: 'product_page',
                  viewDuration: undefined
                }).catch(err => console.error('Failed to track product view:', err))
              ]).catch(() => {})
              
              // Update localStorage
              try {
                const recent = JSON.parse(localStorage.getItem('recently_viewed') || '[]')
                const updated = [String(item.id), ...recent.filter((id: string) => id !== String(item.id))].slice(0, 20)
                localStorage.setItem('recently_viewed', JSON.stringify(updated))
                
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('product-viewed', { 
                  detail: { productId: item.id } 
                }))
              } catch (err) {
                console.error('Failed to update localStorage:', err)
              }
              
              setViewStartTime(Date.now())
              
              // Track ViewContent event for Meta Pixel
              if (item) {
                pixelEvents.viewContent(formatProductData(item))
              }
              
              // Load reviews from database (non-blocking) - parallel with other operations
              if (item.id) {
                const productId = item.id
                // Load reviews immediately but don't block rendering
                api.reviews.getProductReviews(productId)
                  .then(reviews => setDbReviews(reviews || []))
                  .catch(() => setDbReviews([]))
              }
            }
            
            // Process CSV data
            if (csvData && csvData.length > 0) {
              const csvMatch = csvData.find((csv: any) => {
                const csvSlug = csv['Slug'] || csv['Product Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''
                return csvSlug === slug
              })
              
              if (csvMatch) {
                setCsvProduct(csvMatch)
                // CSV product found
              } else {
                // If no CSV match, try to use database details as fallback
                if (item.details) {
                  const dbDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details
                  setCsvProduct({
                    'Product Name': item.title,
                    'Title': item.title,
                    'Brand Name': dbDetails.brand || 'NEFOL',
                    'SKU': dbDetails.sku || '',
                    'HSN Code': dbDetails.hsn || '',
                    'Subtitle / Tagline': dbDetails.subtitle || '',
                    'Product Description (Long)': dbDetails.longDescription || '',
                    'Skin/Hair Type': dbDetails.skinHairType || '',
                    'Net Quantity (Content)': dbDetails.netQuantity || '',
                    'Unit Count (Pack of)': dbDetails.unitCount || '',
                    'Package Content Details': dbDetails.packageContent || '',
                    'Inner Packaging Type': dbDetails.innerPackaging || '',
                    'Outer Packaging Type': dbDetails.outerPackaging || '',
                    'Net Weight (Product Only)': dbDetails.netWeight || '',
                    'Dead Weight (Packaging Only)': dbDetails.deadWeight || '',
                    'MRP ': dbDetails.mrp || item.price,
                    'website price': dbDetails.websitePrice || '',
                    'GST %': dbDetails.gstPercent || '',
                    'Country of Origin': dbDetails.countryOfOrigin || '',
                    'Manufacturer / Packer / Importer': dbDetails.manufacturer || '',
                    'Key Ingredients': dbDetails.keyIngredients || '',
                    'Ingredient Benefits': dbDetails.ingredientBenefits || '',
                    'How to Use (Steps)': dbDetails.howToUse || '',
                    'Video Links': dbDetails.videoLinks || '',
                    'Hazardous / Fragile (Y/N)': dbDetails.hazardous || '',
                    'Special Attributes (Badges)': dbDetails.badges || ''
                  })
                }
              }
            }
          }
        } else {
          // Database fetch failed
        }
      } catch (error) {
        console.error('❌ Failed to fetch product:', error)
      }
      
      setLoading(false)
      setLastUpdated(new Date())
      // Product loading completed
  }, [getCsvData])

  // Load product reviews from database
  const loadProductReviews = useCallback(async (productId: number) => {
    try {
      setReviewsLoading(true)
      const reviews = await api.reviews.getProductReviews(productId)
      setDbReviews(reviews || [])
    } catch (err) {
      console.error('Failed to load reviews:', err)
      setDbReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  // Extract slug from URL and update state
  useEffect(() => {
    const hash = window.location.hash || '#/'
    const match = hash.match(/^#\/user\/product\/([^?#]+)/)
    const slug = match?.[1] || null
    setCurrentSlug(slug)
  }, [])
  
  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/'
      const match = hash.match(/^#\/user\/product\/([^?#]+)/)
      const slug = match?.[1] || null
      setCurrentSlug(slug)
    }
    
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  
  // Load product when slug changes
  useEffect(() => {
    if (!currentSlug) {
      setLoading(false)
      return
    }
    
    // Reset loading state and hasLoaded when slug changes
    if (product?.slug !== currentSlug) {
      hasLoaded.current = false
      setLoading(true)
      setProduct(null)
      setCsvProduct(null)
      loadProduct(currentSlug)
    } else if (!hasLoaded.current) {
      // Load if not already loaded for this slug
      hasLoaded.current = true
      loadProduct(currentSlug)
    }
  }, [currentSlug, product?.slug, loadProduct])

  // Memoize expensive review calculations - MUST be before any early returns
  // Cache static reviews to avoid loading heavy product_reviews file repeatedly
  const staticReviewsCache = useRef<Map<string, any[]>>(new Map())
  
  // Get related products for review stats
  const relatedProducts = useMemo(() => getRelatedProducts(product), [product])
  const relatedProductSlugs = useMemo(() => {
    return relatedProducts.map(p => p.slug || '').filter(slug => slug)
  }, [relatedProducts])
  
  // Fetch review stats for related products
  const { stats: relatedReviewStats } = useProductReviewStats(relatedProductSlugs)
  
  // Pagination state for inline "You May Also Like" section
  const [relatedPage, setRelatedPage] = useState(0)
  const relatedProductsPerPage = 4
  const relatedTotalPages = Math.ceil(relatedProducts.length / relatedProductsPerPage)
  const relatedStartIndex = relatedPage * relatedProductsPerPage
  const relatedEndIndex = relatedStartIndex + relatedProductsPerPage
  const visibleRelatedProducts = relatedProducts.slice(relatedStartIndex, relatedEndIndex)
  const canGoPreviousRelated = relatedPage > 0
  const canGoNextRelated = relatedPage < relatedTotalPages - 1
  
  const { allProductReviews, overallRating, reviewCount } = useMemo(() => {
    // Combine database reviews with static reviews (both should be shown together)
    const productSlug = product?.slug || ''
    
    // Use cached static reviews if available
    let staticReviews: any[] = []
    if (staticReviewsCache.current.has(productSlug)) {
      staticReviews = staticReviewsCache.current.get(productSlug) || []
    } else {
      // Only load static reviews if not in cache
      try {
        staticReviews = getProductReviews(productSlug) || []
        staticReviewsCache.current.set(productSlug, staticReviews)
      } catch (error) {
        // If loading fails, use empty array
        staticReviews = []
      }
    }
    
    // Transform database reviews to match display format (memoized)
    const transformedDbReviews = dbReviews.map(review => ({
      id: review.id,
      name: review.customer_name,
      rating: review.rating,
      date: new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      comment: review.review_text || review.comment || '',
      title: review.title || '',
      isVerified: review.is_verified || false,
      isFeatured: review.is_featured || false
    }))
    
    // Combine both database reviews and static reviews
    // Database reviews first (newest), then static reviews
    // Deduplicate by checking if a static review already exists in database reviews
    const dbReviewIds = new Set(transformedDbReviews.map(r => r.id))
    const uniqueStaticReviews = staticReviews.filter((staticReview: any) => {
      // Only include static reviews that don't have a matching database review
      // We can match by checking if the name, rating, and comment are similar
      // or just include all static reviews if they don't have an id that matches
      return !staticReview.id || !dbReviewIds.has(staticReview.id)
    })
    
    // Combine: database reviews first (they're newer), then static reviews
    const allReviews = [...transformedDbReviews, ...uniqueStaticReviews]
    
    // Calculate overall rating (optimized)
    const calculateOverallRating = (reviews: any[]) => {
      if (reviews.length === 0) return 0
      const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0)
      return parseFloat((sum / reviews.length).toFixed(2))
    }
    
    return {
      allProductReviews: allReviews,
      overallRating: calculateOverallRating(allReviews),
      reviewCount: allReviews.length
    }
  }, [product?.slug, dbReviews])

  // Refresh data function
  const refreshData = async () => {
    setIsRefreshing(true)
    const hash = window.location.hash || '#/'
    const match = hash.match(/^#\/user\/product\/([^?#]+)/)
    const slug = match?.[1]
    if (!slug) return
    const apiBase = getApiBase()
    
    try {
      // Refresh product from database
      const res = await fetch(`${apiBase}/api/products/slug/${slug}?_=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        if (data) {
          const toAbs = (u?: string) => {
            if (!u || typeof u !== 'string') return ''
            if (/^https?:\/\//i.test(u)) return u
            const base = apiBase.replace(/\/$/, '')
            const path = u.startsWith('/') ? u : `/${u}`
            return `${base}${path}`
          }
          const normalizePdpImages = (images: any): string[] => {
            if (!images || !Array.isArray(images)) return [toAbs(data.list_image || '')]
            const normalized = images
              .map((img: any) => {
                if (!img) return ''
                if (typeof img === 'string') return toAbs(img)
                if (typeof img === 'object' && typeof img.url === 'string') return toAbs(img.url)
                return ''
              })
              .filter((u: string) => u && u.trim().length > 0)
            // Deduplicate by URL
            return [...new Map(normalized.map((url, idx) => [url, idx])).keys()]
          }

          const normalizeBannerImages = (images: any): string[] => {
            if (!images || !Array.isArray(images)) return []
            const normalized = images
              .map((img: any) => {
                if (!img) return ''
                if (typeof img === 'string') return toAbs(img)
                if (typeof img === 'object' && typeof img.url === 'string') return toAbs(img.url)
                return ''
              })
              .filter((u: string) => u && u.trim().length > 0)
            // Deduplicate by URL
            return [...new Map(normalized.map((url, idx) => [url, idx])).keys()]
          }

          const item: Product = {
            id: data.id,
            slug: data.slug,
            title: data.title,
            category: data.category,
            price: data.price,
            listImage: toAbs(data.list_image || ''),
            pdpImages: normalizePdpImages(data.pdp_images),
            bannerImages: normalizeBannerImages(data.banner_images),
            description: data.description || '',
            details: data.details
          }
          setProduct(item)
        }
      }

      // Refresh CSV data
      const csvRes = await fetch(`${apiBase}/api/products-csv`)
      if (csvRes.ok) {
        const csvData = await csvRes.json()
        const csvMatch = csvData.find((csv: any) => {
          const csvSlug = csv['Slug'] || csv['Product Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''
          return csvSlug === slug
        })
        
        if (csvMatch) {
          setCsvProduct(csvMatch)
        }
      }
      
      setLastUpdated(new Date())
      
      // Reload reviews if product ID is available
      if (product?.id) {
        loadProductReviews(product.id)
      }
      
      // Data refreshed successfully
    } catch (error) {
      console.error('❌ Failed to refresh data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Listen for product updates
  useEffect(() => {
    const handleProductUpdate = (event: CustomEvent) => {
      const updatedProduct = event.detail
      if (!updatedProduct || !updatedProduct.id) return

      // If the updated product matches the current product, refresh
      if (product && product.id === updatedProduct.id) {
        // Product updated, refreshing product page
        refreshData()
      }
    }

    window.addEventListener('product-updated', handleProductUpdate as EventListener)
    window.addEventListener('refresh-products', handleProductUpdate as EventListener)

    return () => {
      window.removeEventListener('product-updated', handleProductUpdate as EventListener)
      window.removeEventListener('refresh-products', handleProductUpdate as EventListener)
    }
  }, [product?.id])

  const derivePdpImages = (r: any, toAbs: (u?: string) => string) => {
    const images = []
    if (r.pdp_image_1) images.push(toAbs(r.pdp_image_1))
    if (r.pdp_image_2) images.push(toAbs(r.pdp_image_2))
    if (r.pdp_image_3) images.push(toAbs(r.pdp_image_3))
    if (r.pdp_image_4) images.push(toAbs(r.pdp_image_4))
    if (r.pdp_image_5) images.push(toAbs(r.pdp_image_5))
    if (r.pdp_image_6) images.push(toAbs(r.pdp_image_6))
    return images.length > 0 ? images : ['/IMAGES/BANNER (1).webp']
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (loading) {
    return (
      <main className="py-10 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="animate-pulse">
            <div className="h-8 w-3/4 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="py-10 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        </div>
      </main>
    )
  }

  return (
    <div className="overflow-x-hidden bg-white w-full max-w-full">
      <main className="py-4 sm:py-6 md:py-8 bg-white w-full max-w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          {/* Breadcrumb */}
          <nav className="mb-4 sm:mb-6 text-xs sm:text-sm">
            <ol className="flex items-center space-x-1 sm:space-x-2 text-gray-600 flex-wrap">
              <li><a href="#/user/" className="hover:text-gray-900">Home</a></li>
              <li>/</li>
              <li><a href="#/user/shop" className="hover:text-gray-900">Shop</a></li>
              <li>/</li>
              <li><a href={`#/user/shop?category=${product.category}`} className="hover:text-gray-900 truncate max-w-[100px] sm:max-w-none">{product.category}</a></li>
              <li>/</li>
              <li className="text-gray-900 truncate max-w-[150px] sm:max-w-none">{product.title}</li>
            </ol>
          </nav>

          {/* Product Details */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:gap-12 lg:grid-cols-2 mb-8 sm:mb-12 md:mb-16 w-full">
            {/* Product Media */}
            <div className="space-y-2 sm:space-y-4 relative">
              {/* Main Product Image - First with Amazon-style hover zoom */}
              <div 
                ref={mainImageRef}
                className="aspect-square overflow-hidden rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 cursor-zoom-in group w-full relative"
                onMouseMove={(e) => {
                  if (!mainImageRef.current) return
                  const rect = mainImageRef.current.getBoundingClientRect()
                  const x = ((e.clientX - rect.left) / rect.width) * 100
                  const y = ((e.clientY - rect.top) / rect.height) * 100
                  setHoverZoom({ show: true, x, y })
                }}
                onMouseLeave={() => setHoverZoom({ show: false, x: 0, y: 0 })}
              >
                {(() => {
                  const allImages = product.listImage ? [product.listImage, ...(product.pdpImages || [])] : (product.pdpImages || [])
                  const mainImage = allImages[0] || ''
                  // Displaying main image
                  
                  return mainImage ? (
                    <>
                      <img
                        src={mainImage}
                        alt={product.title}
                        className="w-full h-full object-contain transition-transform duration-300 max-w-full"
                        loading="eager"
                        decoding="async"
                        {...({ fetchpriority: 'high' } as any)}
                        onClick={() => {
                          setZoomImageIndex(0)
                          setShowImageZoom(true)
                        }}
                        onError={(e) => {
                          console.log('❌ Image failed to load:', mainImage)
                          e.currentTarget.style.display = 'none'
                        }}
                        draggable={false}
                      />
                      {/* Amazon-style hover zoom lens effect */}
                      {hoverZoom.show && (
                        <div 
                          className="absolute pointer-events-none z-20 rounded-full border-2 border-gray-300 shadow-2xl"
                          style={{
                            width: '200px',
                            height: '200px',
                            left: `calc(${hoverZoom.x}% - 100px)`,
                            top: `calc(${hoverZoom.y}% - 100px)`,
                            background: `url(${mainImage})`,
                            backgroundSize: '300%',
                            backgroundPosition: `${hoverZoom.x}% ${hoverZoom.y}%`,
                            backgroundRepeat: 'no-repeat',
                            transform: 'scale(1.2)',
                            transition: 'transform 0.1s ease-out',
                            boxShadow: '0 0 20px rgba(0,0,0,0.3)'
                          }}
                        />
                      )}
                    </>
                  ) : null
                })()}
              </div>

              {/* Thumbnail Gallery - Below Main Image */}
              {(() => {
                const allImages = product.listImage ? [product.listImage, ...(product.pdpImages || [])] : (product.pdpImages || [])
                // Deduplicate images by URL to avoid showing duplicates
                const uniqueImages = [...new Map(allImages.map((img, idx) => [img, idx])).keys()]
                return uniqueImages.length > 1 && (
                  <div className="w-full">
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 w-full overflow-x-auto pb-2">
                      {uniqueImages.map((src, index) => (
                        <button
                          key={`${src}-${index}`}
                          onClick={() => {
                            setZoomImageIndex(index)
                            setShowImageZoom(true)
                          }}
                          className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-zoom-in w-full flex-shrink-0 ${
                            index === 0
                              ? 'border-gray-900 ring-2 ring-gray-300' 
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {/\.(mp4|webm|ogg)(\?|$)/i.test(src) ? (
                            <video 
                              src={src} 
                              className="h-full w-full object-cover max-w-full"
                              muted
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <img 
                              src={src} 
                              alt={`${product.title} ${index + 1}`} 
                              className="h-full w-full object-cover max-w-full"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                console.log('❌ Thumbnail image failed to load:', src)
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Product Info */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {csvProduct?.['Product Name'] || product.title}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mb-4">
                  {csvProduct?.['Subtitle / Tagline'] || 'Premium natural skincare for radiant skin'}
                </p>
                
                {/* nefol-style Rating */}
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900 mr-2">{overallRating > 0 ? overallRating.toFixed(2) : '4.7'}</span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => {
                        const ratingValue = overallRating || 0
                        const filled = i < Math.round(ratingValue)
                        return (
                          <svg key={`main-rating-${i}`} className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )
                      })}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">Rating</span>
                  <span className="ml-2 text-sm text-gray-500">{reviewCount || 0} review{(reviewCount || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* nefol-style Pricing */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Discounted price</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900">
                    {(() => {
                      // Priority: Admin panel data > CSV data > fallback
                      const adminMrp = product?.details?.mrp
                      const adminWebsitePrice = product?.details?.websitePrice
                      const csvMrp = csvProduct?.['MRP (₹)'] || csvProduct?.['MRP']
                      const csvWebsitePrice = csvProduct?.['website price'] || csvProduct?.['Website Price']
                      
                      const mrp = adminMrp || csvMrp || product.price || '₹599'
                      const websitePrice = adminWebsitePrice || csvWebsitePrice || ''
                      
                      return websitePrice && websitePrice !== mrp ? websitePrice : mrp
                    })()}
                  </span>
                  {(() => {
                    // Priority: Admin panel data > CSV data > fallback
                    const adminMrp = product?.details?.mrp
                    const adminWebsitePrice = product?.details?.websitePrice
                    const csvMrp = csvProduct?.['MRP (₹)'] || csvProduct?.['MRP']
                    const csvWebsitePrice = csvProduct?.['website price'] || csvProduct?.['Website Price']
                    
                    const mrp = adminMrp || csvMrp || product.price || '₹599'
                    const websitePrice = adminWebsitePrice || csvWebsitePrice || ''
                    
                    return websitePrice && websitePrice !== mrp ? (
                      <>
                        <div className="text-sm text-gray-600">Regular price</div>
                        <span className="text-lg font-medium line-through opacity-60 text-gray-500">
                          ₹{mrp}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                          Save {Math.round(((parseFloat(mrp.toString().replace(/[₹,]/g, '')) - parseFloat(websitePrice.toString().replace(/[₹,]/g, ''))) / parseFloat(mrp.toString().replace(/[₹,]/g, '')) * 100))}%
                        </span>
                      </>
                    ) : null
                  })()}
                </div>
                <div className="text-sm text-gray-600">Inclusive of GST</div>
                
                {/* Net Volume */}
                {csvProduct?.['Net Quantity (Content)'] && (
                  <div className="text-sm text-gray-600">
                    Net Vol: {csvProduct['Net Quantity (Content)']}
                  </div>
                )}
              </div>

              {/* Check Delivery Availability */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Check Delivery Availability</div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    placeholder="Enter Pincode" 
                    value={deliveryPincode || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setDeliveryPincode(value)
                      setDeliveryError(null)
                      setDeliveryInfo(null)
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && deliveryPincode.length === 6) {
                        checkDeliveryAvailability()
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
                    maxLength={6}
                  />
                  <button 
                    onClick={checkDeliveryAvailability}
                    disabled={deliveryPincode.length !== 6 || checkingDelivery}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingDelivery ? 'CHECKING...' : 'CHECK'}
                  </button>
                </div>
                {deliveryError && (
                  <div className="text-sm text-red-600 mt-2">{deliveryError}</div>
                )}
                {deliveryInfo && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    {deliveryInfo.data?.available_courier_companies && deliveryInfo.data.available_courier_companies.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-green-800">✓ Delivery Available</div>
                        {(() => {
                          // Get all delivery days and find min/max
                          const deliveryDays = deliveryInfo.data.available_courier_companies
                            .map((courier: any) => courier.estimated_delivery_days)
                            .filter((days: number) => days && days > 0)
                            .sort((a: number, b: number) => a - b)
                          
                          if (deliveryDays.length === 0) {
                            return <div className="text-sm text-green-700">Delivery available</div>
                          }
                          
                          const minDays = deliveryDays[0]
                          const maxDays = deliveryDays[deliveryDays.length - 1]
                          
                          if (minDays === maxDays) {
                            return <div className="text-sm text-green-700 font-medium">{minDays} {minDays === 1 ? 'day' : 'days'}</div>
                          } else {
                            return <div className="text-sm text-green-700 font-medium">{minDays}-{maxDays} days</div>
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="text-sm text-orange-800">⚠️ Delivery may not be available to this pincode. Please contact support.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => {
                      if (product && addItem) {
                        try {
                          addItem(product, quantity)
                          // Track AddToCart event for Meta Pixel
                          pixelEvents.addToCart({
                            ...formatProductData(product),
                            quantity: quantity,
                          })
                          // Show success message
                          const button = document.querySelector('[data-add-to-cart]') as HTMLButtonElement
                          if (button) {
                            const originalText = button.textContent
                            button.textContent = 'Added to Cart!'
                            button.classList.add('bg-green-600', 'hover:bg-green-700')
                        button.classList.remove('bg-gray-900', 'hover:bg-gray-800')
                            setTimeout(() => {
                              button.textContent = originalText
                              button.classList.remove('bg-green-600', 'hover:bg-green-700')
                          button.classList.add('bg-gray-900', 'hover:bg-gray-800')
                            }, 2000)
                          }
                        } catch (error) {
                          // AuthGuard will handle the authentication requirement
                          console.log('Authentication required for cart operation')
                        }
                      }
                    }}
                    data-add-to-cart
                    className="flex-1 rounded-md bg-gray-900 px-4 sm:px-6 py-3 font-semibold text-white hover:bg-gray-800 transition-colors min-h-[48px]"
                  >
                ADD TO CART
                  </button>

                  <button 
                    onClick={() => {
                      if (product && addItem) {
                        try {
                          addItem(product, quantity)
                          // Navigate to checkout immediately using hash-based routing
                          window.location.hash = '#/user/checkout'
                        } catch (error) {
                          // AuthGuard will handle the authentication requirement
                          console.log('Authentication required for purchase')
                        }
                      }
                    }}
                    className="flex-1 rounded-md bg-blue-600 px-4 sm:px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors min-h-[48px]"
                  >
                    BUY NOW
                  </button>
              </div>

              {/* Share Product */}
              <div className="flex items-center gap-2">
                <ShareProduct 
                  productSlug={product.slug}
                  productTitle={product.title}
                  productImage={product.listImage}
                />
              </div>

              {/* Loyalty Points */}
              <div className="flex items-center text-sm text-gray-600">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Earn upto 249 points on this purchase
                </div>

              {/* Shipping Info */}
              <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-md">
                Your order will be shipped out in 2-4 business days.
              </div>

              {/* Reasons to Love */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">REASONS TO LOVE:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Natural Ingredients</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Cruelty Free</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Paraben Free</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Suitable for All Skin Types</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>Dermatologically Tested</span>
                  </li>
                </ul>
              </div>

              {/* Product Claims/Badges */}
              {csvProduct?.['Special Attributes (Badges)'] && (
                <div className="flex flex-wrap gap-3 mb-6">
                  {csvProduct['Special Attributes (Badges)'].split('|').filter((badge: string) => badge.trim()).map((badge: string, index: number) => (
                    <div key={`badge-${index}-${badge.trim().substring(0, 10)}`} className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-full">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700">{badge.trim()}</span>
            </div>
                  ))}
          </div>
              )}

              {/* Collapsible Sections */}
              <div className="space-y-2">
                {/* Description */}
                <div className="border-b border-gray-200">
              <button
                    onClick={() => toggleSection('description')}
                    className="flex items-center justify-between w-full py-3 text-left font-semibold text-gray-900"
                  >
                    <span>DESCRIPTION</span>
                    <svg className={`h-5 w-5 transition-transform ${expandedSections.description ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
              </button>
                  {expandedSections.description && (
                    <div className="pb-4 text-sm text-gray-600">
                      <p className="mb-4">
                        {csvProduct?.['Product Description (Long)'] || csvProduct?.['Long Description'] || product.description || 'Premium natural skincare product designed for optimal skin health and radiance.'}
                      </p>
                      {csvProduct?.['Subtitle / Tagline'] && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                          <p>{csvProduct['Subtitle / Tagline']}</p>
                        </div>
                      )}
                    </div>
                  )}
            </div>

                {/* Suitable For */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection('suitablefor')}
                    className="flex items-center justify-between w-full py-3 text-left font-semibold text-gray-900"
                  >
                    <span>SUITABLE FOR</span>
                    <svg className={`h-5 w-5 transition-transform ${expandedSections.suitablefor ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedSections.suitablefor && (
                    <div className="pb-4 text-sm text-gray-600">
                      <p className="mb-4">
                        {csvProduct?.['Skin/Hair Type'] || 'All Skin Types'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div key="skin-type-all" className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>All Skin Types</span>
                        </div>
                        <div key="skin-type-sensitive" className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Sensitive Skin</span>
                        </div>
                        <div key="skin-type-dry" className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Dry Skin</span>
                        </div>
                        <div key="skin-type-oily" className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Oily Skin</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* How to Use */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection('howtouse')}
                    className="flex items-center justify-between w-full py-3 text-left font-semibold text-gray-900"
                  >
                    <span>HOW TO USE</span>
                    <svg className={`h-5 w-5 transition-transform ${expandedSections.howtouse ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedSections.howtouse && (
                    <div className="pb-4 text-sm text-gray-600">
                      <ol className="list-decimal list-inside space-y-1">
                        {csvProduct?.['How to Use (Steps)'] ? 
                          csvProduct['How to Use (Steps)'].split(',').filter((step: string) => step.trim()).map((step: string, index: number) => (
                            <li key={`howtouse-csv-${index}-${step.trim().substring(0, 10)}`}>{step.trim()}</li>
                          )) :
                          [
                            'Cleanse your face with a gentle cleanser',
                            'Apply a small amount to face and neck',
                            'Gently massage in circular motions',
                            'Use twice daily for best results'
                          ].map((step, index) => (
                            <li key={`howtouse-default-${index}-${step.substring(0, 10)}`}>{step}</li>
                          ))
                        }
                      </ol>
                    </div>
                  )}
                </div>

                {/* Product Specifications */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection('specifications')}
                    className="flex items-center justify-between w-full py-3 text-left font-semibold text-gray-900"
                  >
                    <span>PRODUCT SPECIFICATIONS</span>
                    <svg className={`h-5 w-5 transition-transform ${expandedSections.specifications ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedSections.specifications && (
                    <div className="pb-4 text-sm text-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {csvProduct?.['SKU'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">SKU:</span>
                              <span className="font-medium">{csvProduct['SKU']}</span>
                            </div>
                          )}
                          {csvProduct?.['HSN Code'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">HSN Code:</span>
                              <span className="font-medium">{csvProduct['HSN Code']}</span>
                            </div>
                          )}
                          {csvProduct?.['Brand Name'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Brand:</span>
                              <span className="font-medium">{csvProduct['Brand Name']}</span>
                            </div>
                          )}
                          {csvProduct?.['Net Quantity (Content)'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Net Quantity:</span>
                              <span className="font-medium">{csvProduct['Net Quantity (Content)']}</span>
                            </div>
                          )}
                          {csvProduct?.['Unit Count (Pack of)'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Unit Count:</span>
                              <span className="font-medium">{csvProduct['Unit Count (Pack of)']}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {csvProduct?.['Net Weight (Product Only)'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Net Weight:</span>
                              <span className="font-medium">{csvProduct['Net Weight (Product Only)']}</span>
                            </div>
                          )}
                          {csvProduct?.['Dead Weight (Packaging Only)'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Packaging Weight:</span>
                              <span className="font-medium">{csvProduct['Dead Weight (Packaging Only)']}</span>
                            </div>
                          )}
                          {csvProduct?.['GST %'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">GST:</span>
                              <span className="font-medium">{csvProduct['GST %']}%</span>
                            </div>
                          )}
                          {csvProduct?.['Country of Origin'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Country of Origin:</span>
                              <span className="font-medium">{csvProduct['Country of Origin']}</span>
                            </div>
                          )}
                          {csvProduct?.['Manufacturer / Packer / Importer'] && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Manufacturer:</span>
                              <span className="font-medium">{csvProduct['Manufacturer / Packer / Importer']}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Packaging Details */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection('packaging')}
                    className="flex items-center justify-between w-full py-3 text-left font-semibold text-gray-900"
                  >
                    <span>PACKAGING DETAILS</span>
                    <svg className={`h-5 w-5 transition-transform ${expandedSections.packaging ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedSections.packaging && (
                    <div className="pb-4 text-sm text-gray-600">
                      <div className="space-y-2">
                        {csvProduct?.['Package Content Details'] && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Package Content:</span>
                            <span className="font-medium">{csvProduct['Package Content Details']}</span>
                          </div>
                        )}
                        {csvProduct?.['Inner Packaging Type'] && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Inner Packaging:</span>
                            <span className="font-medium">{csvProduct['Inner Packaging Type']}</span>
                          </div>
                        )}
                        {csvProduct?.['Outer Packaging Type'] && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Outer Packaging:</span>
                            <span className="font-medium">{csvProduct['Outer Packaging Type']}</span>
                          </div>
                        )}
                        {csvProduct?.['Hazardous / Fragile (Y/N)'] && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Hazardous/Fragile:</span>
                            <span className="font-medium">{csvProduct['Hazardous / Fragile (Y/N)']}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Links */}
                {csvProduct?.['Video Links'] && (
                  <div className="border-b border-gray-200">
                    <button
                      onClick={() => toggleSection('videos')}
                      className="flex items-center justify-between w-full py-3 text-left font-semibold text-gray-900"
                    >
                      <span>VIDEO LINKS</span>
                      <svg className={`h-5 w-5 transition-transform ${expandedSections.videos ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    {expandedSections.videos && (
                      <div className="pb-4 text-sm text-gray-600">
                        <div className="space-y-2">
                          {csvProduct['Video Links'].split(',').filter((link: string) => link.trim()).map((link: string, index: number) => (
                            <div key={`video-${index}-${link.trim().substring(0, 20)}`} className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                              <a 
                                href={link.trim()} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Watch Video {index + 1}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
                      
              {/* Key Specifications */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">KEY SPECIFICATIONS</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {csvProduct?.['Net Weight (Product Only)'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Weight:</span>
                      <span className="font-medium">{csvProduct['Net Weight (Product Only)']}</span>
                    </div>
                  )}
                  {csvProduct?.['Net Quantity (Content)'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{csvProduct['Net Quantity (Content)']}</span>
                    </div>
                  )}
                  {csvProduct?.['SKU'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-medium">{csvProduct['SKU']}</span>
                    </div>
                  )}
                  {csvProduct?.['Brand Name'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span className="font-medium">{csvProduct['Brand Name']}</span>
                    </div>
                  )}
                  {csvProduct?.['Country of Origin'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Origin:</span>
                      <span className="font-medium">{csvProduct['Country of Origin']}</span>
                    </div>
                  )}
                  {csvProduct?.['GST %'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST:</span>
                      <span className="font-medium">{csvProduct['GST %']}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plant Powered Science Badge */}
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-green-800">96.52% Plant Powered Science</span>
                </div>
              </div>

              {/* Country of Origin */}
              <div className="flex items-center text-sm text-gray-600">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Country Of Origin: {csvProduct?.['Country of Origin'] || 'India'}
              </div>

              {/* Welcome Offer */}
              <div className="bg-gray-100 px-4 py-3 rounded-md">
                <div className="text-sm font-semibold text-gray-900 mb-1">WELCOME OFFER</div>
                <div className="text-sm text-gray-600">Use Code HELLO10 and enjoy flat 10% off on your first purchase.</div>
              </div>
            </div>
          </div>

          {/* Mid-Page Promotional Banner - Full Width like Navigation - All Banners Displayed */}
          {product.bannerImages && product.bannerImages.length > 0 && (
            <section className="w-full overflow-hidden">
              {(() => {
                // Deduplicate banner images by URL to avoid showing duplicates
                // Filter out empty/null/undefined values and ensure all banners are displayed
                const validBanners = product.bannerImages.filter((img: any) => img && typeof img === 'string' && img.trim().length > 0)
                const uniqueBanners = [...new Map(validBanners.map((img, idx) => [img, idx])).keys()]
                
                // Display ALL banners - no limit, no slice
                return uniqueBanners.map((banner, idx) => {
                  const isVid = /\.(mp4|webm|ogg)(\?|$)/i.test(banner)
                  return (
                    <div key={`${banner}-${idx}`} className="w-full overflow-hidden" style={{ marginBottom: idx < uniqueBanners.length - 1 ? '2px' : '0' }}>
                      {isVid ? (
                        <video 
                          src={banner} 
                          className="w-full h-auto object-cover block" 
                          controls 
                          autoPlay 
                          muted 
                          loop 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <img 
                          src={banner} 
                          alt={`${product.title} Banner ${idx + 1}`} 
                          className="w-full h-auto object-cover block" 
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }} 
                        />
                      )}
                    </div>
                  )
                })
              })()}
            </section>
          )}

          {/* Mid-Page Ingredients Section */}
          {csvProduct?.['Key Ingredients'] && (() => {
            const apiBase = getApiBase()
            const toAbs = (u?: string) => {
              if (!u || typeof u !== 'string') return ''
              if (/^https?:\/\//i.test(u)) return u
              const base = apiBase.replace(/\/$/, '')
              const path = u.startsWith('/') ? u : `/${u}`
              return `${base}${path}`
            }
            
            // Map ingredient names to their images
            const getIngredientImage = (ingredientName: string): string | null => {
              // Remove parentheses and their content, normalize
              let normalized = ingredientName.trim().toLowerCase()
              // Remove parentheses content like "(Blue Tea)" but keep the words
              normalized = normalized.replace(/\([^)]*\)/g, '').trim()
              
              const ingredientMap: { [key: string]: string } = {
                'blue tea': '/IMAGES/blue pea.webp',
                'aprajita': '/IMAGES/blue pea.webp',
                'blue pea': '/IMAGES/blue pea.webp',
                'charcoal': '/IMAGES/charcoal.webp',
                'activated charcoal': '/IMAGES/charcoal.webp',
                'yuja': '/IMAGES/yuja.webp',
                'citron': '/IMAGES/yuja.webp',
                'papaya': '/IMAGES/papaya.webp',
                'shea butter': '/IMAGES/shea butter.webp',
                'coconut oil': '/IMAGES/coconut-oil.webp',
                'coconut': '/IMAGES/coconut-oil.webp',
                'mulberry': '/IMAGES/mulberry.webp',
                'grapeseed': '/IMAGES/grapseed.webp',
                'grape seed': '/IMAGES/grapseed.webp',
                'aha & bha': '/IMAGES/AHA & BHA.webp',
                'aha': '/IMAGES/AHA & BHA.webp',
                'bha': '/IMAGES/AHA & BHA.webp',
                'alpha hydroxy acid': '/IMAGES/AHA & BHA.webp',
                'beta hydroxy acid': '/IMAGES/AHA & BHA.webp',
                'amla': '/IMAGES/Amla.webp',
                'indian gooseberry': '/IMAGES/Amla.webp',
                'argan oil': '/IMAGES/Argan Oils.webp',
                'argan oils': '/IMAGES/Argan Oils.webp',
                'biotin': '/IMAGES/Biotin.webp',
                'blueberry': '/IMAGES/Blueberry.webp',
                'brahmi': '/IMAGES/Brahmi.webp',
                'flaxseed': '/IMAGES/Flaxseed.webp',
                'flax seed': '/IMAGES/Flaxseed.webp',
                'green tea': '/IMAGES/Green Tea.webp',
                'juniper berry': '/IMAGES/Juniper Berry.webp',
                'kakadu plum': '/IMAGES/Kakadu Plum.webp',
                'kale leaf': '/IMAGES/Kale Leaf.webp',
                'kale': '/IMAGES/Kale Leaf.webp',
                'kaolin clay': '/IMAGES/Kaolin Clay.webp',
                'kaolin': '/IMAGES/Kaolin Clay.webp',
                'mustard': '/IMAGES/Mustard.webp',
                'olive squalane': '/IMAGES/Olive Squalane.webp',
                'squalane': '/IMAGES/Olive Squalane.webp',
                'palmetto': '/IMAGES/Palmetto.webp',
                'saw palmetto': '/IMAGES/Palmetto.webp',
                'quinoa': '/IMAGES/Quinoa.webp',
                'rice powder': '/IMAGES/Rice Powder.webp',
                'saffron': '/IMAGES/Saffron.webp',
                'sesame': '/IMAGES/Sesame.webp',
                'sesame seed': '/IMAGES/Sesame.webp',
                'tapioca starch': '/IMAGES/Tapioca Starch.webp',
                'tapioca': '/IMAGES/Tapioca Starch.webp',
                'tea tree': '/IMAGES/Tea Tree.webp',
                'tea tree oil': '/IMAGES/Tea Tree.webp',
                'vitamin c & b5': '/IMAGES/Vitamin C & B5.webp',
                'vitamin c': '/IMAGES/Vitamin C & B5.webp',
                'vitamin b5': '/IMAGES/Vitamin C & B5.webp',
                'pantothenic acid': '/IMAGES/Vitamin C & B5.webp',
                'white tea': '/IMAGES/white tea.webp',
                'yellow dragon': '/IMAGES/Yellow Dragon.webp'
              }
              
              // Try exact match first
              if (ingredientMap[normalized]) {
                return toAbs(ingredientMap[normalized])
              }
              
              // Try partial match - check if any key is contained in normalized name
              for (const [key, image] of Object.entries(ingredientMap)) {
                if (normalized.includes(key) || key.includes(normalized)) {
                  return toAbs(image)
                }
              }
              
              // Also check the original name with parentheses for "Aprajita (Blue Tea)" type entries
              const originalNormalized = ingredientName.trim().toLowerCase()
              for (const [key, image] of Object.entries(ingredientMap)) {
                if (originalNormalized.includes(key)) {
                  return toAbs(image)
                }
              }
              
              return null
            }
            
            const ingredients = csvProduct['Key Ingredients'].split(',').map((ing: string) => ing.trim()).filter((ing: string) => ing)
            
            return (
              <section className="py-16 bg-gray-50 w-full overflow-hidden">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12 px-4">INGREDIENTS</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 w-full">
                    {ingredients.map((ingredient: string, index: number) => {
                      const imageUrl = getIngredientImage(ingredient)
                      return (
                        <div key={`ingredient-${index}-${ingredient.substring(0, 10)}`} className="text-center w-full">
                          <div className="w-20 sm:w-24 md:w-28 mx-auto mb-4 bg-white rounded-full shadow-md overflow-hidden relative" style={{ aspectRatio: '1 / 1', borderRadius: '50%', flexShrink: 0 }}>
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={ingredient}
                                className="absolute inset-0 object-cover rounded-full"
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  objectPosition: 'center',
                                  borderRadius: '50%'
                                }}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  // Fallback to icon if image fails
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                                        </svg>
                                      </div>
                                    `
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base px-2 break-words">{ingredient.trim()}</h3>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })()}

          {/* Plant-Based Skincare Banner */}
          <section className="py-16 bg-white">
            <div className="mx-auto max-w-7xl px-4">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">PLANT-BASED SKINCARE THAT WORKS FOR EVERY SKIN TYPE</h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Our carefully curated ingredients work together to provide effective, natural skincare solutions that deliver real results for all skin types.
                </p>
              </div>
            </div>
          </section>

          {/* You May Also Like Section */}
          <section className="border-t border-gray-200 pt-12 mb-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">YOU MAY ALSO LIKE</h2>
            <div className="relative">
              <button
                onClick={() => setRelatedPage(prev => Math.max(0, prev - 1))}
                className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 ${
                  canGoPreviousRelated ? 'opacity-100 hover:scale-110 cursor-pointer' : 'opacity-0 pointer-events-none'
                }`}
                style={{backgroundColor: '#fff'}}
                aria-label="Previous"
                disabled={!canGoPreviousRelated}
              >
                <ChevronLeft className="w-6 h-6" style={{color: '#1B4965'}} />
              </button>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleRelatedProducts.map((item: any, index) => (
                <div key={`related-product-${item.id || item.slug || 'no-id'}-${index}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <a href={`#/user/product/${item.slug}`}>
                    <div className="relative">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-48 object-cover"
                  />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                          NEW LAUNCH
                        </span>
                      </div>
                      <button className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md">
                        <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                  <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                    {(() => {
                      const slug = item.slug || ''
                      // Use database stats if available, otherwise fallback to static
                      const dbStats = relatedReviewStats[slug]
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
                                  <svg key={`related-${item.id || item.slug || index}-rating-${i}`} className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                )
                              })}
                            </div>
                            <span className="text-sm text-gray-600 ml-2">{rating.toFixed(1)} ({reviewCount})</span>
                            {hasVerified && (
                              <VerifiedBadge size="sm" className="ml-1.5" />
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm line-through text-gray-500">{item.originalPrice}</span>
                          <span className="font-bold text-gray-900">{item.price}</span>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          {item.discount}% OFF
                        </span>
                      </div>
                      <button className="w-full py-2 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800">
                        ADD TO CART
                      </button>
                  </div>
                </a>
              </div>
            ))}
              </div>
              
              <button
                onClick={() => setRelatedPage(prev => Math.min(relatedTotalPages - 1, prev + 1))}
                className={`absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 ${
                  canGoNextRelated ? 'opacity-100 hover:scale-110 cursor-pointer' : 'opacity-0 pointer-events-none'
                }`}
                style={{backgroundColor: '#fff'}}
                aria-label="Next"
                disabled={!canGoNextRelated}
              >
                <ChevronRight className="w-6 h-6" style={{color: '#1B4965'}} />
              </button>
            </div>
          </section>

          {/* Related Products Carousel */}
          {product.id && (
            <>
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500">Loading related products...</div>}>
                <RelatedProductsCarousel 
                  productId={product.id}
                  type="related"
                  title="Complete the Routine"
                />
              </Suspense>
              
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500">Loading recommendations...</div>}>
                <RelatedProductsCarousel 
                  productId={product.id}
                  type="recommended"
                  title="You May Also Like"
                />
              </Suspense>
            </>
          )}

          {/* Recently Viewed Products */}
          <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading recently viewed...</div>}>
            <RecentlyViewed limit={8} />
          </Suspense>

          {/* Customer Reviews Section */}
          <section className="border-t border-gray-200 pt-12 mb-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Customer Reviews</h2>
            
            <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => {
                          const ratingValue = overallRating || 0
                          const filled = i < Math.round(ratingValue)
                          const halfFilled = i < ratingValue && i + 1 > ratingValue
                          return (
                            <svg key={`reviews-overall-${i}`} className={`h-5 w-5 ${filled ? 'fill-current' : halfFilled ? 'fill-current opacity-50' : 'text-gray-300'}`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          )
                        })}
                      </div>
                <span className="text-lg font-semibold text-gray-900">{overallRating > 0 ? overallRating.toFixed(2) : '0.00'} out of 5</span>
                <span className="text-sm text-gray-600">Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    if (!isAuthenticated) {
                      alert('Please login to write a review')
                      window.location.hash = '#/user/login'
                      return
                    }
                    setShowReviewModal(true)
                  }}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                >
                  Write a review
                </button>
                <button 
                  onClick={() => setShowQuestionModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-900 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Ask a question
                </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reviewsLoading ? (
                      <p className="text-gray-600 text-center py-8">Loading reviews...</p>
                    ) : allProductReviews.length === 0 ? (
                      <p className="text-gray-600 text-center py-8">No reviews yet. Be the first to review this product!</p>
                    ) : (
                      allProductReviews.slice(0, reviewsToShow).map((review: any, index) => (
                <div key={`review-${review.id || 'no-id'}-${index}`} className={`p-4 border rounded-lg ${review.isFeatured ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">
                                {review.name.charAt(0).toUpperCase()}
                              </span>
          </div>
          <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{review.name}</h4>
                          {review.isVerified && (
                            <VerifiedBadge size="sm" className="ml-1" />
                          )}
                          {review.isFeatured && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Featured</span>
                          )}
                        </div>
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={`review-${review.id || index}-rating-${i}`} className={`h-4 w-4 ${i < (review.rating || 0) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                          </div>
                    <span className="text-sm text-gray-600">{review.date}</span>
                  </div>
                  {review.title && (
                    <h5 className="font-semibold text-gray-900 mb-1">{review.title}</h5>
                  )}
                  <p className="text-gray-700">{review.comment}</p>
                </div>
                      ))
                    )}
            </div>

            {allProductReviews.length > reviewsToShow && (
              <div className="text-center mt-8">
                <button 
                  onClick={() => setReviewsToShow(reviewsToShow + 5)}
                  className="px-6 py-2 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </section>

          {/* FAQ Section */}
          <section className="border-t border-gray-200 pt-12 mb-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">NEED HELP? FREQUENTLY ASKED QUESTIONS</h2>
            <div className="max-w-3xl mx-auto space-y-2">
              {getFAQItems().map((faq, index) => (
                <div key={`faq-${index}-${faq.question.substring(0, 10)}`} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection(`faq-${index}`)}
                    className="flex items-center justify-between w-full py-4 text-left font-semibold text-gray-900"
                  >
                    <span>{faq.question}</span>
                    <svg className={`h-5 w-5 transition-transform ${expandedSections[`faq-${index}`] ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedSections[`faq-${index}`] && (
                    <div className="pb-4 text-sm text-gray-600">
                      {faq.answer}
                    </div>
                  )}
              </div>
            ))}
          </div>
          </section>
        </div>
      </main>

      {/* Sticky Add to Cart */}
      {product && (
        <StickyAddToCart 
          product={{
            id: product.id,
            title: product.title,
            price: product.price,
            slug: product.slug,
            listImage: product.listImage
          }}
          quantity={quantity}
        />
      )}

      {/* Image Zoom Lightbox */}
      {showImageZoom && product && (
        <ImageZoom
          images={(() => {
            const allImages = product.listImage ? [product.listImage, ...(product.pdpImages || [])] : (product.pdpImages || [])
            // Deduplicate images by URL to avoid showing duplicates
            return [...new Map(allImages.filter(Boolean).map((img, idx) => [img, idx])).keys()]
          })()}
          currentIndex={zoomImageIndex}
          onClose={() => setShowImageZoom(false)}
          onIndexChange={(index) => {
            setZoomImageIndex(index)
          }}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && product && <ReviewModal 
        product={product}
        user={user}
        onClose={() => setShowReviewModal(false)}
        onSuccess={() => {
          setShowReviewModal(false)
          if (product?.id) {
            loadProductReviews(product.id)
          }
        }}
      />}

      {/* Question Modal */}
      {showQuestionModal && product && <QuestionModal 
        product={product}
        user={user}
        onClose={() => setShowQuestionModal(false)}
      />}
    </div>
  )
}

// Review Modal Component
function ReviewModal({ product, user, onClose, onSuccess }: {
  product: Product
  user: { name: string; email: string } | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!rating) {
      setError('Please select a rating')
      return
    }
    if (!title.trim()) {
      setError('Please enter a review title')
      return
    }
    if (!reviewText.trim()) {
      setError('Please enter your review')
      return
    }

    setIsSubmitting(true)

    if (!product.id) {
      setError('Product ID is missing')
      return
    }

    try {
      await api.reviews.createProductReview({
        product_id: product.id,
        customer_email: user?.email || '',
        customer_name: user?.name || '',
        rating,
        title: title.trim() || undefined,
        review_text: reviewText.trim() || undefined,
        images: []
      })

      // Invalidate review stats cache so new review shows up immediately
      try {
        const { invalidateReviewStatsCache } = await import('../hooks/useProductReviewStats')
        invalidateReviewStatsCache()
      } catch (e) {
        // Ignore if module not available
      }
      
      alert('Review submitted successfully! Thank you for your feedback.')
      onSuccess()
    } catch (err: any) {
      console.error('Failed to submit review:', err)
      setError(err.message || 'Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Write a Review</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">Reviewing: <span className="font-semibold text-gray-900">{product.title}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`w-10 h-10 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your review a title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                maxLength={100}
              />
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500">{reviewText.length}/1000 characters</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Question Modal Component
function QuestionModal({ product, user, onClose }: {
  product: Product
  user: { name: string; email: string; phone?: string } | null
  onClose: () => void
}) {
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [question, setQuestion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (!question.trim()) {
      setError('Please enter your question')
      return
    }

    if (!product.id) {
      setError('Product ID is missing')
      return
    }

    setIsSubmitting(true)

    try {
      await productQuestionsAPI.createQuestion({
        product_id: product.id,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        question: question.trim()
      })

      alert('Question submitted successfully! We\'ll get back to you soon.')
      onClose()
    } catch (err: any) {
      console.error('Failed to submit question:', err)
      setError(err.message || 'Failed to submit question. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Ask a Question</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">Question about: <span className="font-semibold text-gray-900">{product.title}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Phone (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Question <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask your question about this product..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                required
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">{question.length}/500 characters</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function getRelatedProducts(currentProduct: Product | null): Array<{
  slug: string
  image: string
  title: string
  rating: number
  reviewCount: number
  originalPrice: string
  price: string
  discount: number
}> {
  if (!currentProduct) return []
  
  // Return empty array - related products should be loaded via API in the component
  return []
}

function getFAQItems(): Array<{
  question: string
  answer: string
}> {
  // Return empty array - FAQ items should be loaded via API in the component
  return []
}
