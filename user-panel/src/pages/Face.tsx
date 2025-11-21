import React, { useState, useEffect, useMemo } from 'react'
import { getApiBase } from '../utils/apiBase'
import { Heart, Package } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import PricingDisplay from '../components/PricingDisplay'
import { getProductRating, getProductReviewCount, hasVerifiedReviews } from '../utils/product_reviews'
import { useProductReviewStats } from '../hooks/useProductReviewStats'
import VerifiedBadge from '../components/VerifiedBadge'

interface Product {
  id?: number
  slug: string
  title: string
  category: string
  price: string
  list_image: string
  description: string
  created_at?: string
  details?: {
    mrp?: string
    websitePrice?: string
    discountPercent?: string
    productType?: string
    [key: string]: any
  }
}

export default function Face() {
  const { addItem } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [combos, setCombos] = useState<Product[]>([])
  const [csvProducts, setCsvProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Get all product slugs for batch fetching review stats
  const allProductSlugs = useMemo(() => {
    return [...products, ...combos].map(p => p.slug || '').filter(slug => slug)
  }, [products, combos])
  
  // Fetch review stats for all products
  const { stats: reviewStats } = useProductReviewStats(allProductSlugs)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/products`)
      if (response.ok) {
        const data = await response.json()
        // Filter products for face category - ONLY show products tagged as Face Care
        const faceProducts = data.filter((product: any) => {
          const category = (product.category || '').toLowerCase()
          return category === 'face care' || category === 'facecare'
        })
        setProducts(faceProducts)

        // Filter combos related to face
        const faceCombos = data.filter((product: any) => {
          const category = (product.category || '').toLowerCase()
          const title = (product.title || '').toLowerCase()
          const productType = (product.details?.productType || '').toLowerCase()
          
          // Check if it's a combo
          if (category !== 'combo' && category !== 'combo pack') return false
          
          // Check if it's face-related
          return title.includes('face') || 
                 title.includes('glow') ||
                 title.includes('radiance') ||
                 title.includes('hydration') ||
                 title.includes('deep clean') ||
                 title.includes('acne') ||
                 productType === 'face' ||
                 productType === 'acne'
        })
        setCombos(faceCombos)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
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
      category: 'Face Care'
    }
  }

  return (
    <main className="py-12 sm:py-16 md:py-20 min-h-screen overflow-x-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 tracking-[0.15em]" 
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Face Care
          </h1>
          <p className="text-sm sm:text-base font-light max-w-2xl mx-auto tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
            Discover our range of natural face care products designed to enhance your natural beauty.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-10 md:gap-12 auto-rows-fr mb-16">
          {loading ? (
            <div className="col-span-full text-center py-20">
              <p className="text-sm font-light tracking-wide" style={{color: '#999', letterSpacing: '0.1em'}}>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="rounded-2xl p-12" style={{ backgroundColor: '#D0E8F2' }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#4B97C9' }}>
                  <Heart className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4" style={{ color: '#1B4965' }}>
                  Coming Soon!
                </h3>
                <p className="text-xl mb-6" style={{ color: '#9DB4C0' }}>
                  We're working on amazing face care products for you.
                </p>
                <div className="bg-white rounded-lg p-6 inline-block">
                  <p className="text-lg font-semibold" style={{ color: '#1B4965' }}>
                    🚀 Upcoming Very Soon
                  </p>
                </div>
              </div>
            </div>
          ) : (
            products.map((product, index) => {
              return (
                <article 
                  key={product.slug} 
                  className="bg-white group overflow-hidden flex flex-col h-full transition-all duration-500"
                >
                  <div className="relative overflow-hidden aspect-square mb-6 rounded-xl">
                    <a href={`#/user/product/${product.slug}`}>
                      {product.list_image && (
                        <img 
                          src={product.list_image}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }} 
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 rounded-xl" 
                          loading="lazy"
                          style={{ aspectRatio: '1 / 1' }}
                        />
                      )}
                    </a>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <button 
                        className="w-9 h-9 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-all duration-300"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col flex-grow px-2">
                    <h3 className="text-lg sm:text-xl font-semibold tracking-wide mb-1 line-clamp-2 overflow-hidden" style={{color: '#1a1a1a', letterSpacing: '0.05em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxHeight: '3.5rem'}}>
                      {product.title}
                    </h3>
                    {(() => {
                      const rating = getProductRating(product.slug || '')
                      const reviewCount = getProductReviewCount(product.slug || '')
                      if (rating > 0) {
                        return (
                          <div className="flex items-center mb-2">
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
                            {hasVerifiedReviews(product.slug || '') && (
                              <VerifiedBadge size="sm" className="ml-1.5" />
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <PricingDisplay 
                            product={product} 
                            csvProduct={undefined}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            if (addItem) {
                              try {
                                addItem({
                                  slug: product.slug,
                                  title: product.title,
                                  price: product.price,
                                  listImage: product.list_image,
                                  pdpImages: [],
                                  category: product.category,
                                  description: product.description
                                })
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
              )
            })
          )}
        </div>

        {/* Face Combos Section */}
        {combos.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                Face Care Combos
              </h2>
              <p className="text-sm sm:text-base font-light max-w-2xl mx-auto tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                Complete skincare routines in curated combo packs. Get the perfect combination of products for glowing, healthy skin.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-10 md:gap-12 auto-rows-fr">
              {combos.map((combo) => (
                <article 
                  key={combo.slug} 
                  className="bg-white group overflow-hidden flex flex-col h-full transition-all duration-500"
                >
                  <div className="relative overflow-hidden aspect-square mb-6 rounded-xl">
                    <a href={`#/user/product/${combo.slug}`}>
                      {combo.list_image && (
                        <img 
                          src={combo.list_image}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }} 
                          alt={combo.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 rounded-xl" 
                          loading="lazy"
                          style={{ aspectRatio: '1 / 1' }}
                        />
                      )}
                    </a>
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
                        COMBO OFFER
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <button 
                        className="w-9 h-9 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-all duration-300"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col flex-grow px-2">
                    <div className="flex items-center mb-2">
                      <Package className="w-4 h-4 mr-2" style={{ color: '#4B97C9' }} />
                      <span className="text-xs font-medium tracking-wide uppercase" style={{ color: '#4B97C9' }}>COMBO PACK</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold tracking-wide mb-1 line-clamp-2 overflow-hidden" style={{color: '#1a1a1a', letterSpacing: '0.05em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxHeight: '3.5rem'}}>
                      {combo.title}
                    </h3>
                    {(() => {
                      const slug = combo.slug || ''
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
                      return null
                    })()}
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <PricingDisplay 
                            product={combo} 
                            csvProduct={combo.details ? {
                              'MRP': combo.details.mrp || '',
                              'website price': combo.details.websitePrice || combo.price || ''
                            } : undefined}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            if (addItem) {
                              try {
                                addItem({
                                  slug: combo.slug,
                                  title: combo.title,
                                  price: combo.price || combo.details?.websitePrice || '₹1,299',
                                  listImage: combo.list_image,
                                  pdpImages: [],
                                  category: combo.category,
                                  description: combo.description || 'Premium face care combo pack'
                                })
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
                          href={`#/user/product/${combo.slug}`}
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
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center rounded-2xl p-12 text-white" style={{ backgroundColor: '#4B97C9' }}>
          <h2 className="text-3xl font-bold mb-4">Ready to Glow?</h2>
          <p className="text-xl mb-8 opacity-90">
            Transform your skincare routine with Nefol's natural face care products.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#/user/shop" 
              className="inline-block bg-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors" style={{ color: '#4B97C9' }}
            >
              Shop Face Care
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white px-8 py-3 rounded-xl font-semibold hover:bg-white transition-colors" style={{ color: 'white' }}
            >
              Get Skincare Advice
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
