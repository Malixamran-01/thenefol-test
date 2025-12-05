import React, { useState, useEffect } from 'react'
import { X, AlertCircle, Package, ArrowLeft, CheckCircle } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

interface CancelOrderProps {
  orderNumber?: string
}

export default function CancelOrder({ orderNumber: propOrderNumber }: CancelOrderProps) {
  const { isAuthenticated } = useAuth()
  const [orderNumber, setOrderNumber] = useState(propOrderNumber || '')
  const [reason, setReason] = useState('')
  const [cancellationType, setCancellationType] = useState<'full' | 'partial'>('full')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Get order number from URL if not provided
    if (!orderNumber) {
      const hash = window.location.hash
      const match = hash.match(/cancel-order\/(.+)/)
      if (match && match[1]) {
        setOrderNumber(decodeURIComponent(match[1]))
      }
    }
  }, [orderNumber])

  useEffect(() => {
    if (orderNumber && isAuthenticated) {
      fetchOrderDetails()
    }
  }, [orderNumber, isAuthenticated])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const orderData = await api.orders.getById(orderNumber)
      setOrder(orderData)
      
      // Check if order can be cancelled
      if (orderData.status !== 'delivered' && orderData.status !== 'completed') {
        setError('Only delivered orders can be cancelled')
      }
      
      // Check if within 5 days
      const deliveredAt = (orderData as any).delivered_at || (orderData as any).updated_at
      if (deliveredAt) {
        const deliveryDate = new Date(deliveredAt)
        const now = new Date()
        const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceDelivery > 5) {
          setError('Cancellation can only be requested within 5 days of delivery')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details')
    } finally {
      setLoading(false)
    }
  }

  const handleItemToggle = (itemIndex: number) => {
    if (cancellationType === 'full') return
    
    setSelectedItems(prev => 
      prev.includes(itemIndex)
        ? prev.filter(i => i !== itemIndex)
        : [...prev, itemIndex]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation')
      return
    }

    if (cancellationType === 'partial' && selectedItems.length === 0) {
      setError('Please select at least one item to cancel')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const itemsToCancel = cancellationType === 'partial' && order?.items
        ? selectedItems.map(index => order.items[index])
        : undefined

      await api.cancellations.requestCancellation({
        order_number: orderNumber,
        reason: reason.trim(),
        cancellation_type: cancellationType,
        items_to_cancel: itemsToCancel
      })

      setSuccess(true)
      setTimeout(() => {
        window.location.hash = `#/user/order/${orderNumber}`
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit cancellation request')
    } finally {
      setSubmitting(false)
    }
  }

  const cancellationReasons = [
    'Changed my mind',
    'Product not as described',
    'Damaged product',
    'Wrong product received',
    'Delivery delay',
    'Better price available',
    'No longer needed',
    'Other'
  ]

  if (success) {
    return (
      <main className="py-10 dark:bg-slate-900 min-h-screen">
        <div className="mx-auto max-w-2xl px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Cancellation Request Submitted
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your cancellation request has been submitted successfully. Our team will review it and process your refund within 5-7 business days.
            </p>
            <button
              onClick={() => window.location.hash = `#/user/order/${orderNumber}`}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Order Details
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-2xl px-4">
        <button
          onClick={() => window.location.hash = `#/user/order/${orderNumber || ''}`}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order Details
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Cancel Order
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Order #{orderNumber || 'Loading...'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">Loading order details...</p>
            </div>
          ) : order ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cancellation Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  What would you like to cancel?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-4 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <input
                      type="radio"
                      name="cancellation_type"
                      value="full"
                      checked={cancellationType === 'full'}
                      onChange={() => {
                        setCancellationType('full')
                        setSelectedItems([])
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Full Order</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Cancel all items in this order</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <input
                      type="radio"
                      name="cancellation_type"
                      value="partial"
                      checked={cancellationType === 'partial'}
                      onChange={() => setCancellationType('partial')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Partial Order</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Cancel specific items</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Item Selection for Partial */}
              {cancellationType === 'partial' && order.items && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Select items to cancel:
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {order.items.map((item: any, index: number) => (
                      <label
                        key={index}
                        className="flex items-center gap-3 p-3 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(index)}
                          onChange={() => handleItemToggle(index)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {item.name || item.title || 'Product'}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Quantity: {item.quantity || 1} × ₹{parseFloat(item.price || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-3"
                  required
                >
                  <option value="">Select a reason</option>
                  {cancellationReasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {reason === 'Other' && (
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide more details..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    rows={3}
                    required
                  />
                )}
              </div>

              {/* Refund Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Refund Information</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Refund will be processed within 5-7 business days</li>
                  <li>• Refund will be credited to your original payment method</li>
                  <li>• You will receive an email confirmation once the refund is processed</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => window.location.hash = `#/user/order/${orderNumber}`}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Cancellation Request'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">Order not found</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

