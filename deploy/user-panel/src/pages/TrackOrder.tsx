import { FormEvent, useState } from 'react'
import { api } from '../services/api'
import { MapPin, Package, CheckCircle, Edit, Eye, X } from 'lucide-react'

type OrderStatus =
  | 'created'
  | 'ordered'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled'

const statusSteps: { key: OrderStatus; label: string }[] = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out-for-delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' }
]

function getEstimatedDeliveryDate(order: any): string {
  if (order.estimated_delivery) {
    const date = new Date(order.estimated_delivery)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `Arriving ${days[date.getDay()]}`
  }
  
  // Default: calculate 3-5 days from order date
  const orderDate = new Date(order.created_at)
  const estimatedDate = new Date(orderDate)
  estimatedDate.setDate(estimatedDate.getDate() + 4) // Default to 4 days
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `Arriving ${days[estimatedDate.getDay()]}`
}

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<any>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!orderNumber.trim()) {
      setError('Please enter your order number.')
      return
    }
    try {
      setLoading(true)
      setError(null)

      const response = await api.orders.getById(orderNumber.trim())

      if (email && response.customer_email && response.customer_email !== email.trim()) {
        setError('Email does not match our records for this order.')
        setOrder(null)
        return
      }

      setOrder(response)
    } catch (err: any) {
      console.error('Failed to track order:', err)
      setError(err?.message || 'Order not found. Please verify the details and try again.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIndex = (status: string): number => {
    const normalized = status.toLowerCase().replace(/\s+/g, '-')
    if (normalized === 'created' || normalized === 'ordered') return 0
    if (normalized === 'shipped') return 1
    if (normalized === 'out-for-delivery' || normalized === 'out for delivery') return 2
    if (normalized === 'delivered' || normalized === 'completed') return 3
    return 0
  }

  const currentStatusIndex = order ? getStatusIndex(order.status) : -1

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Search Form */}
        {!order && (
          <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm mb-8">
            <header className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
              <p className="mt-2 text-sm text-gray-600">
                Enter your order number to track your package
              </p>
            </header>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={event => setOrderNumber(event.target.value)}
                  placeholder="e.g. NEFOL-20251027-1234"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="For verification"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Fetching status…' : 'Track Order'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>
        )}

        {/* Order Tracking Display */}
        {order && (
          <div className="space-y-6">
            {/* Arrival Date Header */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                {getEstimatedDeliveryDate(order)}
              </h2>
            </div>

            {/* Product Information */}
            {order.items && order.items.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-medium text-gray-900 leading-relaxed">
                  {(() => {
                    const item = order.items[0]
                    let productName = item.name || item.title || 'Product'
                    
                    // Try to get full product description from details
                    if (item.details) {
                      let details = item.details
                      if (typeof details === 'string') {
                        try {
                          details = JSON.parse(details)
                        } catch {
                          // If it's not JSON, use it as is
                          if (details.length > 50) {
                            productName = details
                          }
                        }
                      }
                      
                      if (typeof details === 'object') {
                        const subtitle = details.subtitle || details['Subtitle / Tagline']
                        const longDesc = details.longDescription || details['Product Description (Long)']
                        if (longDesc) {
                          productName = longDesc
                        } else if (subtitle) {
                          productName = `${productName} | ${subtitle}`
                        }
                      }
                    }
                    
                    return productName
                  })()}
                </h3>
                {order.items.length > 1 && (
                  <p className="text-sm text-gray-500 mt-2">
                    + {order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Order Status Timeline */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-300">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                  />
                </div>
                
                {/* Status Steps */}
                <div className="relative flex items-center justify-between">
                  {statusSteps.map((step, index) => {
                    const isCompleted = currentStatusIndex > index
                    const isCurrent = currentStatusIndex === index
                    
                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        {/* Status Circle */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition ${
                            isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : isCurrent
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : isCurrent ? (
                            <Package className="w-6 h-6" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                          )}
                        </div>
                        
                        {/* Status Label */}
                        <p className={`mt-2 text-xs font-medium text-center ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Delivery Info Section */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Info</h3>
              
              <button className="mb-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Edit className="w-4 h-4" />
                Update delivery instructions
              </button>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {order.shipping_address ? (
                    <>
                      <p className="font-semibold text-gray-900">
                        {order.shipping_address.firstName || order.shipping_address.first_name || order.customer_name || ''} {order.shipping_address.lastName || order.shipping_address.last_name || ''}
                      </p>
                      {order.shipping_address.address && (
                        <p>{order.shipping_address.address}</p>
                      )}
                      {order.shipping_address.apartment && (
                        <p>{order.shipping_address.apartment}</p>
                      )}
                      {order.shipping_address.street && (
                        <p>{order.shipping_address.street}</p>
                      )}
                      {order.shipping_address.area && (
                        <p>{order.shipping_address.area}</p>
                      )}
                      {order.shipping_address.landmark && (
                        <p>{order.shipping_address.landmark}</p>
                      )}
                      <p>
                        {(order.shipping_address.city || '').toUpperCase()}
                        {order.shipping_address.city && order.shipping_address.state && ', '}
                        {(order.shipping_address.state || '').toUpperCase()} {order.shipping_address.zip || ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Address not available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Info Section */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Info</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.hash = `#/user/order/${order.order_number}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <Eye className="w-4 h-4" />
                  View order details
                </button>
                
                {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => window.location.hash = `#/user/cancel-order/${order.order_number}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel order
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}


