import React, { useState, useEffect } from 'react'
import { 
  MessageCircle, Users, Send, BarChart3, Calendar, Target, Eye, 
  MousePointer, Clock, TrendingUp, Filter, Plus, Smartphone, Settings,
  ShoppingCart, Package, Star, Tag, XCircle, Mail, Bell, CheckCircle, Edit, Trash2
} from 'lucide-react'
import apiService from '../../services/api'

interface WhatsAppNotification {
  id: string
  title: string
  message: string
  status: 'draft' | 'scheduled' | 'sent' | 'paused'
  type: 'add_to_cart' | 'purchase' | 'review' | 'promotion' | 'cancellation' | 'welcome' | 'push'
  audience: string
  scheduledDate?: string
  sentDate?: string
  recipients: number
  deliveryRate: number
  openRate: number
  clickRate: number
  conversionRate: number
  revenue: number
}

interface WhatsAppTemplate {
  id: string
  name: string
  category: string
  type: 'add_to_cart' | 'purchase' | 'review' | 'promotion' | 'cancellation' | 'welcome' | 'push'
  title: string
  message: string
  isCustom: boolean
}

interface WhatsAppAutomation {
  id: string
  name: string
  trigger: string
  condition: string
  action: string
  notificationType: 'add_to_cart' | 'purchase' | 'review' | 'promotion' | 'cancellation' | 'welcome' | 'push'
  isActive: boolean
  messagesSent: number
  conversionRate: number
}

interface WhatsAppSettings {
  isEnabled: boolean
  allowWelcome: boolean
  allowPromotional: boolean
  allowTransactional: boolean
  allowCart: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  frequencyLimit: {
    enabled: boolean
    maxPerDay: number
  }
  whatsappBusinessAccountId?: string
  phoneNumber?: string
  apiToken?: string
}

