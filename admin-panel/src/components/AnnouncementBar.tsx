import React, { useState, useEffect } from 'react'
import { X, Bell, Gift, Truck, Star, Heart, AlertCircle } from 'lucide-react'

interface Announcement {
  id: string
  type: 'info' | 'success' | 'warning' | 'promotion' | 'shipping' | 'review'
  title: string
  message: string
  actionText?: string
  actionUrl?: string
  icon?: React.ReactNode
  color: string
  bgColor: string
  textColor: string
  isActive: boolean
  priority: number
  startDate?: string
  endDate?: string
}

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      type: 'promotion',
      title: '🎉 New Year Sale!',
      message: 'Get 25% off on all skincare products. Use code NEWYEAR2024',
      actionText: 'Shop Now',
      actionUrl: '#/shop',
      icon: <Gift className="h-5 w-5" />,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
      textColor: 'text-white',
      isActive: true,
      priority: 1,
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    },
    {
      id: '2',
      type: 'shipping',
      title: '🚚 Free Shipping',
      message: 'Free shipping on orders above ₹500. No minimum order required!',
      actionText: 'Learn More',
      actionUrl: '#/shipping',
      icon: <Truck className="h-5 w-5" />,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      textColor: 'text-white',
      isActive: true,
      priority: 2
    },
    {
      id: '3',
      type: 'review',
      title: '⭐ Rate Us',
      message: 'Love our products? Leave a review and help others discover Nefol!',
      actionText: 'Write Review',
      actionUrl: '#/reviews',
      icon: <Star className="h-5 w-5" />,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      textColor: 'text-white',
      isActive: true,
      priority: 3
    },
    {
      id: '4',
      type: 'info',
      title: '💝 Loyalty Program',
      message: 'Join our loyalty program and earn points on every purchase!',
      actionText: 'Join Now',
      actionUrl: '#/loyalty',
      icon: <Heart className="h-5 w-5" />,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      textColor: 'text-white',
      isActive: true,
      priority: 4
    }
  ])

  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([])
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Get active announcements that haven't been dismissed
    const activeAnnouncements = announcements
      .filter(announcement => 
        announcement.isActive && 
        !dismissedAnnouncements.includes(announcement.id)
      )
      .sort((a, b) => a.priority - b.priority)

    if (activeAnnouncements.length > 0) {
      setCurrentAnnouncement(activeAnnouncements[0])
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [announcements, dismissedAnnouncements])

  const handleDismiss = (announcementId: string) => {
    setDismissedAnnouncements(prev => [...prev, announcementId])
    setIsVisible(false)
  }

  const handleActionClick = (url: string) => {
    if (url.startsWith('#')) {
      window.location.hash = url
    } else {
      window.open(url, '_blank')
    }
  }

  if (!isVisible || !currentAnnouncement) {
    return null
  }

  return (
    <div className={`${currentAnnouncement.bgColor} ${currentAnnouncement.textColor} relative overflow-hidden`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-pulse"></div>
      </div>
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {currentAnnouncement.icon && (
                <div className="flex-shrink-0">
                  {currentAnnouncement.icon}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm sm:text-base">
                    {currentAnnouncement.title}
                  </span>
                  <span className="hidden sm:inline text-sm opacity-90">
                    {currentAnnouncement.message}
                  </span>
                </div>
                
                {/* Mobile message */}
                <div className="sm:hidden text-xs opacity-90 mt-1">
                  {currentAnnouncement.message}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              {currentAnnouncement.actionText && (
                <button
                  onClick={() => handleActionClick(currentAnnouncement.actionUrl || '#')}
                  className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white border-opacity-30"
                >
                  {currentAnnouncement.actionText}
                </button>
              )}
              
              <button
                onClick={() => handleDismiss(currentAnnouncement.id)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors duration-200"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black bg-opacity-20">
        <div className="h-full bg-white bg-opacity-50 animate-pulse"></div>
      </div>
    </div>
  )
}

// Admin component for managing announcements
export function AnnouncementBarAdmin() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  const announcementTypes = [
    { value: 'info', label: 'Information', icon: <Bell className="h-4 w-4" />, color: 'from-blue-500 to-cyan-500' },
    { value: 'success', label: 'Success', icon: <Star className="h-4 w-4" />, color: 'from-green-500 to-emerald-500' },
    { value: 'warning', label: 'Warning', icon: <AlertCircle className="h-4 w-4" />, color: 'from-yellow-500 to-orange-500' },
    { value: 'promotion', label: 'Promotion', icon: <Gift className="h-4 w-4" />, color: 'from-pink-500 to-rose-500' },
    { value: 'shipping', label: 'Shipping', icon: <Truck className="h-4 w-4" />, color: 'from-indigo-500 to-purple-500' },
    { value: 'review', label: 'Review', icon: <Heart className="h-4 w-4" />, color: 'from-purple-500 to-pink-500' }
  ]

  const handleCreateAnnouncement = (announcement: Omit<Announcement, 'id'>) => {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: Date.now().toString()
    }
    setAnnouncements(prev => [...prev, newAnnouncement])
    setShowForm(false)
  }

  const handleUpdateAnnouncement = (id: string, updates: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(announcement => 
      announcement.id === id ? { ...announcement, ...updates } : announcement
    ))
    setEditingAnnouncement(null)
  }

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(announcement => announcement.id !== id))
  }

  const toggleAnnouncementStatus = (id: string) => {
    setAnnouncements(prev => prev.map(announcement => 
      announcement.id === id ? { ...announcement, isActive: !announcement.isActive } : announcement
    ))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Announcement Bar Management
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      announcement.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {announcement.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {announcement.icon}
                      <span className="text-sm text-slate-900 dark:text-slate-100 capitalize">
                        {announcement.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                    {announcement.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {announcement.message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                    {announcement.priority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => toggleAnnouncementStatus(announcement.id)}
                      className={`px-3 py-1 rounded text-xs ${
                        announcement.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {announcement.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setEditingAnnouncement(announcement)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      {announcements.filter(a => a.isActive).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Preview
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <AnnouncementBar />
          </div>
        </div>
      )}
    </div>
  )
}
