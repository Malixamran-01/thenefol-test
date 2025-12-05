/**
 * Comprehensive API Service Layer for NEFOL User Panel
 * This service handles all backend communication with proper error handling,
 * authentication, and data transformation.
 */

import { getApiBase } from '../utils/apiBase'

// Types
export interface User {
  id: number
  name: string
  email: string
  phone: string
  address: {
    street: string
    area?: string
    landmark?: string
    city: string
    state: string
    zip: string
    address_type?: 'home' | 'work' | 'other'
  }
  profile_photo?: string
  loyalty_points: number
  total_orders: number
  member_since: string
  is_verified: boolean
}

export interface Product {
  id: number
  slug: string
  title: string
  category: string
  price: string
  list_image: string
  description: string
  details: any
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_email: string
  shipping_address: any
  billing_address?: any
  items: any[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: string
  payment_method: string
  payment_type: string
  created_at: string
  tracking_number?: string
  estimated_delivery?: string
}

export interface Review {
  id: number
  order_id: string
  product_id: number
  customer_email: string
  customer_name: string
  rating: number
  title: string
  review_text: string
  images: any[]
  is_verified: boolean
  is_featured: boolean
  points_awarded: number
  status: string
  created_at: string
}

export interface Discount {
  id: number
  name: string
  code: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  min_amount: number
  max_amount: number
  usage_limit: number
  valid_from: string
  valid_until: string
  is_active: boolean
}

// API Configuration - get at runtime to ensure correct URL based on current hostname
const getApiBaseUrl = () => getApiBase()

// Utility functions
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}`) as any
    error.status = response.status
    error.response = { status: response.status, data: errorData }
    throw error
  }
  return response.json()
}

// Authentication API
export const authAPI = {
  async login(email: string, password: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return handleResponse(response)
  },

  async signup(userData: {
    name: string
    email: string
    password: string
    phone: string
    address: any
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    return handleResponse(response)
  },

  async sendOTP(phone: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    return handleResponse(response)
  },

  async verifyOTPSignup(data: {
    phone: string
    otp: string
    name: string
    email?: string
    address?: any
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/verify-otp-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async sendOTPLogin(phone: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/send-otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    return handleResponse(response)
  },

  async verifyOTPLogin(data: {
    phone: string
    otp: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/verify-otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async logout() {
    // Clear local storage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

// User Profile API
export const userAPI = {
  async getProfile(): Promise<User> {
    const response = await fetch(`${getApiBaseUrl()}/api/users/profile`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await fetch(`${getApiBaseUrl()}/api/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async getSavedCards() {
    const response = await fetch(`${getApiBaseUrl()}/api/users/saved-cards`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async getAddresses() {
    const response = await fetch(`${getApiBaseUrl()}/api/users/addresses`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async createAddress(addressData: any) {
    const response = await fetch(`${getApiBaseUrl()}/api/users/addresses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(addressData)
    })
    return handleResponse(response)
  },

  async updateAddress(addressId: number, addressData: any) {
    const response = await fetch(`${getApiBaseUrl()}/api/users/addresses/${addressId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(addressData)
    })
    return handleResponse(response)
  },

  async deleteAddress(addressId: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/users/addresses/${addressId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async setDefaultAddress(addressId: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/users/addresses/${addressId}/default`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }
}

// Products API
export const productsAPI = {
  async getAll(): Promise<Product[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/products`)
    return handleResponse(response)
  },

  async getBySlug(slug: string): Promise<Product> {
    const response = await fetch(`${getApiBaseUrl()}/api/products/slug/${slug}`)
    return handleResponse(response)
  },

  async getById(id: number): Promise<Product> {
    const response = await fetch(`${getApiBaseUrl()}/api/products/${id}`)
    return handleResponse(response)
  },

  async getByCategory(category: string): Promise<Product[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/products/category/${category}`)
    return handleResponse(response)
  },

  async search(query: string): Promise<Product[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/products/search?q=${encodeURIComponent(query)}`)
    return handleResponse(response)
  }
}

// Cart API (Backend Integration)
export const cartAPI = {
  async getCart() {
    const response = await fetch(`${getApiBaseUrl()}/api/cart`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async addToCart(productId: number, quantity: number = 1) {
    console.log('🌐 API: Adding to cart', { productId, quantity, headers: getAuthHeaders() })
    const response = await fetch(`${getApiBaseUrl()}/api/cart`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: productId, quantity })
    })
    console.log('🌐 API: Cart response status:', response.status)
    return handleResponse(response)
  },

  async updateCartItem(cartItemId: number, quantity: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/cart/${cartItemId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity })
    })
    return handleResponse(response)
  },

  async removeFromCart(cartItemId: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async clearCart() {
    const response = await fetch(`${getApiBaseUrl()}/api/cart`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }
}

// Wishlist API
export const wishlistAPI = {
  async getWishlist() {
    const response = await fetch(`${getApiBaseUrl()}/api/wishlist`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async addToWishlist(productId: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/wishlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: productId })
    })
    return handleResponse(response)
  },

  async removeFromWishlist(productId: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/wishlist/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }
}