export default function WhatsAppNotifications() {
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [automations, setAutomations] = useState<WhatsAppAutomation[]>([])
  const [settings, setSettings] = useState<WhatsAppSettings>({
    isEnabled: true,
    allowWelcome: true,
    allowPromotional: true,
    allowTransactional: true,
    allowCart: true,
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
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showCreateAutomation, setShowCreateAutomation] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<WhatsAppNotification | null>(null)
  const [selectedType, setSelectedType] = useState<'add_to_cart' | 'purchase' | 'review' | 'promotion' | 'cancellation' | 'welcome' | 'push'>('welcome')
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'all'
  })
  
  // Template form state
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    category: '',
    type: 'welcome' as any,
    title: '',
    message: '',
    isCustom: true
  })
  
  // Automation form state
  const [automationFormData, setAutomationFormData] = useState({
    name: '',
    trigger: '',
    condition: '',
    action: '',
    notificationType: 'welcome' as any,
    isActive: true
  })
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadWhatsAppData()
  }, [])

  const loadWhatsAppData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Use mock data for now since we're focusing on UI
      const mockNotifications: WhatsAppNotification[] = [
        {
          id: '1',
          title: 'Welcome to Nefol!',
          message: 'Welcome to Nefol! Enjoy 10% off your first order with code WELCOME10',
          status: 'sent',
          type: 'welcome',
          audience: 'all',
          sentDate: new Date().toISOString(),
          recipients: 1523,
          deliveryRate: 98.5,
          openRate: 87.2,
          clickRate: 23.4,
          conversionRate: 12.5,
          revenue: 45678
        },
        {
          id: '2',
          title: 'Your Cart is Waiting!',
          message: 'You have items in your cart! Complete your purchase now and save 15%',
          status: 'sent',
          type: 'add_to_cart',
          audience: 'cart_abandoners',
          sentDate: new Date().toISOString(),
          recipients: 842,
          deliveryRate: 97.8,
          openRate: 65.3,
          clickRate: 31.2,
          conversionRate: 18.9,
          revenue: 32145
        },
        {
          id: '3',
          title: 'Order Confirmed!',
          message: 'Your order #12345 has been confirmed and is being processed',
          status: 'sent',
          type: 'purchase',
          audience: 'purchasers',
          sentDate: new Date().toISOString(),
          recipients: 1205,
          deliveryRate: 99.2,
          openRate: 92.1,
          clickRate: 15.3,
          conversionRate: 8.7,
          revenue: 28934
        },
        {
          id: '4',
          title: 'Share Your Experience!',
          message: 'How was your purchase? We\'d love to hear from you!',
          status: 'sent',
          type: 'review',
          audience: 'recent_purchasers',
          sentDate: new Date().toISOString(),
          recipients: 589,
          deliveryRate: 96.5,
          openRate: 52.3,
          clickRate: 28.7,
          conversionRate: 12.4,
          revenue: 12567
        }
      ]
      
      const mockTemplates: WhatsAppTemplate[] = [
        {
          id: '1',
          name: 'Welcome Message',
          category: 'Onboarding',
          type: 'welcome',
          title: 'Welcome to Nefol!',
          message: 'Welcome to Nefol! Enjoy {{discount}}% off your first order with code {{code}}',
          isCustom: false
        },
        {
          id: '2',
          name: 'Add to Cart Reminder',
          category: 'Abandoned Cart',
          type: 'add_to_cart',
          title: 'Your Cart is Waiting!',
          message: 'You have {{item_count}} items in your cart! Complete your purchase now',
          isCustom: false
        },
        {
          id: '3',
          name: 'Order Confirmation',
          category: 'Transactional',
          type: 'purchase',
          title: 'Order Confirmed!',
          message: 'Your order #{{order_number}} has been confirmed and is being processed',
          isCustom: false
        },
        {
          id: '4',
          name: 'Review Request',
          category: 'Engagement',
          type: 'review',
          title: 'Share Your Experience!',
          message: 'How was your purchase of {{product_name}}? We\'d love to hear from you!',
          isCustom: false
        },
        {
          id: '5',
          name: 'Promotion Alert',
          category: 'Marketing',
          type: 'promotion',
          title: 'Special Offer Inside!',
          message: '{{product_name}} is now {{discount}}% off! Limited time only',
          isCustom: false
        },
        {
          id: '6',
          name: 'Order Cancellation',
          category: 'Transactional',
          type: 'cancellation',
          title: 'Order Cancelled',
          message: 'Your order #{{order_number}} has been cancelled as requested',
          isCustom: false
        },
        {
          id: '7',
          name: 'Product Back in Stock',
          category: 'Product Updates',
          type: 'push',
          title: 'Back in Stock!',
          message: '{{product_name}} is back in stock! Order now before it\'s gone',
          isCustom: false
        }
      ]
      
      setNotifications(mockNotifications)
      setTemplates(mockTemplates)
      setAutomations([])
    } catch (err) {
      console.error('Failed to load WhatsApp data:', err)
      setError('Failed to load WhatsApp notification data')
    } finally {
      setLoading(false)
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesStatus = filterStatus === 'all' || notification.status === filterStatus
    const matchesType = filterType === 'all' || notification.type === filterType
    const matchesSearch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  const totalStats = {
    totalNotifications: filteredNotifications.length,
    totalRecipients: filteredNotifications.reduce((sum, notification) => sum + notification.recipients, 0),
    averageDeliveryRate: filteredNotifications.length > 0 ? filteredNotifications.reduce((sum, notification) => sum + notification.deliveryRate, 0) / filteredNotifications.length : 0,
    totalRevenue: filteredNotifications.reduce((sum, notification) => sum + notification.revenue, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'welcome': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'add_to_cart': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'purchase': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'promotion': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'cancellation': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'push': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return <Mail className="h-5 w-5" />
      case 'add_to_cart': return <ShoppingCart className="h-5 w-5" />
      case 'purchase': return <Package className="h-5 w-5" />
      case 'review': return <Star className="h-5 w-5" />
      case 'promotion': return <Tag className="h-5 w-5" />
      case 'cancellation': return <XCircle className="h-5 w-5" />
      case 'push': return <Bell className="h-5 w-5" />
      default: return <MessageCircle className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'welcome': return 'Welcome'
      case 'add_to_cart': return 'Add to Cart'
      case 'purchase': return 'Purchase'
      case 'review': return 'Review'
      case 'promotion': return 'Promotion'
      case 'cancellation': return 'Cancellation'
      case 'push': return 'Push Update'
      default: return type
    }
  }

  const handleUseTemplate = (template: WhatsAppTemplate) => {
    setSelectedType(template.type)
    setFormData({
      title: template.title,
      message: template.message,
      audience: 'all'
    })
    setShowCreateNotification(true)
  }

  const handlePreviewTemplate = (template: WhatsAppTemplate) => {
    alert(`Preview: ${template.title}\n\n${template.message}`)
  }

  const handleViewNotification = (notification: WhatsAppNotification) => {
    setSelectedNotification(notification)
    setShowViewModal(true)
  }

  const handleEditNotification = (notification: WhatsAppNotification) => {
    setSelectedType(notification.type)
    setFormData({
      title: notification.title,
      message: notification.message,
      audience: notification.audience
    })
    setShowCreateNotification(true)
  }

  const handleDeleteNotification = (id: string) => {
    if (confirm('Are you sure you want to delete this notification?')) {
      setNotifications(notifications.filter(n => n.id !== id))
      alert('Notification deleted successfully!')
    }
  }

  const handleSendNotification = () => {
    if (!formData.title || !formData.message) {
      alert('Please fill in all required fields')
      return
    }

    const newNotification: WhatsAppNotification = {
      id: Date.now().toString(),
      title: formData.title,
      message: formData.message,
      status: 'sent',
      type: selectedType,
      audience: formData.audience,
      sentDate: new Date().toISOString(),
      recipients: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0,
      revenue: 0
    }

    setNotifications([newNotification, ...notifications])
    setShowCreateNotification(false)
    setFormData({ title: '', message: '', audience: 'all' })
    alert('WhatsApp notification sent successfully!')
  }

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    alert('Settings saved successfully!')
    setShowSettings(false)
  }
  
  const handleCreateTemplate = () => {
    if (!templateFormData.name || !templateFormData.title || !templateFormData.message) {
      alert('Please fill in all required fields')
      return
    }
    
    const newTemplate: WhatsAppTemplate = {
      id: Date.now().toString(),
      ...templateFormData,
      category: templateFormData.category || 'Custom'
    }
    
    setTemplates([...templates, newTemplate])
    setShowCreateTemplate(false)
    setTemplateFormData({
      name: '',
      category: '',
      type: 'welcome',
      title: '',
      message: '',
      isCustom: true
    })
    alert('Template created successfully!')
  }
  
  const handleCreateAutomation = () => {
    if (!automationFormData.name || !automationFormData.trigger || !automationFormData.action) {
      alert('Please fill in all required fields')
      return
    }
    
    const newAutomation: WhatsAppAutomation = {
      id: Date.now().toString(),
      ...automationFormData,
      messagesSent: 0,
      conversionRate: 0
    }
    
    setAutomations([...automations, newAutomation])
    setShowCreateAutomation(false)
    setAutomationFormData({
      name: '',
      trigger: '',
      condition: '',
      action: '',
      notificationType: 'welcome',
      isActive: true
    })
    alert('Automation created successfully!')
  }
  
  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id))
      alert('Template deleted successfully!')
    }
  }
  
  const handleDeleteAutomation = (id: string) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      setAutomations(automations.filter(a => a.id !== id))
      alert('Automation deleted successfully!')
    }
  }
  
  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    ))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading WhatsApp notifications...</p>
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
              onClick={loadWhatsAppData}
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
            WhatsApp Notifications
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage WhatsApp notifications for your customers - Add to Cart, Purchase, Review, Promotions, Cancellations, Welcome, and more
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadWhatsAppData}
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
            onClick={() => {
              setShowCreateNotification(true)
              setFormData({ title: '', message: '', audience: 'all' })
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Send Notification</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Notifications</h3>
              <p className="text-3xl font-bold">{totalStats.totalNotifications}</p>
            </div>
            <MessageCircle className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
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

      {/* Quick Send Buttons */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Quick Send Notification
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {['welcome', 'add_to_cart', 'purchase', 'review', 'promotion', 'cancellation', 'push'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type as any)
                setFormData({ title: '', message: '', audience: 'all' })
                setShowCreateNotification(true)
              }}
              className="p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
            >
              <div className="flex justify-center mb-2">
                {getTypeIcon(type)}
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{getTypeLabel(type)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Status */}
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Allowed Types
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Welcome</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Add to Cart</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Purchase</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Review</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Meta Integration
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Connected to WhatsApp Business API
            </p>
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Active</span>
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

      {/* Recent Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Recent Notifications
          </h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm"
            />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="paused">Paused</option>
            </select>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm"
            >
              <option value="all">All Types</option>
              <option value="welcome">Welcome</option>
              <option value="add_to_cart">Add to Cart</option>
              <option value="purchase">Purchase</option>
              <option value="review">Review</option>
              <option value="promotion">Promotion</option>
              <option value="cancellation">Cancellation</option>
              <option value="push">Push Update</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Notification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Delivery Rate
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
              {filteredNotifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTypeIcon(notification.type)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(notification.type)}`}>
                        {getTypeLabel(notification.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
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
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                      {notification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {notification.recipients.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {notification.deliveryRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ₹{notification.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleViewNotification(notification)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleEditNotification(notification)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            WhatsApp Templates
          </h2>
          <button
            onClick={() => {
              setTemplateFormData({
                name: '',
                category: '',
                type: 'welcome',
                title: '',
                message: '',
                isCustom: true
              })
              setShowCreateTemplate(true)
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {template.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(template.type)}`}>
                  {getTypeLabel(template.type)}
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
                <button 
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Use Template
                </button>
                <button 
                  onClick={() => handlePreviewTemplate(template)}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Preview
                </button>
                <button 
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automations Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            WhatsApp Automations
          </h2>
          <button
            onClick={() => {
              setAutomationFormData({
                name: '',
                trigger: '',
                condition: '',
                action: '',
                notificationType: 'welcome',
                isActive: true
              })
              setShowCreateAutomation(true)
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Automation</span>
          </button>
        </div>
        
        {automations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-4">No automations yet</p>
            <button
              onClick={() => {
                setAutomationFormData({
                  name: '',
                  trigger: '',
                  condition: '',
                  action: '',
                  notificationType: 'welcome',
                  isActive: true
                })
                setShowCreateAutomation(true)
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Your First Automation
            </button>
          </div>
        ) : (
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
                    <button
                      onClick={() => toggleAutomation(automation.id)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        automation.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {automation.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteAutomation(automation.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
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
                    <p className="font-medium text-slate-900 dark:text-slate-100">{automation.condition || 'None'}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Action:</span>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{automation.action}</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex space-x-4">
                    <span className="text-slate-600 dark:text-slate-400">
                      Messages Sent: <span className="font-semibold">{automation.messagesSent}</span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Conversion Rate: <span className="font-semibold text-green-600">{automation.conversionRate}%</span>
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(automation.notificationType)}`}>
                    {getTypeLabel(automation.notificationType)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Notification Modal */}
      {showCreateNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Send WhatsApp Notification
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Type
                </label>
                <select 
                  value={selectedType} 
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="welcome">Welcome</option>
                  <option value="add_to_cart">Add to Cart</option>
                  <option value="purchase">Purchase</option>
                  <option value="review">Review</option>
                  <option value="promotion">Promotion</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="push">Push Update</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter notification title"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Message
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter notification message (max 4096 characters for WhatsApp)"
                  maxLength={4096}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Target Audience
                </label>
                <select 
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All Customers</option>
                  <option value="new">New Customers</option>
                  <option value="vip">VIP Customers</option>
                  <option value="cart_abandoners">Cart Abandoners</option>
                  <option value="recent_purchasers">Recent Purchasers</option>
                </select>
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
                onClick={handleSendNotification}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Notification Modal */}
      {showViewModal && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Notification Details
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Type</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{getTypeLabel(selectedNotification.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.status}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Title</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Message</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Recipients</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.recipients}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Delivery Rate</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.deliveryRate}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Rate</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.openRate}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Conversion Rate</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNotification.conversionRate}%</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Revenue</p>
                <p className="text-sm text-green-600">₹{selectedNotification.revenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
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
              WhatsApp Notification Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Enable WhatsApp Notifications</span>
                <input 
                  type="checkbox" 
                  checked={settings.isEnabled} 
                  onChange={(e) => setSettings({...settings, isEnabled: e.target.checked})}
                  className="rounded" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Welcome Messages</span>
                <input 
                  type="checkbox" 
                  checked={settings.allowWelcome} 
                  onChange={(e) => setSettings({...settings, allowWelcome: e.target.checked})}
                  className="rounded" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Promotional</span>
                <input 
                  type="checkbox" 
                  checked={settings.allowPromotional} 
                  onChange={(e) => setSettings({...settings, allowPromotional: e.target.checked})}
                  className="rounded" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Transactional</span>
                <input 
                  type="checkbox" 
                  checked={settings.allowTransactional} 
                  onChange={(e) => setSettings({...settings, allowTransactional: e.target.checked})}
                  className="rounded" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Allow Cart Notifications</span>
                <input 
                  type="checkbox" 
                  checked={settings.allowCart} 
                  onChange={(e) => setSettings({...settings, allowCart: e.target.checked})}
                  className="rounded" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Quiet Hours Start
                </label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => setSettings({...settings, quietHours: {...settings.quietHours, start: e.target.value}})}
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
                  onChange={(e) => setSettings({...settings, quietHours: {...settings.quietHours, end: e.target.value}})}
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
                  onChange={(e) => setSettings({...settings, frequencyLimit: {...settings.frequencyLimit, maxPerDay: parseInt(e.target.value)}})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Create WhatsApp Template
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  placeholder="e.g., Welcome Message"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                  placeholder="e.g., Onboarding, Marketing"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Type *
                </label>
                <select 
                  value={templateFormData.type} 
                  onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="welcome">Welcome</option>
                  <option value="add_to_cart">Add to Cart</option>
                  <option value="purchase">Purchase</option>
                  <option value="review">Review</option>
                  <option value="promotion">Promotion</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="push">Push Update</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={templateFormData.title}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                  placeholder="Enter template title"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Message *
                </label>
                <textarea
                  rows={4}
                  value={templateFormData.message}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, message: e.target.value })}
                  placeholder="Enter template message (use {{variable}} for dynamic content)"
                  maxLength={4096}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCreateTemplate(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Automation Modal */}
      {showCreateAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Create WhatsApp Automation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Automation Name *
                </label>
                <input
                  type="text"
                  value={automationFormData.name}
                  onChange={(e) => setAutomationFormData({ ...automationFormData, name: e.target.value })}
                  placeholder="e.g., Welcome New Users"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Trigger *
                </label>
                <select 
                  value={automationFormData.trigger} 
                  onChange={(e) => setAutomationFormData({ ...automationFormData, trigger: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select a trigger...</option>
                  <option value="user_signs_up">User Signs Up</option>
                  <option value="cart_abandoned">Cart Abandoned</option>
                  <option value="order_placed">Order Placed</option>
                  <option value="order_delivered">Order Delivered</option>
                  <option value="product_back_in_stock">Product Back in Stock</option>
                  <option value="user_inactive_7_days">User Inactive for 7 Days</option>
                  <option value="birthday">Customer Birthday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Condition (Optional)
                </label>
                <input
                  type="text"
                  value={automationFormData.condition}
                  onChange={(e) => setAutomationFormData({ ...automationFormData, condition: e.target.value })}
                  placeholder="e.g., Only for VIP customers"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Action *
                </label>
                <select 
                  value={automationFormData.action} 
                  onChange={(e) => setAutomationFormData({ ...automationFormData, action: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select an action...</option>
                  <option value="send_welcome_message">Send Welcome Message</option>
                  <option value="send_cart_reminder">Send Cart Reminder</option>
                  <option value="send_order_confirmation">Send Order Confirmation</option>
                  <option value="request_review">Request Product Review</option>
                  <option value="send_promotion">Send Promotion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notification Type *
                </label>
                <select 
                  value={automationFormData.notificationType} 
                  onChange={(e) => setAutomationFormData({ ...automationFormData, notificationType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="welcome">Welcome</option>
                  <option value="add_to_cart">Add to Cart</option>
                  <option value="purchase">Purchase</option>
                  <option value="review">Review</option>
                  <option value="promotion">Promotion</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="push">Push Update</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCreateAutomation(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAutomation}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
