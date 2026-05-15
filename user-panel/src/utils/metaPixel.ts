// Meta Pixel tracking utility — single inject, deferred past first paint (Safari / ITP / blockers).
import { getApiBase } from './apiBase'

/** Set `VITE_META_PIXEL_ID` on Vercel; legacy default matches former `index.html` pixel. */
const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || '602234032691847'

let metaPixelScheduleStarted = false

// Initialize Meta Pixel (safe to call multiple times)
export function initMetaPixel() {
  registerFailedEventRetryOnLoad()

  if (!PIXEL_ID) {
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.warn('Meta Pixel ID not configured')
    return
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (metaPixelScheduleStarted) return
  metaPixelScheduleStarted = true

  const run = () => {
    try {
      injectMetaPixelScript(PIXEL_ID)
    } catch {
      /* ignore */
    }
  }

  const delayMs = 2000
  if (document.readyState === 'complete') {
    window.setTimeout(run, delayMs)
  } else {
    window.addEventListener(
      'load',
      () => {
        window.setTimeout(run, delayMs)
      },
      { once: true }
    )
  }
}

function injectMetaPixelScript(pixelId: string) {
  if (document.querySelector('script[data-nefol-meta-pixel="1"]')) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(function (fb: any, b: Document, e: string, v: string, n?: any, t?: HTMLScriptElement, s?: Element | null) {
    if (fb.fbq) return
    n = fb.fbq = function () {
      // Meta’s stub queues `arguments` — keep identical behavior.
      // eslint-disable-next-line prefer-rest-params
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!fb._fbq) fb._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e) as HTMLScriptElement
    t.async = !0
    t.src = v
    t.setAttribute('data-nefol-meta-pixel', '1')
    t.onerror = () => {
      /* Blocked / offline — never retry (avoids loops). */
    }
    s = b.getElementsByTagName(e)[0]
    if (s?.parentNode) s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq
  if (typeof fbq === 'function') {
    fbq('init', pixelId)
    fbq('track', 'PageView')
  }
}

function registerFailedEventRetryOnLoad() {
  if (typeof window === 'undefined') return
  if ((registerFailedEventRetryOnLoad as unknown as { done?: boolean }).done) return
  ;(registerFailedEventRetryOnLoad as unknown as { done?: boolean }).done = true

  window.addEventListener(
    'load',
    () => {
      void (async () => {
        try {
          const failedEvents = JSON.parse(localStorage.getItem('meta_pixel_failed_events') || '[]')
          if (failedEvents.length > 0) {
            for (const event of failedEvents) {
              await sendEventToBackend(event.event_name, event.event_data, 1)
            }
            localStorage.removeItem('meta_pixel_failed_events')
          }
        } catch {
          // Ignore errors
        }
      })()
    },
    { once: true }
  )
}

// Track custom events
export function trackEvent(eventName: string, eventData?: unknown) {
  if (typeof window === 'undefined' || !(window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
    // Fallback: send to backend
    void sendEventToBackend(eventName, eventData)
    return
  }

  const pixel = (window as unknown as { fbq: (...args: unknown[]) => void }).fbq

  // Track via Meta Pixel
  pixel('track', eventName, eventData || {})

  // Also send to backend for logging
  void sendEventToBackend(eventName, eventData)
}

// Send event to backend for logging and server-side tracking with retry logic
async function sendEventToBackend(eventName: string, eventData?: unknown, retries = 3) {
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
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000)) // Exponential backoff
      }
    } catch (error) {
      if (attempt === retries - 1) {
        // eslint-disable-next-line no-console
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
        } catch {
          // Ignore localStorage errors
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }
}

// Get user data for tracking
async function getUserData(): Promise<Record<string, unknown>> {
  const userData: Record<string, unknown> = {}

  // Get user email from localStorage or session
  try {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr) as {
        email?: string
        phone?: string
        name?: string
      }
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
  } catch {
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
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback: simple hash
    return btoa(value)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
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
  viewContent: (contentData?: unknown) => trackEvent('ViewContent', contentData),
  addToCart: (cartData?: unknown) => trackEvent('AddToCart', cartData),
  initiateCheckout: (checkoutData?: unknown) => trackEvent('InitiateCheckout', checkoutData),
  addPaymentInfo: (paymentData?: unknown) => trackEvent('AddPaymentInfo', paymentData),
  purchase: (purchaseData?: unknown) => trackEvent('Purchase', purchaseData),

  // Engagement events
  search: (searchData?: unknown) => trackEvent('Search', searchData),
  viewCategory: (categoryData?: unknown) => trackEvent('ViewCategory', categoryData),
  addToWishlist: (wishlistData?: unknown) => trackEvent('AddToWishlist', wishlistData),
  lead: (leadData?: unknown) => trackEvent('Lead', leadData),
  completeRegistration: (registrationData?: unknown) => trackEvent('CompleteRegistration', registrationData),

  // Custom events
  custom: (eventName: string, eventData?: unknown) => trackEvent(eventName, eventData),
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
    return sum + (item.price || 0) * (item.quantity || 1)
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
