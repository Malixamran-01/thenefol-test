import React, { useState, useEffect } from 'react'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

interface BlogRequestFormProps {
  onClose: () => void
  onSubmitSuccess?: () => void
}

interface BlogRequest {
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email: string
  images: File[]
}

export default function BlogRequestForm({ onClose, onSubmitSuccess }: BlogRequestFormProps) {
  const { user, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState<BlogRequest>({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
    images: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // Auto-fill user information if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        author_name: user.name || '',
        author_email: user.email || ''
      }))
    }
  }, [isAuthenticated, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }))
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      images: prev.images.filter((_, i) => i !== index) 
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreedToTerms) {
      setSubmitStatus('error')
      setErrorMessage('Please agree to the terms and conditions before submitting.')
      return
    }
    
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const apiBase = getApiBase()
      const formDataToSend = new FormData()
      
      // Add text fields
      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content)
      formDataToSend.append('excerpt', formData.excerpt)
      formDataToSend.append('author_name', formData.author_name)
      formDataToSend.append('author_email', formData.author_email)
      
      // Add images
      formData.images.forEach((image, index) => {
        formDataToSend.append(`images`, image)
      })

      // Get authentication token if user is logged in
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${apiBase}/api/blog/request`, {
        method: 'POST',
        headers,
        body: formDataToSend
      })

      if (response.ok) {
        setSubmitStatus('success')
        setTimeout(() => {
          onSubmitSuccess?.()
          onClose()
        }, 2000)
      } else {
        const errorData = await response.json()
        setSubmitStatus('error')
        setErrorMessage(errorData.message || 'Failed to submit blog request')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your blog post request has been submitted successfully. Our team will review it and notify you once it's approved.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You'll receive an email confirmation shortly.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Submit Blog Post Request</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Author Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                name="author_name"
                value={formData.author_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your full name"
                required
                disabled={isSubmitting || (isAuthenticated && !!user?.name)}
                title={isAuthenticated && user?.name ? "Your account name will be used" : ""}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="author_email"
                value={formData.author_email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="your.email@domain.com"
                required
                disabled={isSubmitting || (isAuthenticated && !!user?.email)}
                title={isAuthenticated && user?.email ? "Your account email will be used" : ""}
              />
            </div>
          </div>

          {/* Blog Post Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blog Post Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter an engaging title for your blog post"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Excerpt *
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Write a brief summary of your blog post (2-3 sentences)"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blog Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Write your full blog post content here..."
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              You can use basic HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt; for formatting.
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Images (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop images here, or click to select
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={isSubmitting}
              />
              <label
                htmlFor="image-upload"
                className="inline-block px-4 py-2 text-white rounded-lg cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                Choose Images
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, GIF. Max 5MB per image.
              </p>
            </div>

            {/* Display uploaded images */}
            {formData.images.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="terms-checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <label htmlFor="terms-checkbox" className="text-sm text-gray-700">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                terms and conditions
              </button>{' '}
              for blog post submissions
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: 'rgb(75,151,201)' }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              disabled={isSubmitting || !agreedToTerms}
              title={!agreedToTerms ? "Please agree to terms and conditions" : ""}
            >
              {isSubmitting ? (
                <>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Blog Submission Terms</h3>
              <button 
                onClick={() => setShowTermsModal(false)} 
                className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="px-4 py-4 overflow-y-auto overflow-x-hidden flex-1">
              <div className="space-y-3 text-gray-700 break-words">
                <p className="text-xs text-gray-500 italic mb-3">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
                
                <section className="mb-3">
                  <h4 className="font-semibold text-sm mb-1.5 text-gray-900">
                    1. Content Guidelines
                  </h4>
                  <p className="text-xs leading-relaxed mb-1.5 text-gray-700">
                    By submitting a blog post, you agree your content must be appropriate for all audiences. We strictly prohibit:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-700">
                    <li>NSFW content (explicit, sexual, or graphic material)</li>
                    <li>Hate speech, discrimination, or harassment</li>
                    <li>Violence, threats, or harmful activities</li>
                    <li>Spam, misleading info, or false claims</li>
                    <li>Copyright infringement or plagiarism</li>
                    <li>Personal attacks or defamation</li>
                  </ul>
                </section>

                <section className="mb-3">
                  <h4 className="font-semibold text-sm mb-1.5 text-gray-900">
                    2. Content Rights
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-700">
                    You retain ownership but grant NEFOL a non-exclusive license to publish, display, modify, and distribute your content.
                  </p>
                </section>

                <section className="mb-3">
                  <h4 className="font-semibold text-sm mb-1.5 text-gray-900">
                    3. Review Process
                  </h4>
                  <p className="text-xs leading-relaxed mb-1.5 text-gray-700">
                    All submissions are reviewed. We reserve the right to:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-700">
                    <li>Approve or reject any submission</li>
                    <li>Request edits before publication</li>
                    <li>Edit for grammar/formatting</li>
                  </ul>
                </section>

                <section className="mb-3">
                  <h4 className="font-semibold text-sm mb-1.5 text-gray-900">
                    4. Content Removal
                  </h4>
                  <p className="text-xs leading-relaxed mb-1.5 text-gray-700">
                    We can remove, unpublish, or delete any post at any time for:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-700">
                    <li>Terms violations</li>
                    <li>User complaints or legal requirements</li>
                    <li>Brand misalignment or technical reasons</li>
                  </ul>
                </section>

                <section className="mb-3">
                  <h4 className="font-semibold text-sm mb-1.5 text-gray-900">
                    5. Liability
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-700">
                    You're responsible for your content's accuracy and legality. NEFOL isn't liable for claims arising from your post.
                  </p>
                </section>

                <section className="mb-3">
                  <h4 className="font-semibold text-sm mb-1.5 text-gray-900">
                    6. User Conduct
                  </h4>
                  <p className="text-xs leading-relaxed mb-1.5 text-gray-700">
                    You agree not to:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-700">
                    <li>Promote competing services</li>
                    <li>Upload malicious code or viruses</li>
                    <li>Impersonate others</li>
                  </ul>
                </section>

                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-900 font-medium leading-relaxed">
                    By checking the agreement box, you acknowledge you've read and agree to these Terms and Conditions.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setAgreedToTerms(true)
                  setShowTermsModal(false)
                }}
                className="px-4 py-2 text-sm text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
