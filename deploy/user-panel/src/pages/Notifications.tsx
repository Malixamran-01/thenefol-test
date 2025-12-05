import React, { useState, useEffect } from 'react'
import { Bell, Mail, X, CheckCircle, Package, XCircle, Clock, Trash2, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

interface Notification {
  id: number
  user_id: number
  notification_type: string
  title: string
  message: string
  link?: string
  icon?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'unread' | 'read' | 'archived'
  metadata?: any
  read_at?: string
  created_at: string
}

export default function Notifications() {
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const API_BASE = getApiBase()

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/user/notifications?status=${filter === 'all' ? 'all' : filter}`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || data || [])
      } else {
        console.error('Failed to fetch notifications')
        setNotifications([])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return

    try {
      const response = await fetch(`${API_BASE}/api/user/notifications/unread-count`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.data?.count || data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/user/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, status: 'read' as const, read_at: new Date().toISOString() } : n)
        )
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/user/notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, status: 'read' as const, read_at: new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/user/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    if (notification.icon) {
      return notification.icon
    }
    
    switch (notification.notification_type) {
      case 'order_placed':
        return <Package className="h-5 w-5 text-blue-600" />
      case 'order_cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'order_shipped':
        return <Truck className="h-5 w-5 text-blue-600" />
      case 'order_delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <Bell className="h-5 w-5 text-slate-600" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }, [isAuthenticated, filter])

  if (!isAuthenticated) {
    return (
      <main className="py-10 min-h-screen">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Please log in to view notifications</h1>
            <p className="text-gray-600">You need to be logged in to see your notifications.</p>
          </div>
        </div>
      </main>
    )
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return n.status === 'unread'
    if (filter === 'read') return n.status === 'read'
    return true
  })

  return (
    <main className="py-10 min-h-screen" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-600">
                  {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === f
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="mt-4 text-slate-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications</h3>
            <p className="text-slate-600">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                ? "No read notifications yet."
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm p-4 border-l-4 transition-all ${
                  notification.status === 'unread'
                    ? 'border-blue-600 bg-blue-50/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    {getNotificationIcon(notification)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={`font-semibold text-slate-900 mb-1 ${
                          notification.status === 'unread' ? 'font-bold' : ''
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{formatDate(notification.created_at)}</span>
                          {notification.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
