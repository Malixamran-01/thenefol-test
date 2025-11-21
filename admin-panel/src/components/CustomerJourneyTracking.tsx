import React, { useState, useEffect } from 'react'
import { MapPin, Clock, ShoppingCart, Heart, Eye, Mail, MessageSquare, Bell, User, Calendar, TrendingUp, Filter, Search, Download, Share } from 'lucide-react'
import { apiService } from '../services/api'
import { socketService } from '../services/socket'

interface JourneyEvent {
  id: string
  customerId: string
  customerName: string
  eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'purchase' | 'email_open' | 'email_click' | 'sms_click' | 'push_click' | 'chat_start' | 'review_submit'
  eventName: string
  timestamp: string
  details: {
    page?: string
    product?: string
    value?: number
    source?: string
    device?: string
    location?: string
  }
  sessionId: string
}

interface CustomerJourney {
  customerId: string
  customerName: string
  email: string
  totalEvents: number
  firstSeen: string
  lastSeen: string
  totalValue: number
  status: 'active' | 'inactive' | 'at-risk' | 'churned'
  events: JourneyEvent[]
  touchpoints: {
    website: number
    email: number
    sms: number
    push: number
    chat: number
  }
}

interface JourneyStage {
  name: string
  events: string[]
  color: string
  description: string
}

