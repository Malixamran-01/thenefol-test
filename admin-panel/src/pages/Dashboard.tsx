import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LiveMonitoring from '../components/LiveMonitoring'
import { socketService } from '../services/socket'
import { getApiBaseUrl } from '../utils/apiUrl'

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
  href?: string
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [showCongrats, setShowCongrats] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [liveVisitors, setLiveVisitors] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState<{ dates: string[], current: number[], previous: number[] } | null>(null)
  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

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
      
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }

      const [metricsRes, actionItemsRes, visitorsRes, chartRes] = await Promise.all([
        fetch(`${apiBase}/dashboard/metrics`, { headers }),
        fetch(`${apiBase}/dashboard/action-items`, { headers }),
        fetch(`${apiBase}/dashboard/live-visitors`, { headers }),
        fetch(`${apiBase}/dashboard/sessions-chart`, { headers })
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

      if (chartRes.ok) {
        const chartDataResponse = await chartRes.json()
        const data = chartDataResponse.data || chartDataResponse
        setChartData(data)
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
        
        {/* Working Chart */}
        {chartData && chartData.dates.length > 0 ? (
          <div className="h-64 rounded-xl relative" style={{ backgroundColor: 'var(--arctic-blue-lighter)', padding: '1rem' }}>
            <svg width="100%" height="240" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="40"
                  y1={40 + i * 40}
                  x2="760"
                  y2={40 + i * 40}
                  stroke="var(--arctic-blue-light)"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
              
              {/* Calculate max value for scaling */}
              {(() => {
                const maxVal = Math.max(...chartData.current, ...chartData.previous, 1)
                const chartHeight = 160
                const chartWidth = 720
                const startX = 40
                const startY = 200
                
                // Previous period line
                const prevPoints = chartData.previous.map((val, idx) => {
                  const x = startX + (idx / Math.max(chartData.previous.length - 1, 1)) * chartWidth
                  const y = startY - (val / maxVal) * chartHeight
                  return `${x},${y}`
                }).join(' ')
                
                // Current period line
                const currPoints = chartData.current.map((val, idx) => {
                  const x = startX + (idx / Math.max(chartData.current.length - 1, 1)) * chartWidth
                  const y = startY - (val / maxVal) * chartHeight
                  return `${x},${y}`
                }).join(' ')
                
                // Current period area fill
                const areaPoints = `${startX},${startY} ${currPoints} ${startX + chartWidth},${startY}`
                
                return (
                  <>
                    {/* Previous period line */}
                    <polyline
                      points={prevPoints}
                      fill="none"
                      stroke="var(--arctic-blue-light)"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                    
                    {/* Current period area fill */}
                    <polygon
                      points={areaPoints}
                      fill="var(--arctic-blue-primary)"
                      opacity="0.2"
                    />
                    
                    {/* Current period line */}
                    <polyline
                      points={currPoints}
                      fill="none"
                      stroke="var(--arctic-blue-primary)"
                      strokeWidth="3"
                    />
                    
                    {/* Data points for current period */}
                    {chartData.current.map((val, idx) => {
                      const x = startX + (idx / Math.max(chartData.current.length - 1, 1)) * chartWidth
                      const y = startY - (val / maxVal) * chartHeight
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="3"
                          fill="var(--arctic-blue-primary)"
                        />
                      )
                    })}
                  </>
                )
              })()}
            </svg>
            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs px-10" style={{ color: 'var(--text-muted)' }}>
              {chartData.dates.filter((_, i) => i % 5 === 0).map((date, idx) => {
                const dateObj = new Date(date)
                return (
                  <span key={idx}>
                    {dateObj.getDate()}/{dateObj.getMonth() + 1}
                  </span>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 rounded-xl flex items-center justify-center border-2 border-dashed" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--arctic-blue-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Loading chart data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Items */}
      {!loading && !error && actionItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actionItems.map((item, index) => (
            <div 
              key={index} 
              className={`metric-card ${item.href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              onClick={item.href ? () => navigate(item.href!) : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`font-medium ${item.color}`}>{item.title}</span>
                </div>
                {item.href && (
                  <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
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
