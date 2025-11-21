import React, { useState } from 'react'
import { Globe, Smartphone, Monitor, ShoppingCart, MessageSquare, Mail, Bell, Users, BarChart3, TrendingUp, Settings, Play, Pause } from 'lucide-react'

interface Channel {
  id: string
  name: string
  type: 'website' | 'mobile' | 'social' | 'email' | 'sms' | 'push' | 'chat'
  status: 'active' | 'inactive' | 'maintenance'
  metrics: {
    reach: number
    engagement: number
    conversion: number
    revenue: number
  }
  icon: React.ComponentType<any>
  color: string
}

interface OmniChannelCampaign {
  id: string
  name: string
  description: string
  channels: string[]
  status: 'active' | 'paused' | 'draft'
  startDate: string
  endDate: string
  budget: number
  performance: {
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }
}

export default function OmniChannel() {
  const [channels] = useState<Channel[]>([
    {
      id: '1',
      name: 'Website',
      type: 'website',
      status: 'active',
      metrics: {
        reach: 50000,
        engagement: 12.5,
        conversion: 3.2,
        revenue: 800000
      },
      icon: Monitor,
      color: 'bg-blue-500'
    },
    {
      id: '2',
      name: 'Mobile App',
      type: 'mobile',
      status: 'active',
      metrics: {
        reach: 25000,
        engagement: 18.3,
        conversion: 5.7,
        revenue: 450000
      },
      icon: Smartphone,
      color: 'bg-green-500'
    },
    {
      id: '3',
      name: 'Email Marketing',
      type: 'email',
      status: 'active',
      metrics: {
        reach: 30000,
        engagement: 15.2,
        conversion: 4.8,
        revenue: 350000
      },
      icon: Mail,
      color: 'bg-purple-500'
    },
    {
      id: '4',
      name: 'SMS Marketing',
      type: 'sms',
      status: 'active',
      metrics: {
        reach: 15000,
        engagement: 22.1,
        conversion: 8.3,
        revenue: 200000
      },
      icon: MessageSquare,
      color: 'bg-orange-500'
    },
    {
      id: '5',
      name: 'Push Notifications',
      type: 'push',
      status: 'active',
      metrics: {
        reach: 20000,
        engagement: 16.7,
        conversion: 6.2,
        revenue: 280000
      },
      icon: Bell,
      color: 'bg-pink-500'
    },
    {
      id: '6',
      name: 'Live Chat',
      type: 'chat',
      status: 'active',
      metrics: {
        reach: 8000,
        engagement: 45.2,
        conversion: 12.8,
        revenue: 150000
      },
      icon: MessageSquare,
      color: 'bg-cyan-500'
    }
  ])

  const [campaigns] = useState<OmniChannelCampaign[]>([
    {
      id: '1',
      name: 'Holiday Sale Campaign',
      description: 'Multi-channel holiday promotion across all touchpoints',
      channels: ['website', 'mobile', 'email', 'sms', 'push'],
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-01-31',
      budget: 100000,
      performance: {
        impressions: 150000,
        clicks: 25000,
        conversions: 3500,
        revenue: 1200000
      }
    },
    {
      id: '2',
      name: 'New Product Launch',
      description: 'Launch campaign for new skincare line',
      channels: ['website', 'email', 'push', 'chat'],
      status: 'active',
      startDate: '2024-01-20',
      endDate: '2024-02-05',
      budget: 75000,
      performance: {
        impressions: 80000,
        clicks: 12000,
        conversions: 1800,
        revenue: 650000
      }
    },
    {
      id: '3',
      name: 'Customer Retention',
      description: 'Retention campaign for at-risk customers',
      channels: ['email', 'sms', 'push'],
      status: 'paused',
      startDate: '2024-01-10',
      endDate: '2024-01-25',
      budget: 50000,
      performance: {
        impressions: 40000,
        clicks: 6000,
        conversions: 900,
        revenue: 300000
      }
    }
  ])

  const [activeTab, setActiveTab] = useState('overview')

  const totalStats = {
    totalChannels: channels.length,
    activeChannels: channels.filter(c => c.status === 'active').length,
    totalReach: channels.reduce((sum, c) => sum + c.metrics.reach, 0),
    totalRevenue: channels.reduce((sum, c) => sum + c.metrics.revenue, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      case 'maintenance': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'paused': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'draft': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Channel Overview', icon: Globe },
    { id: 'campaigns', label: 'Campaigns', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Omni Channel Marketing
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage and optimize customer interactions across all channels
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Channels</h3>
              <p className="text-3xl font-bold">{totalStats.totalChannels}</p>
            </div>
            <Globe className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Channels</h3>
              <p className="text-3xl font-bold">{totalStats.activeChannels}</p>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Reach</h3>
              <p className="text-3xl font-bold">{(totalStats.totalReach / 1000).toFixed(0)}K</p>
            </div>
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Revenue</h3>
              <p className="text-3xl font-bold">₹{(totalStats.totalRevenue / 100000).toFixed(1)}L</p>
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
          {/* Channel Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Channel Performance
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel) => {
                  const IconComponent = channel.icon
                  return (
                    <div key={channel.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${channel.color} rounded-full flex items-center justify-center`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {channel.name}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {channel.type}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(channel.status)}`}>
                          {channel.status}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Reach</span>
                          <span className="font-semibold text-blue-600">{channel.metrics.reach.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Engagement</span>
                          <span className="font-semibold text-green-600">{channel.metrics.engagement}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Conversion</span>
                          <span className="font-semibold text-purple-600">{channel.metrics.conversion}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Revenue</span>
                          <span className="font-semibold text-orange-600">₹{(channel.metrics.revenue / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                          Configure
                        </button>
                        <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          {channel.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Omni Channel Campaigns
              </h3>
              
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {campaign.name}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {campaign.description}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Channels
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {campaign.channels.map((channel, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                              {channel}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Campaign Period
                        </h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Budget: ₹{campaign.budget.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{campaign.performance.impressions.toLocaleString()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Impressions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{campaign.performance.clicks.toLocaleString()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{campaign.performance.conversions.toLocaleString()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Conversions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">₹{(campaign.performance.revenue / 100000).toFixed(1)}L</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                        View Details
                      </button>
                      <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Omni Channel Analytics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Channel Performance Comparison
                  </h4>
                  <div className="space-y-3">
                    {channels
                      .sort((a, b) => b.metrics.conversion - a.metrics.conversion)
                      .slice(0, 3)
                      .map((channel, index) => (
                        <div key={channel.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                                {channel.name}
                              </h5>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {channel.metrics.reach.toLocaleString()} reach
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {channel.metrics.conversion}%
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Conversion
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Cross-Channel Insights
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Cross-Channel Engagement</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">+28.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Customer Journey Length</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">4.2 touchpoints</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Channel Synergy</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">High</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Attribution Accuracy</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">92.3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Omni Channel Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Omni Channel Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Consistent Experience</h3>
            <p className="text-sm opacity-90">
              Ensure consistent messaging and branding across all customer touchpoints.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Data Integration</h3>
            <p className="text-sm opacity-90">
              Integrate data from all channels to get a complete customer view.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Channel Optimization</h3>
            <p className="text-sm opacity-90">
              Continuously optimize each channel while maintaining cross-channel synergy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
