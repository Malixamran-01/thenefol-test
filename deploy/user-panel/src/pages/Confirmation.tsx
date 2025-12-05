import { useEffect, useState } from 'react'
import { CheckCircle, Package, Truck, Clock, FileText, MapPin, CreditCard, Calendar, RefreshCw } from 'lucide-react'
import { api } from '../services/api'
import { getApiBase } from '../utils/apiBase'

interface OrderDetails {
  order_number: string
  invoice_number?: string
  shipment_id?: string
  customer_name: string
  customer_email: string
  id?: number
  shipping_address: {
    address: string
    city: string
    state: string
    zip: string
    phone: string
  }
  items: Array<{
    title: string
    price: string
    quantity: number
    slug: string
  }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: string
  payment_method: string
  payment_type: string
  created_at: string
  estimated_delivery: string
}

interface TrackingData {
  tracking_data?: {
    awb_code?: string
    courier_name?: string
    shipment_status?: string
    shipment_track?: Array<{
      current_status?: string
      current_status_code?: string
      current_status_location?: string
      current_status_time?: string
      current_status_description?: string
    }>
    shipment_track_activities?: Array<{
      date?: string
      activity?: string
      location?: string
      status?: string
    }>
    edd?: {
      date?: string
    }
  }
  meta?: {
    code?: number
    message?: string
  }
}

