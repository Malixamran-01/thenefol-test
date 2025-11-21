import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Phone, Calendar, User, Filter, Download } from 'lucide-react'
import { getApiBase } from '../../services/config'
import { socketService } from '../../services/socket'

interface WhatsAppSubscription {
  id: number
  phone: string
  name: string | null
  source: string | null
  subscribed_at: string
  unsubscribed_at: string | null
  is_active: boolean
  metadata: any
}

export default function WhatsAppSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<WhatsAppSubscription[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const apiBase = getApiBase()
  const pageRef = useRef(page)
  const filterRef = useRef(filter)
  const searchRef = useRef(search)

  // Update refs when values change
  useEffect(() => {
    pageRef.current = page
    filterRef.current = filter
    searchRef.current = search
  }, [page, filter, search])

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const role = localStorage.getItem('role') || 'admin'
      const permissions = localStorage.getItem('permissions') || 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
      const params = new URLSearchParams({
        page: pageRef.current.toString(),
        limit: '50',
        ...(searchRef.current && { search: searchRef.current })
      })

      const response = await fetch(`${apiBase}/api/whatsapp/subscriptions?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'x-user-role': role,
          'x-user-permissions': permissions
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📋 Fetched subscriptions:', data.subscriptions?.length || 0, 'total')
        let filteredData = data.subscriptions || []
        
        if (filterRef.current === 'active') {
          filteredData = filteredData.filter((s: WhatsAppSubscription) => s.is_active)
        } else if (filterRef.current === 'inactive') {
          filteredData = filteredData.filter((s: WhatsAppSubscription) => !s.is_active)
        }

        setSubscriptions(filteredData)
        setPagination(data.pagination || {})
      } else {
        const errorText = await response.text()
        console.error(`Failed to fetch subscriptions: ${response.status} ${response.statusText}`, errorText)
        if (response.status === 401) {
          console.error('Authentication failed. Please check your login credentials.')
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  // Consolidated effect for fetching subscriptions when page, filter, or search changes
  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timer = setTimeout(() => {
      fetchSubscriptions()
    }, search ? 500 : 0) // No delay for page/filter changes, 500ms delay for search
    
    return () => clearTimeout(timer)
  }, [page, filter, search, fetchSubscriptions])

  // Initial stats fetch
  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    // Listen for real-time subscription updates via Socket.IO
    // The socketService is already initialized in App.tsx
    const handleUpdate = (data: any) => {
      if (data.type === 'whatsapp-subscription') {
        console.log('📱 Received WhatsApp subscription update, refreshing list...')
        // Always refresh subscriptions and stats when a new one comes in
        fetchSubscriptions()
        fetchStats()
        
        // Show notification
        if (Notification.permission === 'granted') {
          new Notification('New WhatsApp Subscription!', {
            body: `New subscription: ${data.data?.subscription?.phone || data.data?.message || 'Unknown'}`,
            icon: '/favicon.ico'
          })
        }
      }
    }

    // Subscribe to updates - socketService is already initialized in App.tsx
    const unsubscribe = socketService.subscribe('update', handleUpdate)

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [fetchSubscriptions])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const role = localStorage.getItem('role') || 'admin'
      const permissions = localStorage.getItem('permissions') || 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
      const response = await fetch(`${apiBase}/api/whatsapp/stats`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'x-user-role': role,
          'x-user-permissions': permissions
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        const errorText = await response.text()
        console.error(`Failed to fetch stats: ${response.status} ${response.statusText}`, errorText)
        if (response.status === 401) {
          console.error('Authentication failed. Please check your login credentials.')
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
    }
    return phone
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportSubscriptions = () => {
    const csv = [
      ['Phone', 'Name', 'Source', 'Subscribed At', 'Status'].join(','),
      ...subscriptions.map(s => [
        s.phone,
        s.name || '',
        s.source || '',
        s.subscribed_at,
        s.is_active ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whatsapp-subscriptions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    // Clean up blob URL after a short delay to prevent memory leaks
    // Note: Browser may show security warning if app is served over HTTP instead of HTTPS
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }


  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">WhatsApp Subscriptions</h1>
        <p className="text-gray-600">Manage and view all WhatsApp subscriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Subscribers</div>
          <div className="text-2xl font-bold">{stats.total_subscribers || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active_subscribers || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Last 24 Hours</div>
          <div className="text-2xl font-bold text-blue-600">{stats.new_last_24_hours || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Last 7 Days</div>
          <div className="text-2xl font-bold">{stats.new_last_7_days || 0}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by phone or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as any)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              onClick={exportSubscriptions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No subscriptions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscribed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{formatPhone(subscription.phone)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscription.name || (
                        <span className="text-gray-400 italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {subscription.source || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(subscription.subscribed_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          subscription.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {subscription.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing page {page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

