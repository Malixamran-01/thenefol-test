import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Return {
  id: string
  returnNumber: string
  orderId: string
  customerName: string
  customerEmail: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed'
  items: ReturnItem[]
  totalAmount: number
  refundAmount: number
  createdAt: string
  updatedAt: string
  notes?: string
}

interface ReturnItem {
  id: string
  productName: string
  quantity: number
  reason: string
  condition: 'new' | 'used' | 'damaged'
  refundAmount: number
}

const Returns = () => {
  const { notify } = useToast()
  const [returns, setReturns] = useState<Return[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Load returns from API
  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
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
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/returns`, { headers: { 'x-user-role': 'admin', 'x-user-permissions': 'returns:read' } });
      if (response.ok) {
        const data = await response.json();
        setReturns(Array.isArray(data) ? data : data?.data || []);
      }
    } catch (error) {
      console.error('Failed to load returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.orderId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateReturn = async (returnData: Partial<Return>) => {
    setLoading(true)
    try {
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
      const apiBase = getApiBase();
      const payload = {
        order_id: returnData.orderId,
        items: returnData.items || [],
        reason: returnData.reason || ''
      }
      const response = await fetch(`${apiBase}/api/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin', 'x-user-permissions': 'returns:create' },
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        const newReturn = await response.json()
        setReturns([...returns, newReturn?.data || newReturn])
        setShowCreateModal(false)
        notify('success','Return created')
      }
    } catch (error) {
      console.error('Error creating return:', error)
      notify('error','Failed to create return')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateReturn = async (returnData: Partial<Return>) => {
    if (!selectedReturn) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/returns/${selectedReturn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      })
      
      if (response.ok) {
        const updatedReturn = await response.json()
        setReturns(returns.map(ret => ret.id === selectedReturn.id ? updatedReturn : ret))
        setShowEditModal(false)
        setSelectedReturn(null)
        notify('success','Return updated')
      }
    } catch (error) {
      console.error('Error updating return:', error)
      notify('error','Failed to update return')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReturn = async (returnId: string) => {
    if (!returnId) return
    setLoading(true)
    try {
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
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/returns/${returnId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setReturns(returns.filter(ret => ret.id !== returnId))
        notify('success','Return deleted')
      }
    } catch (error) {
      console.error('Error deleting return:', error)
      notify('error','Failed to delete return')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (returnId: string, newStatus: Return['status']) => {
    setLoading(true)
    try {
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
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/returns/${returnId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin', 'x-user-permissions': 'returns:update' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setReturns(returns.map(ret => 
          ret.id === returnId ? { ...ret, status: newStatus, updatedAt: new Date().toISOString() } : ret
        ))
      }
    } catch (error) {
      console.error('Error updating return status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLabel = async (returnId: string) => {
    try {
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
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/returns/${returnId}/label`, {
        method: 'POST',
        headers: { 'x-user-role': 'admin', 'x-user-permissions': 'returns:update' }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate label')
      alert(`Return Label: ${data?.data?.label_url || data?.label_url}`)
    } catch (e: any) {
      alert(e?.message || 'Failed to generate label')
    }
  }

  const totalReturns = returns.length
  const pendingReturns = returns.filter(ret => ret.status === 'pending').length
  const totalRefundAmount = returns.reduce((sum, ret) => sum + ret.refundAmount, 0)
  const averageRefundAmount = totalReturns > 0 ? totalRefundAmount / totalReturns : 0

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
            Returns Management
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Process customer returns and refunds
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <span className="text-lg mr-2">↩️</span>
          Process Return
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Total Returns</p>
              <p className="text-2xl font-light" style={{ color: 'var(--arctic-blue-primary-dark)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>{totalReturns}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Pending Returns</p>
              <p className="text-2xl font-light" style={{ color: '#D97706', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>{pendingReturns}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Total Refunds</p>
              <p className="text-2xl font-light" style={{ color: '#DC2626', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>₹{totalRefundAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <span className="text-2xl">💸</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Avg Refund</p>
              <p className="text-2xl font-light" style={{ color: 'var(--arctic-blue-primary-dark)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>₹{averageRefundAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="metric-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search returns..."
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
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Returns Table */}
      <div className="metric-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Return #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((returnItem) => (
                <tr key={returnItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/admin/returns/${returnItem.id}`} className="text-brand-primary hover:underline font-medium">
                      {returnItem.returnNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/admin/orders/${returnItem.orderId}`} className="text-brand-primary hover:underline">
                      {returnItem.orderId}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{returnItem.customerName}</p>
                      <p className="text-sm text-gray-500">{returnItem.customerEmail}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{returnItem.reason}</td>
                  <td className="py-3 px-4 font-medium">${returnItem.refundAmount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{returnItem.createdAt}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReturn(returnItem)
                          setShowEditModal(true)
                        }}
                        className="text-brand-secondary hover:text-brand-primary"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {returnItem.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(returnItem.id, 'approved')}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(returnItem.id, 'rejected')}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      {returnItem.status === 'approved' && (
                        <button
                          onClick={() => handleStatusUpdate(returnItem.id, 'processing')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Start Processing"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      {returnItem.status === 'processing' && (
                        <button
                          onClick={() => handleStatusUpdate(returnItem.id, 'completed')}
                          className="text-green-600 hover:text-green-800"
                          title="Mark Complete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateLabel(returnItem.id)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Generate Return Label"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button onClick={()=>setConfirmDeleteId(returnItem.id)} className="text-red-600 hover:text-red-800" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={()=>setConfirmDeleteId(null)}
        onConfirm={()=>{ if (confirmDeleteId) handleDeleteReturn(confirmDeleteId) }}
        title="Delete this return?"
        description="This action cannot be undone."
        confirmText="Delete"
      />

      {/* Create Return Modal */}
      {showCreateModal && (
        <CreateReturnModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateReturn}
          loading={loading}
        />
      )}

      {/* Edit Return Modal */}
      {showEditModal && selectedReturn && (
        <EditReturnModal
          returnItem={selectedReturn}
          onClose={() => {
            setShowEditModal(false)
            setSelectedReturn(null)
          }}
          onSubmit={handleUpdateReturn}
          loading={loading}
        />
      )}
    </div>
  )
}

// Create Return Modal Component
const CreateReturnModal = ({ onClose, onSubmit, loading }: {
  onClose: () => void
  onSubmit: (data: Partial<Return>) => void
  loading: boolean
}) => {
  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    customerEmail: '',
    reason: '',
    notes: '',
    items: [{ productName: '', quantity: 1, reason: '', condition: 'new' as const, refundAmount: 0 }]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const totalRefundAmount = formData.items.reduce((sum, item) => sum + item.refundAmount, 0)
    const returnData = {
      ...formData,
      returnNumber: `RET-${Date.now()}`,
      status: 'pending' as const,
      totalAmount: totalRefundAmount,
      refundAmount: totalRefundAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: formData.items.map((item, index) => ({ ...item, id: `item-${Date.now()}-${index}` }))
    }
    onSubmit(returnData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-primary">Process Return</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input
                type="text"
                required
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
              <input
                type="email"
                required
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              >
                <option value="">Select reason</option>
                <option value="Product defect">Product defect</option>
                <option value="Wrong size">Wrong size</option>
                <option value="Changed mind">Changed mind</option>
                <option value="Not as described">Not as described</option>
                <option value="Damaged in shipping">Damaged in shipping</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Return Items</label>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={item.productName}
                    onChange={(e) => {
                      const newItems = [...formData.items]
                      newItems[index].productName = e.target.value
                      setFormData({ ...formData, items: newItems })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Quantity"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...formData.items]
                      newItems[index].quantity = parseInt(e.target.value) || 1
                      setFormData({ ...formData, items: newItems })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
                <div>
                  <select
                    value={item.condition}
                    onChange={(e) => {
                      const newItems = [...formData.items]
                      newItems[index].condition = e.target.value as any
                      setFormData({ ...formData, items: newItems })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Refund Amount"
                    min="0"
                    step="0.01"
                    value={item.refundAmount}
                    onChange={(e) => {
                      const newItems = [...formData.items]
                      newItems[index].refundAmount = parseFloat(e.target.value) || 0
                      setFormData({ ...formData, items: newItems })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, items: [...formData.items, { productName: '', quantity: 1, reason: '', condition: 'new', refundAmount: 0 }] })}
              className="text-brand-secondary hover:text-brand-primary"
            >
              + Add Item
            </button>
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
              {loading ? 'Processing...' : 'Process Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Return Modal Component
const EditReturnModal = ({ returnItem, onClose, onSubmit, loading }: {
  returnItem: Return
  onClose: () => void
  onSubmit: (data: Partial<Return>) => void
  loading: boolean
}) => {
  const [formData, setFormData] = useState({
    status: returnItem.status,
    notes: returnItem.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const returnData = {
      ...formData,
      updatedAt: new Date().toISOString()
    }
    onSubmit(returnData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-primary">Edit Return</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
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
              {loading ? 'Updating...' : 'Update Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Returns




