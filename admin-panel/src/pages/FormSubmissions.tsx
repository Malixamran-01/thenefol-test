import React, { useState, useEffect } from 'react'
import { FileText, User, Mail, Calendar, Search, Filter, Eye, X, Download, CheckCircle, Clock } from 'lucide-react'

interface FormSubmission {
  id: number
  form_id: number
  form_name?: string
  data: Record<string, any>
  status: string
  created_at: string
}

interface User {
  id: number
  name: string
  email: string
  phone?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://192.168.1.36:2000'

export default function FormSubmissions() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'read' | 'archived'>('all')
  const [filterForm, setFilterForm] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const [forms, setForms] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    fetchSubmissions()
    fetchUsers()
    fetchForms()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/forms/submissions`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || data || [])
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchForms = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/forms`)
      if (response.ok) {
        const data = await response.json()
        setForms(data.forms || data || [])
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    }
  }

  const getUserFromSubmission = (submission: FormSubmission): User | null => {
    const submissionData = submission.data || {}
    const email = submissionData.email || submissionData.Email || ''
    
    if (!email) return null
    
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
  }

  const getUserInfo = (submission: FormSubmission) => {
    const user = getUserFromSubmission(submission)
    const submissionData = submission.data || {}
    
    return {
      user,
      name: submissionData.name || submissionData.Name || user?.name || 'Anonymous',
      email: submissionData.email || submissionData.Email || user?.email || 'N/A',
      phone: submissionData.phone || submissionData.Phone || user?.phone || null
    }
  }

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = 
      submission.form_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(submission.data || {}).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus
    
    const matchesForm = filterForm === 'all' || String(submission.form_id) === filterForm
    
    return matchesSearch && matchesStatus && matchesForm
  })

  const updateSubmissionStatus = async (submissionId: number, newStatus: string) => {
    try {
      // Note: You may need to add an API endpoint for updating submission status
      // For now, we'll just update locally
      setSubmissions(submissions.map(s => 
        s.id === submissionId ? { ...s, status: newStatus } : s
      ))
    } catch (error) {
      console.error('Error updating submission status:', error)
    }
  }

  const exportSubmissions = () => {
    const csvContent = [
      ['Form Name', 'User Name', 'Email', 'Phone', 'Submission Date', 'Status', ...Object.keys(submissions[0]?.data || {})].join(','),
      ...filteredSubmissions.map(sub => {
        const userInfo = getUserInfo(sub)
        const data = sub.data || {}
        return [
          sub.form_name || `Form #${sub.form_id}`,
          userInfo.name,
          userInfo.email,
          userInfo.phone || '',
          new Date(sub.created_at).toLocaleString(),
          sub.status,
          ...Object.values(data).map(v => `"${String(v).replace(/"/g, '""')}"`)
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `form-submissions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'read':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Submissions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all form submissions from users
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportSubmissions}
            disabled={filteredSubmissions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <div className="text-sm text-blue-600 dark:text-blue-400">Total Submissions</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {submissions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filterForm}
            onChange={(e) => setFilterForm(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Forms</option>
            {forms.map(form => (
              <option key={form.id} value={String(form.id)}>
                {form.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No submissions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== 'all' || filterForm !== 'all'
                ? 'Try adjusting your filters'
                : 'No form submissions have been received yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubmissions.map((submission) => {
                  const userInfo = getUserInfo(submission)
                  return (
                    <tr
                      key={submission.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {submission.form_name || `Form #${submission.form_id}`}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {submission.form_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {userInfo.name}
                            </div>
                            {userInfo.user && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                User ID: {userInfo.user.id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {userInfo.email}
                          </div>
                          {userInfo.phone && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {userInfo.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(submission.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                          {submission.status || 'new'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Submission Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedSubmission.form_name || `Form #${selectedSubmission.form_id}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  User Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const userInfo = getUserInfo(selectedSubmission)
                    return (
                      <>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Name
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {userInfo.name}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Email
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {userInfo.email}
                          </p>
                        </div>
                        {userInfo.phone && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Phone
                            </label>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {userInfo.phone}
                            </p>
                          </div>
                        )}
                        {userInfo.user && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Registered User
                            </label>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              Yes (User ID: {userInfo.user.id})
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Submission Data */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Form Data
                </h3>
                <div className="space-y-4">
                  {Object.entries(selectedSubmission.data || {}).map(([key, value]) => {
                    // Skip email, name, phone as they're shown in user info
                    if (['email', 'Email', 'name', 'Name', 'phone', 'Phone'].includes(key)) {
                      return null
                    }
                    return (
                      <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                          {key}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Submission Metadata */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Submission Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Submission ID
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      #{selectedSubmission.id}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </label>
                    <p className="text-sm mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                        {selectedSubmission.status || 'new'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Submitted At
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {new Date(selectedSubmission.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Form ID
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedSubmission.form_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    updateSubmissionStatus(selectedSubmission.id, 'read')
                    setSelectedSubmission(null)
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Mark as Read</span>
                </button>
                <button
                  onClick={() => {
                    updateSubmissionStatus(selectedSubmission.id, 'archived')
                    setSelectedSubmission(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Archive
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

