import React, { useState, useEffect } from 'react'
import { Heart, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Wishlist() {
  const { items, loading, refreshWishlist, removeFromWishlist } = useWishlist()
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()
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
      <main className="py-10 dark:bg-slate-900 min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Please Login to View Your Wishlist
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Sign in to save and manage your favorite products
            </p>
            <a
              href="#/user/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      <main className="py-10 dark:bg-slate-900 min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center py-16">
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <a
            href="#/user/profile"
            className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Profile
          </a>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Wishlist
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {items.length === 0
              ? 'You have no items in your wishlist yet'
              : `${items.length} item${items.length > 1 ? 's' : ''} saved for later`}
          </p>
        </div>

        {/* Wishlist Items */}
        {items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
            <Heart className="h-20 w-20 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Start saving products you love to your wishlist!
            </p>
            <a
              href="#/user/shop"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <a href={`#/user/product/${item.slug}`}>
                  <div className="relative">
                    <img
                      src={item.list_image || ''}
                      alt={item.title}
                      className="w-full h-64 object-cover"
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
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                  </a>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ₹{item.price}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={movingToCart === item.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {movingToCart === item.id ? 'Adding...' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => handleRemoveFromWishlist(item.product_id)}
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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

