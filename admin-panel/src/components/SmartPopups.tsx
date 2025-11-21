import React, { useState, useEffect } from 'react'
import { X, Gift, Percent, Truck, Star, Heart, Clock, User, ShoppingCart, Mail } from 'lucide-react'

interface PopupTrigger {
  type: 'time' | 'scroll' | 'exit_intent' | 'page_views' | 'cart_abandonment' | 'first_visit'
  value: number
  unit?: 'seconds' | 'percent' | 'pages'
}

interface PopupContent {
  type: 'discount' | 'newsletter' | 'product' | 'review' | 'shipping' | 'loyalty'
  title: string
  message: string
  image?: string
  buttonText: string
  buttonUrl?: string
  discountCode?: string
  discountValue?: number
}

interface SmartPopup {
  id: string
  name: string
  isActive: boolean
  trigger: PopupTrigger
  content: PopupContent
  design: {
    backgroundColor: string
    textColor: string
    buttonColor: string
    borderRadius: string
    position: 'center' | 'bottom_right' | 'bottom_left' | 'top'
  }
  targeting: {
    pages: string[]
    devices: ('desktop' | 'mobile' | 'tablet')[]
    userSegments: string[]
  }
  analytics: {
    impressions: number
    conversions: number
    conversionRate: number
  }
}

