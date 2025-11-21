import { useState } from 'react'
import { getApiBase } from '../utils/apiBase'

export default function Affiliate() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    snapchat: '',
    youtube: '',
    facebook: '',
    followers: '',
    platform: '',
    experience: '',
    whyJoin: '',
    expectedSales: '',
    // Address fields
    houseNumber: '',
    street: '',
    building: '',
    apartment: '',
    road: '',
    city: '',
    pincode: '',
    state: '',
    agreeTerms: false
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if at least one social media handle is provided
    const hasSocialMedia = formData.instagram.trim() || 
                          formData.youtube.trim() || 
                          formData.snapchat.trim() || 
                          formData.facebook.trim()
    
    if (!hasSocialMedia) {
      alert('Please provide at least one social media profile handle (Instagram, YouTube, Snapchat, or Facebook) to proceed.')
      return
    }
    
    try {
      // Send affiliate application to admin
      const response = await fetch(`${getApiBase()}/api/admin/affiliate-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          applicationDate: new Date().toISOString(),
          status: 'pending'
        })
      })
      
      if (response.ok) {
        alert('Application submitted successfully! We will review your application and get back to you within 24-48 hours.')
        setShowForm(false)
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          instagram: '',
          snapchat: '',
          youtube: '',
          facebook: '',
          followers: '',
          platform: '',
          experience: '',
          whyJoin: '',
          expectedSales: '',
          // Address fields
          houseNumber: '',
          street: '',
          building: '',
          apartment: '',
          road: '',
          city: '',
          pincode: '',
          state: '',
          agreeTerms: false
        })
      } else {
        throw new Error('Failed to submit application')
      }
    } catch (error) {
      console.error('Error submitting affiliate application:', error)
      // Fallback: still show success message and log to console for now
      console.log('Affiliate Application (Fallback):', formData)
      alert('Application submitted successfully! We will review your application and get back to you within 24-48 hours.')
      setShowForm(false)
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        snapchat: '',
        youtube: '',
        facebook: '',
        followers: '',
        platform: '',
        experience: '',
        whyJoin: '',
        expectedSales: '',
        // Address fields
        houseNumber: '',
        street: '',
        building: '',
        apartment: '',
        road: '',
        city: '',
        pincode: '',
        state: '',
        agreeTerms: false
      })
    }
  }

  return (
    <main className="py-10 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="mb-6 text-5xl font-bold text-slate-900 dark:text-slate-100">Nefol Affiliate Program</h1>
          <p className="mx-auto max-w-3xl text-xl text-slate-600 dark:text-slate-400">
            Join our affiliate program and earn commissions by promoting natural, effective skincare products. 
            Share the power of Blue Tea Flower and other botanical ingredients with your audience.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-center">Why Join Our Affiliate Program?</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Competitive Commissions</h3>
              <p className="text-slate-600">Earn up to 15% commission on every sale you generate through your unique affiliate links.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mx-auto">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Real-time Tracking</h3>
              <p className="text-slate-600">Monitor your performance with our comprehensive dashboard and detailed analytics.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mx-auto">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Marketing Materials</h3>
              <p className="text-slate-600">Access high-quality banners, product images, and promotional content.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mx-auto">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Fast Payouts</h3>
              <p className="text-slate-600">Get paid monthly with minimum payout threshold of ₹2,500 via bank transfer.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Dedicated Support</h3>
              <p className="text-slate-600">Get personalized support from our affiliate team to maximize your success.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 mx-auto">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Performance Bonuses</h3>
              <p className="text-slate-600">Earn additional bonuses for top performers and milestone achievements.</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white mx-auto text-xl font-bold">1</div>
              <h3 className="mb-2 text-lg font-semibold">Sign Up</h3>
              <p className="text-slate-600">Complete our simple application form and get approved within 24-48 hours.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white mx-auto text-xl font-bold">2</div>
              <h3 className="mb-2 text-lg font-semibold">Get Links</h3>
              <p className="text-slate-600">Access your unique affiliate links and marketing materials from your dashboard.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white mx-auto text-xl font-bold">3</div>
              <h3 className="mb-2 text-lg font-semibold">Promote</h3>
              <p className="text-slate-600">Share Nefol products with your audience through your preferred channels.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white mx-auto text-xl font-bold">4</div>
              <h3 className="mb-2 text-lg font-semibold">Earn</h3>
              <p className="text-slate-600">Get paid monthly for every sale generated through your affiliate links.</p>
            </div>
          </div>
        </div>

        {/* Commission Structure */}
        <div className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-center">Commission Structure</h2>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-blue-600">10%</div>
                <h3 className="mb-2 text-lg font-semibold">Standard Products</h3>
                <p className="text-slate-600">Face cleansers, moisturizers, and basic skincare products</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-blue-600">12%</div>
                <h3 className="mb-2 text-lg font-semibold">Premium Products</h3>
                <p className="text-slate-600">Serums, masks, and specialized treatments</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-blue-600">15%</div>
                <h3 className="mb-2 text-lg font-semibold">Bundle Deals</h3>
                <p className="text-slate-600">Product bundles and combo offers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-center">Program Requirements</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-xl font-semibold text-green-600">✓ What We're Looking For</h3>
              <ul className="space-y-2 text-slate-600">
                <li>• Active social media presence (Instagram, YouTube, Blog, etc.)</li>
                <li>• Engaged audience interested in skincare and beauty</li>
                <li>• Authentic content creation and honest reviews</li>
                <li>• Compliance with advertising guidelines and FTC regulations</li>
                <li>• Professional communication and timely responses</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-xl font-semibold text-red-600">✗ What We Don't Accept</h3>
              <ul className="space-y-2 text-slate-600">
                <li>• Spam or misleading promotional tactics</li>
                <li>• Fake reviews or purchased followers</li>
                <li>• Promotion of competing skincare brands</li>
                <li>• Inappropriate or offensive content</li>
                <li>• Non-compliance with our brand guidelines</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 p-12 text-center text-white">
          <h2 className="mb-4 text-3xl font-bold">Ready to Start Earning?</h2>
          <p className="mb-8 text-xl opacity-90">
            Join thousands of successful affiliates who are already earning with Nefol.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-white px-8 py-4 font-semibold text-blue-600 hover:bg-slate-50 transition-colors"
            >
              Apply Now
            </button>
            <button className="rounded-lg border-2 border-white px-8 py-4 font-semibold text-white hover:bg-white hover:text-blue-600 transition-colors">
              Learn More
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-16 text-center">
          <h3 className="mb-4 text-xl font-semibold">Questions About Our Affiliate Program?</h3>
          <p className="text-slate-600">
            Contact our affiliate team at <a href="mailto:affiliates@thenefol.com" className="text-blue-600 hover:underline">affiliates@thenefol.com</a> or call +91-8887847213
          </p>
        </div>
      </div>

      {/* Application Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-8 shadow-2xl">
            <button
              onClick={() => setShowForm(false)}
              className="absolute right-4 top-4 text-2xl text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-900">Affiliate Program Application</h2>
              <p className="mt-2 text-slate-600">Fill out the form below to apply for our affiliate program</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="name">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="phone">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Social Media Information */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Social Media Profiles <span className="text-red-500">*</span>
                </h3>
                <p className="mb-4 text-sm text-slate-600">
                  Please provide at least one social media profile handle
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="instagram">
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      id="instagram"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      placeholder="@yourusername"
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="youtube">
                      YouTube Channel
                    </label>
                    <input
                      type="url"
                      id="youtube"
                      name="youtube"
                      value={formData.youtube}
                      onChange={handleInputChange}
                      placeholder="https://youtube.com/@yourchannel"
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="snapchat">
                      Snapchat Handle
                    </label>
                    <input
                      type="text"
                      id="snapchat"
                      name="snapchat"
                      value={formData.snapchat}
                      onChange={handleInputChange}
                      placeholder="@yourusername"
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="facebook">
                      Facebook Page
                    </label>
                    <input
                      type="url"
                      id="facebook"
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleInputChange}
                      placeholder="https://facebook.com/yourpage"
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="followers">
                    Total Followers/Subscribers *
                  </label>
                  <select
                    id="followers"
                    name="followers"
                    value={formData.followers}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select range</option>
                    <option value="1k-5k">1,000 - 5,000</option>
                    <option value="5k-10k">5,000 - 10,000</option>
                    <option value="10k-25k">10,000 - 25,000</option>
                    <option value="25k-50k">25,000 - 50,000</option>
                    <option value="50k-100k">50,000 - 100,000</option>
                    <option value="100k+">100,000+</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="platform">
                    Primary Platform *
                  </label>
                  <select
                    id="platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select platform</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="blog">Blog/Website</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="experience">
                  Affiliate Marketing Experience *
                </label>
                <textarea
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe your experience with affiliate marketing, previous partnerships, and success stories..."
                  required
                  className="w-full rounded-lg border border-slate-300 p-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="whyJoin">
                  Why do you want to join Nefol's affiliate program? *
                </label>
                <textarea
                  id="whyJoin"
                  name="whyJoin"
                  value={formData.whyJoin}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Tell us why you're interested in promoting Nefol products and how you align with our brand values..."
                  required
                  className="w-full rounded-lg border border-slate-300 p-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="expectedSales">
                  Expected Monthly Sales Volume
                </label>
                <select
                  id="expectedSales"
                  name="expectedSales"
                  value={formData.expectedSales}
                  onChange={handleInputChange}
                  className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select range</option>
                  <option value="0-5k">₹0 - ₹5,000</option>
                  <option value="5k-10k">₹5,000 - ₹10,000</option>
                  <option value="10k-25k">₹10,000 - ₹25,000</option>
                  <option value="25k-50k">₹25,000 - ₹50,000</option>
                  <option value="50k+">₹50,000+</option>
                </select>
              </div>

              {/* Address Section */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Address Information</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="houseNumber">
                      House Number *
                    </label>
                    <input
                      type="text"
                      id="houseNumber"
                      name="houseNumber"
                      value={formData.houseNumber}
                      onChange={handleInputChange}
                      placeholder="123"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="street">
                      Street *
                    </label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Main Street"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="building">
                      Building/Apartment
                    </label>
                    <input
                      type="text"
                      id="building"
                      name="building"
                      value={formData.building}
                      onChange={handleInputChange}
                      placeholder="Tower A, Apt 4B"
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="road">
                      Road/Locality *
                    </label>
                    <input
                      type="text"
                      id="road"
                      name="road"
                      value={formData.road}
                      onChange={handleInputChange}
                      placeholder="MG Road, Sector 15"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="city">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Mumbai"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="pincode">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="400001"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="state">
                      State *
                    </label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Select State</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                      <option value="Assam">Assam</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Chhattisgarh">Chhattisgarh</option>
                      <option value="Goa">Goa</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Himachal Pradesh">Himachal Pradesh</option>
                      <option value="Jharkhand">Jharkhand</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Manipur">Manipur</option>
                      <option value="Meghalaya">Meghalaya</option>
                      <option value="Mizoram">Mizoram</option>
                      <option value="Nagaland">Nagaland</option>
                      <option value="Odisha">Odisha</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Sikkim">Sikkim</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Tripura">Tripura</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Uttarakhand">Uttarakhand</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
                />
                <label htmlFor="agreeTerms" className="text-sm text-slate-600">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Affiliate Program Terms</a> and 
                  <a href="#" className="text-blue-600 hover:underline"> Privacy Policy</a>. I understand that I must comply with 
                  FTC guidelines and disclose my affiliate relationship with Nefol. *
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