export default function CustomerJourneyTracking() {
  const [journeys, setJourneys] = useState<CustomerJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [journeyStages] = useState<JourneyStage[]>([
    {
      name: 'Awareness',
      events: ['page_view', 'email_open'],
      color: 'bg-blue-500',
      description: 'Customer discovers your brand'
    },
    {
      name: 'Interest',
      events: ['product_view', 'email_click'],
      color: 'bg-green-500',
      description: 'Customer shows interest in products'
    },
    {
      name: 'Consideration',
      events: ['add_to_cart', 'sms_click'],
      color: 'bg-yellow-500',
      description: 'Customer considers purchasing'
    },
    {
      name: 'Purchase',
      events: ['purchase'],
      color: 'bg-purple-500',
      description: 'Customer makes a purchase'
    },
    {
      name: 'Retention',
      events: ['review_submit', 'chat_start'],
      color: 'bg-pink-500',
      description: 'Customer engages post-purchase'
    }
  ])

  const [selectedJourney, setSelectedJourney] = useState<CustomerJourney | null>(null)
  const [activeTab, setActiveTab] = useState('journeys')
  const [timeRange, setTimeRange] = useState('7d')
  const [eventFilter, setEventFilter] = useState('all')

  // Load journey data from API
  const loadJourneys = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiService.getCustomerJourneys(timeRange, eventFilter) as any
      const journeysData = Array.isArray(data) ? data : (data?.data || [])
      setJourneys(journeysData)
    } catch (err: any) {
      console.error('Error loading journeys:', err)
      setError('Failed to load journey data')
      setJourneys([])
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadJourneys()
  }, [timeRange, eventFilter])

  // Set up real-time updates
  useEffect(() => {
    if (!socketService.isConnected()) {
      socketService.connect()
    }

    // Subscribe to user activity updates
    const unsubscribeUserAction = socketService.subscribe('user-action-update', (data: any) => {
      // Reload journeys when new activity occurs
      loadJourneys()
    })

    // Subscribe to page view updates
    const unsubscribePageView = socketService.subscribe('page-view-update', (data: any) => {
      loadJourneys()
    })

    // Subscribe to cart updates
    const unsubscribeCart = socketService.subscribe('cart-update', (data: any) => {
      loadJourneys()
    })

    return () => {
      unsubscribeUserAction()
      unsubscribePageView()
      unsubscribeCart()
    }
  }, [])

  const totalStats = {
    totalCustomers: journeys.length,
    totalEvents: journeys.reduce((sum, j) => sum + j.totalEvents, 0),
    totalValue: journeys.reduce((sum, j) => sum + j.totalValue, 0),
    activeCustomers: journeys.filter(j => j.status === 'active').length
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'page_view': return <Eye className="h-4 w-4" />
      case 'product_view': return <Eye className="h-4 w-4" />
      case 'add_to_cart': return <ShoppingCart className="h-4 w-4" />
      case 'purchase': return <ShoppingCart className="h-4 w-4" />
      case 'email_open': return <Mail className="h-4 w-4" />
      case 'email_click': return <Mail className="h-4 w-4" />
      case 'sms_click': return <MessageSquare className="h-4 w-4" />
      case 'push_click': return <Bell className="h-4 w-4" />
      case 'chat_start': return <MessageSquare className="h-4 w-4" />
      case 'review_submit': return <Heart className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'page_view': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'product_view': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'add_to_cart': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'purchase': return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200'
      case 'email_open': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-200'
      case 'email_click': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-200'
      case 'sms_click': return 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900 dark:text-cyan-200'
      case 'push_click': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'chat_start': return 'text-pink-600 bg-pink-100 dark:bg-pink-900 dark:text-pink-200'
      case 'review_submit': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'at-risk': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'churned': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const tabs = [
    { id: 'journeys', label: 'Customer Journeys', icon: MapPin },
    { id: 'events', label: 'Event Analytics', icon: TrendingUp },
    { id: 'stages', label: 'Journey Stages', icon: Clock }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Customer Journey Tracking
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track and analyze customer interactions across all touchpoints
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Customers</h3>
              <p className="text-3xl font-bold">{totalStats.totalCustomers}</p>
            </div>
            <User className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Events</h3>
              <p className="text-3xl font-bold">{totalStats.totalEvents}</p>
            </div>
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Value</h3>
              <p className="text-3xl font-bold">₹{(totalStats.totalValue / 100000).toFixed(1)}L</p>
            </div>
            <ShoppingCart className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Customers</h3>
              <p className="text-3xl font-bold">{totalStats.activeCustomers}</p>
            </div>
            <Heart className="h-8 w-8" />
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
          {/* Customer Journeys Tab */}
          {activeTab === 'journeys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Customer Journeys
                </h3>
                <div className="flex space-x-2">
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="all">All Events</option>
                    <option value="page_view">Page Views</option>
                    <option value="product_view">Product Views</option>
                    <option value="add_to_cart">Add to Cart</option>
                    <option value="purchase">Purchases</option>
                    <option value="email_open">Email Opens</option>
                  </select>
                  <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-slate-600 dark:text-slate-400">Loading journey data...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <button
                    onClick={loadJourneys}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : journeys.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 dark:text-slate-400">No journey data found for the selected time range.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {journeys.map((journey) => (
                    <div key={journey.customerId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-200 font-bold">
                              {journey.customerName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {journey.customerName}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {journey.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
                            <p className="font-semibold text-green-600">₹{journey.totalValue.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Events</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{journey.totalEvents}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(journey.status)}`}>
                            {journey.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex space-x-4 text-sm text-slate-600 dark:text-slate-400">
                          <span>First seen: {new Date(journey.firstSeen).toLocaleDateString()}</span>
                          <span>Last seen: {new Date(journey.lastSeen).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => setSelectedJourney(journey)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          View Journey
                        </button>
                      </div>
                      
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <span className="text-slate-600 dark:text-slate-400">Website: {journey.touchpoints.website}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4 text-indigo-500" />
                          <span className="text-slate-600 dark:text-slate-400">Email: {journey.touchpoints.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4 text-cyan-500" />
                          <span className="text-slate-600 dark:text-slate-400">SMS: {journey.touchpoints.sms}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Bell className="h-4 w-4 text-orange-500" />
                          <span className="text-slate-600 dark:text-slate-400">Push: {journey.touchpoints.push}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4 text-pink-500" />
                          <span className="text-slate-600 dark:text-slate-400">Chat: {journey.touchpoints.chat}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event Analytics Tab */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Event Analytics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {journeyStages.map((stage) => (
                  <div key={stage.name} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-8 h-8 ${stage.color} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">
                          {stage.name.charAt(0)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {stage.name}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {stage.description}
                    </p>
                    <div className="space-y-2">
                      {stage.events.map((event, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {getEventIcon(event)}
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {event.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              </div>
          )}

          {/* Journey Stages Tab */}
          {activeTab === 'stages' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Journey Stage Analysis
              </h3>
              
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Customer Journey Flow
                  </h4>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Last 30 days
                  </div>
                </div>
                
                <div className="space-y-4">
                  {journeyStages.map((stage, index) => (
                    <div key={stage.name} className="flex items-center">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${stage.color} rounded-full flex items-center justify-center text-white font-bold`}>
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                            {stage.name}
                          </h5>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                      {index < journeyStages.length - 1 && (
                        <div className="flex-1 mx-4">
                          <div className="h-0.5 bg-slate-200 dark:bg-slate-700 relative">
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-slate-300 dark:border-l-slate-600 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Journey Details Modal */}
      {selectedJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Journey Details: {selectedJourney.customerName}
              </h3>
              <button
                onClick={() => setSelectedJourney(null)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedJourney.totalEvents}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Events</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">₹{selectedJourney.totalValue.toLocaleString()}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.ceil((new Date(selectedJourney.lastSeen).getTime() - new Date(selectedJourney.firstSeen).getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Days Active</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Event Timeline
                </h4>
                <div className="space-y-3">
                  {selectedJourney.events.map((event) => (
                    <div key={event.id} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className={`p-2 rounded-full ${getEventColor(event.eventType)}`}>
                        {getEventIcon(event.eventType)}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                          {event.eventName}
                        </h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {event.timestamp}
                        </p>
                        {event.details.product && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Product: {event.details.product}
                          </p>
                        )}
                        {event.details.value && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Value: ₹{event.details.value.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Journey Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Customer Journey Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Track All Touchpoints</h3>
            <p className="text-sm opacity-90">
              Monitor customer interactions across all channels to get a complete picture.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Identify Pain Points</h3>
            <p className="text-sm opacity-90">
              Use journey data to identify where customers drop off and optimize those areas.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Personalize Experiences</h3>
            <p className="text-sm opacity-90">
              Use journey insights to deliver personalized experiences at each stage.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
