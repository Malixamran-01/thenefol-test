import React, { useState, useEffect } from 'react'

interface PaymentMethod {
  id: string
  name: string
  type: 'credit_card' | 'debit_card' | 'paypal' | 'stripe' | 'razorpay' | 'cash_on_delivery'
  isActive: boolean
  processingFee: number
  minimumAmount: number
  maximumAmount: number
  supportedCurrencies: string[]
  createdAt: string
  updatedAt: string
}

interface PaymentTransaction {
  id: string
  transactionId: string
  orderId: string
  customerName: string
  amount: number
  currency: string
  paymentMethod: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  createdAt: string
  processedAt?: string
  failureReason?: string
}

interface PaymentReport {
  period: string
  totalTransactions: number
  totalAmount: number
  successfulTransactions: number
  failedTransactions: number
  averageTransactionAmount: number
  paymentMethodBreakdown: { method: string; count: number; amount: number }[]
}

const Payment = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [paymentReport, setPaymentReport] = useState<PaymentReport | null>(null)

  // Load payment data from API
  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`;
      const [methodsRes, transactionsRes, reportRes] = await Promise.all([
        fetch(`${apiBase}/api/payment-methods`),
        fetch(`${apiBase}/api/payment-transactions`),
        fetch(`${apiBase}/api/payment-report`)
      ]);
      
      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        setPaymentMethods(methodsData);
      }
      
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData);
      }
      
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setPaymentReport(reportData);
      }
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = (transaction.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.orderId || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreatePaymentMethod = async (paymentData: Partial<PaymentMethod>) => {
    setLoading(true)
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })
      
      if (response.ok) {
        const newPaymentMethod = await response.json()
        setPaymentMethods([...paymentMethods, newPaymentMethod])
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Error creating payment method:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePaymentMethod = async (paymentData: Partial<PaymentMethod>) => {
    if (!selectedPaymentMethod) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/payment-methods/${selectedPaymentMethod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })
      
      if (response.ok) {
        const updatedPaymentMethod = await response.json()
        setPaymentMethods(paymentMethods.map(method => method.id === selectedPaymentMethod.id ? updatedPaymentMethod : method))
        setShowEditModal(false)
        setSelectedPaymentMethod(null)
      }
    } catch (error) {
      console.error('Error updating payment method:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setPaymentMethods(paymentMethods.filter(method => method.id !== paymentMethodId))
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (paymentMethodId: string) => {
    setLoading(true)
    try {
      const paymentMethod = paymentMethods.find(method => method.id === paymentMethodId)
      if (!paymentMethod) return

      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !paymentMethod.isActive })
      })
      
      if (response.ok) {
        setPaymentMethods(paymentMethods.map(method => 
          method.id === paymentMethodId ? { ...method, isActive: !method.isActive } : method
        ))
      }
    } catch (error) {
      console.error('Error toggling payment method:', error)
    } finally {
      setLoading(false)
    }
  }

  const activePaymentMethods = paymentMethods.filter(method => method.isActive)
  const totalTransactions = transactions.length
  const successfulTransactions = transactions.filter(t => t.status === 'completed').length
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-primary">Payment Management</h1>
          <p className="text-gray-600 mt-1">Configure payment methods and monitor transactions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <span className="text-lg mr-2">💳</span>
          Add Payment Method
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Methods</p>
              <p className="text-2xl font-bold text-brand-primary">{activePaymentMethods.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-brand-primary">{totalTransactions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-brand-primary">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Report */}
      {paymentReport && (
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Report - {paymentReport.period}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="font-semibold">{paymentReport.totalTransactions}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Successful</span>
                <span className="font-semibold text-green-600">{paymentReport.successfulTransactions}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{paymentReport.failedTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Amount</span>
                <span className="font-semibold">${paymentReport.averageTransactionAmount.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Method Breakdown</h4>
              {paymentReport.paymentMethodBreakdown.map((method, index) => (
                <div key={index} className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{method.method}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">${method.amount.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 ml-2">({method.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="metric-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{method.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {method.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Fee: {method.processingFee}%</p>
                <p>Min: ${method.minimumAmount}</p>
                <p>Max: ${method.maximumAmount}</p>
                <p>Currencies: {(method.supportedCurrencies || []).join(', ')}</p>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedPaymentMethod(method)
                    setShowEditModal(true)
                  }}
                  className="text-brand-secondary hover:text-brand-primary"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleToggleActive(method.id)}
                  className={`${method.isActive ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                  title={method.isActive ? 'Deactivate' : 'Activate'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePaymentMethod(method.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="metric-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="metric-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Transaction ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{transaction.transactionId}</td>
                  <td className="py-3 px-4 text-brand-primary">{transaction.orderId}</td>
                  <td className="py-3 px-4 text-gray-600">{transaction.customerName}</td>
                  <td className="py-3 px-4 font-medium">${transaction.amount.toFixed(2)} {transaction.currency}</td>
                  <td className="py-3 px-4 text-gray-600">{transaction.paymentMethod}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{transaction.createdAt}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {transaction.status === 'completed' && (
                        <button
                          onClick={() => {
                            // Handle refund
                            console.log('Process refund for', transaction.id)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Process Refund"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          // View transaction details
                          console.log('View details for', transaction.id)
                        }}
                        className="text-brand-secondary hover:text-brand-primary"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Method Modal */}
      {showCreateModal && (
        <CreatePaymentMethodModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePaymentMethod}
          loading={loading}
        />
      )}

      {/* Edit Payment Method Modal */}
      {showEditModal && selectedPaymentMethod && (
        <EditPaymentMethodModal
          paymentMethod={selectedPaymentMethod}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPaymentMethod(null)
          }}
          onSubmit={handleUpdatePaymentMethod}
          loading={loading}
        />
      )}
    </div>
  )
}

