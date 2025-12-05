// Meta Pixel tracking utility
import { getApiBase } from './apiBase'
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || ''

// Initialize Meta Pixel
export function initMetaPixel() {
  if (!PIXEL_ID) {
    console.warn('Meta Pixel ID not configured')
    return
  }

  // Load Meta Pixel script
  if (typeof window !== 'undefined' && !(window as any).fbq) {
    ;(function(f: any, b: any, e: string, v: string, n?: any, t?: any, s?: any) {
      if (f.fbq) return
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode?.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

    // Initialize pixel
    ;(window as any).fbq('init', PIXEL_ID)
    ;(window as any).fbq('track', 'PageView')
  }
}

// Track custom events
export function trackEvent(eventName: string, eventData?: any) {
  if (typeof window === 'undefined' || !(window as any).fbq) {
    // Fallback: send to backend
    sendEventToBackend(eventName, eventData)
    return
  }

  const pixel = (window as any).fbq

  // Track via Meta Pixel
  pixel('track', eventName, eventData || {})

  // Also send to backend for logging
  sendEventToBackend(eventName, eventData)
}

// Send event to backend for logging and server-side tracking with retry logic
async function sendEventToBackend(eventName: string, eventData?: any, retries = 3) {
  const eventPayload = {
    event_name: eventName,
    event_id: generateEventId(),
    user_data: await getUserData(),
    event_data: eventData || {},
    source_url: window.location.href,
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${getApiBase()}/api/meta-ads/pixel/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      })

      if (response.ok) {
        return // Success
      }

      // If not last attempt, wait before retrying
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)) // Exponential backoff
      }
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('Failed to send pixel event to backend after retries:', error)
        // Store in localStorage for later retry
        try {
          const failedEvents = JSON.parse(localStorage.getItem('meta_pixel_failed_events') || '[]')
          failedEvents.push({
            ...eventPayload,
            timestamp: Date.now(),
          })
          // Keep only last 50 failed events
          localStorage.setItem('meta_pixel_failed_events', JSON.stringify(failedEvents.slice(-50)))
        } catch (e) {
          // Ignore localStorage errors
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }
}

// Retry failed events on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    try {
      const failedEvents = JSON.parse(localStorage.getItem('meta_pixel_failed_events') || '[]')
      if (failedEvents.length > 0) {
        // Retry failed events
        for (const event of failedEvents) {
          await sendEventToBackend(event.event_name, event.event_data, 1)
        }
        // Clear after retry
        localStorage.removeItem('meta_pixel_failed_events')
      }
    } catch (e) {
      // Ignore errors
    }
  })
}

// Get user data for tracking
async function getUserData(): Promise<any> {
  const userData: any = {}

  // Get user email from localStorage or session
  try {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user.email) {
        userData.em = await hashValue(user.email)
      }
      if (user.phone) {
        userData.ph = await hashValue(user.phone)
      }
      if (user.name) {
        const names = user.name.split(' ')
        if (names[0]) userData.fn = await hashValue(names[0])
        if (names[1]) userData.ln = await hashValue(names[1])
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return userData
}

// Hash value for privacy (SHA-256)
async function hashValue(value: string): Promise<string> {
  if (!value) return ''
  
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(value.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (e) {
    // Fallback: simple hash
    return btoa(value).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }
}

// Generate unique event ID
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Common event tracking functions
export const pixelEvents = {
  // Page View (automatically tracked on init)
  pageView: () => trackEvent('PageView'),

  // E-commerce events
  viewContent: (contentData?: any) => trackEvent('ViewContent', contentData),
  addToCart: (cartData?: any) => trackEvent('AddToCart', cartData),
  initiateCheckout: (checkoutData?: any) => trackEvent('InitiateCheckout', checkoutData),
  addPaymentInfo: (paymentData?: any) => trackEvent('AddPaymentInfo', paymentData),
  purchase: (purchaseData?: any) => trackEvent('Purchase', purchaseData),

  // Engagement events
  search: (searchData?: any) => trackEvent('Search', searchData),
  viewCategory: (categoryData?: any) => trackEvent('ViewCategory', categoryData),
  addToWishlist: (wishlistData?: any) => trackEvent('AddToWishlist', wishlistData),
  lead: (leadData?: any) => trackEvent('Lead', leadData),
  completeRegistration: (registrationData?: any) => trackEvent('CompleteRegistration', registrationData),

  // Custom events
  custom: (eventName: string, eventData?: any) => trackEvent(eventName, eventData),
}

// Helper to format product data for Meta Pixel
export function formatProductData(product: any) {
  return {
    content_name: product.title || product.name,
    content_ids: [product.id || product.slug],
    content_type: 'product',
    value: product.price || 0,
    currency: 'INR',
  }
}

// Helper to format cart data
export function formatCartData(cart: any[]) {
  const contents = cart.map((item: any) => ({
    id: item.product_id || item.id,
    quantity: item.quantity || 1,
    item_price: item.price || 0,
  }))

  const value = cart.reduce((sum: number, item: any) => {
    return sum + ((item.price || 0) * (item.quantity || 1))
  }, 0)

  return {
    content_type: 'product',
    contents,
    value,
    currency: 'INR',
    num_items: cart.length,
  }
}

// Helper to format purchase data
export function formatPurchaseData(order: any) {
  const contents = (order.items || []).map((item: any) => ({
    id: item.product_id || item.id,
    quantity: item.quantity || 1,
    item_price: item.price || 0,
  }))

  return {
    content_type: 'product',
    contents,
    value: order.total || order.amount || 0,
    currency: 'INR',
    order_id: order.order_number || order.id,
    num_items: order.items?.length || 0,
  }
}

