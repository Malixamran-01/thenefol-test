import React, { useState, useEffect } from 'react'

type AnalyticsData = {
  sessions: number
  pageViews: number
  bounceRate: number
  avgSessionDuration: string
  conversionRate: number
  revenue: number
  orders: number
  customers: number
  sessionsChange: number
  pageViewsChange: number
  bounceRateChange: number
  avgSessionDurationChange: number
  conversionRateChange: number
  revenueChange: number
  ordersChange: number
  customersChange: number
}

type ChartData = {
  date: string
  sessions: number
  revenue: number
  orders: number
}

type TopPage = {
  page: string
  views: number
  unique: number
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    sessions: 0,
    pageViews: 0,
    bounceRate: 0,
    avgSessionDuration: '0:00',
    conversionRate: 0,
    revenue: 0,
    orders: 0,
    customers: 0,
    sessionsChange: 0,
    pageViewsChange: 0,
    bounceRateChange: 0,
    avgSessionDurationChange: 0,
    conversionRateChange: 0,
    revenueChange: 0,
    ordersChange: 0,
    customersChange: 0
  })
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/analytics?range=${timeRange}`)
      const data = await res.json()
      setAnalyticsData(data.overview || analyticsData)
      setChartData(data.chartData || [])
      setTopPages(data.topPages || [])
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setAnalyticsData({
        sessions: 0,
        pageViews: 0,
        bounceRate: 0,
        avgSessionDuration: '0:00',
        conversionRate: 0,
        revenue: 0,
        orders: 0,
        customers: 0,
        sessionsChange: 0,
        pageViewsChange: 0,
        bounceRateChange: 0,
        avgSessionDurationChange: 0,
        conversionRateChange: 0,
        revenueChange: 0,
        ordersChange: 0,
        customersChange: 0
      })
      setChartData([])
      setTopPages([])
    } finally {
      setLoading(false)
    }
  }

  const formatChange = (change: number | undefined | null) => {
    if (change === undefined || change === null || isNaN(change)) {
      return '0.0%'
    }
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const getTrend = (change: number | undefined | null) => {
    if (change === undefined || change === null || isNaN(change)) {
      return 'neutral'
    }
    return change >= 0 ? 'up' : 'down'
  }

  const metrics = [
    {
      title: 'Sessions',
      value: (analyticsData.sessions || 0).toLocaleString(),
      change: formatChange(analyticsData.sessionsChange),
      trend: getTrend(analyticsData.sessionsChange),
      icon: '📈'
    },
    {
      title: 'Page Views',
      value: (analyticsData.pageViews || 0).toLocaleString(),
      change: formatChange(analyticsData.pageViewsChange),
      trend: getTrend(analyticsData.pageViewsChange),
      icon: '👁️'
    },
    {
      title: 'Bounce Rate',
      value: `${analyticsData.bounceRate || 0}%`,
      change: formatChange(analyticsData.bounceRateChange),
      trend: getTrend(analyticsData.bounceRateChange),
      icon: '📊'
    },
    {
      title: 'Avg. Session',
      value: analyticsData.avgSessionDuration || '0:00',
      change: formatChange(analyticsData.avgSessionDurationChange),
      trend: getTrend(analyticsData.avgSessionDurationChange),
      icon: '⏱️'
    },
    {
      title: 'Conversion Rate',
      value: `${analyticsData.conversionRate || 0}%`,
      change: formatChange(analyticsData.conversionRateChange),
      trend: getTrend(analyticsData.conversionRateChange),
      icon: '🎯'
    },
    {
      title: 'Revenue',
      value: `₹${(analyticsData.revenue || 0).toLocaleString()}`,
      change: formatChange(analyticsData.revenueChange),
      trend: getTrend(analyticsData.revenueChange),
      icon: '💰'
    },
    {
      title: 'Orders',
      value: (analyticsData.orders || 0).toString(),
      change: formatChange(analyticsData.ordersChange),
      trend: getTrend(analyticsData.ordersChange),
      icon: '📦'
    },
    {
      title: 'Customers',
      value: (analyticsData.customers || 0).toString(),
      change: formatChange(analyticsData.customersChange),
      trend: getTrend(analyticsData.customersChange),
      icon: '👥'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button onClick={loadAnalyticsData} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className="text-2xl">{metric.icon}</div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {metric.change}
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Chart */}
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions Over Time</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-brand-secondary rounded-t w-full mb-2"
                  style={{ height: `${(data.sessions / Math.max(...chartData.map(d => d.sessions))) * 200}px` }}
                ></div>
                <span className="text-xs text-gray-500">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-green-500 rounded-t w-full mb-2"
                  style={{ height: `${(data.revenue / Math.max(...chartData.map(d => d.revenue))) * 200}px` }}
                ></div>
                <span className="text-xs text-gray-500">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Pages */}
      <div className="metric-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 animate-pulse">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : topPages.length > 0 ? (
          <div className="space-y-3">
            {topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{page.page}</p>
                  <p className="text-sm text-gray-500">{page.unique} unique views</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{page.views}</p>
                  <p className="text-sm text-gray-500">total views</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No page data available
          </div>
        )}
      </div>
    </div>
  )
}








