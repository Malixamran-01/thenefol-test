import React, { useState } from 'react'
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Eye, MousePointer, Clock, Filter, Download, RefreshCw, Calendar, Target, PieChart, Activity } from 'lucide-react'

interface AnalyticsData {
  revenue: {
    total: number
    growth: number
    monthly: number[]
    daily: number[]
  }
  orders: {
    total: number
    growth: number
    average: number
    conversion: number
  }
  customers: {
    total: number
    new: number
    returning: number
    growth: number
  }
  traffic: {
    total: number
    growth: number
    sources: {
      organic: number
      direct: number
      social: number
      paid: number
      email: number
    }
  }
  engagement: {
    pageViews: number
    bounceRate: number
    sessionDuration: number
    pagesPerSession: number
  }
  products: {
    topSelling: Array<{
      name: string
      sales: number
      revenue: number
      growth: number
    }>
    categories: Array<{
      name: string
      sales: number
      revenue: number
    }>
  }
  marketing: {
    email: {
      sent: number
      opened: number
      clicked: number
      conversion: number
    }
    sms: {
      sent: number
      delivered: number
      clicked: number
      conversion: number
    }
    push: {
      sent: number
      opened: number
      clicked: number
      conversion: number
    }
  }
}

interface TimeRange {
  label: string
  value: string
  days: number
}

