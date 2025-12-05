import { useEffect, useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../contexts/CartContext'
import type { Product } from '../types'
import PricingDisplay from '../components/PricingDisplay'
import { getProductRating, getProductReviewCount } from '../utils/product_reviews'

export default function CategoryPage() {
  const { items, loading, error } = useProducts()
  const cartContext = useCart()
  const addItem = cartContext?.addItem
  const [category, setCategory] = useState<string>('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

  useEffect(() => {
    const hash = window.location.hash || '#/'
    const match = hash.match(/^#\/user\/category\/([^?#]+)/)
    const cat = match?.[1] || ''
    setCategory(cat)
    
    if (items.length > 0) {
      const filtered = items.filter(product => {
        const productCategory = (product.category || '').toLowerCase()
        const targetCategory = cat.toLowerCase()
        
        // Map categories based on CSV data
        if (targetCategory === 'face') {
          return productCategory.includes('face') || 
                 productCategory.includes('moisturizer') ||
                 productCategory.includes('serum') ||
                 productCategory.includes('mask') ||
                 productCategory.includes('scrub') ||
                 productCategory.includes('cream') ||
                 productCategory.includes('cleanser')
        }
        if (targetCategory === 'hair') {
          return productCategory.includes('hair') || 
                 productCategory.includes('shampoo') ||
                 productCategory.includes('oil')
        }
        if (targetCategory === 'body') {
          return productCategory.includes('body') || 
                 productCategory.includes('lotion')
        }
        return false
      })
      setFilteredProducts(filtered)
    }
  }, [items, category])

  const getCategoryTitle = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'face': return 'Face Care'
      case 'hair': return 'Hair Care'
      case 'body': return 'Body Care'
      default: return 'Category'
    }
  }

  const getCategoryDescription = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'face': return 'Complete face care essentials for healthy, glowing skin'
      case 'hair': return 'Nourishing hair care products for strong, shiny hair'
      case 'body': return 'Body care products for smooth, hydrated skin'
      default: return 'Browse our products'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen py-12 sm:py-16 md:py-20 overflow-x-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <p className="text-sm font-light tracking-wide" style={{color: '#999', letterSpacing: '0.1em'}}>Loading products...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen py-12 sm:py-16 md:py-20 overflow-x-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <p className="text-sm font-light text-slate-600">{error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 sm:py-16 md:py-20 overflow-x-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 tracking-[0.15em]" 
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            {getCategoryTitle(category).toUpperCase()}
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-2xl mx-auto px-4 tracking-wide" 
            style={{color: '#666', letterSpacing: '0.05em'}}
          >
            {getCategoryDescription(category)}
          </p>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-light text-slate-600">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-10 md:gap-12 auto-rows-fr">
            {filteredProducts.map((product, index) => {
              const rating = getProductRating(product.slug || '')
              const reviewCount = getProductReviewCount(product.slug || '')
              return (
                <article 
                  key={product.slug} 
                  className="bg-white group overflow-hidden flex flex-col h-full transition-all duration-500"
                >
                  <div className="relative overflow-hidden aspect-square mb-6">
                    <a href={`#/user/product/${product.slug}`}>
                      {product.listImage && (
                        <img 
                          src={product.listImage || (product.pdpImages && product.pdpImages[0])} 
                          alt={product.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
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
                    <h3 className="text-sm sm:text-base font-light tracking-wide mb-3 line-clamp-2 min-h-[3rem] flex items-start" style={{color: '#1a1a1a', letterSpacing: '0.05em'}}>
                      {product.title}
                    </h3>
                    {rating > 0 && (
                      <div className="flex items-center mb-4">
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
                      </div>
                    )}
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-between mb-4">
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
                            if (addItem) {
                              try {
                                addItem(product)
                              } catch (error) {
                                console.log('Authentication required for cart operation')
                              }
                            }
                          }}
                          className="flex-1 px-6 py-3 text-white text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase border border-transparent hover:border-slate-900"
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
                          className="flex-1 px-6 py-3 text-slate-900 text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase text-center flex items-center justify-center border border-slate-900 hover:bg-slate-900 hover:text-white"
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
            })}
          </div>
        )}
      </div>
    </main>
  )
}
