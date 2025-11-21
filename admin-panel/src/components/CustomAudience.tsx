import React, { useState, useEffect } from 'react'
import { Users, Target, Plus, Edit, Trash2, Eye, Filter, Download, BarChart3, TrendingUp, Calendar, MapPin, ShoppingCart, Heart, Star } from 'lucide-react'
import apiService from '../services/api'

interface CustomAudience {
  id: string
  name: string
  description: string
  size: number
  criteria: AudienceCriteria[]
  createdAt: string
  lastUpdated: string
  status: 'active' | 'inactive' | 'draft'
  tags: string[]
  performance: {
    reach: number
    engagement: number
    conversion: number
    revenue: number
  }
}

interface AudienceCriteria {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in'
  value: any
  value2?: any
}

export default function CustomAudience() {
  const [audiences, setAudiences] = useState<CustomAudience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('audiences')
  const [showCreateAudience, setShowCreateAudience] = useState(false)
  const [selectedAudience, setSelectedAudience] = useState<CustomAudience | null>(null)

  useEffect(() => {
    loadAudiencesData()
  }, [])

  const loadAudiencesData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiService.getCustomAudiences().catch(() => [])
      setAudiences(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load audiences data:', err)
      setError('Failed to load audiences data')
    } finally {
      setLoading(false)
    }
  }

  const totalStats = {
    totalAudiences: audiences.length,
    totalSize: audiences.reduce((sum, a) => sum + a.size, 0),
    activeAudiences: audiences.filter(a => a.status === 'active').length,
    totalRevenue: audiences.reduce((sum, a) => sum + a.performance.revenue, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      case 'draft': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case 'equals': return 'equals'
      case 'not_equals': return 'does not equal'
      case 'contains': return 'contains'
      case 'not_contains': return 'does not contain'
      case 'greater_than': return 'is greater than'
      case 'less_than': return 'is less than'
      case 'between': return 'is between'
      case 'in': return 'is in'
      case 'not_in': return 'is not in'
      default: return operator
    }
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'category_preference': return 'Category Preference'
      case 'total_orders': return 'Total Orders'
      case 'total_spent': return 'Total Spent'
      case 'cart_status': return 'Cart Status'
      case 'cart_value': return 'Cart Value'
      case 'registration_date': return 'Registration Date'
      case 'last_order_date': return 'Last Order Date'
      case 'location': return 'Location'
      case 'age': return 'Age'
      case 'gender': return 'Gender'
      default: return field
    }
  }

  const tabs = [
    { id: 'audiences', label: 'Custom Audiences', icon: Users },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'insights', label: 'Insights', icon: TrendingUp }
  ]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading audiences...</p>
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
              onClick={loadAudiencesData}
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
            Custom Audience Targeting
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create and manage targeted customer audiences for personalized marketing
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadAudiencesData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Target className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateAudience(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Audience</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Audiences</h3>
              <p className="text-3xl font-bold">{totalStats.totalAudiences}</p>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Size</h3>
              <p className="text-3xl font-bold">{totalStats.totalSize.toLocaleString()}</p>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Audiences</h3>
              <p className="text-3xl font-bold">{totalStats.activeAudiences}</p>
            </div>
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Revenue Generated</h3>
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
          {/* Custom Audiences Tab */}
          {activeTab === 'audiences' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Custom Audiences
                </h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Filter className="h-4 w-4" />
                  </button>
                  <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {audiences.map((audience) => (
                  <div key={audience.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {audience.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(audience.status)}`}>
                        {audience.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {audience.description}
                    </p>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Size:</span>
                        <span className="font-semibold">{audience.size.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Engagement:</span>
                        <span className="font-semibold text-green-600">{audience.performance.engagement}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Conversion:</span>
                        <span className="font-semibold text-blue-600">{audience.performance.conversion}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Revenue:</span>
                        <span className="font-semibold text-purple-600">₹{(audience.performance.revenue / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {audience.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedAudience(audience)}
                        className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                      <button className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="px-3 py-1 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Audience Performance
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Audience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Reach
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Engagement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Conversion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {audiences.map((audience) => (
                      <tr key={audience.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                          {audience.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {audience.size.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {audience.performance.reach.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-green-600">{audience.performance.engagement}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-blue-600">{audience.performance.conversion}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-purple-600">₹{(audience.performance.revenue / 1000).toFixed(0)}K</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Audience Insights
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Top Performing Audiences
                  </h4>
                  <div className="space-y-3">
                    {audiences
                      .sort((a, b) => b.performance.revenue - a.performance.revenue)
                      .slice(0, 3)
                      .map((audience, index) => (
                        <div key={audience.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                                {audience.name}
                              </h5>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {audience.size.toLocaleString()} members
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              ₹{(audience.performance.revenue / 1000).toFixed(0)}K
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
                    Audience Analytics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Total Audiences</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {totalStats.totalAudiences}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Active Audiences</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {totalStats.activeAudiences}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Total Members</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {totalStats.totalSize.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Total Revenue</span>
                      <span className="font-semibold text-green-600">
                        ₹{(totalStats.totalRevenue / 100000).toFixed(1)}L
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audience Details Modal */}
      {selectedAudience && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Audience Details: {selectedAudience.name}
              </h3>
              <button
                onClick={() => setSelectedAudience(null)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Description
                </h4>
                <p className="text-slate-600 dark:text-slate-400">
                  {selectedAudience.description}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Audience Criteria
                </h4>
                <div className="space-y-2">
                  {selectedAudience.criteria.map((criterion, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {getFieldLabel(criterion.field)}
                      </span>
                      <span className="mx-2 text-slate-600 dark:text-slate-400">
                        {getOperatorLabel(criterion.operator)}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {criterion.value}
                        {criterion.value2 && ` and ${criterion.value2}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedAudience.performance.reach.toLocaleString()}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Reach</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedAudience.performance.engagement}%</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Engagement</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{selectedAudience.performance.conversion}%</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Conversion</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">₹{(selectedAudience.performance.revenue / 1000).toFixed(0)}K</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Audience Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Custom Audience Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Define Clear Criteria</h3>
            <p className="text-sm opacity-90">
              Use specific, measurable criteria to create meaningful audience segments.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Test and Optimize</h3>
            <p className="text-sm opacity-90">
              Continuously test audience performance and optimize targeting criteria.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Personalize Content</h3>
            <p className="text-sm opacity-90">
              Create personalized content and offers for each audience segment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
