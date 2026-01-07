import React, { useState, useEffect } from 'react'
import { Heart, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

export default function Wishlist() {
  const { items, loading, refreshWishlist, removeFromWishlist } = useWishlist()
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const [movingToCart, setMovingToCart] = useState<number | null>(null)

  useEffect(() => {
    refreshWishlist()
  }, [])

  const handleAddToCart = async (item: any) => {
    try {
      setMovingToCart(item.id)
      const product = {
        id: item.product_id,
        slug: item.slug,
        title: item.title,
        category: item.category,
        price: item.price,
        listImage: item.list_image,
        pdpImages: [],
        description: item.description
      }
      await addItem(product, 1)
      alert(`${item.title} added to cart!`)
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart')
    } finally {
      setMovingToCart(null)
    }
  }

  const handleRemoveFromWishlist = async (productId: number) => {
    if (confirm('Remove this item from your wishlist?')) {
      try {
        await removeFromWishlist(productId)
      } catch (error: any) {
        alert(error.message || 'Failed to remove from wishlist')
      }
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4" style={{ color: '#666' }} />
            <h1 
              className="text-2xl sm:text-3xl font-light mb-4 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Please Login to View Your Wishlist
            </h1>
            <p 
              className="mb-6 font-light tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Sign in to save and manage your favorite products
            </p>
            <a
              href="#/user/login"
              className="inline-block px-6 py-3 text-white rounded-lg transition-colors text-xs font-light tracking-[0.15em] uppercase"
              style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
            >
              Go to Login
            </a>
          </div>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-16">
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <a
            href="#/user/profile"
            className="inline-flex items-center mb-4 font-light tracking-wide transition-colors hover:opacity-70"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Profile
          </a>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-2 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            My Wishlist
          </h1>
          <p 
            className="font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            {items.length === 0
              ? 'You have no items in your wishlist yet'
              : `${items.length} item${items.length > 1 ? 's' : ''} saved for later`}
          </p>
        </div>

        {/* Wishlist Items */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-slate-100">
            <Heart className="h-20 w-20 mx-auto mb-6" style={{ color: '#ccc' }} />
            <h2 
              className="text-xl sm:text-2xl font-light mb-2 tracking-[0.1em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.1em'
              }}
            >
              Your Wishlist is Empty
            </h2>
            <p 
              className="mb-6 font-light tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Start saving products you love to your wishlist!
            </p>
            <a
              href="#/user/shop"
              className="inline-block px-6 py-3 text-white rounded-lg transition-colors text-xs font-light tracking-[0.15em] uppercase"
              style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-slate-100 group"
              >
                {/* Product Image */}
                <a href={`#/user/product/${item.slug}`}>
                  <div className="relative bg-gray-50 overflow-hidden">
                    <img
                      src={item.list_image || ''}
                      alt={item.title}
                      className="w-full h-64 sm:h-80 object-cover rounded-t-xl transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                </a>

                {/* Product Info */}
                <div className="p-5">
                  <a href={`#/user/product/${item.slug}`}>
                    <h3 
                      className="text-lg font-light mb-2 line-clamp-2 transition-colors hover:opacity-70 tracking-wide"
                      style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                    >
                      {item.title}
                    </h3>
                  </a>

                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className="text-2xl font-light"
                      style={{ color: '#1a1a1a' }}
                    >
                      ₹{item.price}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={movingToCart === item.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-light tracking-[0.1em] uppercase"
                      style={{ backgroundColor: 'rgb(75,151,201)', color: '#FFFFFF', letterSpacing: '0.1em' }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'
                        }
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {movingToCart === item.id ? 'Adding...' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => handleRemoveFromWishlist(item.product_id)}
                      className="px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}