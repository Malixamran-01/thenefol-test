import React, { useState, useEffect } from 'react'
import { Heart, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { isOutOfStock, toCartProduct } from '../utils/stock'

export default function Wishlist() {
  const { items, loading, refreshWishlist, removeFromWishlist } = useWishlist()
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const [movingToCart, setMovingToCart] = useState<number | null>(null)

  useEffect(() => {
    refreshWishlist()
  }, [])

  const handleAddToCart = async (item: any) => {
    if (isOutOfStock(item)) return
    try {
      setMovingToCart(item.id)
      await addItem({ ...toCartProduct(item), id: item.product_id }, 1)
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
            <Heart className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--nf-text-muted)' }} />
            <h1 
              className="text-2xl sm:text-3xl font-light mb-4 tracking-[0.15em]"
              style={{
                color: 'var(--nf-text)',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Please Login to View Your Wishlist
            </h1>
            <p 
              className="mb-6 font-light tracking-wide"
              style={{ color: 'var(--nf-text-muted)', letterSpacing: '0.05em' }}
            >
              Sign in to save and manage your favorite products
            </p>
            <a
              href="#/user/login"
              className="inline-block px-6 py-3 text-white rounded-lg transition-colors text-xs font-light tracking-[0.15em] uppercase"
              style={{ backgroundColor: 'var(--nf-primary)', letterSpacing: '0.15em' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nf-primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--nf-primary)'}
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
            style={{ color: 'var(--nf-text-muted)', letterSpacing: '0.05em' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Profile
          </a>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-2 tracking-[0.15em]"
            style={{
              color: 'var(--nf-text)',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            My Wishlist
          </h1>
          <p 
            className="font-light tracking-wide"
            style={{ color: 'var(--nf-text-muted)', letterSpacing: '0.05em' }}
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
                color: 'var(--nf-text)',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.1em'
              }}
            >
              Your Wishlist is Empty
            </h2>
            <p 
              className="mb-6 font-light tracking-wide"
              style={{ color: 'var(--nf-text-muted)', letterSpacing: '0.05em' }}
            >
              Start saving products you love to your wishlist!
            </p>
            <a
              href="#/user/shop"
              className="inline-block px-6 py-3 text-white rounded-lg transition-colors text-xs font-light tracking-[0.15em] uppercase"
              style={{ backgroundColor: 'var(--nf-primary)', letterSpacing: '0.15em' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nf-primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--nf-primary)'}
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-5 sm:gap-6">
            {items.map((item) => {
              const outOfStock = isOutOfStock(item)
              const adding = movingToCart === item.id
              return (
                <div
                  key={item.id}
                  className="flex flex-col min-w-0 rounded-2xl overflow-hidden border transition-shadow hover:shadow-md group"
                  style={{ backgroundColor: 'var(--nf-card-bg, #fff)', borderColor: 'rgba(17, 24, 39, 0.08)' }}
                >
                  {/* Product image — square frame, whole product visible (never cropped) */}
                  <div className="relative">
                    <a
                      href={`#/user/product/${item.slug}`}
                      className="block aspect-square overflow-hidden bg-white"
                    >
                      {item.list_image && (
                        <img
                          src={item.list_image}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromWishlist(item.product_id)}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm transition-colors hover:bg-red-50"
                      style={{ color: '#b91c1c' }}
                      title="Remove from wishlist"
                      aria-label={`Remove ${item.title} from wishlist`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Product info */}
                  <div className="flex flex-col flex-1 p-3 sm:p-5">
                    <a href={`#/user/product/${item.slug}`} className="block">
                      <h3
                        className="text-sm sm:text-base leading-snug line-clamp-2 transition-opacity hover:opacity-70"
                        style={{
                          color: 'var(--nf-card-title, var(--nf-text))',
                          fontFamily: 'var(--font-heading-family)',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {item.title}
                      </h3>
                    </a>

                    <p className="mt-1.5 text-base sm:text-lg font-medium" style={{ color: 'var(--nf-text)' }}>
                      ₹{item.price}
                    </p>

                    <div className="mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      disabled={adding || outOfStock}
                      className={`w-full flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-[11px] sm:text-xs font-medium uppercase whitespace-nowrap transition-colors disabled:cursor-not-allowed ${
                        outOfStock ? 'bg-gray-100 text-gray-500' : 'disabled:opacity-60'
                      }`}
                      style={{
                        letterSpacing: '0.08em',
                        ...(outOfStock
                          ? {}
                          : {
                              backgroundColor: 'var(--nf-button-primary-bg, var(--nf-primary))',
                              color: 'var(--nf-button-primary-text, #fff)',
                            }),
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 shrink-0" />
                      {outOfStock ? 'Out of stock' : adding ? 'Adding…' : 'Add to Cart'}
                    </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}