import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Product } from '../types'
import { wishlistAPI } from '../services/api'
import { useAuth } from './AuthContext'

export type WishlistItem = {
  id: number
  product_id: number
  title: string
  price: string
  list_image: string
  slug: string
  description: string
  created_at: string
}

type WishlistContextValue = {
  items: WishlistItem[]
  loading: boolean
  error: string | null
  addToWishlist: (productId: number) => Promise<void>
  removeFromWishlist: (productId: number) => Promise<void>
  isInWishlist: (productId: number) => boolean
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined)

// Wishlist storage key for offline fallback
const WISHLIST_STORAGE_KEY = 'nefol_wishlist_items'

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  // Load wishlist from backend or localStorage
  const loadWishlist = async () => {
    if (isAuthenticated) {
      try {
        setLoading(true)
        setError(null)
        const wishlistItems = await wishlistAPI.getWishlist()
        setItems(wishlistItems)
      } catch (err: any) {
        console.error('Failed to load wishlist from backend:', err)
        setError(err.message)
        // Fallback to localStorage
        loadFromLocalStorage()
      } finally {
        setLoading(false)
      }
    } else {
      loadFromLocalStorage()
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (savedWishlist) {
        const parsedWishlist = JSON.parse(savedWishlist)
        if (Array.isArray(parsedWishlist)) {
          setItems(parsedWishlist)
        }
      }
    } catch (error) {
      console.error('Failed to load wishlist from localStorage:', error)
    }
  }

  // Load wishlist on mount and when authentication changes
  useEffect(() => {
    loadWishlist()
  }, [isAuthenticated])

  const addToWishlist = async (productId: number) => {
    if (isAuthenticated) {
      try {
        setError(null)
        await wishlistAPI.addToWishlist(productId)
        await loadWishlist() // Refresh wishlist from backend
      } catch (err: any) {
        console.error('Failed to add to wishlist:', err)
        setError(err.message)
        throw err
      }
    } else {
      // For offline mode, we can't add to wishlist without authentication
      throw new Error('Please login to add items to wishlist')
    }
  }

  const removeFromWishlist = async (productId: number) => {
    if (isAuthenticated) {
      try {
        setError(null)
        await wishlistAPI.removeFromWishlist(productId)
        await loadWishlist() // Refresh wishlist from backend
      } catch (err: any) {
        console.error('Failed to remove from wishlist:', err)
        setError(err.message)
        throw err
      }
    } else {
      // For offline mode, remove from local storage
      setItems(prev => prev.filter(item => item.product_id !== productId))
    }
  }

  const isInWishlist = (productId: number): boolean => {
    return items.some(item => item.product_id === productId)
  }

  const refreshWishlist = async () => {
    await loadWishlist()
  }

  // Save to localStorage for offline support
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
      } catch (error) {
        console.error('Failed to save wishlist to localStorage:', error)
      }
    }
  }, [items, isAuthenticated])

  const value: WishlistContextValue = {
    items,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist
  }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
