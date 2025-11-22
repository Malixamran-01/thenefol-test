import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  tax: number;
  total: number;
  dueDate: string;
  createdAt: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const Invoice: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Load invoices from API
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const apiBase = (import.meta as any).env.VITE_API_URL || `https://thenefol.com/api`;
      const response = await fetch(`${apiBase}/api/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = async (invoiceData: Partial<Invoice>) => {
    setLoading(true);
    try {
      const apiBase = (import.meta as any).env.VITE_API_URL || `https://thenefol.com/api`;
      // API call to create invoice
      const response = await fetch(`${apiBase}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      
      if (response.ok) {
        const newInvoice = await response.json();
        setInvoices([...invoices, newInvoice]);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    setLoading(true);
    try {
      const apiBase = (import.meta as any).env.VITE_API_URL || `https://thenefol.com/api`;
      const response = await fetch(`${apiBase}/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setInvoices(invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, status: newStatus as any } : inv
        ));
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const apiBase = (import.meta as any).env.VITE_API_URL || `https://thenefol.com/api`;
      const response = await fetch(`${apiBase}/api/invoices/${invoiceId}/send`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setInvoices(invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, status: 'sent' } : inv
        ));
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const apiBase = (import.meta as any).env.VITE_API_URL || `https://thenefol.com/api`;
      const url = `${apiBase}/api/invoices/${invoiceId}/download`;
      // Open invoice in new window for printing with Arctic Blue gradient
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage customer invoices and billing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Paid</div>
          <div className="text-2xl font-bold text-green-600">
            {invoices.filter(inv => inv.status === 'paid').length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Overdue</div>
          <div className="text-2xl font-bold text-red-600">
            {invoices.filter(inv => inv.status === 'overdue').length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            ${invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="metric-card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
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
      </div>

      {/* Invoices Table */}
      <div className="metric-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        Order: {invoice.orderId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.customerName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.customerEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${invoice.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-brand-primary hover:text-brand-primary/80"
                      >
                        Download
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleSendInvoice(invoice.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Send
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowEditModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Edit
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Invoice</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              // Handle form submission
              setShowCreateModal(false);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order ID
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items
                </label>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 mb-2 text-sm font-medium text-gray-600">
                    <div>Product</div>
                    <div>Quantity</div>
                    <div>Unit Price</div>
                    <div>Total</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Product name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Total"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Invoice</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowEditModal(false);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    defaultValue={selectedInvoice.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    defaultValue={selectedInvoice.dueDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  Update Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;




