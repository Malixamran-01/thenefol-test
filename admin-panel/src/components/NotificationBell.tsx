import React, { useState, useEffect } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import socketService from '../services/socket'

interface Notification {
  id: number
  notification_type: string
  title: string
  message: string
  link?: string
  icon?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'unread' | 'read' | 'archived'
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response: any = await apiService.getAdminNotifications('all', 20)
      if (response.data) {
        setNotifications(response.data)
        const unread = response.data.filter((n: Notification) => n.status === 'unread')
        setUnreadCount(unread.length)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response: any = await apiService.getAdminNotificationUnreadCount()
      if (response.data) {
        setUnreadCount(response.data.count)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Mark notification as read
  const markAsRead = async (id: number) => {
    try {
      await apiService.markNotificationAsRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, status: 'read' } : n)
      )
      fetchUnreadCount()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead()
      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'read' }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.link) {
      navigate(notification.link)
    }
    setIsOpen(false)
  }

  // Subscribe to real-time notifications
  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()

    // Subscribe to new notifications
    const unsubscribe = socketService.subscribe('new-notification', (data: Notification) => {
      setNotifications(prev => [data, ...prev])
      if (data.status === 'unread') {
        setUnreadCount(prev => prev + 1)
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-red-500 bg-red-50'
      case 'high': return 'border-l-4 border-orange-500 bg-orange-50'
      case 'medium': return 'border-l-4 border-yellow-500 bg-yellow-50'
      default: return 'border-l-4 border-blue-500 bg-blue-50'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${getPriorityColor(notification.priority)} ${notification.status === 'read' ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {notification.icon && (
                        <span className="text-2xl flex-shrink-0">{notification.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${notification.status === 'unread' ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {notification.status === 'unread' && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => navigate('/admin/notifications')}
                  className="w-full py-2 text-sm text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

