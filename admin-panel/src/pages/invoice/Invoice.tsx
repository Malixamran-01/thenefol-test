import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  orderId: string
  amount: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueDate: string
  createdAt: string
  items: InvoiceItem[]
}

interface InvoiceItem {
  id: string
  productName: string
  quantity: number
  price: number
  total: number
}

const Invoice = () => {
  const { notify } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Load invoices from API
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
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
      const response = await fetch(`${apiBase}/invoices`);
      if (response.ok) {
        const data = await response.json();
        // Ensure we have an array and filter out any malformed invoices
        const validInvoices = Array.isArray(data) ? data.filter(invoice => 
          invoice && 
          typeof invoice === 'object' && 
          invoice.invoiceNumber && 
          invoice.customerName && 
          invoice.customerEmail
        ) : [];
        setInvoices(validInvoices);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
      // Set empty array on error to prevent undefined issues
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = (invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (invoice.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateInvoice = async (invoiceData: Partial<Invoice>) => {
    setLoading(true)
    try {
      // API call to create invoice
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })
      
      if (response.ok) {
        const newInvoice = await response.json()
        setInvoices([...invoices, newInvoice])
        setShowCreateModal(false)
        notify('success','Invoice created')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      notify('error','Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateInvoice = async (invoiceData: Partial<Invoice>) => {
    if (!selectedInvoice) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })
      
      if (response.ok) {
        const updatedInvoice = await response.json()
        setInvoices(invoices.map(inv => inv.id === selectedInvoice.id ? updatedInvoice : inv))
        setShowEditModal(false)
        setSelectedInvoice(null)
        notify('success','Invoice updated')
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
      notify('error','Failed to update invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!invoiceId) return
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
      const response = await fetch(`${apiBase}/invoices/${invoiceId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setInvoices(invoices.filter(inv => inv.id !== invoiceId))
        notify('success','Invoice deleted')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      notify('error','Failed to delete invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvoice = async (invoiceId: string) => {
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
      const response = await fetch(`${apiBase}/invoices/${invoiceId}/send`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setInvoices(invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, status: 'sent' as const } : inv
        ))
        notify('success','Invoice sent')
      }
    } catch (error) {
      console.error('Error sending invoice:', error)
      notify('error','Failed to send invoice')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0)
  const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, invoice) => sum + invoice.total, 0)

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
            Invoices
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage customer invoices and billing
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/invoice-settings"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Invoice Settings
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <span className="text-lg mr-2">🧾</span>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-brand-primary">{invoices.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-brand-primary">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Amount</p>
              <p className="text-2xl font-bold text-green-600">${paidAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
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
              placeholder="Search invoices..."
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
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="metric-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/admin/invoices/${invoice.id}`} className="text-brand-primary hover:underline font-medium">
                      {invoice.invoiceNumber || 'N/A'}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.customerName || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{invoice.customerEmail || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/admin/orders/${invoice.orderId}`} className="text-brand-primary hover:underline">
                      {invoice.orderId || 'N/A'}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium">${(invoice.total || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status || 'draft')}`}>
                      {(invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{invoice.dueDate || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setShowEditModal(true)
                        }}
                        className="text-brand-secondary hover:text-brand-primary"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleSendInvoice(invoice.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Send Invoice"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      )}
                      <button onClick={()=>setConfirmDeleteId(invoice.id)} className="text-red-600 hover:text-red-800" title="Delete">
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

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateInvoice}
          loading={loading}
        />
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && selectedInvoice && (
        <EditInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowEditModal(false)
            setSelectedInvoice(null)
          }}
          onSubmit={handleUpdateInvoice}
          loading={loading}
        />
      )}
    <ConfirmDialog open={!!confirmDeleteId} onClose={()=>setConfirmDeleteId(null)} onConfirm={()=>{ if (confirmDeleteId) handleDeleteInvoice(confirmDeleteId) }} title="Delete this invoice?" description="This action cannot be undone." confirmText="Delete" />
    </div>
  )
}

// Create Invoice Modal Component
const CreateInvoiceModal = ({ onClose, onSubmit, loading }: {
  onClose: () => void
  onSubmit: (data: Partial<Invoice>) => void
  loading: boolean
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    orderId: '',
    dueDate: '',
    items: [{ id: `item-${Date.now()}`, productName: '', quantity: 1, price: 0, total: 0 }]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = total * 0.1 // 10% tax
    const invoiceData = {
      ...formData,
      amount: total,
      tax,
      total: total + tax,
      status: 'draft' as const,
      invoiceNumber: `INV-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    onSubmit(invoiceData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-primary">Create Invoice</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                      newItems[index].total = newItems[index].quantity * newItems[index].price
                      setFormData({ ...formData, items: newItems })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Price"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => {
                      const newItems = [...formData.items]
                      newItems[index].price = parseFloat(e.target.value) || 0
                      newItems[index].total = newItems[index].quantity * newItems[index].price
                      setFormData({ ...formData, items: newItems })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, items: [...formData.items, { id: `item-${Date.now()}`, productName: '', quantity: 1, price: 0, total: 0 }] })}
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
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Invoice Modal Component
const EditInvoiceModal = ({ invoice, onClose, onSubmit, loading }: {
  invoice: Invoice
  onClose: () => void
  onSubmit: (data: Partial<Invoice>) => void
  loading: boolean
}) => {
  const [formData, setFormData] = useState({
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    orderId: invoice.orderId,
    dueDate: invoice.dueDate,
    status: invoice.status,
    items: invoice.items
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = total * 0.1
    const invoiceData = {
      ...formData,
      amount: total,
      tax,
      total: total + tax
    }
    onSubmit(invoiceData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-primary">Edit Invoice</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
              {loading ? 'Updating...' : 'Update Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Invoice
