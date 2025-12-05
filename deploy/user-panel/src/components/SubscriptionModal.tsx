import React, { useState } from 'react'
import { X } from 'lucide-react'
import { whatsappAPI } from '../services/api'
import PhoneInput from './PhoneInput'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  image?: string
  logo?: string
  logoName?: string
  heading?: string
  description?: string
  footer?: string
}

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  image = '/IMAGES/BANNER (1).webp',
  logo = '',
  logoName = 'NEFÖL',
  heading = 'Join The Nefol Circle',
  description = 'Stay ahead with exclusive style drops, member-only offers, and insider fashion updates.',
  footer = 'By subscribing, you agree to receive WhatsApp messages from Nefol.'
}: SubscriptionModalProps) {
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  // Format phone number: remove spaces, dashes, parentheses, and ensure only digits
  const formatPhoneNumber = (value: string): string => {
    return value.replace(/[\s+\-()]/g, '')
  }

  // Validate phone number format
  const validatePhoneNumber = (number: string): boolean => {
    const digitsOnly = formatPhoneNumber(number)
    // Phone number should be 6-15 digits (excluding country code)
    return /^\d{6,15}$/.test(digitsOnly)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber) {
      setError('Please enter a phone number')
      return
    }

    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (6-15 digits)')
      return
    }

    setIsSubmitting(true)
    setError('')
    
    try {
      // Format phone number consistently: country code + number (no spaces)
      const formattedPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`
      
      // Send the WhatsApp number to the backend
      const result = await whatsappAPI.subscribe(formattedPhone, undefined, 'homepage_modal')
      
      // Check if subscription was successful (result might be wrapped in data field or have subscribed field)
      const isSuccess = result?.subscribed || result?.data?.subscribed || result?.message
      
      if (isSuccess) {
        // Close modal after successful subscription
        onClose()
        // Clear the inputs
        setPhoneNumber('')
        setCountryCode('+91')
        setError('')
      } else {
        console.error('Subscription failed:', result)
        setError('Failed to subscribe. Please try again.')
      }
    } catch (error: any) {
      console.error('Subscription failed:', error)
      let errorMessage = error?.message || 'Failed to subscribe. Please try again.'
      
      // Check if error is about duplicate or already subscribed (backend returns 409 for duplicates)
      const errorLower = errorMessage.toLowerCase()
      if (errorLower.includes('already') || 
          errorLower.includes('duplicate') || 
          errorLower.includes('subscribed') || 
          errorLower.includes('exists') ||
          error?.response?.status === 409 ||
          error?.status === 409) {
        setError('This number is already subscribed. Please use a different number.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Modal centered */}
      <div 
        className={`relative w-full max-w-4xl bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-lg"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Mobile Back Button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 left-4 z-50 w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-lg"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col lg:flex-row min-h-[400px] lg:min-h-[500px]">
            {/* Left Section - Product Image */}
            <div className="lg:w-1/2 relative overflow-hidden h-64 lg:h-auto" style={{ backgroundColor: '#F4F9F9' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100"></div>
              
              {/* Product Image */}
              <div className="relative h-full flex items-center justify-center p-4 lg:p-8">
                <div className="relative z-10">
                  {/* Main Product Image */}
                  <div className="relative mb-4 lg:mb-8">
                    <img 
                      src={image} 
                      alt="Nefol Product"
                      className="w-full max-w-md h-auto object-contain mx-auto"
                    />
                  </div>

                  {/* Decorative Elements - Hidden on mobile */}
                  <div className="hidden lg:block absolute top-20 left-8 opacity-20">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                      <span className="text-2xl">🌿</span>
                    </div>
                  </div>
                  
                  <div className="hidden lg:block absolute top-32 right-8 opacity-20">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <span className="text-xl">🦋</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Subscription Form */}
            <div className="lg:w-1/2 p-4 lg:p-8 flex flex-col justify-center" style={{ backgroundColor: '#1B4965' }}>
              <div className="max-w-md mx-auto w-full">
                {/* Logo */}
                <div className="flex items-center mb-4 lg:mb-6">
                  {logo ? (
                    <img 
                      src={logo} 
                      alt={logoName}
                      className="h-6 lg:h-8 w-auto mr-2 lg:mr-3 object-contain"
                    />
                  ) : (
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-500 rounded-full flex items-center justify-center mr-2 lg:mr-3">
                      <span className="text-white text-xs lg:text-sm font-bold">{logoName.charAt(0)}</span>
                    </div>
                  )}
                  <span className="text-xl lg:text-2xl font-bold text-white">{logoName}</span>
                </div>

                {/* Heading */}
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 lg:mb-4">
                  {heading}
                </h2>

                {/* Description */}
                <p className="text-white/90 mb-6 lg:mb-8 text-base lg:text-lg">
                  {description}
                </p>

                {/* Subscription Form */}
                <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-4">
                  <div>
                    <PhoneInput
                      value={phoneNumber}
                      onChange={(value) => {
                        setPhoneNumber(value)
                        setError('')
                      }}
                      onCountryCodeChange={(code) => {
                        setCountryCode(code)
                        setError('')
                      }}
                      defaultCountry={countryCode}
                      placeholder="Enter phone number"
                      required
                      showLabel
                      label="Phone Number"
                      error={error}
                      className="mb-3"
                      inputClassName="text-gray-900 text-sm lg:text-base"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !phoneNumber || !!error}
                    className="w-full bg-white text-gray-900 py-2.5 lg:py-3 px-4 lg:px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                  >
                    {isSubmitting ? 'Subscribing...' : 'Subscribe Now'}
                  </button>
                </form>

                {/* Additional Info */}
                <p className="text-white/70 text-xs lg:text-sm mt-4 lg:mt-6 text-center">
                  {footer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
