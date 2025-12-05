import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import type { Product } from '../types'
import { calculatePurchaseCoins } from '../utils/points'
import { cartAPI } from '../services/api'
import { useAuth } from './AuthContext'
import { userSocketService } from '../services/socket'

export type CartItem = {
  id?: number
  product_id: number
  slug: string
  title: string
  price: string
  image?: string
  quantity: number
  category?: string
  mrp?: string
  discounted_price?: string
  original_price?: string
  csvProduct?: any
}

type CartContextValue = {
  items: CartItem[]
  loading: boolean
  error: string | null
  addItem: (p: Product, quantity?: number) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>
  clear: () => Promise<void>
  refreshCart: () => Promise<void>
  subtotal: number
  tax: number
  total: number
  coinsEarned: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

// Cart storage key for offline fallback
const CART_STORAGE_KEY = 'nefol_cart_items'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  // Load cart from backend or localStorage
  const loadCart = async () => {
    if (isAuthenticated) {
      try {
        setLoading(true)
        setError(null)
        const cartItems = await cartAPI.getCart()
        setItems(cartItems)
      } catch (err: any) {
        console.error('Failed to load cart from backend:', err)
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
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        if (Array.isArray(parsedCart)) {
          setItems(parsedCart)
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
    }
  }

  // Load cart on mount and when authentication changes
  useEffect(() => {
    loadCart()
  }, [isAuthenticated])

  // Listen for product updates and refresh cart items with updated prices
  useEffect(() => {
    const handleProductUpdate = (event: CustomEvent) => {
      const updatedProduct = event.detail
      if (!updatedProduct || !updatedProduct.id) return

      console.log('🔄 Product updated in cart, refreshing cart items:', updatedProduct)

      // Update cart items that match this product
      setItems(prevItems => {
        const updatedItems = prevItems.map(item => {
          if (item.product_id === updatedProduct.id) {
            // Update with new product data
            const updatedPrice = updatedProduct.details?.websitePrice || updatedProduct.details?.mrp || updatedProduct.price
            return {
              ...item,
              title: updatedProduct.title || item.title,
              price: updatedPrice || item.price,
              image: updatedProduct.list_image || updatedProduct.listImage || item.image,
              category: updatedProduct.category || item.category,
              mrp: updatedProduct.details?.mrp || item.mrp,
              discounted_price: updatedProduct.details?.websitePrice || item.discounted_price,
            }
          }
          return item
        })
        return updatedItems
      })

      // Also reload cart from backend to ensure consistency
      if (isAuthenticated) {
        loadCart()
      }
    }

    // Listen for both event names
    window.addEventListener('product-updated', handleProductUpdate as EventListener)
    window.addEventListener('refresh-products', handleProductUpdate as EventListener)

    return () => {
      window.removeEventListener('product-updated', handleProductUpdate as EventListener)
      window.removeEventListener('refresh-products', handleProductUpdate as EventListener)
    }
  }, [isAuthenticated])

  const addItem = async (p: Product, quantity: number = 1) => {
    console.log('🛒 Adding item to cart:', { product: p.title, quantity, isAuthenticated })
    
    // Track cart action in real-time
    userSocketService.trackCartUpdate('add', { 
      productId: p.id,
      product: p, 
      quantity 
    })
    
    if (isAuthenticated && p.id) {
      try {
        setError(null)
        console.log('🛒 Calling cart API with product ID:', p.id)
        await cartAPI.addToCart(p.id, quantity)
        await loadCart() // Refresh cart from backend
        console.log('✅ Successfully added to cart')
      } catch (err: any) {
        console.error('❌ Failed to add item to cart:', err)
        setError(err.message)
        // Fallback to local storage
        console.log('🔄 Falling back to local storage')
        addItemLocally(p, quantity)
      }
    } else {
      if (isAuthenticated && !p.id) {
        console.log('⚠️ Product ID missing, using local storage')
      } else {
        console.log('🔄 User not authenticated, using local storage')
      }
      addItemLocally(p, quantity)
    }
  }

  const addItemLocally = (p: Product, quantity: number) => {
    // Determine the correct price to use (discounted price if available)
    const getCorrectPrice = (product: Product) => {
      if (product.details?.mrp && product.details?.websitePrice) {
        return product.details.websitePrice // Use discounted price
      }
      return product.price // Fallback to regular price
    }

    const correctPrice = getCorrectPrice(p)

    setItems(prev => {
      const idx = prev.findIndex(i => i.slug === p.slug)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
        return next
      }
      return [...prev, { 
        product_id: p.id || 0,
        slug: p.slug, 
        title: p.title, 
        price: correctPrice, 
        image: p.listImage, 
        quantity, 
        category: p.category 
      }]
    })
  }

  const removeItem = async (cartItemId: number) => {
    // Track cart action in real-time
    const item = items.find((item, i) => isAuthenticated ? item.id === cartItemId : i === cartItemId)
    if (item) {
      userSocketService.trackCartUpdate('remove', { 
        productId: item.product_id,
        productName: item.title
      })
    }
    
    if (isAuthenticated) {
      try {
        setError(null)
        await cartAPI.removeFromCart(cartItemId)
        await loadCart() // Refresh cart from backend
      } catch (err: any) {
        console.error('Failed to remove item from cart:', err)
        setError(err.message)
      }
    } else {
      // For local storage, find by index
      setItems(prev => prev.filter((_, i) => i !== cartItemId))
    }
  }

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(cartItemId)
      return
    }

    // Track cart action in real-time
    const item = items.find((item, i) => isAuthenticated ? item.id === cartItemId : i === cartItemId)
    if (item) {
      userSocketService.trackCartUpdate('update', { 
        productId: item.product_id,
        productName: item.title,
        quantity
      })
    }

    if (isAuthenticated) {
      try {
        setError(null)
        await cartAPI.updateCartItem(cartItemId, quantity)
        await loadCart() // Refresh cart from backend
      } catch (err: any) {
        console.error('Failed to update cart item:', err)
        setError(err.message)
      }
    } else {
      // For local storage, update by index
      setItems(prev => prev.map((item, i) => 
        i === cartItemId ? { ...item, quantity } : item
      ))
    }
  }

  const clear = async () => {
    // Track cart action in real-time
    userSocketService.trackCartUpdate('clear', { itemCount: items.length })
    
    if (isAuthenticated) {
      try {
        setError(null)
        await cartAPI.clearCart()
        setItems([])
      } catch (err: any) {
        console.error('Failed to clear cart:', err)
        setError(err.message)
      }
    } else {
      setItems([])
    }
    
    // Also clear from localStorage
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear cart from localStorage:', error)
    }
  }

  const refreshCart = async () => {
    await loadCart()
  }

  // Save to localStorage for offline support
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error)
      }
    }
  }, [items, isAuthenticated])

  // Calculate subtotal (MRP is tax-inclusive, so this includes tax)
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + parsePrice(i.price) * i.quantity, 0), [items])
  
  // Extract tax from MRP (tax-inclusive pricing)
  // Formula: tax = price - (price / (1 + taxRate))
  const tax = useMemo(() => {
    return items.reduce((totalTax, item) => {
      const itemPrice = parsePrice(item.price) // This is MRP which includes tax
      const category = (item.category || '').toLowerCase()
      
      // 5% tax for hair products, 18% for others
      const taxRate = category.includes('hair') ? 0.05 : 0.18
      
      // Calculate base price (excluding tax) from tax-inclusive MRP
      // basePrice = taxInclusivePrice / (1 + taxRate)
      const basePrice = itemPrice / (1 + taxRate)
      const itemTax = itemPrice - basePrice
      
      return totalTax + (itemTax * item.quantity)
    }, 0)
  }, [items])
  
  // Total remains the same as subtotal since MRP already includes tax
  const total = useMemo(() => subtotal, [subtotal])
  
  const coinsEarned = useMemo(() => calculatePurchaseCoins(total), [total])

  const value = useMemo(() => ({ 
    items, 
    loading, 
    error,
    addItem, 
    removeItem, 
    updateQuantity, 
    clear, 
    refreshCart,
    subtotal, 
    tax, 
    total, 
    coinsEarned 
  }), [items, loading, error, subtotal, tax, total, coinsEarned])
  
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function parsePrice(input: string): number {
  const m = (input || '').replace(/[^0-9.]/g, '')
  const n = Number(m)
  return Number.isFinite(n) ? n : 0
}


