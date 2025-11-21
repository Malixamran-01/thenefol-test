import React, { useState } from 'react'
import { Share2, DollarSign, Users, TrendingUp, Copy, ExternalLink, BarChart3, Calendar, Award, Target } from 'lucide-react'

interface AffiliateStats {
  totalClicks: number
  totalConversions: number
  totalEarnings: number
  conversionRate: number
  averageOrderValue: number
  monthlyEarnings: number
  topProducts: Array<{
    name: string
    clicks: number
    conversions: number
    earnings: number
  }>
}

interface AffiliateLink {
  id: string
  productName: string
  productImage: string
  originalUrl: string
  affiliateUrl: string
  clicks: number
  conversions: number
  earnings: number
  commission: number
}

interface CommissionTier {
  tier: string
  minSales: number
  commissionRate: number
  benefits: string[]
  color: string
}

export default function AffiliateMarketing() {
  const [affiliateStats] = useState<AffiliateStats>({
    totalClicks: 1250,
    totalConversions: 89,
    totalEarnings: 12500,
    conversionRate: 7.12,
    averageOrderValue: 1400,
    monthlyEarnings: 3200,
    topProducts: [
      { name: 'Face Cleanser', clicks: 320, conversions: 28, earnings: 3920 },
      { name: 'Moisturizer', clicks: 280, conversions: 22, earnings: 3080 },
      { name: 'Serum', clicks: 250, conversions: 18, earnings: 2520 },
      { name: 'Sunscreen', clicks: 200, conversions: 15, earnings: 2100 },
      { name: 'Face Mask', clicks: 180, conversions: 12, earnings: 1680 }
    ]
  })

  const [affiliateLinks] = useState<AffiliateLink[]>([
    {
      id: '1',
      productName: 'Gentle Face Cleanser',
      productImage: '/products/face-cleanser.jpg',
      originalUrl: '#/product/face-cleanser',
      affiliateUrl: 'https://nefol.com/ref/ABC123/face-cleanser',
      clicks: 320,
      conversions: 28,
      earnings: 3920,
      commission: 10
    },
    {
      id: '2',
      productName: 'Hydrating Moisturizer',
      productImage: '/products/moisturizer.jpg',
      originalUrl: '#/product/moisturizer',
      affiliateUrl: 'https://nefol.com/ref/ABC123/moisturizer',
      clicks: 280,
      conversions: 22,
      earnings: 3080,
      commission: 10
    },
    {
      id: '3',
      productName: 'Anti-Aging Serum',
      productImage: '/products/serum.jpg',
      originalUrl: '#/product/serum',
      affiliateUrl: 'https://nefol.com/ref/ABC123/serum',
      clicks: 250,
      conversions: 18,
      earnings: 2520,
      commission: 12
    }
  ])

  const [commissionTiers] = useState<CommissionTier[]>([
    {
      tier: 'Bronze',
      minSales: 0,
      commissionRate: 8,
      benefits: ['Basic affiliate tools', 'Email support', 'Monthly payouts'],
      color: 'from-amber-500 to-orange-500'
    },
    {
      tier: 'Silver',
      minSales: 10,
      commissionRate: 10,
      benefits: ['Advanced analytics', 'Priority support', 'Weekly payouts', 'Custom banners'],
      color: 'from-gray-400 to-gray-600'
    },
    {
      tier: 'Gold',
      minSales: 25,
      commissionRate: 12,
      benefits: ['Premium tools', 'Dedicated manager', 'Daily payouts', 'Exclusive products'],
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      tier: 'Platinum',
      minSales: 50,
      commissionRate: 15,
      benefits: ['VIP support', 'Custom campaigns', 'Instant payouts', 'Co-marketing opportunities'],
      color: 'from-purple-500 to-purple-600'
    }
  ])

  const [userTier] = useState('Silver')
  const [referralCode] = useState('NEFOL2024')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<AffiliateLink | null>(null)

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    alert('Link copied to clipboard!')
  }

  const handleShareLink = (link: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this amazing product!',
        text: 'I found this great skincare product on Nefol',
        url: link
      })
    } else {
      handleCopyLink(link)
    }
  }

  const generateAffiliateLink = (productId: string) => {
    return `https://nefol.com/ref/${referralCode}/${productId}`
  }

  const currentTier = commissionTiers.find(tier => tier.tier === userTier)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Nefol Affiliate Program
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Earn commissions by promoting our amazing skincare products
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Earnings</h3>
              <p className="text-3xl font-bold">₹{affiliateStats.totalEarnings.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Clicks</h3>
              <p className="text-3xl font-bold">{affiliateStats.totalClicks.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Conversions</h3>
              <p className="text-3xl font-bold">{affiliateStats.totalConversions}</p>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Conversion Rate</h3>
              <p className="text-3xl font-bold">{affiliateStats.conversionRate}%</p>
            </div>
            <BarChart3 className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Current Tier */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Your Affiliate Tier
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentTier?.color} text-white`}>
            {userTier} Tier
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Commission Rate
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {currentTier?.commissionRate}%
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Monthly Earnings
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              ₹{affiliateStats.monthlyEarnings.toLocaleString()}
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Referral Code
            </h3>
            <div className="flex items-center space-x-2">
              <code className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-900 dark:text-slate-100">
                {referralCode}
              </code>
              <button
                onClick={() => handleCopyLink(referralCode)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Tier Benefits
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentTier?.benefits.map((benefit, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Affiliate Links */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Your Affiliate Links
          </h2>
          <button
            onClick={() => setShowLinkModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate New Link
          </button>
        </div>

        <div className="space-y-4">
          {affiliateLinks.map((link) => (
            <div key={link.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <img
                  src={link.productImage}
                  alt={link.productName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {link.productName}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Commission: {link.commission}% • Clicks: {link.clicks} • Conversions: {link.conversions}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="text"
                      value={link.affiliateUrl}
                      readOnly
                      className="flex-1 px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => handleCopyLink(link.affiliateUrl)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleShareLink(link.affiliateUrl)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ₹{link.earnings.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Earnings
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Top Performing Products
        </h2>
        <div className="space-y-4">
          {affiliateStats.topProducts.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {product.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {product.clicks} clicks • {product.conversions} conversions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">
                  ₹{product.earnings.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Earnings
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission Tiers */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Commission Tiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {commissionTiers.map((tier) => (
            <div
              key={tier.tier}
              className={`${tier.color} text-white rounded-lg p-4 ${
                tier.tier === userTier ? 'ring-2 ring-white' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{tier.tier}</h3>
                {tier.tier === userTier && <Award className="h-5 w-5" />}
              </div>
              <p className="text-2xl font-bold mb-2">{tier.commissionRate}%</p>
              <p className="text-sm opacity-90 mb-3">
                Min {tier.minSales} sales/month
              </p>
              <ul className="text-xs space-y-1">
                {tier.benefits.slice(0, 2).map((benefit, index) => (
                  <li key={index}>• {benefit}</li>
                ))}
                {tier.benefits.length > 2 && (
                  <li>• +{tier.benefits.length - 2} more</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing Materials */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Marketing Materials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Banner Ads
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              High-converting banner ads in various sizes
            </p>
            <button className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Download Banners
            </button>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Social Media Posts
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Ready-to-use social media content
            </p>
            <button className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              Get Content
            </button>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Email Templates
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Professional email templates
            </p>
            <button className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
              Download Templates
            </button>
          </div>
        </div>
      </div>

      {/* Generate Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Generate Affiliate Link
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Select Product
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  <option>Gentle Face Cleanser</option>
                  <option>Hydrating Moisturizer</option>
                  <option>Anti-Aging Serum</option>
                  <option>Sunscreen SPF 50</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Campaign Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Instagram Campaign"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLinkModal(false)
                  alert('Affiliate link generated successfully!')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
