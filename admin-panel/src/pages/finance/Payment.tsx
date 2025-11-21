import React, { useState, useEffect } from 'react';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'credit_card' | 'debit_card' | 'upi' | 'netbanking' | 'wallet' | 'cod';
  isActive: boolean;
  processingFee: number;
  minAmount: number;
  maxAmount: number;
  supportedRegions: string[];
  createdAt: string;
}

interface PaymentTransaction {
  id: string;
  transactionId: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  gateway: string;
  createdAt: string;
  processedAt?: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  type: 'razorpay' | 'stripe' | 'paypal' | 'payu' | 'instamojo';
  isActive: boolean;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  supportedMethods: string[];
  createdAt: string;
}

const Payment: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [activeTab, setActiveTab] = useState<'methods' | 'transactions' | 'gateways'>('methods');
  const [showCreateMethodModal, setShowCreateMethodModal] = useState(false);
  const [showCreateGatewayModal, setShowCreateGatewayModal] = useState(false);
  const [showEditMethodModal, setShowEditMethodModal] = useState(false);
  const [showEditGatewayModal, setShowEditGatewayModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Fetch payment data from API
  useEffect(() => {
    const fetchPaymentData = async () => {
      setLoading(true);
      try {
        const [methodsResponse, transactionsResponse, gatewaysResponse] = await Promise.all([
          fetch('/api/payments/methods'),
          fetch('/api/payments/transactions'),
          fetch('/api/payments/gateways')
        ]);

        if (methodsResponse.ok) {
          const methodsData = await methodsResponse.json();
          setPaymentMethods(methodsData.methods || []);
        } else {
          console.error('Failed to fetch payment methods');
          setPaymentMethods([]);
        }

        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData.transactions || []);
        } else {
          console.error('Failed to fetch transactions');
          setTransactions([]);
        }

        if (gatewaysResponse.ok) {
          const gatewaysData = await gatewaysResponse.json();
          setGateways(gatewaysData.gateways || []);
        } else {
          console.error('Failed to fetch gateways');
          setGateways([]);
        }
      } catch (error) {
        console.error('Error fetching payment data:', error);
        setPaymentMethods([]);
        setTransactions([]);
        setGateways([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'credit_card': return '💳';
      case 'debit_card': return '💳';
      case 'upi': return '📱';
      case 'netbanking': return '🏦';
      case 'wallet': return '👛';
      case 'cod': return '💰';
      default: return '💳';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleMethodStatus = async (methodId: string) => {
    setLoading(true);
    try {
      const method = paymentMethods.find(m => m.id === methodId);
      if (!method) return;

      const response = await fetch(`/api/payment/methods/${methodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !method.isActive })
      });
      
      if (response.ok) {
        setPaymentMethods(paymentMethods.map(m => 
          m.id === methodId ? { ...m, isActive: !m.isActive } : m
        ));
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGatewayStatus = async (gatewayId: string) => {
    setLoading(true);
    try {
      const gateway = gateways.find(g => g.id === gatewayId);
      if (!gateway) return;

      const response = await fetch(`/api/payment/gateways/${gatewayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !gateway.isActive })
      });
      
      if (response.ok) {
        setGateways(gateways.map(g => 
          g.id === gatewayId ? { ...g, isActive: !g.isActive } : g
        ));
      }
    } catch (error) {
      console.error('Error updating payment gateway:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMethod = async (methodData: Partial<PaymentMethod>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(methodData)
      });
      
      if (response.ok) {
        const newMethod = await response.json();
        setPaymentMethods([...paymentMethods, newMethod]);
        setShowCreateMethodModal(false);
      }
    } catch (error) {
      console.error('Error creating payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGateway = async (gatewayData: Partial<PaymentGateway>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayData)
      });
      
      if (response.ok) {
        const newGateway = await response.json();
        setGateways([...gateways, newGateway]);
        setShowCreateGatewayModal(false);
      }
    } catch (error) {
      console.error('Error creating payment gateway:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundTransaction = async (transactionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payment/transactions/${transactionId}/refund`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setTransactions(transactions.map(t => 
          t.id === transactionId ? { ...t, status: 'refunded' } : t
        ));
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Manage payment methods, gateways, and transactions</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'methods' && (
            <button
              onClick={() => setShowCreateMethodModal(true)}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              Add Payment Method
            </button>
          )}
          {activeTab === 'gateways' && (
            <button
              onClick={() => setShowCreateGatewayModal(true)}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              Add Gateway
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Successful</div>
          <div className="text-2xl font-bold text-green-600">
            {transactions.filter(t => t.status === 'completed').length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {transactions.filter(t => t.status === 'failed').length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900">
            ${transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('methods')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'methods'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Methods
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('gateways')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'gateways'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Gateways
            </button>
          </nav>
        </div>
      </div>

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="metric-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentMethods.map((method) => (
                  <tr key={method.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getMethodIcon(method.type)}</span>
                        <div className="text-sm font-medium text-gray-900">
                          {method.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {method.type.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {method.processingFee}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${method.minAmount} - ${method.maxAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {method.supportedRegions.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        method.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {method.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleMethodStatus(method.id)}
                          className={`${
                            method.isActive 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {method.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMethod(method);
                            setShowEditMethodModal(true);
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
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <>
          {/* Filters */}
          <div className="metric-card mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search transactions..."
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
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gateway
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.transactionId}
                          </div>
                          <div className="text-sm text-gray-500">
                            Order: {transaction.orderId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.gateway}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {transaction.status === 'completed' && (
                            <button
                              onClick={() => handleRefundTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Refund
                            </button>
                          )}
                          <button className="text-gray-600 hover:text-gray-800">
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Payment Gateways Tab */}
      {activeTab === 'gateways' && (
        <div className="metric-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gateway
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supported Methods
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gateways.map((gateway) => (
                  <tr key={gateway.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {gateway.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gateway.type.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gateway.apiKey}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gateway.supportedMethods.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        gateway.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {gateway.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleGatewayStatus(gateway.id)}
                          className={`${
                            gateway.isActive 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {gateway.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGateway(gateway);
                            setShowEditGatewayModal(true);
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
      )}

      {/* Create Payment Method Modal */}
      {showCreateMethodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Payment Method</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowCreateMethodModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="wallet">Wallet</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supported Regions
                  </label>
                  <input
                    type="text"
                    placeholder="India, USA, UK"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateMethodModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  Add Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payment Gateway Modal */}
      {showCreateGatewayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Payment Gateway</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowCreateGatewayModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
                    <option value="razorpay">Razorpay</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="payu">PayU</option>
                    <option value="instamojo">Instamojo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supported Methods
                  </label>
                  <div className="space-y-2">
                    {['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet'].map((method) => (
                      <label key={method} className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                        />
                        <span className="text-sm">{method.replace('_', ' ').toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateGatewayModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  Add Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;




