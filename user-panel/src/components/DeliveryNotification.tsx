import React, { useState, useEffect } from 'react'
import { Package, Star, X, Gift } from 'lucide-react'

interface DeliveryNotificationProps {
  orderNumber: string
  customerName: string
  customerEmail: string
  onReviewSubmit?: (review: any) => void
}

export default function DeliveryNotification({ 
  orderNumber, 
  customerName, 
  customerEmail,
  onReviewSubmit 
}: DeliveryNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [review, setReview] = useState({
    rating: 5,
    comment: '',
    images: [] as File[]
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Show notification after a delay (simulating delivery)
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Submit review to backend
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_email: customerEmail,
          rating: review.rating,
          comment: review.comment,
          points_awarded: 1000
        })
      })

      if (response.ok) {
        // Award points to customer
        await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/loyalty/award-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_email: customerEmail,
            points: 1000,
            reason: 'Product Review',
            order_number: orderNumber
          })
        })

        // Send email notification about points
        await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            to: customerEmail,
            subject: '🎉 You earned 1000 points for your review!',
            template: 'review-points',
            data: {
              customer_name: customerName,
              points: 1000,
              order_number: orderNumber
            }
          })
        })

        alert('Thank you for your review! You earned 1000 points!')
        setIsVisible(false)
        setShowReviewForm(false)
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setReview(prev => ({ ...prev, images: [...prev.images, ...files] }))
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        {!showReviewForm ? (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2 dark:text-slate-100">Order Delivered! 🎉</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Hi {customerName}, your order <span className="font-mono text-blue-600">{orderNumber}</span> has been delivered successfully.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-900 dark:text-yellow-100">Special Offer!</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Review your order and earn <span className="font-bold">1000 points</span> worth ₹100!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewForm(true)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Star className="h-4 w-4" />
                Write Review & Earn Points
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold dark:text-slate-100">Rate Your Experience</h3>
            
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReview(prev => ({ ...prev, rating: star }))}
                    className={`p-1 ${star <= review.rating ? 'text-yellow-400' : 'text-slate-300'}`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Your Review
              </label>
              <textarea
                value={review.comment}
                onChange={(e) => setReview(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                rows={3}
                placeholder="Tell us about your experience..."
                required
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Upload Photos (Optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                <Gift className="h-4 w-4 inline mr-1" />
                You'll earn <span className="font-bold">1000 points</span> for this review!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}