import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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

const WISHLIST_CONTEXT_DEFAULT: WishlistContextValue = {
  items: [],
  loading: false,
  error: null,
  addToWishlist: async () => {},
  removeFromWishlist: async () => {},
  isInWishlist: () => false,
  refreshWishlist: async () => {},
}

const WishlistContext = createContext(WISHLIST_CONTEXT_DEFAULT)

const WISHLIST_STORAGE_KEY = 'nefol_wishlist_items'

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated

  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (!savedWishlist) return
      const parsedWishlist = JSON.parse(savedWishlist)
      if (Array.isArray(parsedWishlist)) {
        setItems(parsedWishlist)
      }
    } catch (err) {
      console.error('Failed to load wishlist from localStorage:', err)
    }
  }, [])

  const loadWishlist = useCallback(async () => {
    if (!isAuthenticatedRef.current) {
      requestIdRef.current += 1
      loadFromLocalStorage()
      return
    }

    const myId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const wishlistItems = await wishlistAPI.getWishlist()
      if (myId !== requestIdRef.current) return
      setItems(wishlistItems)
    } catch (err: unknown) {
      if (myId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to load wishlist'
      console.error('Failed to load wishlist from backend:', err)
      setError(message)
      loadFromLocalStorage()
    } finally {
      if (myId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [loadFromLocalStorage])

  const loadWishlistRef = useRef(loadWishlist)
  loadWishlistRef.current = loadWishlist

  useEffect(() => {
    void loadWishlistRef.current()
  }, [isAuthenticated])

  const addToWishlist = useCallback(async (productId: number) => {
    if (!isAuthenticatedRef.current) {
      throw new Error('Please login to add items to wishlist')
    }
    setError(null)
    try {
      await wishlistAPI.addToWishlist(productId)
      await loadWishlistRef.current()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add to wishlist'
      console.error('Failed to add to wishlist:', err)
      setError(message)
      throw err
    }
  }, [])

  const removeFromWishlist = useCallback(async (productId: number) => {
    if (!isAuthenticatedRef.current) {
      setItems((prev) => prev.filter((item) => item.product_id !== productId))
      return
    }
    setError(null)
    try {
      await wishlistAPI.removeFromWishlist(productId)
      await loadWishlistRef.current()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove from wishlist'
      console.error('Failed to remove from wishlist:', err)
      setError(message)
      throw err
    }
  }, [])

  const isInWishlist = useCallback(
    (productId: number): boolean => items.some((item) => item.product_id === productId),
    [items]
  )

  const refreshWishlist = useCallback(async () => {
    await loadWishlistRef.current()
  }, [])

  useEffect(() => {
    if (isAuthenticated) return
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
    } catch (err) {
      console.error('Failed to save wishlist to localStorage:', err)
    }
  }, [items, isAuthenticated])

  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      refreshWishlist,
    }),
    [items, loading, error, addToWishlist, removeFromWishlist, isInWishlist, refreshWishlist]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  return useContext(WishlistContext)
}