export default function SmartPopups() {
  const [popups, setPopups] = useState<SmartPopup[]>([
    {
      id: '1',
      name: 'Welcome Discount',
      isActive: true,
      trigger: { type: 'time', value: 10, unit: 'seconds' },
      content: {
        type: 'discount',
        title: 'Welcome to Nefol! 🎉',
        message: 'Get 15% off your first order. Use code WELCOME15',
        image: '/popups/welcome-discount.jpg',
        buttonText: 'Shop Now',
        buttonUrl: '#/shop',
        discountCode: 'WELCOME15',
        discountValue: 15
      },
      design: {
        backgroundColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
        textColor: 'text-white',
        buttonColor: 'bg-white text-pink-600',
        borderRadius: 'rounded-xl',
        position: 'center'
      },
      targeting: {
        pages: ['home', 'shop'],
        devices: ['desktop', 'mobile', 'tablet'],
        userSegments: ['new_visitors']
      },
      analytics: {
        impressions: 1250,
        conversions: 187,
        conversionRate: 14.96
      }
    },
    {
      id: '2',
      name: 'Newsletter Signup',
      isActive: true,
      trigger: { type: 'scroll', value: 50, unit: 'percent' },
      content: {
        type: 'newsletter',
        title: 'Stay Beautiful! 💄',
        message: 'Subscribe to get beauty tips, exclusive offers, and new product updates.',
        image: '/popups/newsletter.jpg',
        buttonText: 'Subscribe',
        buttonUrl: '#/newsletter'
      },
      design: {
        backgroundColor: 'bg-gradient-to-r from-purple-500 to-indigo-500',
        textColor: 'text-white',
        buttonColor: 'bg-white text-purple-600',
        borderRadius: 'rounded-lg',
        position: 'bottom_right'
      },
      targeting: {
        pages: ['home', 'blog'],
        devices: ['desktop', 'tablet'],
        userSegments: ['returning_visitors']
      },
      analytics: {
        impressions: 890,
        conversions: 134,
        conversionRate: 15.06
      }
    },
    {
      id: '3',
      name: 'Cart Abandonment',
      isActive: true,
      trigger: { type: 'exit_intent', value: 0 },
      content: {
        type: 'discount',
        title: 'Wait! Don\'t miss out! 🛒',
        message: 'Complete your purchase and get 10% off. Limited time offer!',
        image: '/popups/cart-abandonment.jpg',
        buttonText: 'Complete Purchase',
        buttonUrl: '#/checkout',
        discountCode: 'SAVE10',
        discountValue: 10
      },
      design: {
        backgroundColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        textColor: 'text-white',
        buttonColor: 'bg-white text-orange-600',
        borderRadius: 'rounded-2xl',
        position: 'center'
      },
      targeting: {
        pages: ['checkout', 'cart'],
        devices: ['desktop', 'mobile', 'tablet'],
        userSegments: ['cart_abandoners']
      },
      analytics: {
        impressions: 456,
        conversions: 89,
        conversionRate: 19.52
      }
    }
  ])

  const [activePopup, setActivePopup] = useState<SmartPopup | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [userBehavior, setUserBehavior] = useState({
    timeOnPage: 0,
    scrollPercentage: 0,
    pageViews: 0,
    isFirstVisit: true,
    hasAbandonedCart: false
  })

  useEffect(() => {
    // Track user behavior
    const startTime = Date.now()
    let scrollTimer: ReturnType<typeof setTimeout>

    const updateTimeOnPage = () => {
      setUserBehavior(prev => ({
        ...prev,
        timeOnPage: Math.floor((Date.now() - startTime) / 1000)
      }))
    }

    const updateScrollPercentage = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const percentage = Math.round((scrollTop / scrollHeight) * 100)
      
      setUserBehavior(prev => ({
        ...prev,
        scrollPercentage: percentage
      }))
    }

    const handleExitIntent = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        // User is trying to leave the page
        const exitIntentPopup = popups.find(popup => 
          popup.isActive && 
          popup.trigger.type === 'exit_intent' &&
          popup.targeting.pages.includes(getCurrentPage())
        )
        
        if (exitIntentPopup) {
          setActivePopup(exitIntentPopup)
          setShowPopup(true)
        }
      }
    }

    const getCurrentPage = () => {
      const hash = window.location.hash || '#/'
      if (hash.includes('shop')) return 'shop'
      if (hash.includes('blog')) return 'blog'
      if (hash.includes('checkout')) return 'checkout'
      if (hash.includes('cart')) return 'cart'
      return 'home'
    }

    // Set up event listeners
    const timeInterval = setInterval(updateTimeOnPage, 1000)
    window.addEventListener('scroll', updateScrollPercentage)
    document.addEventListener('mouseleave', handleExitIntent)

    // Check for popup triggers
    const checkTriggers = () => {
      const currentPage = getCurrentPage()
      
      popups.forEach(popup => {
        if (!popup.isActive) return
        
        const isTargetPage = popup.targeting.pages.includes(currentPage)
        if (!isTargetPage) return

        let shouldShow = false

        switch (popup.trigger.type) {
          case 'time':
            if (userBehavior.timeOnPage >= popup.trigger.value) {
              shouldShow = true
            }
            break
          case 'scroll':
            if (userBehavior.scrollPercentage >= popup.trigger.value) {
              shouldShow = true
            }
            break
          case 'page_views':
            if (userBehavior.pageViews >= popup.trigger.value) {
              shouldShow = true
            }
            break
          case 'first_visit':
            if (userBehavior.isFirstVisit) {
              shouldShow = true
            }
            break
          case 'cart_abandonment':
            if (userBehavior.hasAbandonedCart) {
              shouldShow = true
            }
            break
        }

        if (shouldShow && !showPopup) {
          setActivePopup(popup)
          setShowPopup(true)
          
          // Update analytics
          setPopups(prev => prev.map(p => 
            p.id === popup.id 
              ? { ...p, analytics: { ...p.analytics, impressions: p.analytics.impressions + 1 }}
              : p
          ))
        }
      })
    }

    const triggerCheckInterval = setInterval(checkTriggers, 1000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(triggerCheckInterval)
      window.removeEventListener('scroll', updateScrollPercentage)
      document.removeEventListener('mouseleave', handleExitIntent)
    }
  }, [popups, showPopup, userBehavior])

  const handlePopupAction = (popup: SmartPopup) => {
    // Update conversion analytics
    setPopups(prev => prev.map(p => 
      p.id === popup.id 
        ? { ...p, analytics: { ...p.analytics, conversions: p.analytics.conversions + 1 }}
        : p
    ))

    // Handle action
    if (popup.content.buttonUrl) {
      if (popup.content.buttonUrl.startsWith('#')) {
        window.location.hash = popup.content.buttonUrl
      } else {
        window.open(popup.content.buttonUrl, '_blank')
      }
    }

    setShowPopup(false)
  }

  const handleClosePopup = () => {
    setShowPopup(false)
  }

  const getPopupIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="h-6 w-6" />
      case 'newsletter': return <Mail className="h-6 w-6" />
      case 'product': return <ShoppingCart className="h-6 w-6" />
      case 'review': return <Star className="h-6 w-6" />
      case 'shipping': return <Truck className="h-6 w-6" />
      case 'loyalty': return <Heart className="h-6 w-6" />
      default: return <Gift className="h-6 w-6" />
    }
  }

  if (!showPopup || !activePopup) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className={`${activePopup.design.backgroundColor} ${activePopup.design.textColor} ${activePopup.design.borderRadius} p-6 max-w-md w-full mx-4 relative transform transition-all duration-300 scale-100`}>
        {/* Close Button */}
        <button
          onClick={handleClosePopup}
          className="absolute top-4 right-4 p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {activePopup.content.image && (
            <img
              src={activePopup.content.image}
              alt="Popup"
              className="w-24 h-24 mx-auto mb-4 rounded-full object-cover"
            />
          )}
          
          <div className="flex items-center justify-center mb-3">
            {getPopupIcon(activePopup.content.type)}
            <h2 className="text-xl font-bold ml-2">
              {activePopup.content.title}
            </h2>
          </div>
          
          <p className="text-sm opacity-90 mb-6">
            {activePopup.content.message}
          </p>

          {activePopup.content.discountCode && (
            <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium">Use Code:</p>
              <p className="text-lg font-bold">{activePopup.content.discountCode}</p>
              <p className="text-xs opacity-75">
                Save {activePopup.content.discountValue}% on your order
              </p>
            </div>
          )}

          <button
            onClick={() => handlePopupAction(activePopup)}
            className={`${activePopup.design.buttonColor} px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity w-full`}
          >
            {activePopup.content.buttonText}
          </button>
        </div>

        {/* Analytics Badge */}
        <div className="absolute bottom-2 right-2 text-xs opacity-50">
          {activePopup.analytics.conversionRate.toFixed(1)}% conversion
        </div>
      </div>
    </div>
  )
}

