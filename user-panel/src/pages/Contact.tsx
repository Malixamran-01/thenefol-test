import React, { useState } from 'react'
import { Mail, MessageCircle, ArrowLeft } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import PhoneInput from '../components/PhoneInput'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [countryCode, setCountryCode] = useState('+91')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/contact/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSuccess(true)
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: rgb(75,151,201);
          --arctic-blue-primary-hover: rgb(60,120,160);
          --arctic-blue-primary-dark: rgb(50,100,140);
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
        
        <div className="mb-8 sm:mb-12 text-center">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            CONTACT US
          </h1>
          <p 
            className="mx-auto max-w-3xl text-sm sm:text-base font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Have a question or comment? Use the form below to send us a message, or contact us by mail.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10 border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <h2 
              className="text-xl sm:text-2xl md:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Get In Touch!
            </h2>
            <p 
              className="mb-6 font-light tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              We'd love to hear from you - please use the form to send us your message or ideas. 
              Or simply pop in for a cup of fresh tea and a cookie:
            </p>
            
            {success && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-primary)', borderWidth: '1px' }}>
                <p style={{ color: 'var(--arctic-blue-primary-dark)' }}>Message sent successfully! We'll get back to you soon.</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: '1px' }}>
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  className="mb-2 block text-sm font-light tracking-wide" 
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }} 
                  htmlFor="name"
                >
                  Name
                </label>
                <input 
                  id="name" 
                  className="h-12 w-full rounded-lg border px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200" 
                  style={{ 
                    borderColor: '#E5E7EB',
                    color: '#111827'
                  }}
                  required
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--arctic-blue-light)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  onCountryCodeChange={setCountryCode}
                  defaultCountry={countryCode}
                  placeholder="Enter your phone number"
                  showLabel
                  label="Phone number"
                />
              </div>
              <div>
                <label 
                  className="mb-2 block text-sm font-light tracking-wide" 
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }} 
                  htmlFor="email"
                >
                  Email *
                </label>
                <input 
                  id="email" 
                  type="email" 
                  className="h-12 w-full rounded-lg border px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200" 
                  style={{ 
                    borderColor: '#E5E7EB',
                    color: '#111827'
                  }}
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--arctic-blue-light)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div>
                <label 
                  className="mb-2 block text-sm font-light tracking-wide" 
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }} 
                  htmlFor="message"
                >
                  Comment *
                </label>
                <textarea 
                  id="message" 
                  rows={6} 
                  className="w-full rounded-lg border p-4 bg-white text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200" 
                  style={{ 
                    borderColor: '#E5E7EB',
                    color: '#111827'
                  }}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--arctic-blue-light)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 text-white font-light transition-all duration-300 text-sm tracking-wide uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 rounded-lg"
                style={{ backgroundColor: 'var(--arctic-blue-primary)' }}
              >
                {loading ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10 border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <h2 
              className="text-xl sm:text-2xl md:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Contact Information
            </h2>
            
            <div className="space-y-8">
              {/* Contact Details */}
              <div>
                <h3 
                  className="mb-4 text-lg font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Contact Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                      <Mail className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    </div>
                    <div>
                      <p 
                        className="font-light tracking-wide"
                        style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                      >
                        Email
                      </p>
                      <a 
                        href="mailto:support@thenefol.com" 
                        className="font-light hover:underline tracking-wide"
                        style={{ color: 'var(--arctic-blue-primary)', letterSpacing: '0.05em' }}
                      >
                        support@thenefol.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                      <MessageCircle className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    </div>
                    <div>
                      <p 
                        className="font-light tracking-wide"
                        style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                      >
                        WhatsApp
                      </p>
                      <a 
                        href="https://wa.me/918887847213" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-light hover:underline tracking-wide"
                        style={{ color: 'var(--arctic-blue-primary)', letterSpacing: '0.05em' }}
                      >
                        Chat with us on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12 sm:mt-16">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Explore Our Products
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-6 sm:mb-8 max-w-2xl mx-auto tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Discover our range of natural skincare products and experience the Nefol difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#/user/shop"
                className="px-8 py-3 text-white font-light transition-all duration-300 text-xs tracking-[0.15em] uppercase rounded-xl hover:opacity-90 flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--arctic-blue-primary)',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                SHOP NOW
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
