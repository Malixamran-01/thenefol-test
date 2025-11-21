import React, { useState, useEffect } from 'react'
import { TrendingUp, Users, MousePointer, ShoppingCart, Heart, Eye, Filter, Download, BarChart3, Target, Clock } from 'lucide-react'
import apiService from '../services/api'

interface FunnelStage {
  id: string
  name: string
  visitors: number
  conversions: number
  conversionRate: number
  dropOffRate: number
  color: string
}

interface FunnelData {
  stage: string
  visitors: number
  conversions: number
  conversionRate: number
  previousRate: number
  trend: 'up' | 'down' | 'stable'
}

export default function JourneyFunnel() {
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([])
  const [funnelData, setFunnelData] = useState<FunnelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFunnelData()
  }, [])

  const loadFunnelData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiService.getJourneyFunnels().catch(() => [])
      setFunnelStages([]) // Will be set from data in the future
      setFunnelData([])
    } catch (err) {
      console.error('Failed to load funnel data:', err)
      setError('Failed to load funnel data')
    } finally {
      setLoading(false)
    }
  }

  const [timeRange, setTimeRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  const totalVisitors = funnelStages.length > 0 ? funnelStages[0].visitors : 0
  const totalConversions = funnelStages.length > 0 ? funnelStages[funnelStages.length - 1].conversions : 0
  const overallConversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗'
      case 'down': return '↘'
      case 'stable': return '→'
      default: return '→'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      case 'stable': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Funnel Overview', icon: BarChart3 },
    { id: 'analysis', label: 'Stage Analysis', icon: Target },
    { id: 'optimization', label: 'Optimization', icon: TrendingUp }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Customer Journey Funnel
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track customer progression through each stage of the journey
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Visitors</h3>
              <p className="text-3xl font-bold">{totalVisitors.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Conversions</h3>
              <p className="text-3xl font-bold">{totalConversions.toLocaleString()}</p>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Overall Conversion</h3>
              <p className="text-3xl font-bold">{overallConversionRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Drop-off Rate</h3>
              <p className="text-3xl font-bold">{(100 - overallConversionRate).toFixed(1)}%</p>
            </div>
            <MousePointer className="h-8 w-8" />
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
          {/* Funnel Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Customer Journey Funnel
              </h3>
              
              <div className="space-y-4">
                {funnelStages.map((stage, index) => (
                  <div key={stage.id} className="relative">
                    <div className="flex items-center">
                      <div className="flex items-center space-x-4 w-full">
                        <div className={`w-12 h-12 ${stage.color} rounded-full flex items-center justify-center text-white font-bold`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {stage.name}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-slate-600 dark:text-slate-400">
                                {stage.visitors.toLocaleString()} visitors
                              </span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {stage.conversions.toLocaleString()} conversions
                              </span>
                              <span className="font-semibold text-green-600">
                                {stage.conversionRate}% conversion
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                            <div 
                              className={`${stage.color} h-3 rounded-full transition-all duration-300`}
                              style={{ width: `${stage.conversionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < funnelStages.length - 1 && (
                      <div className="flex justify-center my-4">
                        <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600 relative">
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-slate-300 dark:border-l-slate-600 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Stage Analysis
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Visitors
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Conversions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Conversion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {funnelData.map((data, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                          {data.stage}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {data.visitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {data.conversions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-green-600">{data.conversionRate}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-semibold ${getTrendColor(data.trend)}`}>
                            {getTrendIcon(data.trend)} {data.previousRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Optimization Recommendations
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-red-200 dark:border-red-700 rounded-lg p-6 bg-red-50 dark:bg-red-900">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3">
                    High Drop-off: Consideration Stage
                  </h4>
                  <p className="text-red-700 dark:text-red-300 mb-4">
                    The consideration stage has a 50% drop-off rate. Customers are losing interest before making a purchase decision.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        Add product comparison tools
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        Implement wishlist functionality
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        Add urgency indicators (limited stock)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 bg-yellow-50 dark:bg-yellow-900">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                    Medium Drop-off: Interest Stage
                  </h4>
                  <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                    The interest stage shows 20% drop-off. Improve engagement with better content and personalization.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        Personalize product recommendations
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        Send follow-up emails with reviews
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        Add social proof and testimonials
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Journey Funnel Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Journey Funnel Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Identify Bottlenecks</h3>
            <p className="text-sm opacity-90">
              Focus on stages with the highest drop-off rates to maximize impact.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">A/B Test Changes</h3>
            <p className="text-sm opacity-90">
              Test different approaches to optimize each stage of the funnel.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Monitor Continuously</h3>
            <p className="text-sm opacity-90">
              Track funnel performance regularly to identify new opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