export default function Confirmation() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [shipmentInfo, setShipmentInfo] = useState<any>(null)

  const u = new URL(window.location.href)
  const qs = new URLSearchParams(u.hash.split('?')[1] || '')
  const orderNumber = qs.get('order')

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails(orderNumber)
    } else {
      setLoading(false)
    }
  }, [orderNumber])

  useEffect(() => {
    if (orderDetails?.id) {
      fetchShipmentInfo()
    }
  }, [orderDetails?.id])

  useEffect(() => {
    // Auto-refresh tracking every 30 seconds if shipment exists
    if (shipmentInfo?.awb_code && orderDetails?.id) {
      // Initial fetch
      fetchTrackingData()
      
      const interval = setInterval(() => {
        fetchTrackingData()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [shipmentInfo?.awb_code, orderDetails?.id])

  const fetchOrderDetails = async (orderNum: string) => {
    try {
      const data = await api.orders.getById(orderNum)
      setOrderDetails(data as any)
    } catch (err: any) {
      console.error('Failed to fetch order details:', err)
      setError(err.message || 'Failed to fetch order details. Please ensure you are logged in.')
    } finally {
      setLoading(false)
    }
  }

  const fetchShipmentInfo = async () => {
    if (!orderDetails?.id) return
    
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Fetch shipment info
      const shipmentRes = await fetch(`${apiBase}/api/shiprocket_shipments?order_id=${orderDetails.id}`, {
        headers
      })
      
      if (shipmentRes.ok) {
        const shipments = await shipmentRes.json()
        const shipmentList = Array.isArray(shipments) ? shipments : (shipments.data || [])
        if (shipmentList.length > 0) {
          const latestShipment = shipmentList.find((s: any) => s.order_id === orderDetails.id) || shipmentList[0]
          setShipmentInfo(latestShipment)
          
          // Fetch tracking data if AWB code exists
          if (latestShipment.awb_code && orderDetails?.id) {
            fetchTrackingData()
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch shipment info:', err)
    }
  }

  const fetchTrackingData = async (awbCode?: string) => {
    if (!orderDetails?.id) return
    
    try {
      setTrackingLoading(true)
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const trackingRes = await fetch(`${apiBase}/api/shiprocket/orders/${orderDetails.id}/track`, {
        headers
      })
      
      if (trackingRes.ok) {
        const data = await trackingRes.json()
        setTrackingData(data)
      } else {
        // If tracking fails, try to get basic shipment info
        console.log('Tracking not available yet, will retry when shipment is ready')
      }
    } catch (err) {
      console.error('Failed to fetch tracking data:', err)
    } finally {
      setTrackingLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />
      case 'delivered':
        return <Package className="h-5 w-5 text-green-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Order Confirmed'
      case 'shipped':
        return 'Shipped'
      case 'delivered':
        return 'Delivered'
      default:
        return 'Processing'
    }
  }

  const getPaymentMethodName = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cod':
        return 'Cash on Delivery (COD)'
      case 'razorpay':
        return 'Razorpay Secure (UPI, Cards, Int\'l Cards, Wallets)'
      case 'coins':
        return 'Coins Payment'
      default:
        return method || 'Not specified'
    }
  }

  const getPaymentTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'cod':
        return 'Cash on Delivery'
      case 'prepaid':
        return 'Prepaid Payment'
      case 'postpaid':
        return 'Postpaid Payment'
      default:
        return type || 'Not specified'
    }
  }

  if (loading) {
    return (
      <main className="py-10 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading order details...</p>
        </div>
      </main>
    )
  }

  if (error || !orderDetails) {
    return (
      <main className="py-10 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl font-bold mb-2 dark:text-slate-100">Order Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400">{error || 'Unable to load order details'}</p>
          <a href="#/user/shop" className="inline-block mt-6 rounded bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">Continue Shopping</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Amazon-style Header Section */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-normal dark:text-slate-100 mb-1">
                Thank you, {orderDetails.customer_name.split(' ')[0]}!
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 mb-4">
                Your order has been confirmed
              </p>
              
              {/* Order Number Box - Amazon Style */}
              <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-600 rounded p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Order number: </span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{orderDetails.order_number}</span>
                  </div>
                  {orderDetails.invoice_number && (
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Invoice: </span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{orderDetails.invoice_number}</span>
                    </div>
                  )}
                  {orderDetails.shipment_id && (
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Shipment ID: </span>
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{orderDetails.shipment_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estimated Delivery Box - Amazon Style with Real-time Tracking */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Estimated delivery date
                      </p>
                      <p className="text-base font-medium dark:text-slate-100">
                        {trackingData?.tracking_data?.edd?.date 
                          ? new Date(trackingData.tracking_data.edd.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : orderDetails.estimated_delivery || 'Will be updated soon'}
                      </p>
                      {trackingData?.tracking_data?.courier_name && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Courier: {trackingData.tracking_data.courier_name}
                        </p>
                      )}
                      {shipmentInfo?.awb_code && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          AWB: {shipmentInfo.awb_code}
                        </p>
                      )}
                    </div>
                  </div>
                  {shipmentInfo?.awb_code && (
                    <button
                      onClick={() => fetchTrackingData()}
                      disabled={trackingLoading}
                      className="flex-shrink-0 p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                      title="Refresh tracking"
                    >
                      <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Real-time Tracking Timeline */}
              {trackingData?.tracking_data?.shipment_track_activities && trackingData.tracking_data.shipment_track_activities.length > 0 && (
                <div className="mt-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium dark:text-slate-100 mb-3">Tracking Updates</h3>
                  <div className="space-y-3">
                    {trackingData.tracking_data.shipment_track_activities
                      .slice()
                      .reverse()
                      .map((activity: any, index: number) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              index === 0 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                            {trackingData.tracking_data?.shipment_track_activities && index < trackingData.tracking_data.shipment_track_activities.length - 1 && (
                              <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600 ml-0.5" />
                            )}
                          </div>
                          <div className="flex-1 pb-3 last:pb-0">
                            <p className="text-sm font-medium dark:text-slate-100">
                              {activity.status || activity.activity || 'Update'}
                            </p>
                            {activity.location && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                {activity.location}
                              </p>
                            )}
                            {activity.date && (
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                {new Date(activity.date).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Current Status */}
              {trackingData?.tracking_data?.shipment_track?.[0] && (
                <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-xs font-medium text-green-900 dark:text-green-100">
                        Current Status
                      </p>
                      <p className="text-sm font-medium dark:text-slate-100 mt-0.5">
                        {trackingData.tracking_data.shipment_track[0].current_status || trackingData.tracking_data.shipment_status || 'In Transit'}
                      </p>
                      {trackingData.tracking_data.shipment_track[0].current_status_location && (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                          {trackingData.tracking_data.shipment_track[0].current_status_location}
                        </p>
                      )}
                      {trackingData.tracking_data.shipment_track[0].current_status_time && (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                          {new Date(trackingData.tracking_data.shipment_track[0].current_status_time).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid - Amazon Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Order Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Items Section */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-medium dark:text-slate-100 mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
                Order Items
              </h2>
              <div className="space-y-6">
                {orderDetails.items.map((item: any, index: number) => {
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
                  <div key={index} className="flex gap-4 pb-6 border-b border-gray-200 dark:border-slate-700 last:border-0 last:pb-0">
                    {/* Product Image */}
                    {fullImageUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={fullImageUrl}
                          alt={item.title || 'Product'}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-base font-medium dark:text-slate-100 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Quantity: {item.quantity}
                      </p>
                      {item.csvProduct?.['SKU'] && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
                          SKU: {item.csvProduct['SKU']}
                        </p>
                      )}
                      
                      {/* Product Details Section */}
                      {item.csvProduct && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                            View Product Details
                          </summary>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-slate-900/50 p-3 rounded">
                            {item.csvProduct['Brand Name'] && (
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">Brand: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Brand Name']}</span>
                              </div>
                            )}
                            {item.csvProduct['HSN Code'] && (
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">HSN Code: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['HSN Code']}</span>
                              </div>
                            )}
                            {item.csvProduct['Net Quantity (Content)'] && (
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">Net Quantity: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Net Quantity (Content)']}</span>
                              </div>
                            )}
                            {item.csvProduct['Net Weight (Product Only)'] && (
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">Net Weight: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Net Weight (Product Only)']}</span>
                              </div>
                            )}
                            {item.csvProduct['Country of Origin'] && (
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">Country of Origin: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Country of Origin']}</span>
                              </div>
                            )}
                            {item.csvProduct['GST %'] && (
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">GST: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['GST %']}%</span>
                              </div>
                            )}
                            {item.csvProduct['Manufacturer / Packer / Importer'] && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-slate-600 dark:text-slate-400">Manufacturer: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Manufacturer / Packer / Importer']}</span>
                              </div>
                            )}
                            {item.csvProduct['Key Ingredients'] && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-slate-600 dark:text-slate-400">Key Ingredients: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Key Ingredients']}</span>
                              </div>
                            )}
                            {item.csvProduct['Package Content Details'] && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-slate-600 dark:text-slate-400">Package Contents: </span>
                                <span className="dark:text-slate-100">{item.csvProduct['Package Content Details']}</span>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-medium dark:text-slate-100">
                        ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>

            {/* Shipping Address Section */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-medium dark:text-slate-100 mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
                Shipping Address
              </h2>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">{orderDetails.customer_name}</p>
                  <p>{orderDetails.shipping_address.address}</p>
                  <p>{orderDetails.shipping_address.city}, {orderDetails.shipping_address.state} {orderDetails.shipping_address.zip}</p>
                  <p className="mt-1">Phone: {orderDetails.shipping_address.phone}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-medium dark:text-slate-100 mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
                Payment Method
              </h2>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Payment Method</p>
                    <p className="text-sm font-medium dark:text-slate-100">
                      {getPaymentMethodName(orderDetails.payment_method)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Payment Type</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {getPaymentTypeName(orderDetails.payment_type)}
                    </p>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Order Date</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(orderDetails.created_at).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 sticky top-4">
              <h2 className="text-lg font-medium dark:text-slate-100 mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
                Order Summary
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Items:</span>
                  <span className="dark:text-slate-100">₹{Number(orderDetails.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Shipping:</span>
                  <span className="dark:text-slate-100">₹{Number(orderDetails.shipping || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">GST:</span>
                  <span className="dark:text-slate-100">₹{Number(orderDetails.tax || 0).toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-base font-medium dark:text-slate-100">Order Total:</span>
                    <span className="text-base font-medium dark:text-slate-100">₹{Number(orderDetails.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <a 
                  href="#/user/shop" 
                  className="block w-full text-center rounded-md bg-yellow-400 hover:bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 transition-colors"
                >
                  Continue Shopping
                </a>
                <button 
                  onClick={() => {
                    const apiHost = (import.meta as any).env?.VITE_BACKEND_HOST || (import.meta as any).env?.VITE_API_HOST || window.location.hostname
                    const apiPort = (import.meta as any).env?.VITE_BACKEND_PORT || (import.meta as any).env?.VITE_API_PORT || '4000'
                    const apiBase = getApiBase()
                    window.open(`${apiBase}/api/invoices/${orderDetails.order_number}/download`, '_blank')
                  }}
                  className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Print Invoice
                </button>
              </div>

              {/* Status Info */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  {getStatusIcon(orderDetails.status)}
                  <span className="text-sm font-medium dark:text-slate-100">{getStatusText(orderDetails.status)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Cards */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Invoice Information */}
          {orderDetails.invoice_number && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Invoice Generated</h3>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Sent to your email
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shiprocket Integration */}
          {orderDetails.shipment_id && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">Shiprocket Integration</h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Processing for delivery
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Updates */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Delivery Updates</h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  SMS & email notifications enabled
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


