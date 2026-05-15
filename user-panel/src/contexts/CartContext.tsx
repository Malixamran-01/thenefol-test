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
import { calculatePurchaseCoins } from '../utils/points'
import { cartAPI, type CartSegmentPricing } from '../services/api'
import { computeSegmentDiscountAmount } from '../utils/segmentPricing'
import { deferStateWork } from '../utils/deferStateWork'
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
  csvProduct?: unknown
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
  segmentPricing: CartSegmentPricing | null
  segmentDiscountAmount: number
}

const CART_CONTEXT_DEFAULT: CartContextValue = {
  items: [],
  loading: false,
  error: null,
  addItem: async () => {},
  removeItem: async () => {},
  updateQuantity: async () => {},
  clear: async () => {},
  refreshCart: async () => {},
  subtotal: 0,
  tax: 0,
  total: 0,
  coinsEarned: 0,
  segmentPricing: null,
  segmentDiscountAmount: 0,
}

const CartContext = createContext(CART_CONTEXT_DEFAULT)

const CART_STORAGE_KEY = 'nefol_cart_items'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated

  const [items, setItems] = useState<CartItem[]>([])
  const [segmentPricing, setSegmentPricing] = useState<CartSegmentPricing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const applyCartPayload = useCallback(
    (payload: { items: CartItem[]; segment_pricing: CartSegmentPricing | null }) => {
      setItems(payload.items)
      setSegmentPricing(payload.segment_pricing)
    },
    []
  )

  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (!savedCart) return
      const parsedCart = JSON.parse(savedCart)
      if (Array.isArray(parsedCart)) {
        setItems(parsedCart)
      }
    } catch (err) {
      console.error('Failed to load cart from localStorage:', err)
    }
  }, [])

  const loadCart = useCallback(async () => {
    if (!isAuthenticatedRef.current) {
      requestIdRef.current += 1
      setSegmentPricing(null)
      loadFromLocalStorage()
      return
    }

    const myId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const guestCart = localStorage.getItem(CART_STORAGE_KEY)
      let guestItems: CartItem[] = []
      if (guestCart) {
        try {
          const parsed = JSON.parse(guestCart)
          if (Array.isArray(parsed)) {
            guestItems = parsed
          }
        } catch (err) {
          console.error('Failed to parse guest cart:', err)
        }
      }

      const cartPayload = await cartAPI.getCart()
      if (myId !== requestIdRef.current) return

      const cartItems = cartPayload.items

      if (guestItems.length > 0) {
        const userCartMap = new Map<number, CartItem>()
        cartItems.forEach((item: CartItem) => {
          if (item.product_id) {
            userCartMap.set(item.product_id, item)
          }
        })

        const mergedItems = [...cartItems]
        for (const guestItem of guestItems) {
          if (!guestItem.product_id) continue
          const existingItem = userCartMap.get(guestItem.product_id)
          if (existingItem) {
            const newQuantity = existingItem.quantity + guestItem.quantity
            await cartAPI.updateCartItem(existingItem.id!, newQuantity)
            const index = mergedItems.findIndex((item) => item.id === existingItem.id)
            if (index !== -1) {
              mergedItems[index] = { ...existingItem, quantity: newQuantity }
            }
          } else {
            try {
              await cartAPI.addToCart(guestItem.product_id, guestItem.quantity)
              mergedItems.push(guestItem)
            } catch (err) {
              console.error('Failed to add guest item to user cart:', err)
            }
          }
        }

        if (myId !== requestIdRef.current) return
        const updatedCart = await cartAPI.getCart()
        if (myId !== requestIdRef.current) return
        applyCartPayload(updatedCart)
        localStorage.removeItem(CART_STORAGE_KEY)
      } else {
        applyCartPayload(cartPayload)
      }
    } catch (err: unknown) {
      if (myId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to load cart'
      console.error('Failed to load cart from backend:', err)
      setError(message)
      loadFromLocalStorage()
    } finally {
      if (myId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [applyCartPayload, loadFromLocalStorage])

  const loadCartRef = useRef(loadCart)
  loadCartRef.current = loadCart

  useEffect(() => {
    void loadCartRef.current()
  }, [isAuthenticated])

  useEffect(() => {
    const handleProductUpdate = (event: Event) => {
      const custom = event as CustomEvent
      const updatedProduct = custom.detail
      if (!updatedProduct || !updatedProduct.id) return

      deferStateWork(() => {
        setItems((prevItems) =>
          prevItems.map((item) => {
            if (item.product_id !== updatedProduct.id) return item
            const updatedPrice =
              updatedProduct.details?.websitePrice ||
              updatedProduct.details?.mrp ||
              updatedProduct.price
            return {
              ...item,
              title: updatedProduct.title || item.title,
              price: updatedPrice || item.price,
              image: updatedProduct.list_image || updatedProduct.listImage || item.image,
              category: updatedProduct.category || item.category,
              mrp: updatedProduct.details?.mrp || item.mrp,
              discounted_price: updatedProduct.details?.websitePrice || item.discounted_price,
            }
          })
        )

        if (isAuthenticatedRef.current) {
          void loadCartRef.current()
        }
      })
    }

    window.addEventListener('product-updated', handleProductUpdate as EventListener)
    window.addEventListener('refresh-products', handleProductUpdate as EventListener)

    return () => {
      window.removeEventListener('product-updated', handleProductUpdate as EventListener)
      window.removeEventListener('refresh-products', handleProductUpdate as EventListener)
    }
  }, [])

  const addItemLocally = useCallback((p: Product, quantity: number) => {
    const avail = p.inventoryAvailable
    if (p.inStock === false || (typeof avail === 'number' && avail <= 0)) {
      setError('This product is out of stock')
      return
    }
    if (typeof avail === 'number' && quantity > avail) {
      setError(`Only ${avail} units available`)
      return
    }

    const correctPrice =
      p.details?.mrp && p.details?.websitePrice ? p.details.websitePrice : p.price

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.slug === p.slug)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
        return next
      }
      try {
        window.dispatchEvent(new CustomEvent('cart:item-added', { detail: { title: p.title } }))
      } catch (err) {
        console.error('Failed to dispatch cart:item-added event', err)
      }
      return [
        ...prev,
        {
          product_id: p.id || 0,
          slug: p.slug,
          title: p.title,
          price: correctPrice,
          image: p.listImage,
          quantity,
          category: p.category,
        },
      ]
    })
  }, [])

  const addItem = useCallback(
    async (p: Product, quantity: number = 1) => {
      const avail = p.inventoryAvailable
      if (p.inStock === false || (typeof avail === 'number' && avail <= 0)) {
        setError('This product is out of stock')
        return
      }
      if (typeof avail === 'number' && quantity > avail) {
        setError(`Only ${avail} units available`)
        return
      }

      userSocketService.trackCartUpdate('add', {
        productId: p.id,
        product: p,
        quantity,
      })

      if (isAuthenticatedRef.current && p.id) {
        try {
          setError(null)
          await cartAPI.addToCart(p.id, quantity)
          await loadCartRef.current()
          try {
            window.dispatchEvent(new CustomEvent('cart:item-added', { detail: { title: p.title } }))
          } catch (err) {
            console.error('Failed to dispatch cart:item-added event', err)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add to cart'
          console.error('Failed to add item to cart:', err)
          setError(message)
          addItemLocally(p, quantity)
        }
      } else {
        addItemLocally(p, quantity)
      }
    },
    [addItemLocally]
  )

  const removeItem = useCallback(async (cartItemId: number) => {
    const snapshot = itemsRef.current
    const item = snapshot.find((row, i) =>
      isAuthenticatedRef.current ? row.id === cartItemId : i === cartItemId
    )
    if (item) {
      userSocketService.trackCartUpdate('remove', {
        productId: item.product_id,
        productName: item.title,
      })
    }

    if (isAuthenticatedRef.current) {
      try {
        setError(null)
        await cartAPI.removeFromCart(cartItemId)
        await loadCartRef.current()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove item'
        console.error('Failed to remove item from cart:', err)
        setError(message)
      }
    } else {
      setItems((prev) => prev.filter((_, i) => i !== cartItemId))
    }
  }, [])

  const updateQuantity = useCallback(async (cartItemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(cartItemId)
      return
    }

    const snapshot = itemsRef.current
    const item = snapshot.find((row, i) =>
      isAuthenticatedRef.current ? row.id === cartItemId : i === cartItemId
    )
    if (item) {
      userSocketService.trackCartUpdate('update', {
        productId: item.product_id,
        productName: item.title,
        quantity,
      })
    }

    if (isAuthenticatedRef.current) {
      try {
        setError(null)
        await cartAPI.updateCartItem(cartItemId, quantity)
        await loadCartRef.current()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update cart'
        console.error('Failed to update cart item:', err)
        setError(message)
      }
    } else {
      setItems((prev) =>
        prev.map((item, i) => (i === cartItemId ? { ...item, quantity } : item))
      )
    }
  }, [removeItem])

  const clear = useCallback(async () => {
    userSocketService.trackCartUpdate('clear', { itemCount: items.length })

    if (isAuthenticatedRef.current) {
      try {
        setError(null)
        await cartAPI.clearCart()
        setItems([])
        setSegmentPricing(null)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to clear cart'
        console.error('Failed to clear cart:', err)
        setError(message)
      }
    } else {
      setItems([])
    }

    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (err) {
      console.error('Failed to clear cart from localStorage:', err)
    }
  }, [items.length])

  const refreshCart = useCallback(async () => {
    await loadCartRef.current()
  }, [])

  useEffect(() => {
    if (isAuthenticated) return
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err)
    }
  }, [items, isAuthenticated])

  const subtotal = useMemo(
    () => roundPrice(items.reduce((sum, i) => sum + parsePrice(i.price) * i.quantity, 0)),
    [items]
  )

  const tax = useMemo(() => {
    return roundPrice(
      items.reduce((totalTax, item) => {
        const itemPrice = parsePrice(item.price)
        const category = (item.category || '').toLowerCase()
        const taxRate = category.includes('hair') ? 0.05 : 0.18
        const basePrice = itemPrice / (1 + taxRate)
        const itemTax = itemPrice - basePrice
        return totalTax + itemTax * item.quantity
      }, 0)
    )
  }, [items])

  const total = useMemo(() => roundPrice(subtotal), [subtotal])

  const segmentDiscountAmount = useMemo(() => {
    const pct = segmentPricing?.discount_percent ?? 0
    if (!pct) return 0
    return computeSegmentDiscountAmount(Math.round(subtotal), pct)
  }, [subtotal, segmentPricing])

  const coinsEarned = useMemo(() => calculatePurchaseCoins(total), [total])

  const value = useMemo(
    () => ({
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
      coinsEarned,
      segmentPricing,
      segmentDiscountAmount,
    }),
    [
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
      coinsEarned,
      segmentPricing,
      segmentDiscountAmount,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (ctx === CART_CONTEXT_DEFAULT) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}

export function parsePrice(input: string): number {
  const m = (input || '').replace(/[^0-9.]/g, '')
  const n = Number(m)
  return Number.isFinite(n) ? n : 0
}

export function roundPrice(price: number): number {
  return Math.round(price)
}

export function formatPrice(price: number): string {
  return parseFloat(price.toFixed(2)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
