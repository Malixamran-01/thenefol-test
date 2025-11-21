import { useProducts } from '../hooks/useProducts'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect, useMemo } from 'react'
import { getApiBase } from '../utils/apiBase'
import PricingDisplay from '../components/PricingDisplay'
import ScrollReveal from '../components/ScrollReveal'
import { getProductRating, getProductReviewCount, hasVerifiedReviews } from '../utils/product_reviews'
import { useProductReviewStats } from '../hooks/useProductReviewStats'
import VerifiedBadge from '../components/VerifiedBadge'

export default function Shop() {
  const { items, loading, error } = useProducts()
  const cartContext = useCart()
  const { addToWishlist } = useWishlist()
  const { isAuthenticated } = useAuth()
  
  // Get all product slugs for batch fetching review stats
  const productSlugs = useMemo(() => {
    return items.map(item => item.slug || '').filter(slug => slug)
  }, [items])
  
  // Fetch review stats for all products
  const { stats: reviewStats } = useProductReviewStats(productSlugs)
  
  // Safely access cart methods
  const addItem = cartContext?.addItem
  const [csvProducts, setCsvProducts] = useState<any[]>([])

  useEffect(() => {
    fetchCsvProducts()
  }, [])

  const fetchCsvProducts = async () => {
    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/products-csv`)
      if (response.ok) {
        const data = await response.json()
        setCsvProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch CSV products:', error)
    }
  }

  // Helper function to create simplified product data from CSV for listings
  const getSimplifiedProductData = (csvProduct: any) => {
    return {
      slug: csvProduct['Product Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
      title: csvProduct['Product Name'] || '',
      brand: csvProduct['Brand Name'] || 'NEFOL',
      mrp: csvProduct['MRP '] || csvProduct['MRP'] || '',
      websitePrice: csvProduct['website price'] || '',
      category: csvProduct['Product Name']?.includes('Hair') ? 'Hair Care' : 
                csvProduct['Product Name']?.includes('Face') ? 'Face Care' : 
                csvProduct['Product Name']?.includes('Body') ? 'Body Care' : 'Skincare'
    }
  }

  // Helper function to get product type for sorting (face, hair, body, combo)
  const getProductType = (product: any): string => {
    const category = (product.category || '').toLowerCase()
    const title = (product.title || '').toLowerCase()
    
    // Check for combo first
    if (category.includes('combo') || category === 'combo pack' || title.includes('combo')) {
      return 'combo'
    }
    // Check for face
    if (category.includes('face') || category === 'facecare' || title.includes('face')) {
      return 'face'
    }
    // Check for hair
    if (category.includes('hair') || category === 'haircare' || title.includes('hair')) {
      return 'hair'
    }
    // Check for body
    if (category.includes('body') || title.includes('body')) {
      return 'body'
    }
    // Default to 'other'
    return 'other'
  }

  // Helper function to get numeric price from product
  const getProductPrice = (product: any): number => {
    // Priority: Admin panel data > CSV data > fallback
    const adminWebsitePrice = product?.details?.websitePrice
    const adminMrp = product?.details?.mrp
    const csvWebsitePrice = product?.csvProduct?.['website price'] || product?.csvProduct?.['Website Price']
    const csvMrp = product?.csvProduct?.['MRP (₹)'] || product?.csvProduct?.['MRP '] || product?.csvProduct?.['MRP']
    
    // Prefer website price if available, otherwise use MRP
    const priceStr = adminWebsitePrice || csvWebsitePrice || adminMrp || csvMrp || product.price || '0'
    
    // Clean price string and convert to number
    const cleanPrice = parseFloat(priceStr.toString().replace(/[₹,]/g, '')) || 0
    return cleanPrice
  }

  // Sort products by type: face, hair, body, combo, then others
  // Within combos, sort by price from high to low
  const sortedItems = [...items].sort((a, b) => {
    const typeOrder: { [key: string]: number } = {
      'face': 1,
      'hair': 2,
      'body': 3,
      'combo': 4,
      'other': 5
    }
    const typeA = getProductType(a)
    const typeB = getProductType(b)
    
    // First sort by type
    const typeDiff = (typeOrder[typeA] || 5) - (typeOrder[typeB] || 5)
    if (typeDiff !== 0) {
      return typeDiff
    }
    
    // If both are combos, sort by price (high to low)
    if (typeA === 'combo' && typeB === 'combo') {
      const priceA = getProductPrice(a)
      const priceB = getProductPrice(b)
      return priceB - priceA // Descending order (high to low)
    }
    
    return 0
  })
  return (
    <main className="min-h-screen py-12 sm:py-16 md:py-20 overflow-x-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal animationType="fade-up" delay={0}>
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 tracking-[0.15em]" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
              data-aos="fade-up"
            >
              SHOP
            </h1>
            <p 
              className="text-sm sm:text-base font-light max-w-2xl mx-auto px-4 tracking-wide" 
              style={{color: '#666', letterSpacing: '0.05em'}}
              data-aos="fade-up"
              data-aos-delay="100"
            >
              Discover our curated collection of premium skincare and haircare essentials, crafted with nature's finest ingredients.
            </p>
          </div>
        </ScrollReveal>
        
        {loading && (
          <div className="text-center py-20">
            <p className="text-sm font-light tracking-wide" style={{color: '#999', letterSpacing: '0.1em'}}>Loading products...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-20">
            <p className="text-sm font-light text-slate-600">{error}</p>
          </div>
        )}
        
        {sortedItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-10 md:gap-12 auto-rows-fr">
            {sortedItems.map((product, index) => {
              return (
                <ScrollReveal 
                  key={product.slug} 
                  animationType="fade-up" 
                  delay={index % 4 * 100}
                >
                  <article 
                    className="bg-white group overflow-hidden flex flex-col h-full transition-all duration-500"
                    data-aos="fade-up"
                    data-aos-delay={index % 4 * 100}
                  >
                    <div className="relative overflow-hidden aspect-square mb-6 rounded-xl">
                      <a href={`#/user/product/${product.slug}`}>
                        {product.listImage && (
                          <img 
                            src={product.listImage} 
                            alt={product.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 rounded-xl" 
                            loading="lazy"
                            style={{ aspectRatio: '1 / 1' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                      </a>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <button 
                          onClick={() => {
                            if (!isAuthenticated) {
                              window.location.hash = '#/user/login'
                              return
                            }
                            if (product.id) {
                              addToWishlist?.(product.id)
                            }
                          }}
                          className="w-9 h-9 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-all duration-300"
                          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        >
                          <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col flex-grow px-2">
                      <h3 className="text-lg sm:text-xl font-semibold tracking-wide mb-0.5 line-clamp-2 overflow-hidden" style={{color: '#1a1a1a', letterSpacing: '0.05em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxHeight: '3.5rem'}}>
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
                            <div className="flex items-center mb-1.5">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => {
                                  const filled = i < Math.round(rating)
                                  return (
                                    <svg key={i} className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  )
                                })}
                              </div>
                              <span className="text-xs sm:text-sm ml-2 font-light" style={{color: '#999'}}>{rating.toFixed(1)} ({reviewCount})</span>
                              {hasVerified && (
                                <VerifiedBadge size="sm" className="ml-1.5" />
                              )}
                            </div>
                          )
                        }
                        return <div className="mb-1.5"></div>
                      })()}
                      <div className="mt-auto pt-0.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex flex-col">
                            <PricingDisplay 
                              product={product} 
                              csvProduct={product.csvProduct}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              if (!isAuthenticated) {
                                window.location.hash = '#/user/login'
                                return
                              }
                              if (addItem) {
                                try {
                                  addItem(product)
                                } catch (error) {
                                  console.log('Authentication required for cart operation')
                                }
                              }
                            }}
                            className="flex-1 px-6 py-3 text-white text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase border border-transparent hover:border-slate-900 rounded-xl"
                            style={{
                              backgroundColor: 'var(--arctic-blue-primary)',
                              minHeight: '44px',
                              letterSpacing: '0.15em'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                            }}
                          >
                            Add to Cart
                          </button>
                          <a 
                            href={`#/user/product/${product.slug}`}
                            className="flex-1 px-6 py-3 text-slate-900 text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase text-center flex items-center justify-center border border-slate-900 hover:bg-slate-900 hover:text-white rounded-xl"
                            style={{
                              minHeight: '44px',
                              letterSpacing: '0.15em'
                            }}
                          >
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
