import React, { useState, useEffect } from 'react'
import { Star, Camera, Send, CheckCircle, XCircle } from 'lucide-react'
import apiService from '../services/api'
import { getApiBase } from '../utils/apiBase'

interface ReviewFormProps {
  orderId: string
  productId: number
  productName: string
  customerEmail: string
  customerName: string
  onReviewSubmitted: () => void
}

interface Review {
  id: number
  order_id: string
  product_id: number
  customer_email: string
  customer_name: string
  rating: number
  title: string
  review_text: string
  images: string[]
  is_verified: boolean
  is_featured: boolean
  points_awarded: number
  status: string
  created_at: string
}

export default function ReviewForm({ 
  orderId, 
  productId, 
  productName, 
  customerEmail, 
  customerName, 
  onReviewSubmitted 
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      alert('Maximum 5 images allowed')
      return
    }

    setImages(prev => [...prev, ...files])
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    if (!title.trim() || !reviewText.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images first
      const uploadedImages: string[] = []
      
      for (const image of images) {
        const formData = new FormData()
        formData.append('file', image)
        
        const response = await fetch(`${getApiBase()}/upload`, {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          uploadedImages.push(result.url)
        }
      }

      // Submit review
      await apiService.reviews.createProductReview({
        order_id: orderId,
        product_id: productId,
        customer_email: customerEmail,
        customer_name: customerName,
        rating,
        title,
        review_text: reviewText,
        images: uploadedImages
      })

      setIsSubmitted(true)
      onReviewSubmitted()
      
      // Invalidate review stats cache so new review shows up immediately
      try {
        const { invalidateReviewStatsCache } = await import('../hooks/useProductReviewStats')
        invalidateReviewStatsCache()
      } catch (e) {
        // Ignore if module not available
      }
      
      // Show success message with points
      alert(`Thank you for your review! You've earned 1000 loyalty points!`)
      
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center dark:bg-green-900/20">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
          Review Submitted Successfully!
        </h3>
        <p className="text-green-800 dark:text-green-200">
          Thank you for your review. You've earned 1000 loyalty points!
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
        Review Your Purchase
      </h2>
      <p className="mb-6 text-slate-600 dark:text-slate-400">
        How was your experience with <strong>{productName}</strong>?
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Rating *
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-1 ${
                  star <= rating
                    ? 'text-yellow-400'
                    : 'text-slate-300 hover:text-yellow-300'
                }`}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Review Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            required
          />
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Your Review *
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Tell us about your experience with this product..."
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            required
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Photos (Optional)
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700">
                <Camera className="h-4 w-4" />
                Add Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-500">
                {images.length}/5 photos
              </span>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-20 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Points Info */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Earn 1000 loyalty points for this review!
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              Submitting...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />
              Submit Review
            </div>
          )}
        </button>
      </form>
    </div>
  )
}




