import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Mail, Phone, MapPin, Calendar, Star, Package, FileText } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  loyalty_points: number
  total_orders: number
  member_since: string
  is_verified: boolean
}

interface FormSubmission {
  id: number
  form_id: number
  form_name?: string
  data: Record<string, any>
  status: string
  created_at: string
}

import { getApiBaseUrl } from '../utils/apiUrl'
const API_BASE = getApiBaseUrl()

export default function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified'>('all')
  const [showFormSubmissions, setShowFormSubmissions] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchFormSubmissions()
  }, [])

  const fetchFormSubmissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/forms/submissions`)
      if (response.ok) {
        const data = await response.json()
        setFormSubmissions(data.submissions || data || [])
      }
    } catch (error) {
      console.error('Error fetching form submissions:', error)
    }
  }

  const getUserFormSubmissions = (userEmail: string) => {
    return formSubmissions.filter(submission => {
      const submissionData = submission.data || {}
      return submissionData.email === userEmail || submissionData.Email === userEmail
    })
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        setError('Failed to fetch users')
      }
    } catch (err) {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'verified' && user.is_verified) ||
                         (filterStatus === 'unverified' && !user.is_verified)
    
    return matchesSearch && matchesFilter
  })

  const getMemberLevel = (points: number) => {
    if (points >= 5000) return { level: 'Gold', color: 'text-yellow-600 bg-yellow-100' }
    if (points >= 2000) return { level: 'Silver', color: 'text-gray-600 bg-gray-100' }
    return { level: 'Bronze', color: 'text-orange-600 bg-orange-100' }
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
            Users
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage your customer base
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFormSubmissions(!showFormSubmissions)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Form Submissions ({formSubmissions.length})</span>
          </button>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <div className="text-sm text-blue-600 dark:text-blue-400">Total Users</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{users.length}</div>
          </div>
        </div>
      </div>

      {/* Form Submissions Section */}
      {showFormSubmissions && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Form Submissions
            </h2>
            <button
              onClick={() => setShowFormSubmissions(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          {formSubmissions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No form submissions yet</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {formSubmissions.map((submission) => {
                const submissionData = submission.data || {}
                const userEmail = submissionData.email || submissionData.Email || 'N/A'
                const userName = submissionData.name || submissionData.Name || 'Anonymous'
                const matchingUser = users.find(u => u.email === userEmail)
                
                return (
                  <div key={submission.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {submission.form_name || `Form #${submission.form_id}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Submitted by: {userName} ({userEmail})
                          {matchingUser && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              (User ID: {matchingUser.id})
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(submission.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1 mt-2">
                      {Object.entries(submissionData).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'No users have signed up yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Loyalty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Member Since
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Form Submissions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => {
                  const memberLevel = getMemberLevel(user.loyalty_points)
                  const userSubmissions = getUserFormSubmissions(user.email)
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {user.loyalty_points.toLocaleString()} pts
                            </span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${memberLevel.color}`}>
                            {memberLevel.level}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.total_orders}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_verified 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        }`}>
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {new Date(user.member_since).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {userSubmissions.length}
                          </span>
                        </div>
                        {userSubmissions.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Latest: {new Date(userSubmissions[0].created_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Verified Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.filter(u => u.is_verified).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.reduce((sum, user) => sum + user.total_orders, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.reduce((sum, user) => sum + user.loyalty_points, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-indigo-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Form Submissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formSubmissions.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




