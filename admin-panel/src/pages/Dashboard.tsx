import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LiveMonitoring from '../components/LiveMonitoring'
import { socketService } from '../services/socket'

interface DashboardMetrics {
  sessions: number
  totalSales: number
  orders: number
  conversionRate: number
  sessionsChange: number
  salesChange: number
  ordersChange: number
  conversionChange: number
}

interface ActionItem {
  title: string
  icon: string
  color: string
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [showCongrats, setShowCongrats] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [liveVisitors, setLiveVisitors] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const getApiBase = () => {
    if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
    const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
    const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
    return `http://${host}:${port}`
  }
  const apiBase = getApiBase()

  useEffect(() => {
    // Ensure socket connection for live monitoring
    if (!socketService.isConnected()) {
      socketService.connect()
    }
    
    loadDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData()
    }, 30000)
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const [metricsRes, actionItemsRes, visitorsRes] = await Promise.all([
        fetch(`${apiBase}/api/dashboard/metrics`),
        fetch(`${apiBase}/api/dashboard/action-items`),
        fetch(`${apiBase}/api/dashboard/live-visitors`)
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        // Handle both success wrapper and direct data
        const data = metricsData.data || metricsData
        setMetrics(data)
      } else {
        // Set default values if API fails
        setMetrics({
          sessions: 0,
          sessionsChange: 0,
          totalSales: 0,
          salesChange: 0,
          orders: 0,
          ordersChange: 0,
          conversionRate: 0,
          conversionChange: 0
        })
      }

      if (actionItemsRes.ok) {
        const actionItemsData = await actionItemsRes.json()
        const items = actionItemsData.data?.items || actionItemsData.items || []
        setActionItems(items)
      }

      if (visitorsRes.ok) {
        const visitorsData = await visitorsRes.json()
        const count = visitorsData.data?.count || visitorsData.count || 0
        setLiveVisitors(count)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError('Failed to load dashboard data')
      // Set default values on error
      setMetrics({
        sessions: 0,
        sessionsChange: 0,
        totalSales: 0,
        salesChange: 0,
        orders: 0,
        ordersChange: 0,
        conversionRate: 0,
        conversionChange: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const formatMetricValue = (value: number | undefined, type: string) => {
    if (value === undefined || value === null) {
      return '0'
    }
    
    switch (type) {
      case 'sessions':
        return value.toLocaleString()
      case 'totalSales':
        return `₹${value.toLocaleString()}`
      case 'orders':
        return value.toString()
      case 'conversionRate':
        return `${value.toFixed(2)}%`
      default:
        return value.toString()
    }
  }

  const formatChange = (change: number | undefined) => {
    if (change === undefined || change === null) {
      return '+0.0%'
    }
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const getTrend = (change: number | undefined) => {
    if (change === undefined || change === null) {
      return 'neutral'
    }
    return change >= 0 ? 'up' : 'down'
  }

  const dashboardMetrics = metrics ? [
    {
      title: 'Sessions',
      value: formatMetricValue(metrics.sessions, 'sessions'),
      change: formatChange(metrics.sessionsChange),
      trend: getTrend(metrics.sessionsChange),
      icon: '📈'
    },
    {
      title: 'Total sales',
      value: formatMetricValue(metrics.totalSales, 'totalSales'),
      change: formatChange(metrics.salesChange),
      trend: getTrend(metrics.salesChange),
      icon: '💰'
    },
    {
      title: 'Orders',
      value: formatMetricValue(metrics.orders, 'orders'),
      change: formatChange(metrics.ordersChange),
      trend: getTrend(metrics.ordersChange),
      icon: '📦'
    },
    {
      title: 'Conversion rate',
      value: formatMetricValue(metrics.conversionRate, 'conversionRate'),
      change: formatChange(metrics.conversionChange),
      trend: getTrend(metrics.conversionChange),
      icon: '🎯'
    }
  ] : []

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
      
      {/* Live Monitoring Section */}
      <LiveMonitoring />
      
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center space-x-2 px-4 py-2 border rounded-xl hover:bg-[var(--arctic-blue-lighter)] transition-all duration-300"
            style={{ 
              borderColor: 'var(--arctic-blue-light)',
              color: 'var(--arctic-blue-primary-dark)'
            }}
            title="View analytics for last 30 days"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Last 30 days</span>
          </button>
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center space-x-2 px-4 py-2 border rounded-xl hover:bg-[var(--arctic-blue-lighter)] transition-all duration-300"
            style={{ 
              borderColor: 'var(--arctic-blue-light)',
              color: 'var(--arctic-blue-primary-dark)'
            }}
            title="View analytics for all channels"
          >
            <span>All channels</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{liveVisitors} live visitors</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="metric-card" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-600">{error}</span>
            <button 
              onClick={loadDashboardData}
              className="ml-auto text-red-600 hover:text-red-800 underline transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="metric-card animate-pulse">
              <div className="h-4 rounded mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}></div>
              <div className="h-8 rounded" style={{ backgroundColor: 'var(--arctic-blue-light)' }}></div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardMetrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{metric.icon}</span>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{metric.title}</h3>
              </div>
              <button 
                onClick={() => navigate('/admin/analytics')}
                className="transition-colors hover:opacity-70"
                style={{ color: 'var(--arctic-blue-primary)' }}
                title="View detailed analytics"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>{metric.value}</span>
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                  </svg>
                )}
                <span>{metric.change}</span>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Performance Chart */}
      <div className="metric-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Sessions</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-primary)' }}></div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Period</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)' }}></div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Previous Period</span>
            </div>
          </div>
        </div>
        
        {/* Simple Chart Placeholder */}
        <div className="h-64 rounded-xl flex items-center justify-center border-2 border-dashed" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--arctic-blue-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Performance chart will be displayed here</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chart integration coming soon</p>
          </div>
        </div>
      </div>

      {/* Action Items */}
      {!loading && !error && actionItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actionItems.map((item, index) => (
            <div key={index} className="metric-card">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.icon}</span>
                <span className={`font-medium ${item.color}`}>{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Congratulations Card */}
      {showCongrats && metrics && metrics.orders >= 10 && (
        <div className="metric-card relative" style={{ background: 'linear-gradient(135deg, var(--arctic-blue-lighter) 0%, var(--arctic-blue-light) 100%)', borderColor: 'var(--arctic-blue-primary)' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-light mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>
                Congratulations on reaching {metrics.orders || 0} orders!
              </h3>
              <p className="mb-6" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                This is just the beginning of your journey. Keep pushing forward and watch your business grow with each new customer.
              </p>
              <button 
                onClick={() => navigate('/admin/orders')}
                className="btn-primary"
              >
                View orders report
              </button>
            </div>
            <div className="ml-8">
              {/* Butterfly Pea Symbol */}
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--arctic-blue-primary) 0%, var(--arctic-blue-primary-dark) 100%)' }}>
                <span className="text-4xl">🦋</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowCongrats(false)}
            className="absolute top-4 right-4 transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default Dashboard
