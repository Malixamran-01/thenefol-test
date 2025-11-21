import React, { useState, useEffect } from 'react'
import { socketService } from '../services/socket'
import { Users, Eye, ShoppingCart, TrendingUp, Activity, Clock } from 'lucide-react'

interface ActivityEvent {
  type: 'page-view' | 'cart-update' | 'user-action'
  data: any
  timestamp: string
}

interface PageViewCount {
  [page: string]: number
}

export default function LiveMonitoring() {
  const [liveUsers, setLiveUsers] = useState(0)
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
  const [pageViews, setPageViews] = useState<PageViewCount>({})
  const [cartEvents, setCartEvents] = useState(0)
  const [searchQueries, setSearchQueries] = useState<string[]>([])

  useEffect(() => {
    // Ensure socket connection
    if (!socketService.isConnected()) {
      socketService.connect()
    }
    
    // Subscribe to live users count
    const unsubscribeLiveUsers = socketService.subscribe('live-users-count', (data: any) => {
      console.log('📊 Live users count:', data.count)
      setLiveUsers(data.count || 0)
    })

    // Subscribe to page view updates
    const unsubscribePageView = socketService.subscribe('page-view-update', (data: any) => {
      console.log('👁️ Page view:', data)
      
      setPageViews(prev => ({
        ...prev,
        [data.page]: (prev[data.page] || 0) + 1
      }))
      
      addActivity({
        type: 'page-view',
        data,
        timestamp: new Date().toISOString()
      })
    })

    // Subscribe to cart updates
    const unsubscribeCart = socketService.subscribe('cart-update', (data: any) => {
      console.log('🛒 Cart update:', data)
      setCartEvents(prev => prev + 1)
      
      addActivity({
        type: 'cart-update',
        data,
        timestamp: new Date().toISOString()
      })
    })

    // Subscribe to user actions
    const unsubscribeUserAction = socketService.subscribe('user-action-update', (data: any) => {
      console.log('⚡ User action:', data)
      
      if (data.action === 'search' && data.data?.query) {
        setSearchQueries(prev => [data.data.query, ...prev.slice(0, 9)])
      }
      
      addActivity({
        type: 'user-action',
        data,
        timestamp: new Date().toISOString()
      })
    })

    return () => {
      unsubscribeLiveUsers()
      unsubscribePageView()
      unsubscribeCart()
      unsubscribeUserAction()
    }
  }, [])

  const addActivity = (activity: ActivityEvent) => {
    setRecentActivity(prev => [activity, ...prev.slice(0, 19)])
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page-view':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'cart-update':
        return <ShoppingCart className="h-4 w-4 text-green-500" />
      case 'user-action':
        return <Activity className="h-4 w-4 text-purple-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityDescription = (activity: ActivityEvent) => {
    switch (activity.type) {
      case 'page-view':
        return `User viewed ${activity.data.page}`
      case 'cart-update':
        return `Cart ${activity.data.action}: ${activity.data.data?.productName || 'item'}`
      case 'user-action':
        return `${activity.data.action}: ${JSON.stringify(activity.data.data).substring(0, 50)}`
      default:
        return 'Unknown activity'
    }
  }

  const topPages = Object.entries(pageViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">Live Users</p>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{liveUsers}</p>
            </div>
            <div className="relative">
              <Users className="h-12 w-12 text-blue-500 dark:text-blue-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-300">
            <Activity className="h-4 w-4 mr-1" />
            <span>Active now</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Page Views</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {Object.values(pageViews).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <Eye className="h-12 w-12 text-gray-400 dark:text-gray-600" />
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>Since session start</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Cart Events</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{cartEvents}</p>
            </div>
            <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-600" />
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
            <Activity className="h-4 w-4 mr-1" />
            <span>Add, remove, update</span>
          </div>
        </div>
      </div>

      {/* Live Activity and Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              Live Activity Feed
            </h3>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Waiting for user activity...</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Pages */}
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            Top Pages (This Session)
          </h3>
          
          <div className="space-y-3">
            {topPages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No page views yet...</p>
              </div>
            ) : (
              topPages.map(([page, count], index) => (
                <div key={page} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {page || '/'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {count} {count === 1 ? 'view' : 'views'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Search Queries */}
      {searchQueries.length > 0 && (
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recent Search Queries
          </h3>
          <div className="flex flex-wrap gap-2">
            {searchQueries.map((query, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                {query}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

