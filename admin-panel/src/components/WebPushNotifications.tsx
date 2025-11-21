import React, { useState, useEffect } from 'react'
import { Bell, Users, Send, BarChart3, Calendar, Target, Eye, MousePointer, Clock, TrendingUp, Filter, Plus, Smartphone, Settings } from 'lucide-react'
import apiService from '../services/api'

interface PushNotification {
  id: string
  title: string
  message: string
  status: 'draft' | 'scheduled' | 'sent' | 'paused'
  type: 'promotional' | 'transactional' | 'reminder' | 'announcement' | 'abandoned_cart'
  audience: string
  scheduledDate?: string
  sentDate?: string
  recipients: number
  deliveryRate: number
  openRate: number
  clickRate: number
  conversionRate: number
  revenue: number
  imageUrl?: string
  actionUrl?: string
}

interface PushTemplate {
  id: string
  name: string
  category: string
  title: string
  message: string
  isCustom: boolean
}

interface PushAutomation {
  id: string
  name: string
  trigger: string
  condition: string
  action: string
  isActive: boolean
  notificationsSent: number
  conversionRate: number
}

interface PushSettings {
  isEnabled: boolean
  allowPromotional: boolean
  allowTransactional: boolean
  allowReminders: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  frequencyLimit: {
    enabled: boolean
    maxPerDay: number
  }
}

