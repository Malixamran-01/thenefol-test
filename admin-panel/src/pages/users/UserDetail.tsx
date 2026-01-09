import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, Star, Package, 
  ShoppingCart, CreditCard, Eye, Clock, Tag, MessageSquare, 
  TrendingUp, Activity, FileText, DollarSign, Users, Hash
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

interface UserData {
  user: {
    id: number
    name: string
    email: string
    phone: string
    is_verified: boolean
    created_at: string
    loyalty_points: number
    email_notifications: boolean
    sms_notifications: boolean
    push_notifications: boolean
    marketing_emails: boolean
    theme: string
    language: string
    currency: string
  }
  stats: {
    total_page_views: number
    total_sessions: number
    total_orders: number
    total_spent: number
    total_cart_additions: number
    total_form_submissions: number
    last_seen: string
    last_order_date: string
    last_page_viewed: string
    lifetime_value: number
  }
  addresses: Array<{
    id: number
    address_type: string
    full_name: string
    phone: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    postal_code: string
    country: string
    is_default: boolean
  }>
  orders: Array<{
    id: number
    order_number: string
    status: string
    total_amount: number
    created_at: string
    items: Array<{
      product_id: number
      product_name: string
      quantity: number
      price: number
      image_url: string
    }>
  }>
  activities: Array<{
    id: number
    activity_type: string
    activity_subtype: string
    page_url: string
    page_title: string
    product_name: string
    product_price: number
    quantity: number
    order_id: number
    form_type: string
    payment_amount: number
    payment_method: string
    payment_status: string
    created_at: string
  }>
  sessions: Array<{
    id: number
    session_id: string
    started_at: string
    last_activity: string
    ended_at: string
    device_type: string
    browser: string
    os: string
    city: string
    country: string
  }>
  notes: Array<{
    id: number
    note: string
    note_type: string
    admin_name: string
    created_at: string
  }>
  tags: string[]
  cart: Array<{
    id: number
    product_id: number
    product_name: string
    quantity: number
    price: number
    image_url: string
  }>
  wishlist: Array<{
    id: number
    product_id: number
    product_name: string
    price: number
    image_url: string
  }>
  activitySummary: Array<{
    activity_type: string
    activity_subtype: string
    count: number
    last_activity: string
  }>
  topPages: Array<{
    page_url: string
    page_title: string
    view_count: number
    last_viewed: string
  }>
  productInteractions: Array<{
    product_id: number
    product_name: string
    activity_type: string
    activity_subtype: string
    interaction_count: number
    last_interaction: string
  }>
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [newNote, setNewNote] = useState('')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [id])

  // Use centralized API URL utility that respects VITE_API_URL
  const fetchUserData = async () => {
    try {
      setLoading(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/${id}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
      } else {
        setError('Failed to fetch user details')
      }
    } catch (err) {
      setError('Failed to fetch user details')
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote, note_type: 'general' })
      })
      if (response.ok) {
        setNewNote('')
        fetchUserData()
      }
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  const addTag = async () => {
    if (!newTag.trim()) return
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag })
      })
      if (response.ok) {
        setNewTag('')
        fetchUserData()
      }
    } catch (err) {
      console.error('Failed to add tag:', err)
    }
  }

  const removeTag = async (tag: string) => {
    try {
      const apiBase = getApiBaseUrl()
      await fetch(`${apiBase}/users/${id}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag })
      })
      fetchUserData()
    } catch (err) {
      console.error('Failed to remove tag:', err)
    }
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      page_view: Eye,
      cart: ShoppingCart,
      order: Package,
      payment: CreditCard,
      form_submit: FileText,
      login: User
    }
    const Icon = icons[type] || Activity
    return <Icon className="h-4 w-4" />
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      page_view: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
      cart: 'text-green-600 bg-green-100 dark:bg-green-900/20',
      order: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
      payment: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
      form_submit: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
      login: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20'
    }
    return colors[type] || 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
  }

  const formatDate = (date: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error || 'User not found'}</p>
        <button onClick={() => navigate('/admin/users')} className="mt-4 text-blue-600">
          Back to Users
        </button>
      </div>
    )
  }

  const { user, stats, addresses, orders, activities, sessions, notes, tags, cart, wishlist, activitySummary, topPages, productInteractions } = userData

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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-[var(--arctic-blue-lighter)] rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 
              className="text-3xl font-light mb-2 tracking-[0.15em]" 
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              {user.name}
            </h1>
            <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              User ID: {user.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            user.is_verified 
              ? ''
              : ''
          }`}
          style={user.is_verified 
            ? { backgroundColor: '#D1FAE5', color: '#059669' }
            : { backgroundColor: '#FEF3C7', color: '#D97706' }
          }>
            {user.is_verified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_orders || 0}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.total_spent)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Page Views</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_page_views || 0}</p>
            </div>
            <Eye className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loyalty Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.loyalty_points || 0}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(user.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Last Seen</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(stats.last_seen)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Addresses</h3>
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <p className="text-sm text-gray-500">No addresses saved</p>
              ) : (
                addresses.map((address) => (
                  <div key={address.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                        {address.address_type}
                      </span>
                      {address.is_default && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{address.full_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {address.address_line1}
                      {address.address_line2 && `, ${address.address_line2}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {address.city}, {address.state} {address.postal_code}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{address.country}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart & Wishlist */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Cart</h3>
            <div className="space-y-2">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-500">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <ShoppingCart className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 text-gray-900 dark:text-white">{item.product_name}</span>
                    <span className="text-gray-600 dark:text-gray-400">×{item.quantity}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.price)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto">
                {['overview', 'orders', 'activity', 'sessions', 'notes'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-medium capitalize whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Activity Summary */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Activity Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {activitySummary.slice(0, 6).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getActivityColor(item.activity_type)}`}>
                              {getActivityIcon(item.activity_type)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {item.activity_type}
                              </p>
                              {item.activity_subtype && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                  {item.activity_subtype}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Pages */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Most Viewed Pages</h4>
                    <div className="space-y-2">
                      {topPages.slice(0, 5).map((page, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {page.page_title || page.page_url}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{page.page_url}</p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{page.view_count} views</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(page.last_viewed).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Product Interactions */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product Interactions</h4>
                    <div className="space-y-2">
                      {productInteractions.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                              {item.activity_type} - {item.activity_subtype}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{item.interaction_count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No orders yet</p>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Order #{order.order_number}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status}
                            </span>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                              {formatCurrency(order.total_amount)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span className="flex-1 text-gray-900 dark:text-white">{item.product_name}</span>
                              <span className="text-gray-600 dark:text-gray-400">×{item.quantity}</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No activities yet</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {activity.activity_type}
                            {activity.activity_subtype && ` - ${activity.activity_subtype}`}
                          </p>
                          {activity.page_title && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{activity.page_title}</p>
                          )}
                          {activity.product_name && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {activity.product_name}
                              {activity.product_price && ` - ${formatCurrency(activity.product_price)}`}
                            </p>
                          )}
                          {activity.payment_amount && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Payment: {formatCurrency(activity.payment_amount)} via {activity.payment_method}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === 'sessions' && (
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No sessions yet</p>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                              {session.session_id.substring(0, 12)}...
                            </span>
                          </div>
                          {session.ended_at ? (
                            <span className="text-xs text-gray-500">Ended</span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400">Active</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Started</p>
                            <p className="text-gray-900 dark:text-white">{formatDate(session.started_at)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Last Activity</p>
                            <p className="text-gray-900 dark:text-white">{formatDate(session.last_activity)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Device</p>
                            <p className="text-gray-900 dark:text-white">
                              {session.device_type || 'Unknown'} - {session.browser || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Location</p>
                            <p className="text-gray-900 dark:text-white">
                              {session.city && session.country ? `${session.city}, ${session.country}` : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note about this user..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                    />
                    <button
                      onClick={addNote}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Note
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No notes yet</p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">{note.note}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <span>By {note.admin_name || 'Admin'}</span>
                                <span>•</span>
                                <span>{formatDate(note.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

