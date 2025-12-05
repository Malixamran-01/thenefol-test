import React, { useState, useEffect } from 'react'
import { Package, CheckCircle, XCircle, Truck, MapPin, Calendar, CreditCard, ArrowLeft, Download, X } from 'lucide-react'
import { api } from '../services/api'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

interface OrderDetails {
  id: string
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

export default function OrderDetails() {
  const { isAuthenticated } = useAuth()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [canCancel, setCanCancel] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [taxSettings, setTaxSettings] = useState<{ rate: number; type: string } | null>(null)
  
  // Get order number from URL
  useEffect(() => {
    const hash = window.location.hash
    const orderNumberMatch = hash.match(/user\/order\/(.+)/)
    const orderNumber = orderNumberMatch ? orderNumberMatch[1] : ''
    
    if (!isAuthenticated) {
      setError('Please login to view order details')
      setLoading(false)
      return
    }
    
    if (orderNumber) {
      fetchOrderDetails(orderNumber)
    } else {
      setError('Order number not found')
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchOrderDetails = async (orderNumber: string) => {
    try {
      setLoading(true)
      const [orderData, taxSettingsData] = await Promise.all([
        api.orders.getById(orderNumber),
        fetch(`${getApiBase()}/api/invoice-settings/all`).then(res => res.ok ? res.json() : null).catch(() => null)
      ])
      
      // Set tax settings
      if (taxSettingsData && taxSettingsData.tax) {
        setTaxSettings(taxSettingsData.tax)
      } else {
        // Default tax settings
        setTaxSettings({ rate: 18, type: 'IGST' })
      }
      
      setOrder({
        id: orderData.id.toString(),
        order_number: orderData.order_number,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        shipping_address: orderData.shipping_address,
        billing_address: (orderData as any).billing_address,
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shipping: orderData.shipping || 0,
        tax: orderData.tax || 0,
        total: orderData.total || 0,
        status: orderData.status,
        payment_method: orderData.payment_method,
        payment_type: orderData.payment_type,
        created_at: orderData.created_at,
        tracking_number: orderData.tracking_number,
        estimated_delivery: orderData.estimated_delivery
      })
      
      // Check if order can be cancelled
      const isDelivered = orderData.status === 'delivered' || orderData.status === 'completed'
      const isCancelled = orderData.status === 'cancelled'
      
      if (isCancelled) {
        setCanCancel(false)
      } else if (isDelivered) {
        // For delivered orders, check if within 5 days
        const deliveredAt = (orderData as any).delivered_at || (orderData as any).updated_at || orderData.created_at
        if (deliveredAt) {
          const deliveryDate = new Date(deliveredAt)
          const now = new Date()
          const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24))
          setCanCancel(daysSinceDelivery <= 5 && (orderData as any).can_cancel !== false)
        }
      } else {
        // For non-delivered orders, allow immediate cancellation
        setCanCancel(true)
      }
    } catch (err: any) {
      console.error('Failed to fetch order details:', err)
      setError(err.message || 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/products`)
      const products = await response.json()
      // Get random 6 products as related products
      const shuffled = products.sort(() => 0.5 - Math.random())
      setRelatedProducts(shuffled.slice(0, 6))
    } catch (error) {
      console.error('Failed to fetch related products:', error)
      setRelatedProducts([])
    }
  }

  useEffect(() => {
    if (!loading && order) {
      fetchRelatedProducts()
    }
  }, [order, loading])

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-6 h-6" style={{ color: '#10b981' }} />
      case 'shipped':
        return <Truck className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
      case 'processing':
      case 'pending':
        return <Package className="w-6 h-6" style={{ color: '#F59E0B' }} />
      case 'cancelled':
        return <XCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
      default:
        return <Package className="w-6 h-6" style={{ color: '#666' }} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'green'
      case 'shipped':
        return 'blue'
      case 'processing':
      case 'pending':
        return 'yellow'
      case 'cancelled':
        return 'red'
      default:
        return 'gray'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    if (!order) return

    try {
      setCancelling(true)
      const result = await api.cancellations.cancelOrder({
        order_number: order.order_number,
        reason: cancelReason.trim()
      })

      if (result.success || result.message) {
        alert('Order cancelled successfully')
        setShowCancelModal(false)
        setCancelReason('')
        // Reload order details
        await fetchOrderDetails(order.order_number)
      } else {
        throw new Error(result.error || 'Failed to cancel order')
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err)
      alert(err.message || 'Failed to cancel order. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="text-center">
          <p style={{ color: '#666' }}>Loading order details...</p>
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h2 
              className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              {error || 'Order not found'}
            </h2>
            <a
              href="#/user/user-orders"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors text-white font-light tracking-[0.15em] uppercase text-sm"
              style={{ 
                backgroundColor: 'var(--arctic-blue-primary)',
                fontFamily: 'var(--font-body-family, Inter, sans-serif)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Orders
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-8 sm:py-12 md:py-16" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => window.location.hash = '#/user/user-orders'}
          className="mb-8 flex items-center gap-2 transition-colors font-light tracking-wide"
          style={{ color: '#666' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Orders</span>
        </button>

        {/* Order Header */}
        <section className="mb-12 sm:mb-16">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h1 
                  className="text-lg sm:text-xl font-bold mb-2" 
                  style={{
                    color: '#1a1a1a',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1
                  }}
                >
                  Order #{order.order_number}
                </h1>
                <p className="text-xs sm:text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300"
                style={{
                  backgroundColor: getStatusColor(order.status) === 'green' ? '#E0F5F5' : 
                                  getStatusColor(order.status) === 'blue' ? '#E0F5F5' :
                                  getStatusColor(order.status) === 'yellow' ? '#FEF3C7' :
                                  getStatusColor(order.status) === 'red' ? '#FEE2E2' : '#F0F9F9',
                  borderColor: getStatusColor(order.status) === 'green' ? '#7DD3D3' : 
                              getStatusColor(order.status) === 'blue' ? '#7DD3D3' :
                              getStatusColor(order.status) === 'yellow' ? '#F59E0B' :
                              getStatusColor(order.status) === 'red' ? '#EF4444' : '#7DD3D3',
                  color: getStatusColor(order.status) === 'green' ? '#10b981' : 
                         getStatusColor(order.status) === 'blue' ? '#3B82F6' :
                         getStatusColor(order.status) === 'yellow' ? '#F59E0B' :
                         getStatusColor(order.status) === 'red' ? '#EF4444' : '#666'
                }}
              >
                {getStatusIcon(order.status)}
                <span className="font-light tracking-wide capitalize text-xs sm:text-sm">{order.status}</span>
              </div>
            </div>

            {/* Order Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm transition-all duration-300 hover:shadow-md">
                <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary)' }} />
                <div>
                  <p className="text-xs font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>Order Date</p>
                  <p className="font-light text-sm mt-1" style={{ color: '#1a1a1a' }}>
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm transition-all duration-300 hover:shadow-md">
                <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                <div>
                  <p className="text-xs font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>Payment</p>
                  <p className="font-light text-sm mt-1" style={{ color: '#1a1a1a' }}>
                    {order.payment_method}
                  </p>
                </div>
              </div>
              {order.tracking_number && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm transition-all duration-300 hover:shadow-md">
                  <Truck className="w-5 h-5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                  <div>
                    <p className="text-xs font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>Tracking</p>
                    <p className="font-light text-sm mt-1" style={{ color: '#1a1a1a' }}>
                      {order.tracking_number}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Order Items */}
        <section className="mb-12 sm:mb-16">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <h2 
              className="text-xl sm:text-2xl md:text-3xl font-light mb-8 sm:mb-12 tracking-[0.15em] text-center" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              Order Items
            </h2>
            <div className="space-y-4 sm:space-y-6">
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
              
              return (
                <div
                  key={index}
                  className="group flex items-start gap-4 sm:gap-6 p-4 sm:p-6 border rounded-xl transition-all duration-300 bg-white"
                  style={{ 
                    borderColor: '#E0F5F5',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(125, 211, 211, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E0F5F5'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
                    {fullImageUrl ? (
                      <img
                        src={fullImageUrl}
                        alt={item.name || item.title || 'Product'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to default image on error
                          const target = e.target as HTMLImageElement
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-light text-base sm:text-lg mb-1" style={{ color: '#1a1a1a' }}>
                      {item.name || item.title || 'Product'}
                    </h3>
                    <p className="text-xs font-light tracking-wide mt-1" style={{ color: '#666' }}>
                      Quantity: {item.quantity || 1}
                    </p>
                    {item.details && typeof item.details === 'string' && (
                      <p className="text-xs font-light mt-2 line-clamp-2" style={{ color: '#666' }}>
                        {item.details}
                      </p>
                    )}
                    {item.details && typeof item.details === 'object' && item.details.longDescription && (
                      <p className="text-xs font-light mt-2 line-clamp-2" style={{ color: '#666' }}>
                        {item.details.longDescription}
                      </p>
                    )}
                    {item.details && typeof item.details === 'object' && item.details.subtitle && (
                      <p className="text-xs font-light mt-2" style={{ color: '#666' }}>
                        {item.details.subtitle}
                      </p>
                    )}
                    {item.category && (
                      <span 
                        className="inline-block mt-2 px-2 py-1 text-xs rounded font-light tracking-wide"
                        style={{ 
                          backgroundColor: 'var(--arctic-blue-light)',
                          color: 'var(--arctic-blue-primary-dark)'
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-light text-lg" style={{ color: '#1a1a1a' }}>
                      ₹{item.price ? parseFloat(item.price).toLocaleString() : '0'}
                    </p>
                    <p className="text-xs font-light tracking-wide mt-1" style={{ color: '#666' }}>
                      {item.quantity || 1}x
                    </p>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary)' }} />
              <h2 
                className="text-xl sm:text-2xl font-light tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                Shipping Address
              </h2>
            </div>
            <div className="space-y-1 font-light tracking-wide" style={{ color: '#1a1a1a' }}>
              {order.shipping_address?.firstName || order.shipping_address?.first_name ? (
                <>
                  <p className="font-semibold">
                    {order.shipping_address.firstName || order.shipping_address.first_name} {order.shipping_address.lastName || order.shipping_address.last_name}
                  </p>
                  {order.shipping_address.company && (
                    <p className="text-sm">{order.shipping_address.company}</p>
                  )}
                </>
              ) : (
                <p className="font-semibold">{order.customer_name}</p>
              )}
              <p>{order.shipping_address?.address || order.shipping_address?.street || 'Address not available'}</p>
              {order.shipping_address?.apartment && (
                <p>{order.shipping_address.apartment}</p>
              )}
              <p>
                {order.shipping_address?.city || ''}, {order.shipping_address?.state || ''} {order.shipping_address?.zip || ''}
              </p>
              <p>{order.shipping_address?.country || 'India'}</p>
              {order.shipping_address?.phone && (
                <p className="mt-2">Phone: {order.shipping_address.phone}</p>
              )}
              {order.shipping_address?.email && (
                <p>Email: {order.shipping_address.email}</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
            <h2 
              className="text-xl sm:text-2xl font-light mb-6 tracking-[0.15em]" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              Order Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between font-light tracking-wide" style={{ color: '#666' }}>
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-light tracking-wide" style={{ color: '#666' }}>
                <span>Shipping</span>
                <span>₹{order.shipping.toLocaleString()}</span>
              </div>
              {taxSettings && (
                <div className="flex justify-between font-light tracking-wide" style={{ color: '#666' }}>
                  <span>Tax (GST {taxSettings.rate.toFixed(0)}%)</span>
                  <span>₹{typeof order.tax === 'number' ? order.tax.toFixed(2) : Number(order.tax || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-4 mt-4" style={{ borderColor: '#E0F5F5' }}>
                <div className="flex justify-between">
                  <span className="text-lg font-light tracking-wide" style={{ color: '#1a1a1a' }}>
                    Total
                  </span>
                  <span className="text-lg font-light" style={{ color: 'var(--arctic-blue-primary-dark)' }}>
                    ₹{order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Address - Separate Section */}
        {order.billing_address && (
          <section className="mb-12 sm:mb-16">
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                <h2 
                  className="text-xl sm:text-2xl font-light tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Billing Address
                </h2>
              </div>
            <div className="space-y-1 font-light tracking-wide" style={{ color: '#1a1a1a' }}>
              {order.billing_address?.firstName || order.billing_address?.first_name ? (
                <>
                  <p className="font-semibold">
                    {order.billing_address.firstName || order.billing_address.first_name} {order.billing_address.lastName || order.billing_address.last_name}
                  </p>
                  {order.billing_address.company && (
                    <p className="text-sm">{order.billing_address.company}</p>
                  )}
                </>
              ) : (
                <p className="font-semibold">{order.customer_name}</p>
              )}
              <p>{order.billing_address?.address || order.billing_address?.street || 'Address not available'}</p>
              {order.billing_address?.apartment && (
                <p>{order.billing_address.apartment}</p>
              )}
              <p>
                {order.billing_address?.city || ''}, {order.billing_address?.state || ''} {order.billing_address?.zip || ''}
              </p>
              <p>{order.billing_address?.country || 'India'}</p>
            </div>
          </div>
        </section>
        )}

        {/* Action Buttons */}
        <section className="mb-12 sm:mb-16">
          <div className="flex flex-wrap gap-4 sm:gap-6">
          <button 
            onClick={() => {
              const apiBase = getApiBase();
              window.open(`${apiBase}/api/invoices/${order.id}/download`, '_blank');
            }}
            className="flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm"
            style={{ 
              backgroundColor: 'var(--arctic-blue-primary)',
              fontFamily: 'var(--font-body-family, Inter, sans-serif)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'}
          >
            <Download className="w-5 h-5" />
            Download Invoice
          </button>
          <a
            href="#/user/contact"
            className="flex items-center gap-2 border px-6 py-3 rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm"
            style={{ 
              borderColor: '#E0F5F5',
              color: '#1a1a1a',
              fontFamily: 'var(--font-body-family, Inter, sans-serif)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)';
              e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#E0F5F5';
            }}
          >
            Contact Support
          </a>
          {canCancel && order.status.toLowerCase() !== 'cancelled' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm"
              style={{ 
                backgroundColor: '#ef4444',
                fontFamily: 'var(--font-body-family, Inter, sans-serif)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            >
              <X className="w-5 h-5" />
              Cancel Order
            </button>
          )}
          {(order.status.toLowerCase() === 'delivered' || order.status.toLowerCase() === 'completed') && (
            <button 
              className="flex items-center gap-2 border px-6 py-3 rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm"
              style={{ 
                borderColor: '#10b981',
                color: '#10b981',
                fontFamily: 'var(--font-body-family, Inter, sans-serif)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#D1FAE5';
                e.currentTarget.style.borderColor = '#10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#10b981';
              }}
            >
              Reorder
            </button>
          )}
          </div>
        </section>

        {/* Cancel Order Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
              <h3 
                className="text-xl sm:text-2xl font-light mb-4 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                Cancel Order
              </h3>
              <p className="font-light tracking-wide mb-4" style={{ color: '#666' }}>
                Are you sure you want to cancel order <strong>{order.order_number}</strong>? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-xs font-light tracking-wide mb-2" style={{ color: '#1a1a1a' }}>
                  Reason for Cancellation *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none font-light tracking-wide"
                  style={{ 
                    borderColor: '#E0F5F5',
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-body-family, Inter, sans-serif)'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#E0F5F5'}
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCancelModal(false)
                    setCancelReason('')
                  }}
                  className="px-4 py-2 border rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm"
                  style={{ 
                    borderColor: '#E0F5F5',
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-body-family, Inter, sans-serif)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  disabled={cancelling}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling || !cancelReason.trim()}
                  className="px-4 py-2 text-white rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: '#ef4444',
                    fontFamily: 'var(--font-body-family, Inter, sans-serif)'
                  }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#dc2626')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Track Order Section */}
        {order.tracking_number && (
          <section className="mb-12 sm:mb-16">
            <div className="rounded-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-md" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary)' }} />
                <h3 
                  className="text-xl sm:text-2xl font-light tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Track Your Order
                </h3>
              </div>
            <p className="font-light tracking-wide mb-4" style={{ color: '#666' }}>
              Tracking Number: <span className="font-light" style={{ color: '#1a1a1a' }}>{order.tracking_number}</span>
            </p>
            {order.estimated_delivery && (
              <p className="font-light tracking-wide" style={{ color: '#666' }}>
                Estimated Delivery: <span className="font-light" style={{ color: '#1a1a1a' }}>{formatDate(order.estimated_delivery)}</span>
              </p>
            )}
            </div>
          </section>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 sm:mt-16 md:mt-20">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                You May Also Like
              </h2>
              <p className="text-xs sm:text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                Discover more products from Nefol
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {relatedProducts.map((product: any) => {
                const imageUrl = product.list_image || product.image
                const fullImageUrl = imageUrl && imageUrl.startsWith('http') 
                  ? imageUrl 
                  : imageUrl 
                    ? (() => {
                      const apiBase = getApiBase()
                      return `${apiBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
                    })()
                    : ''

                return (
                  <div
                    key={product.id}
                    onClick={() => window.location.hash = `#/user/product/${product.slug || product.id}`}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group"
                  >
                    {fullImageUrl && (
                      <div className="aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
                        <img
                          src={fullImageUrl}
                          alt={product.title || product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-light text-sm sm:text-base mb-2 line-clamp-2 transition-colors" style={{ color: '#1a1a1a' }}>
                        {product.title || product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs font-light tracking-wide mb-2" style={{ color: '#666' }}>
                          {product.category}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-lg sm:text-xl font-light" style={{ color: 'var(--arctic-blue-primary-dark)' }}>
                            ₹{product.price ? parseFloat(product.price).toLocaleString() : '999'}
                          </p>
                          {product.mrp && parseFloat(product.mrp) > parseFloat(product.price || '0') && (
                            <p className="text-xs font-light line-through" style={{ color: '#999' }}>
                              ₹{parseFloat(product.mrp).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button 
                          className="px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-light tracking-[0.15em] uppercase text-white"
                          style={{ 
                            backgroundColor: 'var(--arctic-blue-primary)',
                            fontFamily: 'var(--font-body-family, Inter, sans-serif)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-8 sm:mt-12 text-center">
              <a
                href="#/user/shop"
                className="inline-block px-8 py-3 rounded-lg transition-colors font-light tracking-[0.15em] uppercase text-sm text-white"
                style={{ 
                  backgroundColor: 'var(--arctic-blue-primary)',
                  fontFamily: 'var(--font-body-family, Inter, sans-serif)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'}
              >
                Shop All Products
              </a>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