export default function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    label: 'Last 30 Days',
    value: '30d',
    days: 30
  })

  const [analyticsData] = useState<AnalyticsData>({
    revenue: {
      total: 1250000,
      growth: 15.2,
      monthly: [95000, 110000, 125000, 140000, 135000, 150000],
      daily: [4200, 3800, 4500, 5200, 4800, 5100, 4900]
    },
    orders: {
      total: 2847,
      growth: 12.8,
      average: 439,
      conversion: 3.2
    },
    customers: {
      total: 15420,
      new: 1250,
      returning: 14170,
      growth: 18.5
    },
    traffic: {
      total: 125000,
      growth: 8.7,
      sources: {
        organic: 45000,
        direct: 35000,
        social: 25000,
        paid: 15000,
        email: 5000
      }
    },
    engagement: {
      pageViews: 450000,
      bounceRate: 35.2,
      sessionDuration: 4.2,
      pagesPerSession: 3.8
    },
    products: {
      topSelling: [
        { name: 'Face Cleanser', sales: 450, revenue: 225000, growth: 22.5 },
        { name: 'Moisturizer', sales: 380, revenue: 190000, growth: 18.3 },
        { name: 'Serum', sales: 320, revenue: 320000, growth: 25.7 },
        { name: 'Sunscreen', sales: 280, revenue: 140000, growth: 15.2 },
        { name: 'Face Mask', sales: 250, revenue: 125000, growth: 20.1 }
      ],
      categories: [
        { name: 'Skincare', sales: 1200, revenue: 600000 },
        { name: 'Hair Care', sales: 800, revenue: 400000 },
        { name: 'Body Care', sales: 600, revenue: 300000 },
        { name: 'Accessories', sales: 200, revenue: 100000 }
      ]
    },
    marketing: {
      email: {
        sent: 50000,
        opened: 15000,
        clicked: 3000,
        conversion: 450
      },
      sms: {
        sent: 15000,
        delivered: 14850,
        clicked: 2250,
        conversion: 180
      },
      push: {
        sent: 25000,
        opened: 8750,
        clicked: 1750,
        conversion: 280
      }
    }
  })

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 },
    { label: 'Last Year', value: '1y', days: 365 }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (growth < 0) return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
    return <TrendingUp className="h-4 w-4 text-gray-600" />
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Advanced Analytics Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange.value}
            onChange={(e) => {
              const selected = timeRanges.find(range => range.value === e.target.value)
              if (selected) setTimeRange(selected)
            }}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Revenue</h3>
              <p className="text-3xl font-bold">{formatCurrency(analyticsData.revenue.total)}</p>
              <div className="flex items-center mt-2">
                {getGrowthIcon(analyticsData.revenue.growth)}
                <span className="ml-1 text-sm">
                  {analyticsData.revenue.growth > 0 ? '+' : ''}{analyticsData.revenue.growth}%
                </span>
              </div>
            </div>
            <DollarSign className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Orders</h3>
              <p className="text-3xl font-bold">{formatNumber(analyticsData.orders.total)}</p>
              <div className="flex items-center mt-2">
                {getGrowthIcon(analyticsData.orders.growth)}
                <span className="ml-1 text-sm">
                  {analyticsData.orders.growth > 0 ? '+' : ''}{analyticsData.orders.growth}%
                </span>
              </div>
            </div>
            <ShoppingCart className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Customers</h3>
              <p className="text-3xl font-bold">{formatNumber(analyticsData.customers.total)}</p>
              <div className="flex items-center mt-2">
                {getGrowthIcon(analyticsData.customers.growth)}
                <span className="ml-1 text-sm">
                  {analyticsData.customers.growth > 0 ? '+' : ''}{analyticsData.customers.growth}%
                </span>
              </div>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Conversion Rate</h3>
              <p className="text-3xl font-bold">{analyticsData.orders.conversion}%</p>
              <div className="flex items-center mt-2">
                <Target className="h-4 w-4" />
                <span className="ml-1 text-sm">Industry avg: 2.5%</span>
              </div>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Revenue & Orders Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Revenue Trend
          </h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analyticsData.revenue.monthly.map((amount, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t w-8 mb-2"
                  style={{ height: `${(amount / Math.max(...analyticsData.revenue.monthly)) * 200}px` }}
                ></div>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {formatCurrency(amount)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  M{index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Daily Orders
          </h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analyticsData.revenue.daily.map((amount, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-green-500 rounded-t w-8 mb-2"
                  style={{ height: `${(amount / Math.max(...analyticsData.revenue.daily)) * 200}px` }}
                ></div>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {amount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  D{index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Traffic Sources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(analyticsData.traffic.sources).map(([source, value]) => (
            <div key={source} className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 relative">
                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {Math.round((value / analyticsData.traffic.total) * 100)}%
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {source}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatNumber(value)} visitors
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Top Selling Products
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {analyticsData.products.topSelling.map((product, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {product.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {formatNumber(product.sales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getGrowthIcon(product.growth)}
                      <span className={`ml-1 text-sm ${getGrowthColor(product.growth)}`}>
                        {product.growth > 0 ? '+' : ''}{product.growth}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Marketing Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Email Marketing
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Sent</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(analyticsData.marketing.email.sent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Open Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {((analyticsData.marketing.email.opened / analyticsData.marketing.email.sent) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Click Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {((analyticsData.marketing.email.clicked / analyticsData.marketing.email.sent) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Conversions</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData.marketing.email.conversion)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            SMS Marketing
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Sent</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(analyticsData.marketing.sms.sent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Delivery Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {((analyticsData.marketing.sms.delivered / analyticsData.marketing.sms.sent) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Click Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {((analyticsData.marketing.sms.clicked / analyticsData.marketing.sms.sent) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Conversions</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData.marketing.sms.conversion)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Push Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Sent</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(analyticsData.marketing.push.sent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Open Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {((analyticsData.marketing.push.opened / analyticsData.marketing.push.sent) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Click Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {((analyticsData.marketing.push.clicked / analyticsData.marketing.push.sent) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Conversions</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData.marketing.push.conversion)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Customer Breakdown
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Total Customers</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(analyticsData.customers.total)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">New Customers</span>
              <span className="font-semibold text-blue-600">
                {formatNumber(analyticsData.customers.new)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Returning Customers</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData.customers.returning)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Customer Growth</span>
              <div className="flex items-center">
                {getGrowthIcon(analyticsData.customers.growth)}
                <span className={`ml-1 text-sm ${getGrowthColor(analyticsData.customers.growth)}`}>
                  {analyticsData.customers.growth > 0 ? '+' : ''}{analyticsData.customers.growth}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Engagement Metrics
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Page Views</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(analyticsData.engagement.pageViews)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Bounce Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {analyticsData.engagement.bounceRate}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Session Duration</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {analyticsData.engagement.sessionDuration}m
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Pages per Session</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {analyticsData.engagement.pagesPerSession}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Categories */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Product Categories Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {analyticsData.products.categories.map((category, index) => (
            <div key={index} className="text-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {category.name}
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Sales</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatNumber(category.sales)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(category.revenue)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2">Revenue Growth</h3>
            <p className="text-sm opacity-90">
              Your revenue has grown by {analyticsData.revenue.growth}% compared to last period
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2">Customer Acquisition</h3>
            <p className="text-sm opacity-90">
              {analyticsData.customers.new} new customers acquired this period
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2">Conversion Rate</h3>
            <p className="text-sm opacity-90">
              {analyticsData.orders.conversion}% conversion rate, above industry average
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