// Admin component for managing smart popups
export function SmartPopupsAdmin() {
  const [popups, setPopups] = useState<SmartPopup[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingPopup, setEditingPopup] = useState<SmartPopup | null>(null)

  const triggerTypes = [
    { value: 'time', label: 'Time on Page', icon: <Clock className="h-4 w-4" /> },
    { value: 'scroll', label: 'Scroll Percentage', icon: <User className="h-4 w-4" /> },
    { value: 'exit_intent', label: 'Exit Intent', icon: <X className="h-4 w-4" /> },
    { value: 'page_views', label: 'Page Views', icon: <User className="h-4 w-4" /> },
    { value: 'cart_abandonment', label: 'Cart Abandonment', icon: <ShoppingCart className="h-4 w-4" /> },
    { value: 'first_visit', label: 'First Visit', icon: <Star className="h-4 w-4" /> }
  ]

  const contentTypes = [
    { value: 'discount', label: 'Discount Offer', icon: <Percent className="h-4 w-4" /> },
    { value: 'newsletter', label: 'Newsletter Signup', icon: <Mail className="h-4 w-4" /> },
    { value: 'product', label: 'Product Promotion', icon: <ShoppingCart className="h-4 w-4" /> },
    { value: 'review', label: 'Review Request', icon: <Star className="h-4 w-4" /> },
    { value: 'shipping', label: 'Shipping Info', icon: <Truck className="h-4 w-4" /> },
    { value: 'loyalty', label: 'Loyalty Program', icon: <Heart className="h-4 w-4" /> }
  ]

  const handleCreatePopup = (popup: Omit<SmartPopup, 'id'>) => {
    const newPopup: SmartPopup = {
      ...popup,
      id: Date.now().toString(),
      analytics: {
        impressions: 0,
        conversions: 0,
        conversionRate: 0
      }
    }
    setPopups(prev => [...prev, newPopup])
    setShowForm(false)
  }

  const handleUpdatePopup = (id: string, updates: Partial<SmartPopup>) => {
    setPopups(prev => prev.map(popup => 
      popup.id === id ? { ...popup, ...updates } : popup
    ))
    setEditingPopup(null)
  }

  const handleDeletePopup = (id: string) => {
    setPopups(prev => prev.filter(popup => popup.id !== id))
  }

  const togglePopupStatus = (id: string) => {
    setPopups(prev => prev.map(popup => 
      popup.id === id ? { ...popup, isActive: !popup.isActive } : popup
    ))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Smart Popups Management
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Popup
        </button>
      </div>

      {/* Popups List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Content Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Analytics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {popups.map((popup) => (
                <tr key={popup.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      popup.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {popup.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    {popup.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {popup.trigger.type.replace('_', ' ')} {popup.trigger.value > 0 && `(${popup.trigger.value}${popup.trigger.unit || ''})`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 capitalize">
                    {popup.content.type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    <div className="space-y-1">
                      <div>Impressions: {popup.analytics.impressions}</div>
                      <div>Conversions: {popup.analytics.conversions}</div>
                      <div>Rate: {popup.analytics.conversionRate.toFixed(1)}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => togglePopupStatus(popup.id)}
                      className={`px-3 py-1 rounded text-xs ${
                        popup.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {popup.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setEditingPopup(popup)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePopup(popup.id)}
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

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Total Impressions
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {popups.reduce((sum, popup) => sum + popup.analytics.impressions, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Total Conversions
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {popups.reduce((sum, popup) => sum + popup.analytics.conversions, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Average Conversion Rate
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {popups.length > 0 
              ? (popups.reduce((sum, popup) => sum + popup.analytics.conversionRate, 0) / popups.length).toFixed(1)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}
