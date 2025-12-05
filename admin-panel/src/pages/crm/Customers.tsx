import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Mail, Phone, MapPin, Calendar, Star, Package, DollarSign, Search, TrendingUp, Filter } from 'lucide-react'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  total_orders: number
  total_spent: number
  member_since: string
  is_verified: boolean
  loyalty_points: number
  last_seen?: string
  last_order_date?: string
}

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'with_orders' | 'high_value'>('with_orders')
  const [sortBy, setSortBy] = useState<'total_spent' | 'total_orders' | 'member_since'>('total_spent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const getApiBase = () => {
    // Always use production URL - no environment variables
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
        return `${window.location.protocol}//${window.location.host}/api`
      }
    }
    return 'https://thenefol.com/api'
  }
  const apiBase = getApiBase()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${apiBase}/users`)
      if (response.ok) {
        const data = await response.json()
        // Filter to only show customers with orders and parse numeric fields
        const customersWithOrders = data
          .filter((user: any) => {
            const orders = parseInt(String(user.total_orders || 0), 10) || 0
            return orders > 0
          })
          .map((user: any) => ({
            ...user,
            total_orders: parseInt(String(user.total_orders || 0), 10) || 0,
            total_spent: parseFloat(String(user.total_spent || 0)) || 0,
            loyalty_points: parseInt(String(user.loyalty_points || 0), 10) || 0
          }))
        setCustomers(customersWithOrders)
      } else {
        setError('Failed to fetch customers')
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError('Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedCustomers = customers
    .filter(customer => {
      // Search filter
      const matchesSearch = 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())

      // Type filter
      const totalOrders = parseInt(String(customer.total_orders || 0), 10) || 0
      const totalSpent = parseFloat(String(customer.total_spent || 0)) || 0
      const matchesFilter = 
        filterType === 'all' ||
        (filterType === 'with_orders' && totalOrders > 0) ||
        (filterType === 'high_value' && totalSpent >= 5000)

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let aVal: number, bVal: number
      
      switch (sortBy) {
        case 'total_spent':
          aVal = parseFloat(String(a.total_spent || 0)) || 0
          bVal = parseFloat(String(b.total_spent || 0)) || 0
          break
        case 'total_orders':
          aVal = parseInt(String(a.total_orders || 0), 10) || 0
          bVal = parseInt(String(b.total_orders || 0), 10) || 0
          break
        case 'member_since':
          aVal = new Date(a.member_since).getTime()
          bVal = new Date(b.member_since).getTime()
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  const getCustomerTier = (spent: number | string) => {
    const spentNum = parseFloat(String(spent || 0)) || 0
    if (spentNum >= 10000) return { level: 'Platinum', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300' }
    if (spentNum >= 5000) return { level: 'Gold', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300' }
    if (spentNum >= 2000) return { level: 'Silver', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300' }
    return { level: 'Bronze', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300' }
  }

  // Calculate stats with proper number conversion
  const stats = {
    totalCustomers: customers.length,
    totalRevenue: customers.reduce((sum, c) => {
      const spent = parseFloat(String(c.total_spent || 0)) || 0
      return sum + spent
    }, 0),
    totalOrders: customers.reduce((sum, c) => {
      const orders = parseInt(String(c.total_orders || 0), 10) || 0
      return sum + orders
    }, 0),
    averageOrderValue: (() => {
      const totalRevenue = customers.reduce((sum, c) => {
        const spent = parseFloat(String(c.total_spent || 0)) || 0
        return sum + spent
      }, 0)
      const totalOrders = customers.reduce((sum, c) => {
        const orders = parseInt(String(c.total_orders || 0), 10) || 0
        return sum + orders
      }, 0)
      return totalOrders > 0 ? totalRevenue / totalOrders : 0
    })(),
    highValueCustomers: customers.filter(c => {
      const spent = parseFloat(String(c.total_spent || 0)) || 0
      return spent >= 5000
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
      <div className="flex justify-between items-center">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Customers
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage your customers and their order history
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="metric-card">
          <div className="flex items-center">
            <Users className="h-8 w-8" style={{ color: 'var(--arctic-blue-primary)' }} />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Total Customers</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>{stats.totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8" style={{ color: 'var(--arctic-blue-primary)' }} />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>
                ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center">
            <Package className="h-8 w-8" style={{ color: 'var(--arctic-blue-primary)' }} />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Total Orders</p>
              <p className="text-2xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>{stats.totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isNaN(stats.averageOrderValue) || stats.averageOrderValue === 0 
                  ? '₹0' 
                  : `₹${Math.round(stats.averageOrderValue).toLocaleString('en-IN')}`
                }
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">High Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.highValueCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Customers</option>
              <option value="with_orders">With Orders</option>
              <option value="high_value">High Value (₹5000+)</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-')
                setSortBy(by as any)
                setSortOrder(order as any)
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="total_spent-desc">Highest Revenue</option>
              <option value="total_spent-asc">Lowest Revenue</option>
              <option value="total_orders-desc">Most Orders</option>
              <option value="total_orders-asc">Least Orders</option>
              <option value="member_since-desc">Newest</option>
              <option value="member_since-asc">Oldest</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Customers List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-2 text-red-600 dark:text-red-400 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {filteredAndSortedCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No customers found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'No customers have placed orders yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Member Since
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedCustomers.map((customer) => {
                  const tier = getCustomerTier(customer.total_spent || 0)
                  return (
                    <tr 
                      key={customer.id} 
                      onClick={() => navigate(`/admin/users/${customer.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {customer.name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {customer.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {customer.email || 'N/A'}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{(parseFloat(String(customer.total_spent || 0)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {parseInt(String(customer.total_orders || 0), 10) || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${tier.color}`}>
                          {tier.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {new Date(customer.member_since).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          customer.is_verified 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        }`}>
                          {customer.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        {filteredAndSortedCustomers.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAndSortedCustomers.length} of {customers.length} customers
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
