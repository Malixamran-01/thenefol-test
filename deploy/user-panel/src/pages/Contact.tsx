import React, { useState } from 'react'
import { Mail, MessageCircle } from 'lucide-react'
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
    <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-serif mb-4" style={{color: '#1B4965'}}>CONTACT US</h1>
          <p className="mx-auto max-w-3xl text-lg font-light" style={{color: '#9DB4C0'}}>
            Have a question or comment? Use the form below to send us a message, or contact us by mail.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-serif mb-6" style={{color: '#1B4965'}}>Get In Touch!</h2>
            <p className="mb-6 font-light" style={{color: '#9DB4C0'}}>
              We'd love to hear from you - please use the form to send us your message or ideas. 
              Or simply pop in for a cup of fresh tea and a cookie:
            </p>
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">Message sent successfully! We'll get back to you soon.</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{color: '#1B4965'}} htmlFor="name">Name</label>
                <input 
                  id="name" 
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" 
                  required
                  value={formData.name}
                  onChange={handleChange}
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
                <label className="mb-2 block text-sm font-medium" style={{color: '#1B4965'}} htmlFor="email">Email *</label>
                <input 
                  id="email" 
                  type="email" 
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" 
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" style={{color: '#1B4965'}} htmlFor="message">Comment *</label>
                <textarea 
                  id="message" 
                  rows={6} 
                  className="w-full rounded-lg border border-gray-300 p-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" 
                  required
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{backgroundColor: '#1B4965'}}
              >
                {loading ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-serif mb-6" style={{color: '#1B4965'}}>Contact Information</h2>
            
            <div className="space-y-8">
              {/* Contact Details */}
              <div>
                <h3 className="mb-4 text-lg font-medium" style={{color: '#1B4965'}}>Contact Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{backgroundColor: '#D0E8F2'}}>
                      <Mail className="h-5 w-5" style={{color: '#4B97C9'}} />
                    </div>
                    <div>
                      <p className="font-medium" style={{color: '#1B4965'}}>Email</p>
                      <a href="mailto:support@thenefol.com" className="font-light hover:underline" style={{color: '#4B97C9'}}>support@thenefol.com</a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{backgroundColor: '#D0E8F2'}}>
                      <MessageCircle className="h-5 w-5" style={{color: '#4B97C9'}} />
                    </div>
                    <div>
                      <p className="font-medium" style={{color: '#1B4965'}}>WhatsApp</p>
                      <a href="https://wa.me/918887847213" target="_blank" rel="noopener noreferrer" className="font-light hover:underline" style={{color: '#4B97C9'}}>Chat with us on WhatsApp</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
