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
  Settings,
  Percent,
  Save,
  Edit,
  ShoppingBag,
  Package,
  ChevronDown,
  ChevronUp
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
  birth_day?: number
  birth_month?: number
  birth_year?: number
  education_level?: string
  profession?: string
  skills?: string
}

export default function AffiliateManagement() {
  const [applications, setApplications] = useState<AffiliateApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<AffiliateApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'view'>('view')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })
  
  // Commission settings state
  const [commissionSettings, setCommissionSettings] = useState({
    commission_percentage: 15.0,
    is_active: true
  })
  const [isEditingCommission, setIsEditingCommission] = useState(false)
  const [commissionLoading, setCommissionLoading] = useState(false)

  // Referral Analytics state
  const [activeTab, setActiveTab] = useState<'applications' | 'referrals'>('applications')
  const [referralAnalytics, setReferralAnalytics] = useState<any[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [expandedAffiliate, setExpandedAffiliate] = useState<number | null>(null)
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('')

  useEffect(() => {
    fetchApplications()
    fetchCommissionSettings()
  }, [statusFilter, currentPage, sortBy, sortOrder])

  useEffect(() => {
    if (activeTab === 'referrals') {
      fetchReferralAnalytics()
    }
  }, [activeTab])

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
        console.error('Failed to fetch applications:', data.error || 'Unknown error')
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

  const fetchCommissionSettings = async () => {
    try {
      const response = await fetch('/api/admin/affiliate-commission-settings')
      const data = await response.json()
      
      if (response.ok && data.commission_percentage !== undefined) {
        setCommissionSettings(data)
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error)
    }
  }

  const handleCommissionUpdate = async () => {
    try {
      setCommissionLoading(true)
      const response = await fetch('/api/admin/affiliate-commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commissionSettings)
      })

      const data = await response.json()
      
      if (response.ok && data.commission_percentage !== undefined) {
        alert('Commission settings updated successfully!')
        setIsEditingCommission(false)
        setCommissionSettings(data)
        // Emit socket event for real-time updates
        if ((window as any).io) {
          (window as any).io.emit('commission_settings_updated', data)
        }
      } else {
        alert('Failed to update commission settings: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating commission settings:', error)
      alert('Error updating commission settings')
    } finally {
      setCommissionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedApplication) return

    try {
      const response = await fetch(`/api/admin/affiliate-applications/${selectedApplication.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminNotes: adminNotes
        })
      })

      const data = await response.json()
      
      if (response.ok && data.application) {
        alert(`Application approved! Verification code: ${data.verificationCode}`)
        setShowModal(false)
        setAdminNotes('')
        fetchApplications()
      } else {
        alert('Failed to approve application: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error approving application:', error)
      alert('Error approving application')
    }
  }

  const handleReject = async () => {
    if (!selectedApplication || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      const response = await fetch(`/api/admin/affiliate-applications/${selectedApplication.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason
        })
      })

      const data = await response.json()
      
      if (response.ok && data.id) {
        alert('Application rejected')
        setShowModal(false)
        setRejectionReason('')
        fetchApplications()
      } else {
        alert('Failed to reject application: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error rejecting application:', error)
      alert('Error rejecting application')
    }
  }

  const openModal = (application: AffiliateApplication, type: 'approve' | 'reject' | 'view') => {
    setSelectedApplication(application)
    setModalType(type)
    setShowModal(true)
    setAdminNotes('')
    setRejectionReason('')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
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

  const fetchReferralAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const response = await fetch('/api/admin/affiliate-referral-analytics')
      const data = await response.json()
      
      if (response.ok && data.analytics) {
        setReferralAnalytics(data.analytics)
      } else {
        console.error('Failed to fetch referral analytics:', data.error || 'Unknown error')
        setReferralAnalytics([])
      }
    } catch (error) {
      console.error('Error fetching referral analytics:', error)
      setReferralAnalytics([])
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const filteredAnalytics = referralAnalytics.filter((affiliate) => {
    if (!analyticsSearchQuery.trim()) return true
    const query = analyticsSearchQuery.toLowerCase()
    return (
      affiliate.name?.toLowerCase().includes(query) ||
      affiliate.email?.toLowerCase().includes(query) ||
      affiliate.id?.toString().includes(query) ||
      affiliate.phone?.includes(query)
    )
  })

  const toggleAffiliateDetails = (affiliateId: number) => {
    setExpandedAffiliate(expandedAffiliate === affiliateId ? null : affiliateId)
  }

  const handleExportCSV = async () => {
    try {
      // Fetch all affiliate partners data
      const response = await fetch('/api/admin/affiliate-referral-analytics')
      const data = await response.json()
      
      if (!response.ok || !data.analytics) {
        alert('Failed to fetch affiliate data: ' + (data.error || 'Unknown error'))
        return
      }

      const affiliates = data.analytics

      // Define CSV headers
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Status',
        'Partner ID',
        'Platform',
        'Followers',
        'Commission Rate (%)',
        'Date of Birth (Day/Month/Year)',
        'Education Level',
        'Profession',
        'Skills',
        'Total Referrals',
        'Confirmed Referrals',
        'Unique Customers',
        'Total Revenue (₹)',
        'Total Earnings (₹)',
        'Created At'
      ]

      // Convert data to CSV rows
      const rows = affiliates.map((affiliate: any) => {
        const dob = affiliate.birth_day && affiliate.birth_month 
          ? `${affiliate.birth_day}/${affiliate.birth_month}${affiliate.birth_year ? `/${affiliate.birth_year}` : ''}`
          : ''
        
        return [
          affiliate.id || '',
          affiliate.name || '',
          affiliate.email || '',
          affiliate.phone || '',
          affiliate.status || '',
          affiliate.partner_id || '',
          affiliate.platform || '',
          affiliate.followers || '',
          affiliate.commission_rate || 0,
          dob,
          affiliate.education_level ? affiliate.education_level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : '',
          affiliate.profession || '',
          affiliate.skills || '',
          affiliate.stats?.total_referrals || 0,
          affiliate.stats?.confirmed_referrals || 0,
          affiliate.stats?.unique_customers || 0,
          affiliate.stats?.total_revenue?.toFixed(2) || '0.00',
          affiliate.stats?.total_earnings?.toFixed(2) || '0.00',
          affiliate.created_at ? formatDate(affiliate.created_at) : ''
        ]
      })

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        // Escape commas, quotes, and newlines
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      // Create CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map((row: (string | number)[]) => row.map(escapeCSV).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `affiliate_members_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      alert(`Exported ${affiliates.length} affiliate member(s) to CSV`)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)', backgroundColor: 'var(--arctic-blue-background)' }}>
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
      <div className="metric-card border-b" style={{ borderColor: 'var(--arctic-blue-light)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className="text-3xl font-light mb-2 tracking-[0.15em]" 
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                Affiliate Program Management
              </h1>
              <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Manage affiliate applications, approvals, and partner accounts
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'applications'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setActiveTab('referrals')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'referrals'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Referral Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Settings Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Commission Settings */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <Percent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {isEditingCommission ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionSettings.commission_percentage}
                      onChange={(e) => setCommissionSettings(prev => ({ ...prev, commission_percentage: parseFloat(e.target.value) || 0 }))}
                      className="w-20 px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <span className="text-sm text-blue-600 dark:text-blue-400">%</span>
                    <button
                      onClick={handleCommissionUpdate}
                      disabled={commissionLoading}
                      className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                      title="Save changes"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingCommission(false)}
                      className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      title="Cancel"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Commission: {commissionSettings.commission_percentage}%
                    </span>
                    <button
                      onClick={() => setIsEditingCommission(true)}
                      className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                      title="Edit commission percentage"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'applications' ? (
              <>
                <button
                  onClick={fetchApplications}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </>
            ) : (
              <button
                onClick={fetchReferralAnalytics}
                disabled={analyticsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Refresh Analytics
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'referrals' ? (
          /* Referral Analytics Tab */
          <div>
            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by affiliate name, email, ID, or phone..."
                  value={analyticsSearchQuery}
                  onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Analytics Loading State */}
            {analyticsLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading referral analytics...</p>
              </div>
            ) : filteredAnalytics.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {analyticsSearchQuery ? 'No affiliates found matching your search' : 'No affiliate data available'}
                </p>
              </div>
            ) : (
              /* Affiliates List */
              <div className="space-y-4">
                {filteredAnalytics.map((affiliate) => (
                  <div
                    key={affiliate.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Affiliate Header */}
                    <div
                      className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => toggleAffiliateDetails(affiliate.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {affiliate.name || 'Unknown'}
                            </h3>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              ID: {affiliate.id}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              affiliate.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {affiliate.status || 'unverified'}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {affiliate.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {affiliate.phone}
                            </span>
                            {affiliate.platform && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                {affiliate.platform}
                              </span>
                            )}
                            {(affiliate.birth_day || affiliate.birth_month || affiliate.birth_year) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                DOB: {affiliate.birth_day && `${affiliate.birth_day}/`}
                                {affiliate.birth_month && `${affiliate.birth_month}`}
                                {affiliate.birth_year && `/${affiliate.birth_year}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {/* Stats */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {affiliate.stats?.total_referrals || 0}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Total Referrals</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {affiliate.stats?.confirmed_referrals || 0}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Confirmed</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {affiliate.stats?.unique_customers || 0}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Customers</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              ₹{affiliate.stats?.total_earnings?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Earnings</div>
                          </div>
                          {expandedAffiliate === affiliate.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedAffiliate === affiliate.id && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
                        {/* Personal Details */}
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Personal Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{affiliate.email}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{affiliate.phone}</p>
                            </div>
                            {affiliate.platform && (
                              <div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Platform:</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{affiliate.platform}</p>
                              </div>
                            )}
                            {affiliate.followers && (
                              <div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Followers:</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{affiliate.followers}</p>
                              </div>
                            )}
                            {(affiliate.birth_day || affiliate.birth_month || affiliate.birth_year) && (
                              <div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Date of Birth:</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {affiliate.birth_day && `${affiliate.birth_day}/`}
                                  {affiliate.birth_month && `${affiliate.birth_month}`}
                                  {affiliate.birth_year && `/${affiliate.birth_year}`}
                                </p>
                              </div>
                            )}
                            {affiliate.education_level && (
                              <div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Education Level:</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {affiliate.education_level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </p>
                              </div>
                            )}
                            {affiliate.profession && (
                              <div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Profession:</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{affiliate.profession}</p>
                              </div>
                            )}
                            {affiliate.skills && (
                              <div className="md:col-span-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Skills:</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{affiliate.skills}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Referrals List */}
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Referrals ({affiliate.referrals?.length || 0})
                          </h4>
                          {affiliate.referrals && affiliate.referrals.length > 0 ? (
                            <div className="space-y-4">
                              {affiliate.referrals.map((referral: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {referral.customer_name || 'Unknown Customer'}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                          ({referral.customer_email})
                                        </span>
                                      </div>
                                      {referral.order_number && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          Order: {referral.order_number}
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-500 dark:text-gray-500">
                                        Date: {formatDate(referral.referral_date || referral.order_date)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                                        ₹{parseFloat(referral.commission_earned || 0).toFixed(2)}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Commission</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Order Total: ₹{parseFloat(referral.order_total || referral.order_total_amount || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Products in this order */}
                                  {referral.order_items && Array.isArray(referral.order_items) && referral.order_items.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                        <Package className="h-4 w-4" />
                                        Products:
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {referral.order_items.map((item: any, itemIdx: number) => (
                                          <div
                                            key={itemIdx}
                                            className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2"
                                          >
                                            <div className="font-medium text-gray-900 dark:text-white">
                                              {item.title || item.name || 'Unknown Product'}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                              Qty: {item.quantity || 0} × ₹{parseFloat(item.price || 0).toFixed(2)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                              No referrals yet
                            </p>
                          )}
                        </div>

                        {/* Products Summary */}
                        {affiliate.products && affiliate.products.length > 0 && (
                          <div>
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <ShoppingBag className="h-5 w-5" />
                              All Products Sold ({affiliate.products.length})
                            </h4>
                            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        Product
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        Customer
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        Order
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        Qty
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        Price
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        Date
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {affiliate.products.map((product: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                          {product.product_name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                          {product.customer_name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                          {product.order_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                          {product.quantity}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                          ₹{parseFloat(product.price || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                          {formatDate(product.referral_date)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Applications Tab - Existing Content */
          <>
            {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  All time applications
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
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
                  <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
                          onClick={() => openModal(application, 'view')}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openModal(application, 'approve')}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openModal(application, 'reject')}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {modalType === 'view' && 'Application Details'}
                  {modalType === 'approve' && 'Approve Application'}
                  {modalType === 'reject' && 'Reject Application'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Name:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedApplication.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Email:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedApplication.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Phone:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedApplication.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Social Media Profiles
                  </h3>
                  <div className="space-y-3">
                    {selectedApplication.instagram && (
                      <div className="flex items-center gap-3">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Instagram:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {selectedApplication.instagram}
                        </span>
                      </div>
                    )}
                    {selectedApplication.youtube && (
                      <div className="flex items-center gap-3">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">YouTube:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {selectedApplication.youtube}
                        </span>
                      </div>
                    )}
                    {selectedApplication.facebook && (
                      <div className="flex items-center gap-3">
                        <Facebook className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Facebook:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {selectedApplication.facebook}
                        </span>
                      </div>
                    )}
                    {selectedApplication.snapchat && (
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Snapchat:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {selectedApplication.snapchat}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Address
                </h3>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">
                    {selectedApplication.house_number}, {selectedApplication.street}
                    {selectedApplication.building && `, ${selectedApplication.building}`}
                    {selectedApplication.apartment && `, ${selectedApplication.apartment}`}
                    <br />
                    {selectedApplication.road}, {selectedApplication.city}
                    <br />
                    {selectedApplication.pincode}, {selectedApplication.state}
                  </span>
                </div>
              </div>

              {/* Date of Birth Section */}
              {(selectedApplication.birth_day || selectedApplication.birth_month || selectedApplication.birth_year) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Date of Birth
                  </h3>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-900 dark:text-slate-100">
                      {selectedApplication.birth_day && `${selectedApplication.birth_day}/`}
                      {selectedApplication.birth_month && `${selectedApplication.birth_month}`}
                      {selectedApplication.birth_year && `/${selectedApplication.birth_year}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Qualifications Section */}
              {(selectedApplication.education_level || selectedApplication.profession || selectedApplication.skills) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Qualifications
                  </h3>
                  <div className="space-y-3">
                    {selectedApplication.education_level && (
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Education Level:</span>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                          {selectedApplication.education_level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                      </div>
                    )}
                    {selectedApplication.profession && (
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Profession:</span>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                          {selectedApplication.profession}
                        </p>
                      </div>
                    )}
                    {selectedApplication.skills && (
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Skills:</span>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                          {selectedApplication.skills}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Experience and Motivation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Experience
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                    {selectedApplication.experience}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Why Join Nefol?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                    {selectedApplication.why_join}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Platform:</span>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedApplication.platform}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Followers:</span>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedApplication.followers}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Expected Sales:</span>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedApplication.expected_sales}
                  </p>
                </div>
              </div>

              {/* Action Forms */}
              {modalType === 'approve' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="Add any notes for the affiliate partner..."
                  />
                </div>
              )}

              {modalType === 'reject' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="Please provide a reason for rejection..."
                    required
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                
                {modalType === 'approve' && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve Application
                  </button>
                )}
                
                {modalType === 'reject' && (
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  )
}