// Create Payment Method Modal Component
const CreatePaymentMethodModal = ({ onClose, onSubmit, loading }: {
  onClose: () => void
  onSubmit: (data: Partial<PaymentMethod>) => void
  loading: boolean
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'credit_card' as PaymentMethod['type'],
    processingFee: 0,
    minimumAmount: 1,
    maximumAmount: 10000,
    supportedCurrencies: ['USD'],
    isActive: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const paymentData = {
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    onSubmit(paymentData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-primary">Add Payment Method</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as PaymentMethod['type'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="razorpay">Razorpay</option>
              <option value="cash_on_delivery">Cash on Delivery</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Processing Fee (%)</label>
            <input
              type="number"
              required
              min="0"
              step="0.1"
              value={formData.processingFee}
              onChange={(e) => setFormData({ ...formData, processingFee: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount</label>
              <input
                type="number"
                required
                min="0"
                value={formData.minimumAmount}
                onChange={(e) => setFormData({ ...formData, minimumAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount</label>
              <input
                type="number"
                required
                min="0"
                value={formData.maximumAmount}
                onChange={(e) => setFormData({ ...formData, maximumAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-brand-secondary focus:ring-brand-secondary border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Payment Method Modal Component
const EditPaymentMethodModal = ({ paymentMethod, onClose, onSubmit, loading }: {
  paymentMethod: PaymentMethod
  onClose: () => void
  onSubmit: (data: Partial<PaymentMethod>) => void
  loading: boolean
}) => {
  const [formData, setFormData] = useState({
    name: paymentMethod.name,
    processingFee: paymentMethod.processingFee,
    minimumAmount: paymentMethod.minimumAmount,
    maximumAmount: paymentMethod.maximumAmount,
    isActive: paymentMethod.isActive
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const paymentData = {
      ...formData,
      updatedAt: new Date().toISOString()
    }
    onSubmit(paymentData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-primary">Edit Payment Method</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Processing Fee (%)</label>
            <input
              type="number"
              required
              min="0"
              step="0.1"
              value={formData.processingFee}
              onChange={(e) => setFormData({ ...formData, processingFee: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount</label>
              <input
                type="number"
                required
                min="0"
                value={formData.minimumAmount}
                onChange={(e) => setFormData({ ...formData, minimumAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount</label>
              <input
                type="number"
                required
                min="0"
                value={formData.maximumAmount}
                onChange={(e) => setFormData({ ...formData, maximumAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-brand-secondary focus:ring-brand-secondary border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Updating...' : 'Update Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Payment