// Orders API
export const ordersAPI = {
  async getAll(): Promise<Order[]> {
    // Try user-specific endpoint first (for regular users)
    try {
      const userResponse = await fetch(`${getApiBaseUrl()}/api/user/orders`, {
        headers: getAuthHeaders()
      })
      if (userResponse.ok) {
        return handleResponse(userResponse)
      }
    } catch (err) {
      // If user endpoint fails, fall back to admin endpoint
    }
    
    // Fall back to admin endpoint (for staff/admin)
    const response = await fetch(`${getApiBaseUrl()}/api/orders`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async getById(orderId: string): Promise<Order> {
    const response = await fetch(`${getApiBaseUrl()}/api/orders/${orderId}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async createOrder(orderData: {
    order_number: string
    customer_name: string
    customer_email: string
    shipping_address: any
    items: any[]
    subtotal: number
    shipping: number
    tax: number
    total: number
    payment_method: string
    payment_type: string
    status: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData)
    })
    return handleResponse(response)
  },

  async updateOrderStatus(orderId: string, status: string, additionalData?: any) {
    const response = await fetch(`${getApiBaseUrl()}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, ...additionalData })
    })
    return handleResponse(response)
  },

  async updatePaymentCancelled(orderNumber: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/user/orders/${orderNumber}/payment-cancelled`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }
}

// Reviews API
export const reviewsAPI = {
  async getProductReviews(productId: number): Promise<Review[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/product-reviews/product/${productId}`)
    return handleResponse(response)
  },

  async getTestimonials(): Promise<any[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/testimonials`)
    return handleResponse(response)
  },

  async createReview(reviewData: {
    order_id?: string
    product_id: number
    customer_email: string
    customer_name: string
    rating: number
    title?: string
    review_text?: string
    images?: any[]
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/product-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    })
    return handleResponse(response)
  },

  async createProductReview(reviewData: {
    order_id?: string
    product_id: number
    customer_email: string
    customer_name: string
    rating: number
    title?: string
    review_text?: string
    images?: any[]
  }) {
    return this.createReview(reviewData)
  },

  async updateReviewStatus(reviewId: number, status: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/product-reviews/${reviewId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    })
    return handleResponse(response)
  }
}

// Discounts API
export const discountsAPI = {
  async getAll(): Promise<Discount[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/discounts`)
    return handleResponse(response)
  },

  async applyDiscount(code: string, amount: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/discounts/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, amount })
    })
    return handleResponse(response)
  }
}

// Payment API
export const paymentAPI = {
  async getPaymentGateways() {
    const response = await fetch(`${getApiBaseUrl()}/api/payment/gateways`)
    return handleResponse(response)
  },

  async createPaymentGateway(gatewayData: any) {
    const response = await fetch(`${getApiBaseUrl()}/api/payment/gateways`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(gatewayData)
    })
    return handleResponse(response)
  },

  // Razorpay APIs
  async createRazorpayOrder(orderData: {
    amount: number
    currency?: string
    order_number: string
    customer_name: string
    customer_email: string
    customer_phone: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/payment/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    return handleResponse(response)
  },

  async verifyRazorpayPayment(paymentData: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    order_number: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/payment/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    })
    return handleResponse(response)
  }
}

