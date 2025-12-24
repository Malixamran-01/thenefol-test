import React, { useState, useEffect } from 'react'

interface GoogleAnalytics {
  impressions: number
  clicks: number
  ctr: number
  conversions: number
}

interface Campaign {
  id: string
  name: string
  platform: 'YouTube' | 'Google Ads'
  status: 'active' | 'paused' | 'completed'
  budget: number
  spent: number
  impressions: number
  clicks: number
}

export default function GoogleYouTube() {
  const [isConnected, setIsConnected] = useState(false)
  const [analytics, setAnalytics] = useState<GoogleAnalytics>({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0
  })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const getApiBase = () => {
    // Always use production URL - no environment variables
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
        return `${window.location.protocol}//${window.location.host}/api`
      }
    }
    return 'https://thenefol.com/api'
  }
  const apiBase = getApiBase()

  useEffect(() => {
    loadGoogleData()
  }, [])

  const loadGoogleData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const [connectionRes, analyticsRes, campaignsRes] = await Promise.all([
        fetch(`${apiBase}/api/google/connection-status`),
        fetch(`${apiBase}/api/google/analytics`),
        fetch(`${apiBase}/api/google/campaigns`)
      ])

      if (connectionRes.ok) {
        const connectionData = await connectionRes.json()
        setIsConnected(connectionData.connected || false)
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json()
        setCampaigns(campaignsData.campaigns || [])
      }
    } catch (error) {
      console.error('Failed to load Google data:', error)
      setError('Failed to load Google data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Google & YouTube
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage Google Ads and YouTube campaigns
          </p>
        </div>
        <button 
          onClick={() => setIsConnected(!isConnected)}
          className={isConnected ? "btn-secondary" : "btn-primary"}
        >
          {isConnected ? 'Disconnect' : 'Connect Google'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="metric-card bg-red-50 border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-600">{error}</span>
            <button 
              onClick={loadGoogleData}
              className="ml-auto text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="metric-card animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="metric-card animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="metric-card text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Google Services</h2>
          <p className="text-gray-600 mb-6">Connect your Google Ads and YouTube accounts to manage campaigns and track performance.</p>
          <button 
            onClick={() => setIsConnected(true)}
            className="btn-primary"
          >
            Connect Google Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="metric-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Y</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">YouTube Channel</h3>
                    <p className="text-sm text-gray-600">NEFOL® Skincare</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Connected</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Google Ads</h3>
                    <p className="text-sm text-gray-600">NEFOL® Campaigns</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Connected</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Impressions', value: analytics.impressions.toLocaleString(), icon: '👁️' },
              { title: 'Clicks', value: analytics.clicks.toLocaleString(), icon: '🖱️' },
              { title: 'CTR', value: `${analytics.ctr}%`, icon: '📊' },
              { title: 'Conversions', value: analytics.conversions.toString(), icon: '🎯' }
            ].map((stat, index) => (
              <div key={index} className="metric-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="text-2xl">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Campaigns */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
              <button className="btn-primary">Create Campaign</button>
            </div>

            <div className="space-y-4">
              {campaigns.length > 0 ? (
                campaigns.map((campaign, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <p className="text-sm text-gray-600">{campaign.platform}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.status}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">₹{campaign.spent.toLocaleString()} / ₹{campaign.budget.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{campaign.clicks.toLocaleString()} clicks</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="btn-secondary text-xs px-2 py-1">Edit</button>
                        <button className="btn-secondary text-xs px-2 py-1">View</button>
                      </div>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No campaigns available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








