import React, { useState, useEffect } from 'react';

interface Return {
  id: string;
  returnNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'refunded';
  items: ReturnItem[];
  totalAmount: number;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface ReturnItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
  condition: 'new' | 'used' | 'damaged';
}

const Returns: React.FC = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Fetch returns data from API
  useEffect(() => {
    const fetchReturns = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/returns');
        if (response.ok) {
          const data = await response.json();
          setReturns(data.returns || []);
        } else {
          console.error('Failed to fetch returns');
          setReturns([]);
        }
      } catch (error) {
        console.error('Error fetching returns:', error);
        setReturns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-yellow-100 text-yellow-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (returnId: string, newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setReturns(returns.map(ret => 
          ret.id === returnId ? { ...ret, status: newStatus as any, updatedAt: new Date().toISOString() } : ret
        ));
      }
    } catch (error) {
      console.error('Error updating return status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (returnId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/returns/${returnId}/refund`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setReturns(returns.map(ret => 
          ret.id === returnId ? { ...ret, status: 'refunded', updatedAt: new Date().toISOString() } : ret
        ));
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async (returnData: Partial<Return>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });
      
      if (response.ok) {
        const newReturn = await response.json();
        setReturns([...returns, newReturn]);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating return:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReturnLabel = async (returnId: string) => {
    try {
      const response = await fetch(`/api/returns/${returnId}/label`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `return-label-${returnId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating return label:', error);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1>
          <p className="text-gray-600">Manage customer returns and process refunds</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          Create Return
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Returns</div>
          <div className="text-2xl font-bold text-gray-900">{returns.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {returns.filter(ret => ret.status === 'pending').length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {returns.filter(ret => ret.status === 'completed' || ret.status === 'refunded').length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Refunded</div>
          <div className="text-2xl font-bold text-gray-900">
            ${returns.reduce((sum, ret) => sum + ret.refundAmount, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="metric-card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search returns..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="metric-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Return
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReturns.map((returnItem) => (
                <tr key={returnItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {returnItem.returnNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        Order: {returnItem.orderId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {returnItem.customerName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {returnItem.customerEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {returnItem.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.status)}`}>
                      {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${returnItem.refundAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReturn(returnItem);
                          setShowDetailsModal(true);
                        }}
                        className="text-brand-primary hover:text-brand-primary/80"
                      >
                        View
                      </button>
                      {returnItem.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(returnItem.id, 'approved')}
                            className="text-green-600 hover:text-green-800"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(returnItem.id, 'rejected')}
                            className="text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {returnItem.status === 'approved' && (
                        <button
                          onClick={() => handleProcessRefund(returnItem.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Refund
                        </button>
                      )}
                      <button
                        onClick={() => generateReturnLabel(returnItem.id)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Label
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Details Modal */}
      {showDetailsModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Return Details - {selectedReturn.returnNumber}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <div><strong>Name:</strong> {selectedReturn.customerName}</div>
                  <div><strong>Email:</strong> {selectedReturn.customerEmail}</div>
                  <div><strong>Order ID:</strong> {selectedReturn.orderId}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Return Information</h3>
                <div className="space-y-2">
                  <div><strong>Status:</strong> 
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReturn.status)}`}>
                      {selectedReturn.status.charAt(0).toUpperCase() + selectedReturn.status.slice(1)}
                    </span>
                  </div>
                  <div><strong>Reason:</strong> {selectedReturn.reason}</div>
                  <div><strong>Total Amount:</strong> ${selectedReturn.totalAmount.toFixed(2)}</div>
                  <div><strong>Refund Amount:</strong> ${selectedReturn.refundAmount.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Return Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Condition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReturn.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(item.condition)}`}>
                            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedReturn.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedReturn.notes}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReturn(selectedReturn);
                  setShowEditModal(true);
                }}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
              >
                Edit Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Return Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Return</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowCreateModal(false);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                    Reason
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
                    <option value="Product not as described">Product not as described</option>
                    <option value="Product damaged during shipping">Product damaged during shipping</option>
                    <option value="Changed mind">Changed mind</option>
                    <option value="Wrong product received">Wrong product received</option>
                    <option value="Defective product">Defective product</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items
                </label>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="grid grid-cols-5 gap-4 mb-2 text-sm font-medium text-gray-600">
                    <div>Product</div>
                    <div>Quantity</div>
                    <div>Unit Price</div>
                    <div>Condition</div>
                    <div>Reason</div>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
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
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="damaged">Damaged</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Reason"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
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
                  Create Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Return Modal */}
      {showEditModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Return</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowEditModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    defaultValue={selectedReturn.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={selectedReturn.refundAmount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={selectedReturn.notes}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
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
                  Update Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;