// Analytics API
export const analyticsAPI = {
  async getPersonalizedContent() {
    const response = await fetch(`${getApiBaseUrl()}/api/ai-personalization/content`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async getCashbackBalance() {
    const response = await fetch(`${getApiBaseUrl()}/api/cashback/balance`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }
}

// Cancellations API
export const cancellationsAPI = {
  async requestCancellation(data: {
    order_number: string
    reason: string
    cancellation_type?: 'full' | 'partial'
    items_to_cancel?: any[]
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/cancellations/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async cancelOrder(data: {
    order_number: string
    reason: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/cancellations/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async getUserCancellations() {
    const response = await fetch(`${getApiBaseUrl()}/api/cancellations`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async getCancellationDetails(id: string | number) {
    const response = await fetch(`${getApiBaseUrl()}/api/cancellations/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }
}

// Videos API
export const videosAPI = {
  async getAll() {
    const response = await fetch(`${getApiBaseUrl()}/api/videos`)
    return handleResponse(response)
  },

  async getById(id: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/videos/${id}`)
    return handleResponse(response)
  }
}

// Live Chat API
export const liveChatAPI = {
  async createSession(data: { userId?: string | number, customerName?: string, customerEmail?: string, customerPhone?: string }) {
    const response = await fetch(`${getApiBaseUrl()}/api/live-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async getMessages(sessionId: number | string) {
    const params = new URLSearchParams({ sessionId: String(sessionId) }).toString()
    const response = await fetch(`${getApiBaseUrl()}/api/live-chat/messages?${params}`)
    return handleResponse(response)
  },

  async sendMessage(data: { sessionId: number | string, sender: 'customer' | 'agent', senderName?: string, message: string, type?: string }) {
    const response = await fetch(`${getApiBaseUrl()}/api/live-chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async createSupportRequest(data: { sessionId: number | string, subject: string, description: string, priority?: 'low' | 'medium' | 'high' }) {
    const response = await fetch(`${getApiBaseUrl()}/api/live-chat/support-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  }
}

// Recommendations API
export const recommendationsAPI = {
  async trackProductView(productId: number | string, data?: { viewDuration?: number, source?: string }) {
    const response = await fetch(`${getApiBaseUrl()}/api/products/${productId}/view`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {})
    })
    return handleResponse(response)
  },

  async getRecentlyViewed(limit: number = 10) {
    const response = await fetch(`${getApiBaseUrl()}/api/recommendations/recently-viewed?limit=${limit}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async getRelatedProducts(productId: number | string, limit: number = 8) {
    const response = await fetch(`${getApiBaseUrl()}/api/recommendations/related/${productId}?limit=${limit}`)
    return handleResponse(response)
  },

  async getRecommendations(type: string = 'based_on_browsing', limit: number = 8) {
    const response = await fetch(`${getApiBaseUrl()}/api/recommendations?type=${type}&limit=${limit}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  },

  async trackSearch(query: string, resultsCount: number = 0) {
    const response = await fetch(`${getApiBaseUrl()}/api/search/track`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, resultsCount })
    })
    return handleResponse(response)
  },

  async getPopularSearches(limit: number = 10) {
    const response = await fetch(`${getApiBaseUrl()}/api/search/popular?limit=${limit}`)
    return handleResponse(response)
  }
}

// Product Collections API
export const collectionsAPI = {
  async getCollections(type: 'offers' | 'new_arrivals' | 'best_sellers' | 'recommendations', published: boolean = true) {
    const response = await fetch(`${getApiBaseUrl()}/api/collections?type=${type}&published=${published}`)
    return handleResponse(response)
  },

  async getRecommendationPosts(published: boolean = true) {
    const response = await fetch(`${getApiBaseUrl()}/api/recommendation-posts?published=${published}`)
    return handleResponse(response)
  }
}

// WhatsApp Subscription API
export const whatsappAPI = {
  async subscribe(phone: string, name?: string, source?: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/whatsapp/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name, source })
    })
    return handleResponse(response)
  },

  async unsubscribe(phone: string) {
    const response = await fetch(`${getApiBaseUrl()}/api/whatsapp/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    return handleResponse(response)
  }
}

// Export all APIs
export const api = {
  auth: authAPI,
  user: userAPI,
  products: productsAPI,
  cart: cartAPI,
  wishlist: wishlistAPI,
  orders: ordersAPI,
  reviews: reviewsAPI,
  discounts: discountsAPI,
  payment: paymentAPI,
  analytics: analyticsAPI,
  cancellations: cancellationsAPI,
  videos: videosAPI,
  liveChat: liveChatAPI,
  recommendations: recommendationsAPI,
  collections: collectionsAPI,
  whatsapp: whatsappAPI
}

// Product Questions API
export const productQuestionsAPI = {
  async getProductQuestions(productId: number) {
    const response = await fetch(`${getApiBaseUrl()}/api/product-questions/product/${productId}`)
    return handleResponse(response)
  },

  async createQuestion(questionData: {
    product_id: number
    customer_name: string
    customer_email: string
    customer_phone?: string
    question: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/product-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionData)
    })
    return handleResponse(response)
  }
}

export default api
