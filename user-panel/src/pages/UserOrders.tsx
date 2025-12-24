import React, { useState, useEffect } from 'react'
import { Package, Clock, CheckCircle, XCircle, Truck, Eye, Search, ShoppingCart, Star, RotateCcw, Download, ChevronDown, ArrowLeft } from 'lucide-react'
import { api } from '../services/api'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

interface OrderItem {
  id: number
  name: string
  title?: string
  slug?: string
  quantity: number
  price: string
  image?: string
  list_image?: string
  product_image?: string
}

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  date: string
  created_at?: string
  items: OrderItem[]
  tracking_number?: string
  estimated_delivery?: string
  shipping_address?: any
}

export default function UserOrders() {
  const { isAuthenticated } = useAuth()
  const cartContext = useCart()
  const [orders, setOrders] = useState<Order[]>([])
  const [archivedOrders, setArchivedOrders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'buy-again' | 'not-shipped' | 'cancelled' | 'pending-payment'>('all')
  const [timeFilter, setTimeFilter] = useState<string>('3months')
  const [showTimeFilter, setShowTimeFilter] = useState(false)
  
  // Load archived orders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('archived_orders')
    if (saved) {
      try {
        setArchivedOrders(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error('Failed to load archived orders:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const ordersData = await api.orders.getAll()
      
      // Filter orders for current user
      const token = localStorage.getItem('token')
      if (!token) {
        setOrders([])
        return
      }
      
      // Parse token to get user info
      const tokenParts = token.split('_')
      const userId = tokenParts[2]
      
      const userOrders = ordersData.map((order: any) => ({
        id: order.id.toString(),
        order_number: order.order_number,
        status: order.status,
        total: parseFloat(order.total),
        date: new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        created_at: order.created_at,
        items: Array.isArray(order.items) ? order.items : [],
        tracking_number: order.tracking_number,
        estimated_delivery: order.estimated_delivery,
        shipping_address: order.shipping_address
      }))
      
      setOrders(userOrders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-600" />
      case 'processing':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'pending_payment':
      case 'pending-payment':
        return <Clock className="w-5 h-5 text-orange-600" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Package className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'text-green-800'
      case 'shipped':
        return 'text-black'
      case 'processing':
      case 'pending':
        return 'text-yellow-800'
      case 'pending_payment':
      case 'pending-payment':
        return 'text-black'
      case 'cancelled':
        return 'text-red-800'
      default:
        return 'text-gray-800'
    }
  }

  const getTimeFilterDate = (filter: string) => {
    const now = new Date()
    switch (filter) {
      case '3months': {
        const date = new Date(now)
        date.setMonth(date.getMonth() - 3)
        return date
      }
      case '6months': {
        const date = new Date(now)
        date.setMonth(date.getMonth() - 6)
        return date
      }
      case 'year': {
        const date = new Date(now)
        date.setFullYear(date.getFullYear() - 1)
        return date
      }
      default:
        return new Date(0)
    }
  }

  const filteredOrders = orders.filter((order) => {
    // Exclude archived orders
    if (archivedOrders.has(order.id)) return false
    
    // Time filter (only apply if not 'all')
    if (timeFilter !== 'all') {
      const filterDate = getTimeFilterDate(timeFilter)
      const orderDate = order.created_at ? new Date(order.created_at) : new Date(order.date)
      
      if (orderDate < filterDate) return false
    }
    
    // Tab filter
    if (activeTab === 'buy-again') {
      return order.status.toLowerCase() === 'delivered' || order.status.toLowerCase() === 'completed'
    }
    if (activeTab === 'not-shipped') {
      return order.status.toLowerCase() !== 'delivered' && 
             order.status.toLowerCase() !== 'completed' && 
             order.status.toLowerCase() !== 'cancelled' &&
             order.status.toLowerCase() !== 'pending_payment' &&
             order.status.toLowerCase() !== 'pending-payment'
    }
    if (activeTab === 'cancelled') {
      return order.status.toLowerCase() === 'cancelled'
    }
    if (activeTab === 'pending-payment') {
      return order.status.toLowerCase() === 'pending_payment' || order.status.toLowerCase() === 'pending-payment'
    }
    
    // For 'all' tab, exclude cancelled orders
    if (activeTab === 'all') {
      if (order.status.toLowerCase() === 'cancelled') return false
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.items.some((item: any) => item.name?.toLowerCase().includes(query))
      )
    }
    
    return true
  })
  
  const handleArchiveOrder = (orderId: string) => {
    const newArchived = new Set(archivedOrders)
    newArchived.add(orderId)
    setArchivedOrders(newArchived)
    localStorage.setItem('archived_orders', JSON.stringify(Array.from(newArchived)))
  }
  
  const handleOrderAgain = async (order: Order) => {
    if (!cartContext?.addItem) {
      alert('Cart service unavailable. Please try again.')
      return
    }
    
    let successCount = 0
    let failCount = 0
    
    try {
      for (const item of order.items) {
        try {
          let product: any = null
          
          // Try to get product details by slug first
          if (item.slug) {
            try {
              product = await api.products.getBySlug(item.slug)
            } catch (err) {
              console.log(`Could not fetch product by slug ${item.slug}, trying by ID`)
            }
          }
          
          // If slug fetch failed, try by ID
          if (!product && item.id) {
            try {
              product = await api.products.getById(item.id)
            } catch (err) {
              console.log(`Could not fetch product by ID ${item.id}`)
            }
          }
          
          // Use product data if available, otherwise use item data
          const productData = product ? {
            id: product.id,
            slug: product.slug || item.slug || '',
            title: product.title || item.name || item.title || 'Product',
            price: product.price || product.details?.websitePrice || product.details?.mrp || item.price || '0',
            listImage: product.list_image || product.listImage || item.list_image || item.image || item.product_image || '',
            pdpImages: product.pdp_images || [],
            description: product.description || ''
          } : {
            id: item.id,
            slug: item.slug || '',
            title: item.name || item.title || 'Product',
            price: item.price || '0',
            listImage: item.list_image || item.image || item.product_image || '',
            pdpImages: [],
            description: ''
          }
          
          if (productData.id) {
            await cartContext.addItem(productData, item.quantity || 1)
            successCount++
          } else {
            failCount++
          }
        } catch (err) {
          console.error(`Failed to add item to cart:`, err)
          failCount++
        }
      }
      
      if (successCount > 0) {
        if (failCount > 0) {
          alert(`${successCount} item(s) added to cart. ${failCount} item(s) could not be added.`)
        } else {
          alert('Items added to cart successfully!')
        }
        window.location.hash = '#/user/cart'
      } else {
        alert('Failed to add items to cart. Please try again.')
      }
    } catch (error) {
      console.error('Failed to add items to cart:', error)
      alert('Failed to add items to cart. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>Loading your orders...</p>
          </div>
        </div>
      </main>
    )
  }

  const timeFilterOptions = [
    { value: '3months', label: 'past 3 months' },
    { value: '6months', label: 'past 6 months' },
    { value: 'year', label: '2025' },
    { value: 'all', label: 'All orders' }
  ]

  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => window.location.hash = '#/user/profile'}
            className="inline-flex items-center gap-2 font-light tracking-wide transition-colors hover:opacity-70"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Profile</span>
          </button>
        </div>
        
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-2 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Your Orders
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search all orders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-4 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-light"
              style={{ letterSpacing: '0.02em', paddingLeft: '3rem' }}
            />
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-md shadow-sm border border-slate-100 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-light rounded-md transition-colors whitespace-nowrap tracking-wide ${
                  activeTab === 'all'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ letterSpacing: '0.05em' }}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('buy-again')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-light rounded-md transition-colors whitespace-nowrap tracking-wide ${
                  activeTab === 'buy-again'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ letterSpacing: '0.05em' }}
              >
                Buy Again
              </button>
              <button
                onClick={() => setActiveTab('not-shipped')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-light rounded-md transition-colors whitespace-nowrap tracking-wide ${
                  activeTab === 'not-shipped'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ letterSpacing: '0.05em' }}
              >
                Not Yet Shipped
              </button>
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-light rounded-md transition-colors whitespace-nowrap tracking-wide ${
                  activeTab === 'cancelled'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ letterSpacing: '0.05em' }}
              >
                Cancelled Orders
              </button>
              <button
                onClick={() => setActiveTab('pending-payment')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-light rounded-md transition-colors whitespace-nowrap tracking-wide ${
                  activeTab === 'pending-payment'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ letterSpacing: '0.05em' }}
              >
                Pending Payment
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="text-sm font-light tracking-wide mr-2 whitespace-nowrap" style={{ color: '#666', letterSpacing: '0.05em' }}>Period of orders:</span>
              <button
                onClick={() => setShowTimeFilter(!showTimeFilter)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-light tracking-wide border border-slate-200 rounded-md transition-colors hover:border-blue-500"
                style={{ color: '#666', letterSpacing: '0.05em' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
              >
                <span>{timeFilterOptions.find(opt => opt.value === timeFilter)?.label || 'past 3 months'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showTimeFilter ? 'rotate-180' : ''}`} />
              </button>
              {showTimeFilter && (
                <>
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowTimeFilter(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-100 z-20">
                    {timeFilterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTimeFilter(option.value)
                          setShowTimeFilter(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-light tracking-wide hover:bg-slate-50 first:rounded-t-md last:rounded-b-md transition-colors ${
                          timeFilter === option.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                        }`}
                        style={{ letterSpacing: '0.05em' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-slate-100 p-8">
            <div className="text-center">
              <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#ccc' }} />
              <h3 
                className="text-lg sm:text-xl font-light mb-2 tracking-[0.1em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.1em'
                }}
              >
                {orders.length === 0 ? (
                  <>
                    0 orders placed in {timeFilterOptions.find(opt => opt.value === timeFilter)?.label || 'past 3 months'}
                  </>
                ) : (
                  <>
                    {activeTab === 'buy-again' && 'No orders available to buy again'}
                    {activeTab === 'not-shipped' && 'No orders pending shipment'}
                    {activeTab === 'cancelled' && 'No cancelled orders'}
                    {activeTab === 'pending-payment' && 'No orders with pending payment'}
                    {activeTab === 'all' && `0 orders placed in ${timeFilterOptions.find(opt => opt.value === timeFilter)?.label || 'past 3 months'}`}
                  </>
                )}
              </h3>
              <p 
                className="text-sm font-light tracking-wide mb-4"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                {orders.length === 0 ? (
                  <>
                    Looks like you haven't placed an order in the last 3 months. 
                    {timeFilter !== 'year' && (
                      <button 
                        onClick={() => setTimeFilter('year')}
                        className="hover:underline ml-1 font-light"
                        style={{ color: 'rgb(75,151,201)' }}
                      >
                        View orders in 2025
                      </button>
                    )}
                  </>
                ) : (
                  'Try selecting a different time period or filter.'
                )}
              </p>
              {orders.length === 0 && (
                <div className="mt-6">
                  <a 
                    href="#/user/shop" 
                    className="inline-block text-white px-6 py-2 rounded-md font-light tracking-[0.15em] uppercase transition-colors text-xs"
                    style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
                  >
                    Start Shopping
                  </a>
                </div>
              )}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  › View or edit your browsing history
                </p>
                <p 
                  className="text-xs font-light mt-1"
                  style={{ color: '#999', letterSpacing: '0.02em' }}
                >
                  After viewing product detail pages, look here to find an easy way to navigate back to pages you are interested in.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-md shadow-sm border border-slate-100">
                {/* Order Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                          Order placed <span className="font-medium">{order.date}</span>
                        </div>
                        <div className="text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                          Order #{order.order_number}
                        </div>
                        {order.tracking_number && (
                          <div className="text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                            Tracking: <span className="font-medium">{order.tracking_number}</span>
                          </div>
                        )}
                      </div>
                      <div className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                        {order.status === 'delivered' && 'Delivered'}
                        {order.status === 'shipped' && 'Shipped'}
                        {order.status === 'processing' && 'Processing'}
                        {order.status === 'pending' && 'Pending'}
                        {(order.status === 'pending_payment' || order.status === 'pending-payment') && 'Pending Payment'}
                        {order.status === 'cancelled' && 'Cancelled'}
                        {order.estimated_delivery && order.status === 'shipped' && (
                          <span className="text-slate-600 ml-2">
                            Expected delivery: {new Date(order.estimated_delivery).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-light" style={{ color: '#1a1a1a' }}>
                        ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4">
                  {order.items.map((item: any, index: number) => {
                    // Construct full image URL
                    const imageUrl = item.list_image || item.image || item.product_image
                    const fullImageUrl = imageUrl && imageUrl.startsWith('http') 
                      ? imageUrl 
                      : imageUrl 
                        ? (() => {
                            const apiBase = getApiBase()
                            return `${apiBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
                          })()
                        : null
                    
                    const productName = item.name || item.title || 'Product'
                    const productSlug = item.slug || ''
                    const productUrl = productSlug ? `#/user/product/${productSlug}` : `#/user/order/${order.order_number}`
                    
                    return (
                    <div key={index} className="flex gap-4 mb-4 last:mb-0 pb-4 border-b border-slate-100 last:border-0">
                      <a 
                        href={productUrl}
                        className="w-24 h-24 bg-slate-100 slate-700 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        {fullImageUrl ? (
                          <img 
                            src={fullImageUrl} 
                            alt={productName} 
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <Package className="w-8 h-8 text-slate-400" />
                        )}
                      </a>
                      <div className="flex-1">
                        <a 
                          href={productUrl}
                          className="block"
                        >
                          <h4 className="text-sm font-medium text-slate-900 mb-1 hover:text-orange-600 text-orange-400 transition-colors cursor-pointer">
                            {productName}
                          </h4>
                        </a>
                        <p className="text-xs text-slate-600 mb-2">
                          Quantity: {item.quantity || 1}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {order.status === 'delivered' && (
                            <>
                              <button 
                                className="text-sm font-light tracking-wide hover:underline flex items-center gap-1 transition-colors"
                                style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                              >
                                <Star className="w-4 h-4" />
                                Write a product review
                              </button>
                              <button 
                                onClick={() => handleOrderAgain(order)}
                                className="text-sm font-light tracking-wide hover:underline flex items-center gap-1 transition-colors"
                                style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Buy it again
                              </button>
                            </>
                          )}
                          {order.status === 'shipped' && (
                            <button 
                              className="text-sm font-light tracking-wide hover:underline flex items-center gap-1 transition-colors"
                              style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                            >
                              <Truck className="w-4 h-4" />
                              Track package
                            </button>
                          )}
                          {(order.status === 'pending_payment' || order.status === 'pending-payment') && (
                            <button 
                              onClick={() => window.location.hash = `#/user/checkout?order=${order.order_number}`}
                              className="text-sm text-white px-4 py-2 rounded-md font-light tracking-[0.15em] uppercase transition-colors"
                              style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
                            >
                              Pay Now
                            </button>
                          )}
                          {order.status === 'cancelled' && (
                            <button 
                              onClick={() => handleOrderAgain(order)}
                              className="text-sm font-light tracking-wide hover:underline flex items-center gap-1 transition-colors"
                              style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                            >
                              <RotateCcw className="w-4 h-4" />
                              Order again
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-light" style={{ color: '#1a1a1a' }}>
                          ₹{parseFloat(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>

                {/* Order Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center gap-4 flex-wrap">
                    {order.status === 'shipped' && (
                      <button 
                        className="text-sm font-light tracking-wide hover:underline transition-colors"
                        style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                      >
                        Track package
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <>
                        <button 
                          className="text-sm font-light tracking-wide hover:underline transition-colors"
                          style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                        >
                          Get invoice
                        </button>
                        <button 
                          onClick={() => handleOrderAgain(order)}
                          className="text-sm font-light tracking-wide hover:underline flex items-center gap-1 transition-colors"
                          style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Buy it again
                        </button>
                      </>
                    )}
                    {(order.status === 'pending_payment' || order.status === 'pending-payment') && (
                      <button
                        onClick={() => window.location.hash = `#/user/checkout?order=${order.order_number}`}
                        className="text-sm text-white px-4 py-2 rounded-md font-light tracking-[0.15em] uppercase transition-colors"
                        style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
                      >
                        Pay Now
                      </button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'pending_payment' && order.status !== 'pending-payment' && (
                      <button
                        onClick={() => window.location.hash = `#/user/order/${order.order_number}`}
                        className="text-sm font-light tracking-wide hover:underline transition-colors"
                        style={{ color: 'rgb(75,151,201)', letterSpacing: '0.05em' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(60,120,160)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(75,151,201)'}
                      >
                        View order details
                      </button>
                    )}
                    <button 
                      onClick={() => handleArchiveOrder(order.id)}
                      className="text-sm font-light tracking-wide hover:underline transition-colors"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                    >
                      Archive order
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

