import React, { useState, useEffect } from 'react'
import { 
  Plus, Edit, Trash2, Play, Pause, BarChart3, TrendingUp, 
  DollarSign, Eye, MousePointerClick, Users, Target, 
  Settings, RefreshCw, Download, Filter, Calendar
} from 'lucide-react'

const apiBase = (import.meta as any).env.VITE_API_URL || 'http://192.168.1.36:2000'

interface Campaign {
  id?: number
  campaign_id: string
  name: string
  objective: string
  status: string
  daily_budget?: number
  lifetime_budget?: number
  start_time?: string
  stop_time?: string
  created_time?: string
}

interface AdSet {
  id?: number
  adset_id: string
  campaign_id: string
  name: string
  status: string
  daily_budget?: number
  targeting?: any
}

interface Ad {
  id?: number
  ad_id: string
  adset_id: string
  campaign_id: string
  name: string
  status: string
  preview_url?: string
  creative?: any
}

interface Insight {
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpm: number
  cpc: number
  ctr: number
  conversions: number
  conversion_value: number
}

export default function MetaAds() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads' | 'insights' | 'config'>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [config, setConfig] = useState({ ad_account_id: '', pixel_id: '', access_token: '' })

  useEffect(() => {
    loadData()
    loadConfig()
  }, [activeTab])

  const loadConfig = async () => {
    try {
      const res = await fetch(`${apiBase}/api/meta-ads/config`)
      const data = await res.json()
      if (data.data) {
        setConfig({
          ad_account_id: data.data.ad_account_id || '',
          pixel_id: data.data.pixel_id || '',
          access_token: data.data.access_token || '',
        })
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      if (activeTab === 'campaigns') {
        const res = await fetch(`${apiBase}/api/meta-ads/campaigns`)
        const data = await res.json()
        setCampaigns(Array.isArray(data.data) ? data.data : [])
      } else if (activeTab === 'adsets') {
        const res = await fetch(`${apiBase}/api/meta-ads/adsets`)
        const data = await res.json()
        setAdsets(Array.isArray(data.data) ? data.data : [])
      } else if (activeTab === 'ads') {
        const res = await fetch(`${apiBase}/api/meta-ads/ads`)
        const data = await res.json()
        setAds(Array.isArray(data.data) ? data.data : [])
      } else if (activeTab === 'insights') {
        const res = await fetch(`${apiBase}/api/meta-ads/insights`)
        const data = await res.json()
        setInsights(Array.isArray(data.data) ? data.data : [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/meta-ads/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.success || data.data?.success) {
        alert('Configuration saved successfully!')
        setShowConfigModal(false)
      } else {
        alert('Failed to save configuration')
      }
    } catch (err) {
      alert('Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async (campaignData: any) => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/meta-ads/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      })
      const data = await res.json()
      if (data.success || data.data) {
        await loadData()
        setShowCreateModal(false)
        alert('Campaign created successfully!')
      } else {
        alert(data.error || 'Failed to create campaign')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const res = await fetch(`${apiBase}/api/meta-ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success || data.data) {
        await loadData()
      } else {
        alert('Failed to update campaign status')
      }
    } catch (err) {
      alert('Failed to update campaign status')
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const res = await fetch(`${apiBase}/api/meta-ads/campaigns/${campaignId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success || data.data) {
        await loadData()
        alert('Campaign deleted successfully!')
      } else {
        alert('Failed to delete campaign')
      }
    } catch (err) {
      alert('Failed to delete campaign')
    }
  }

  const syncInsights = async () => {
    try {
      setLoading(true)
      const campaignIds = campaigns.map(c => c.campaign_id).join(',')
      const res = await fetch(`${apiBase}/api/meta-ads/insights/sync?campaign_id=${campaignIds}`)
      const data = await res.json()
      if (data.success || data.data) {
        await loadData()
        alert('Insights synced successfully!')
      } else {
        alert('Failed to sync insights')
      }
    } catch (err) {
      alert('Failed to sync insights')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'PAUSED':
        return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      case 'DELETED':
      case 'ARCHIVED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalInsights = insights.reduce((acc, insight) => ({
    impressions: acc.impressions + (insight.impressions || 0),
    clicks: acc.clicks + (insight.clicks || 0),
    spend: acc.spend + (insight.spend || 0),
    reach: acc.reach + (insight.reach || 0),
    conversions: acc.conversions + (insight.conversions || 0),
    conversion_value: acc.conversion_value + (insight.conversion_value || 0),
  }), { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0, conversion_value: 0 })

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
      {/* Header */}
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
            Meta Ads Management
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Create and manage your Facebook & Instagram ad campaigns
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          {activeTab === 'campaigns' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Campaign</span>
            </button>
          )}
          {activeTab === 'insights' && (
            <button
              onClick={syncInsights}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Sync Insights</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: Target },
            { id: 'adsets', label: 'Ad Sets', icon: Users },
            { id: 'ads', label: 'Ads', icon: Eye },
            { id: 'insights', label: 'Performance', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? ''
                    : 'border-transparent'
                }`}
                style={activeTab === tab.id 
                  ? { borderColor: 'var(--arctic-blue-primary)', color: 'var(--arctic-blue-primary-dark)' }
                  : { color: 'var(--text-muted)' }
                }
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Content */}
      {loading && !campaigns.length && !adsets.length && !ads.length ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No campaigns yet. Create your first campaign to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.campaign_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{campaign.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Objective: {campaign.objective} • ID: {campaign.campaign_id}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                          <button
                            onClick={() => updateCampaignStatus(campaign.campaign_id, campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            {campaign.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => deleteCampaign(campaign.campaign_id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Daily Budget</p>
                          <p className="font-semibold">
                            {campaign.daily_budget ? `₹${(campaign.daily_budget / 100).toFixed(2)}` : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Lifetime Budget</p>
                          <p className="font-semibold">
                            {campaign.lifetime_budget ? `₹${(campaign.lifetime_budget / 100).toFixed(2)}` : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Created</p>
                          <p className="font-semibold">
                            {campaign.created_time ? new Date(campaign.created_time).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Status</p>
                          <p className="font-semibold">{campaign.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ad Sets Tab */}
          {activeTab === 'adsets' && (
            <div className="space-y-4">
              {adsets.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No ad sets yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {adsets.map((adset) => (
                    <div key={adset.adset_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{adset.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Campaign ID: {adset.campaign_id}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(adset.status)}`}>
                          {adset.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Daily Budget</p>
                          <p className="font-semibold">
                            {adset.daily_budget ? `₹${(adset.daily_budget / 100).toFixed(2)}` : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Status</p>
                          <p className="font-semibold">{adset.status}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Ad Set ID</p>
                          <p className="font-semibold text-xs">{adset.adset_id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              {ads.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No ads yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {ads.map((ad) => (
                    <div key={ad.ad_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{ad.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Ad Set: {ad.adset_id} • Campaign: {ad.campaign_id}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                          {ad.status}
                        </span>
                      </div>
                      {ad.preview_url && (
                        <div className="mt-4">
                          <a
                            href={ad.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Preview →
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Impressions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {totalInsights.impressions.toLocaleString()}
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Clicks</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {totalInsights.clicks.toLocaleString()}
                      </p>
                    </div>
                    <MousePointerClick className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Spend</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ₹{totalInsights.spend.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Conversions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {totalInsights.conversions}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Insights Table */}
              {insights.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No insights data yet. Sync insights to view performance metrics.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Impressions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Clicks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Spend</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">CPC</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">CTR</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Conversions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {insights.map((insight: any, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {insight.date_start || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {insight.impressions?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {insight.clicks?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ₹{insight.spend?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ₹{insight.cpc?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {insight.ctr?.toFixed(2) || '0.00'}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {insight.conversions || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Create New Campaign</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              createCampaign({
                name: formData.get('name'),
                objective: formData.get('objective'),
                status: formData.get('status') || 'PAUSED',
                daily_budget: formData.get('daily_budget') ? parseFloat(formData.get('daily_budget') as string) : undefined,
                lifetime_budget: formData.get('lifetime_budget') ? parseFloat(formData.get('lifetime_budget') as string) : undefined,
                start_time: formData.get('start_time') || undefined,
                stop_time: formData.get('stop_time') || undefined,
              })
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Campaign Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Summer Sale 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Objective</label>
                <select
                  name="objective"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="OUTCOME_TRAFFIC">Traffic</option>
                  <option value="OUTCOME_LEADS">Leads</option>
                  <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                  <option value="OUTCOME_AWARENESS">Awareness</option>
                  <option value="OUTCOME_SALES">Sales</option>
                  <option value="OUTCOME_APP_PROMOTION">App Promotion</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Daily Budget (₹)</label>
                  <input
                    type="number"
                    name="daily_budget"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Lifetime Budget (₹)</label>
                  <input
                    type="number"
                    name="lifetime_budget"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    type="datetime-local"
                    name="stop_time"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
                <select
                  name="status"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="PAUSED">Paused</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Meta Ads Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Ad Account ID</label>
                <input
                  type="text"
                  value={config.ad_account_id}
                  onChange={(e) => setConfig({ ...config, ad_account_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="act_123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Pixel ID</label>
                <input
                  type="text"
                  value={config.pixel_id}
                  onChange={(e) => setConfig({ ...config, pixel_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="123456789012345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Access Token</label>
                <input
                  type="password"
                  value={config.access_token}
                  onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Your Meta access token"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