export default function WebPushNotifications() {
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [templates, setTemplates] = useState<PushTemplate[]>([])
  const [automations, setAutomations] = useState<PushAutomation[]>([])
  const [settings, setSettings] = useState<PushSettings>({
    isEnabled: true,
    allowPromotional: true,
    allowTransactional: true,
    allowReminders: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    },
    frequencyLimit: {
      enabled: true,
      maxPerDay: 3
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateNotification, setShowCreateNotification] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<PushNotification | null>(null)

  useEffect(() => {
    loadPushData()
  }, [])

  const loadPushData = async () => {
    try {
      setLoading(true)
      setError('')
      const [notificationsData, templatesData, automationsData] = await Promise.all([
        apiService.getPushNotifications().catch(() => [] as PushNotification[]),
        apiService.getPushTemplates().catch(() => [] as PushTemplate[]),
        apiService.getPushAutomations().catch(() => [] as PushAutomation[])
      ])
      
      setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
      setTemplates(Array.isArray(templatesData) ? templatesData : [])
      setAutomations(Array.isArray(automationsData) ? automationsData : [])
    } catch (err) {
      console.error('Failed to load push notification data:', err)
      setError('Failed to load push notification data')
    } finally {
      setLoading(false)
    }
  }

  const totalStats = {
    totalNotifications: notifications.length,
    totalRecipients: notifications.length > 0 ? notifications.reduce((sum, notification) => sum + notification.recipients, 0) : 0,
    averageDeliveryRate: notifications.length > 0 ? notifications.reduce((sum, notification) => sum + notification.deliveryRate, 0) / notifications.length : 0,
    totalRevenue: notifications.length > 0 ? notifications.reduce((sum, notification) => sum + notification.revenue, 0) : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      case 'scheduled': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'sent': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'paused': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'promotional': return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200'
      case 'transactional': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'reminder': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'announcement': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'abandoned_cart': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading push notification data...</p>
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
              onClick={loadPushData}
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
            Web Push Notifications
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Send real-time notifications to engage customers instantly
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadPushData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setShowCreateNotification(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Notification</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Notifications</h3>
              <p className="text-3xl font-bold">{totalStats.totalNotifications}</p>
            </div>
            <Bell className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Recipients</h3>
              <p className="text-3xl font-bold">{totalStats.totalRecipients.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Avg Delivery Rate</h3>
              <p className="text-3xl font-bold">{totalStats.averageDeliveryRate.toFixed(1)}%</p>
            </div>
            <Send className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Revenue</h3>
              <p className="text-3xl font-bold">₹{totalStats.totalRevenue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Notification Settings Status */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Notification Settings
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            settings.isEnabled 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {settings.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Allowed Types
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.allowPromotional} readOnly className="rounded" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Promotional</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.allowTransactional} readOnly className="rounded" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Transactional</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.allowReminders} readOnly className="rounded" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Reminders</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Quiet Hours
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {settings.quietHours.enabled 
                ? `${settings.quietHours.start} - ${settings.quietHours.end}`
                : 'Disabled'
              }
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Frequency Limit
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {settings.frequencyLimit.enabled 
                ? `Max ${settings.frequencyLimit.maxPerDay} per day`
                : 'No limit'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Push Notifications
          </h2>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
              <Filter className="h-4 w-4 inline mr-1" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Notification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {notification.message}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(notification.type)}`}>
                      {notification.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                      {notification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {notification.recipients.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {notification.openRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ₹{notification.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedNotification(notification)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Push Templates */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Push Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {template.name}
                </h3>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  {template.category}
                </span>
              </div>
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  {template.title}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {template.message}
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                  Use Template
                </button>
                <button className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Push Automations */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Push Automations
          </h2>
          <button
            onClick={() => setShowCreateNotification(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Automation</span>
          </button>
        </div>

        <div className="space-y-4">
          {automations.map((automation) => (
            <div key={automation.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {automation.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    automation.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {automation.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Edit
                  </button>
                  <button className={`px-3 py-1 text-sm rounded transition-colors ${
                    automation.isActive
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}>
                    {automation.isActive ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Trigger:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{automation.trigger}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Condition:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{automation.condition}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Action:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{automation.action}</p>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex space-x-4">
                  <span className="text-slate-600 dark:text-slate-400">
                    Notifications Sent: <span className="font-semibold">{automation.notificationsSent}</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Conversion Rate: <span className="font-semibold text-green-600">{automation.conversionRate}%</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Push Performance */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Push Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Top Performing Notifications
            </h3>
            <div className="space-y-3">
              {notifications
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 3)
                .map((notification, index) => (
                  <div key={notification.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {notification.conversionRate}% conversion rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ₹{notification.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Revenue
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Push Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Average Delivery Rate</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {totalStats.averageDeliveryRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Average Open Rate</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {notifications.reduce((sum, n) => sum + n.openRate, 0) / notifications.length}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Average Click Rate</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {notifications.reduce((sum, n) => sum + n.clickRate, 0) / notifications.length}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Total Revenue</span>
                <span className="font-semibold text-green-600">
                  ₹{totalStats.totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Push Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Push Notification Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Personalize Content</h3>
            <p className="text-sm opacity-90">
              Use customer data to personalize notifications with names, preferences, and behavior.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Optimal Timing</h3>
            <p className="text-sm opacity-90">
              Send notifications at times when customers are most likely to engage and convert.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Clear Call-to-Action</h3>
            <p className="text-sm opacity-90">
              Include compelling CTAs and direct links to drive immediate action from customers.
            </p>
          </div>
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Create Push Notification
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  placeholder="Enter notification title"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter notification message"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Type
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  <option>Promotional</option>
                  <option>Transactional</option>
                  <option>Reminder</option>
                  <option>Announcement</option>
                  <option>Abandoned Cart</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Target Audience
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  <option>All Subscribers</option>
                  <option>VIP Customers</option>
                  <option>New Customers</option>
                  <option>Cart Abandoners</option>
                  <option>Wishlist Users</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Action URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://nefol.com/shop"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCreateNotification(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreateNotification(false)
                  alert('Push notification created successfully!')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Push Notification Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Enable Push Notifications</span>
                <input type="checkbox" checked={settings.isEnabled} className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Promotional</span>
                <input type="checkbox" checked={settings.allowPromotional} className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Transactional</span>
                <input type="checkbox" checked={settings.allowTransactional} className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Reminders</span>
                <input type="checkbox" checked={settings.allowReminders} className="rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Quiet Hours Start
                </label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Quiet Hours End
                </label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Notifications Per Day
                </label>
                <input
                  type="number"
                  value={settings.frequencyLimit.maxPerDay}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettings(false)
                  alert('Settings saved successfully!')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
