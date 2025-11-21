import React, { useState, useEffect } from 'react'
import { Sparkles, Users, Target, BarChart3, Settings, Play, Pause, RotateCcw, Eye, MousePointer, ShoppingCart, Heart } from 'lucide-react'
import apiService from '../services/api'

interface PersonalizationRule {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'testing'
  targetAudience: string
  conditions: string[]
  actions: string[]
  performance: {
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }
}

interface PersonalizationCampaign {
  id: string
  name: string
  type: 'product_recommendation' | 'content_personalization' | 'pricing' | 'email'
  status: 'active' | 'paused' | 'draft'
  audience: string
  performance: {
    reach: number
    engagement: number
    conversion: number
    revenue: number
  }
}

export default function AIPersonalization() {
  const [rules, setRules] = useState<PersonalizationRule[]>([])
  const [campaigns, setCampaigns] = useState<PersonalizationCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPersonalizationData()
  }, [])

  const loadPersonalizationData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiService.getPersonalizationRules().catch(() => [])
      setRules(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load personalization data:', err)
      setError('Failed to load personalization data')
    } finally {
      setLoading(false)
    }
  }

  const [activeTab, setActiveTab] = useState('rules')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      case 'testing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'paused': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'draft': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product_recommendation': return <ShoppingCart className="h-4 w-4" />
      case 'content_personalization': return <Eye className="h-4 w-4" />
      case 'pricing': return <Target className="h-4 w-4" />
      case 'email': return <MousePointer className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  const tabs = [
    { id: 'rules', label: 'Personalization Rules', icon: Target },
    { id: 'campaigns', label: 'Campaigns', icon: BarChart3 },
    { id: 'insights', label: 'Insights', icon: Sparkles }
  ]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading personalization data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={loadPersonalizationData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            AI Personalization
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Deliver personalized experiences using AI-powered insights
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadPersonalizationData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Rules</h3>
              <p className="text-3xl font-bold">{rules.filter(r => r.status === 'active').length}</p>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Impressions</h3>
              <p className="text-3xl font-bold">
                {rules.reduce((sum, r) => sum + r.performance.impressions, 0).toLocaleString()}
              </p>
            </div>
            <Eye className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Conversions</h3>
              <p className="text-3xl font-bold">
                {rules.reduce((sum, r) => sum + r.performance.conversions, 0).toLocaleString()}
              </p>
            </div>
            <MousePointer className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Revenue Generated</h3>
              <p className="text-3xl font-bold">
                ₹{(rules.reduce((sum, r) => sum + r.performance.revenue, 0) / 100000).toFixed(1)}L
              </p>
            </div>
            <BarChart3 className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Personalization Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Personalization Rules
              </h3>
              
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {rule.name}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {rule.description}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rule.status)}`}>
                        {rule.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Target Audience
                        </h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {rule.targetAudience}
                        </p>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Conditions
                        </h5>
                        <ul className="text-sm text-slate-600 dark:text-slate-400">
                          {rule.conditions.map((condition, index) => (
                            <li key={index}>• {condition}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Actions
                      </h5>
                      <ul className="text-sm text-slate-600 dark:text-slate-400">
                        {rule.actions.map((action, index) => (
                          <li key={index}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{rule.performance.impressions.toLocaleString()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Impressions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{rule.performance.clicks.toLocaleString()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{rule.performance.conversions.toLocaleString()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Conversions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">₹{(rule.performance.revenue / 100000).toFixed(1)}L</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                        Edit Rule
                      </button>
                      <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Personalization Campaigns
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(campaign.type)}
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {campaign.name}
                        </h4>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Audience: {campaign.audience}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Reach</span>
                        <span className="font-semibold text-blue-600">{campaign.performance.reach.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Engagement</span>
                        <span className="font-semibold text-green-600">{campaign.performance.engagement}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Conversion</span>
                        <span className="font-semibold text-purple-600">{campaign.performance.conversion}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Revenue</span>
                        <span className="font-semibold text-orange-600">₹{(campaign.performance.revenue / 100000).toFixed(1)}L</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                        View Details
                      </button>
                      <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Personalization Insights
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Top Performing Rules
                  </h4>
                  <div className="space-y-3">
                    {rules
                      .sort((a, b) => b.performance.revenue - a.performance.revenue)
                      .slice(0, 3)
                      .map((rule, index) => (
                        <div key={rule.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                                {rule.name}
                              </h5>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {rule.performance.conversions} conversions
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              ₹{(rule.performance.revenue / 100000).toFixed(1)}L
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Revenue
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Personalization Impact
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Revenue Increase</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">+35.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Conversion Rate</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">+18.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Customer Engagement</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">+42.1%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Average Order Value</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">+25.8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Personalization Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">AI Personalization Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Start with Clear Goals</h3>
            <p className="text-sm opacity-90">
              Define specific objectives for each personalization rule to measure success effectively.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Test and Iterate</h3>
            <p className="text-sm opacity-90">
              Continuously test different personalization approaches and optimize based on results.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Respect Privacy</h3>
            <p className="text-sm opacity-90">
              Ensure personalization respects customer privacy and complies with regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
