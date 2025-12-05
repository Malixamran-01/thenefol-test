import React, { useState, useEffect } from 'react'
import { Package, Clock, CheckCircle, XCircle, Truck, Eye, Search, ShoppingCart, Star, RotateCcw, Download, ChevronDown } from 'lucide-react'
import { api } from '../services/api'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

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
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'buy-again' | 'not-shipped' | 'cancelled' | 'pending-payment'>('all')
  const [timeFilter, setTimeFilter] = useState<string>('3months')
  const [showTimeFilter, setShowTimeFilter] = useState(false)

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
        return 'text-green-700 dark:text-green-400'
      case 'shipped':
        return 'text-blue-700 dark:text-blue-400'
      case 'processing':
      case 'pending':
        return 'text-yellow-700 dark:text-yellow-400'
      case 'pending_payment':
      case 'pending-payment':
        return 'text-orange-700 dark:text-orange-400'
      case 'cancelled':
        return 'text-red-700 dark:text-red-400'
      default:
        return 'text-gray-700 dark:text-gray-400'
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

  if (loading) {
    return (
      <main className="py-10 dark:bg-slate-900 min-h-screen">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">Loading your orders...</p>
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
    <main className="bg-gray-50 dark:bg-slate-900 min-h-screen py-6">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
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
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-2 border-orange-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('buy-again')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'buy-again'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-2 border-orange-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Buy Again
              </button>
              <button
                onClick={() => setActiveTab('not-shipped')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'not-shipped'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-2 border-orange-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Not Yet Shipped
              </button>
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'cancelled'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-2 border-orange-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Cancelled Orders
              </button>
              <button
                onClick={() => setActiveTab('pending-payment')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'pending-payment'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-2 border-orange-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Pending Payment
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowTimeFilter(!showTimeFilter)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md hover:border-orange-500 dark:hover:border-orange-500"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 z-20">
                    {timeFilterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTimeFilter(option.value)
                          setShowTimeFilter(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-md last:rounded-b-md ${
                          timeFilter === option.value ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
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
          <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
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
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {orders.length === 0 ? (
                  <>
                    Looks like you haven't placed an order in the last 3 months. 
                    {timeFilter !== 'year' && (
                      <button 
                        onClick={() => setTimeFilter('year')}
                        className="text-orange-600 dark:text-orange-400 hover:underline ml-1"
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
                    className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Start Shopping
                  </a>
                </div>
              )}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  › View or edit your browsing history
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  After viewing product detail pages, look here to find an easy way to navigate back to pages you are interested in.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                {/* Order Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Order placed <span className="font-medium">{order.date}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Order #{order.order_number}
                        </div>
                        {order.tracking_number && (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
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
                          <span className="text-slate-600 dark:text-slate-400 ml-2">
                            Expected delivery: {new Date(order.estimated_delivery).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        ₹{order.total.toLocaleString('en-IN')}
                      </div>
                      <button
                        onClick={() => window.location.hash = `#/user/order/${order.order_number}`}
                        className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline mt-1"
                      >
                        Order Details
                      </button>
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
                    const productUrl = productSlug ? `#/product/${productSlug}` : `#/user/order/${order.order_number}`
                    
                    return (
                    <div key={index} className="flex gap-4 mb-4 last:mb-0 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <a 
                        href={productUrl}
                        className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
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
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer">
                            {productName}
                          </h4>
                        </a>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          Quantity: {item.quantity || 1}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {order.status === 'delivered' && (
                            <>
                              <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1">
                                <Star className="w-4 h-4" />
                                Write a product review
                              </button>
                              <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1">
                                <ShoppingCart className="w-4 h-4" />
                                Buy it again
                              </button>
                            </>
                          )}
                          {order.status === 'shipped' && (
                            <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1">
                              <Truck className="w-4 h-4" />
                              Track package
                            </button>
                          )}
                          {(order.status === 'pending_payment' || order.status === 'pending-payment') && (
                            <button 
                              onClick={() => window.location.hash = `#/user/checkout?order=${order.order_number}`}
                              className="text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                            >
                              Pay Now
                            </button>
                          )}
                          {order.status !== 'delivered' && order.status !== 'shipped' && order.status !== 'cancelled' && 
                           order.status !== 'pending_payment' && order.status !== 'pending-payment' && (
                            <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline">
                              View order details
                            </button>
                          )}
                          {order.status === 'cancelled' && (
                            <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1">
                              <RotateCcw className="w-4 h-4" />
                              Order again
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          ₹{parseFloat(item.price || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>

                {/* Order Actions */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4 flex-wrap">
                    {order.status === 'shipped' && (
                      <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline">
                        Track package
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <>
                        <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline">
                          Get invoice
                        </button>
                        <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4" />
                          Buy it again
                        </button>
                      </>
                    )}
                    {(order.status === 'pending_payment' || order.status === 'pending-payment') && (
                      <button
                        onClick={() => window.location.hash = `#/user/checkout?order=${order.order_number}`}
                        className="text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                      >
                        Pay Now
                      </button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'pending_payment' && order.status !== 'pending-payment' && (
                      <button
                        onClick={() => window.location.hash = `#/user/order/${order.order_number}`}
                        className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline"
                      >
                        View order details
                      </button>
                    )}
                    <button className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
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

