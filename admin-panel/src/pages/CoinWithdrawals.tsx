import React, { useState, useEffect } from 'react'
import { 
  Wallet, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  Filter,
  Search,
  Download,
  Eye
} from 'lucide-react'
import api from '../services/api'

interface Withdrawal {
  id: number
  user_id: number
  user_name: string
  user_email: string
  user_phone?: string
  amount: number
  withdrawal_method: string
  account_holder_name: string
  account_number?: string
  ifsc_code?: string
  bank_name?: string
  upi_id?: string
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed'
  transaction_id?: string
  razorpay_payout_id?: string
  admin_notes?: string
  rejection_reason?: string
  processed_by?: number
  created_at: string
  updated_at: string
  processed_at?: string
}

export default function CoinWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processForm, setProcessForm] = useState({
    status: 'processing',
    transaction_id: '',
    admin_notes: '',
    rejection_reason: ''
  })

  useEffect(() => {
    fetchWithdrawals()
  }, [filterStatus])

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/coin-withdrawals${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Backend returns array directly
        setWithdrawals(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch withdrawals:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedWithdrawal) return

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token')
      const role = localStorage.getItem('role') || 'admin'
      const permissions = localStorage.getItem('permissions') || ''
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      // Add auth headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      if (role) {
        headers['x-user-role'] = role
      }
      if (permissions) {
        headers['x-user-permissions'] = permissions
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/coin-withdrawals/${selectedWithdrawal.id}/process`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(processForm)
      })

      if (response.ok) {
        alert('Withdrawal processed successfully!')
        setShowProcessModal(false)
        setSelectedWithdrawal(null)
        fetchWithdrawals()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to process withdrawal')
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error)
      alert('Failed to process withdrawal')
    }
  }

  const openProcessModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setProcessForm({
      status: withdrawal.status,
      transaction_id: withdrawal.transaction_id || '',
      admin_notes: withdrawal.admin_notes || '',
      rejection_reason: withdrawal.rejection_reason || ''
    })
    setShowProcessModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'processing': 'bg-blue-100 text-blue-800 border-blue-300',
      'completed': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'failed': 'bg-red-100 text-red-800 border-red-300'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles['pending']}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'rejected':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const filteredWithdrawals = withdrawals.filter(w => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        w.user_name.toLowerCase().includes(query) ||
        w.user_email.toLowerCase().includes(query) ||
        w.transaction_id?.toLowerCase().includes(query) ||
        w.id.toString().includes(query)
      )
    }
    return true
  })

  const totalPending = withdrawals.filter(w => w.status === 'pending').length
  // Convert coins to rupees (1 rupee = 10 coins)
  const totalAmount = withdrawals.reduce((sum, w) => sum + ((Number(w.amount) || 0) / 10), 0)
  const pendingAmount = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + ((Number(w.amount) || 0) / 10), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coin Withdrawals</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user withdrawal requests</p>
          </div>
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{withdrawals.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Amount</p>
            <p className="text-2xl font-bold text-orange-600">₹{pendingAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Withdrawals List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredWithdrawals.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No withdrawal requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      #{withdrawal.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{withdrawal.user_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{withdrawal.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                      ₹{((Number(withdrawal.amount) || 0) / 10).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {withdrawal.withdrawal_method === 'bank' ? (
                          <Building2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {withdrawal.withdrawal_method === 'bank' ? 'Bank' : 'UPI'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(withdrawal.status)}
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openProcessModal(withdrawal)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Process Modal */}
      {showProcessModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Process Withdrawal
            </h2>

            <div className="mb-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">User</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedWithdrawal.user_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedWithdrawal.user_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">₹{((Number(selectedWithdrawal.amount) || 0) / 10).toFixed(2)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedWithdrawal.amount} coins</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Method</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedWithdrawal.withdrawal_method === 'bank' ? 'Bank Transfer' : 'UPI Transfer'}
                  </p>
                </div>
              </div>

              {selectedWithdrawal.withdrawal_method === 'bank' && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Bank Details</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Account: {selectedWithdrawal.account_holder_name}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Bank: {selectedWithdrawal.bank_name}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Account Number: ****{selectedWithdrawal.account_number?.slice(-4)}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">IFSC: {selectedWithdrawal.ifsc_code}</p>
                </div>
              )}

              {selectedWithdrawal.withdrawal_method === 'upi' && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">UPI Details</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">UPI ID: {selectedWithdrawal.upi_id}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleProcess} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={processForm.status}
                  onChange={(e) => setProcessForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={processForm.transaction_id}
                  onChange={(e) => setProcessForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                  placeholder="Enter transaction ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={processForm.admin_notes}
                  onChange={(e) => setProcessForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                  rows={3}
                  placeholder="Add notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {(processForm.status === 'rejected' || processForm.status === 'failed') && (
                <div>
                  <label className="block text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={processForm.rejection_reason}
                    onChange={(e) => setProcessForm(prev => ({ ...prev, rejection_reason: e.target.value }))}
                    rows={3}
                    required
                    placeholder={`Reason for ${processForm.status === 'rejected' ? 'rejection' : 'failure'}...`}
                    className="w-full px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Process Withdrawal
                </button>
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
