import React, { useState, useEffect } from 'react'
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  RefreshCw,
  DollarSign,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Youtube,
  Facebook,
  MessageSquare,
  Search,
  Filter,
  Download,
  Copy,
  AlertCircle,
  Calendar,
  User,
  Globe,
  BarChart3,
  Send,
  FileText,
  CheckSquare,
  XSquare
} from 'lucide-react'

interface AffiliateApplication {
  id: number
  name: string
  email: string
  phone: string
  instagram?: string
  snapchat?: string
  youtube?: string
  facebook?: string
  followers: string
  platform: string
  experience: string
  why_join: string
  expected_sales: string
  house_number: string
  street: string
  building?: string
  apartment?: string
  road: string
  city: string
  pincode: string
  state: string
  agree_terms: boolean
  status: 'pending' | 'approved' | 'rejected'
  verification_code?: string
  admin_notes?: string
  rejection_reason?: string
  application_date: string
  approved_at?: string
  rejected_at?: string
}

export default function AffiliateRequests() {
  const [applications, setApplications] = useState<AffiliateApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<AffiliateApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'view'>('view')
  const [regeneratingCode, setRegeneratingCode] = useState<number | null>(null)
  const [recentlyRegenerated, setRecentlyRegenerated] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  useEffect(() => {
    fetchApplications()
  }, [statusFilter, currentPage, sortBy, sortOrder])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '') {
        fetchApplications()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sort: sortBy,
        order: sortOrder
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await fetch(`/api/admin/affiliate-applications?${params}`)
      const data = await response.json()
      
      if (response.ok && data.applications) {
        setApplications(data.applications)
        setTotalPages(data.pagination.pages)
        
        // Update stats
        setStats({
          total: data.pagination.total,
          pending: data.applications.filter((app: AffiliateApplication) => app.status === 'pending').length,
          approved: data.applications.filter((app: AffiliateApplication) => app.status === 'approved').length,
          rejected: data.applications.filter((app: AffiliateApplication) => app.status === 'rejected').length
        })
      } else {
        console.error('Failed to fetch applications:', data.message)
        setApplications([])
        setTotalPages(0)
        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        })
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      // Show error message to user
      alert('Failed to load applications. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedApplication) return

    try {
      const response = await fetch(`/api/admin/affiliate-applications/${selectedApplication.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminNotes: adminNotes
        })
      })

      const data = await response.json()
      
      if (response.ok && data.message) {
        alert(`Application approved successfully!\n\nVerification Code: ${data.data?.verificationCode || 'Generated'}\n\nCopy this code and send it to the affiliate partner.`)
        setShowModal(false)
        setAdminNotes('')
        fetchApplications()
      } else {
        alert(data.error || data.message || 'Failed to approve application')
      }
    } catch (error) {
      console.error('Error approving application:', error)
      alert('Error approving application. Please try again.')
    }
  }

  const handleReject = async () => {
    if (!selectedApplication || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const response = await fetch(`/api/admin/affiliate-applications/${selectedApplication.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason
        })
      })

      const data = await response.json()
      
      if (response.ok && data.message) {
        alert('Application rejected successfully!')
        setShowModal(false)
        setRejectionReason('')
        fetchApplications()
      } else {
        alert(data.error || data.message || 'Failed to reject application')
      }
    } catch (error) {
      console.error('Error rejecting application:', error)
      alert('Error rejecting application. Please try again.')
    }
  }

  const handleRegenerateCode = async (applicationId: number) => {
    if (!confirm('Are you sure you want to regenerate the verification code? This will invalidate the current code and the affiliate partner will need to verify again with the new code.')) {
      return
    }

    try {
      setRegeneratingCode(applicationId)
      
      // First, we need to get the affiliate partner ID from the application
      const response = await fetch(`/api/admin/affiliate-applications/${applicationId}`)
      const appData = await response.json()
      
      if (!response.ok) {
        alert(appData.error || 'Failed to get application details')
        return
      }

      // Find the affiliate partner record
      const partnerResponse = await fetch(`/api/admin/affiliate-partners?applicationId=${applicationId}`)
      const partnerData = await partnerResponse.json()
      
      if (!partnerResponse.ok || !partnerData.partners || partnerData.partners.length === 0) {
        alert('Affiliate partner record not found')
        return
      }

      const partnerId = partnerData.partners[0].id

      // Regenerate the verification code
      const regenerateResponse = await fetch(`/api/admin/affiliate-partners/${partnerId}/regenerate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const regenerateData = await regenerateResponse.json()
      
      if (regenerateResponse.ok && regenerateData.verificationCode) {
        // Update the local state with the new verification code
        setApplications(prevApplications => 
          prevApplications.map(app => 
            app.id === applicationId 
              ? { ...app, verification_code: regenerateData.verificationCode }
              : app
          )
        )
        
        // Add visual feedback for recently regenerated code
        setRecentlyRegenerated(prev => new Set(prev).add(applicationId))
        
        // Remove the highlight after 3 seconds
        setTimeout(() => {
          setRecentlyRegenerated(prev => {
            const newSet = new Set(prev)
            newSet.delete(applicationId)
            return newSet
          })
        }, 3000)
        
        // Show success message
        alert(`New verification code generated successfully!\n\nNew Code: ${regenerateData.verificationCode}\n\nThe code has been updated in the UI and is ready to copy.`)
      } else {
        alert(regenerateData.error || regenerateData.message || 'Failed to regenerate verification code')
      }
    } catch (error) {
      console.error('Error regenerating verification code:', error)
      alert('Error regenerating verification code. Please try again.')
    } finally {
      setRegeneratingCode(null)
    }
  }

  const openModal = (application: AffiliateApplication, type: 'approve' | 'reject' | 'view') => {
    setSelectedApplication(application)
    setModalType(type)
    setShowModal(true)
    setAdminNotes('')
    setRejectionReason('')
  }

  const toggleRowExpansion = (applicationId: number) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(applicationId)) {
      newExpandedRows.delete(applicationId)
    } else {
      newExpandedRows.add(applicationId)
    }
    setExpandedRows(newExpandedRows)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        alert('Copied to clipboard!')
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
        alert('Copied to clipboard!')
      }
    } catch (err) {
      console.error('Failed to copy: ', err)
      alert('Failed to copy to clipboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Affiliate Requests Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and manage affiliate applications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchApplications}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  All applications
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pending}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Awaiting approval
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.approved}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Active partners
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.rejected}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Not approved
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <XSquare className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Followers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading applications...
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                      No applications found
                      {searchQuery && (
                        <p className="text-sm">Try adjusting your search criteria</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <React.Fragment key={application.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {application.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {application.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {application.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {application.platform}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {application.followers}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(application.application_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRowExpansion(application.id)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          title={expandedRows.has(application.id) ? "Collapse Details" : "Expand Details"}
                        >
                          {expandedRows.has(application.id) ? (
                            <span className="text-lg">−</span>
                          ) : (
                            <span className="text-lg">+</span>
                          )}
                        </button>
                        
                        <button
                          onClick={() => openModal(application, 'view')}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openModal(application, 'approve')}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openModal(application, 'reject')}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        
                        {application.verification_code && (
                          <>
                            <button
                              onClick={() => copyToClipboard(application.verification_code!)}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                              title="Copy Verification Code"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRegenerateCode(application.id)}
                              disabled={regeneratingCode === application.id}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 disabled:opacity-50"
                              title="Regenerate Verification Code"
                            >
                              <RefreshCw className={`h-4 w-4 ${regeneratingCode === application.id ? 'animate-spin' : ''}`} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row Content */}
                  {expandedRows.has(application.id) && (
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column - Basic Info */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Application Details</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{application.phone}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Platform:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{application.platform}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Followers:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{application.followers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Expected Sales:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{application.expected_sales}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column - Social Media & Verification Code */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Social Media & Verification</h4>
                            <div className="space-y-2">
                              {application.instagram && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Instagram:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{application.instagram}</span>
                                </div>
                              )}
                              {application.youtube && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">YouTube:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{application.youtube}</span>
                                </div>
                              )}
                              {application.facebook && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Facebook:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{application.facebook}</span>
                                </div>
                              )}
                              
                              {/* Verification Code Section */}
                              {application.verification_code && (
                                <div className={`mt-4 p-3 rounded-lg border transition-all duration-500 ${
                                  recentlyRegenerated.has(application.id) 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
                                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-semibold ${
                                        recentlyRegenerated.has(application.id)
                                          ? 'text-blue-800 dark:text-blue-200'
                                          : 'text-green-800 dark:text-green-200'
                                      }`}>
                                        Verification Code:
                                      </span>
                                      {recentlyRegenerated.has(application.id) && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full animate-pulse">
                                          Just Updated!
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => copyToClipboard(application.verification_code!)}
                                        className={`flex items-center gap-1 ${
                                          recentlyRegenerated.has(application.id)
                                            ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200'
                                            : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200'
                                        }`}
                                      >
                                        <Copy className="h-4 w-4" />
                                        Copy
                                      </button>
                                      <button
                                        onClick={() => handleRegenerateCode(application.id)}
                                        disabled={regeneratingCode === application.id}
                                        className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <RefreshCw className={`h-4 w-4 ${regeneratingCode === application.id ? 'animate-spin' : ''}`} />
                                        Regenerate
                                      </button>
                                    </div>
                                  </div>
                                  <div className={`rounded p-2 border transition-colors duration-500 ${
                                    recentlyRegenerated.has(application.id)
                                      ? 'bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700'
                                      : 'bg-white dark:bg-gray-800 border-green-300 dark:border-green-700'
                                  }`}>
                                    <code className={`text-lg font-mono tracking-wider transition-colors duration-500 ${
                                      recentlyRegenerated.has(application.id)
                                        ? 'text-blue-900 dark:text-blue-100'
                                        : 'text-green-900 dark:text-green-100'
                                    }`}>
                                      {application.verification_code}
                                    </code>
                                  </div>
                                  <p className={`text-xs mt-1 transition-colors duration-500 ${
                                    recentlyRegenerated.has(application.id)
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-green-700 dark:text-green-300'
                                  }`}>
                                    Send this 20-digit code to the affiliate partner for account verification
                                  </p>
                                </div>
                              )}
                              
                              {/* Admin Notes */}
                              {application.admin_notes && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Admin Notes:</span>
                                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{application.admin_notes}</p>
                                </div>
                              )}
                              
                              {/* Rejection Reason */}
                              {application.rejection_reason && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                  <span className="text-sm font-semibold text-red-800 dark:text-red-200">Rejection Reason:</span>
                                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{application.rejection_reason}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Address Section */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Address</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {application.house_number}, {application.street}{application.building && `, ${application.building}`}{application.apartment && `, ${application.apartment}`}, {application.road}, {application.city}, {application.state} - {application.pincode}
                          </p>
                        </div>
                        
                        {/* Experience & Motivation */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Experience</h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{application.experience}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Why Join</h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{application.why_join}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {modalType === 'view' && 'Application Details'}
                  {modalType === 'approve' && 'Approve Application'}
                  {modalType === 'reject' && 'Reject Application'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Address:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.house_number}, {selectedApplication.street}, {selectedApplication.road}, {selectedApplication.city}, {selectedApplication.state} - {selectedApplication.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Social Media & Platform
                  </h3>
                  <div className="space-y-3">
                    {selectedApplication.instagram && (
                      <div className="flex items-center gap-3">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Instagram:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedApplication.instagram}
                        </span>
                      </div>
                    )}
                    {selectedApplication.youtube && (
                      <div className="flex items-center gap-3">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">YouTube:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedApplication.youtube}
                        </span>
                      </div>
                    )}
                    {selectedApplication.facebook && (
                      <div className="flex items-center gap-3">
                        <Facebook className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Facebook:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedApplication.facebook}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Followers:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.followers}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Platform:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.platform}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience and Motivation */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Experience & Motivation
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Experience:</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {selectedApplication.experience}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Why Join:</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {selectedApplication.why_join}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Expected Sales:</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {selectedApplication.expected_sales}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Forms */}
              {modalType === 'approve' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Add any notes for the affiliate partner..."
                  />
                </div>
              )}

              {modalType === 'reject' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Please provide a reason for rejection..."
                    required
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                
                {modalType === 'approve' && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve Application
                  </button>
                )}
                
                {modalType === 'reject' && (
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
