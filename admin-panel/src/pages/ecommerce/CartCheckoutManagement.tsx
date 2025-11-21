import React, { useState, useEffect } from 'react'
import { Search, Filter, Edit, Trash2, Eye, ShoppingCart, Package, CreditCard, Truck, Clock } from 'lucide-react'

interface CartItem {
  id: number
  user_id: number
  user_name: string
  user_email: string
  product_id: number
  product_name: string
  product_image: string
  quantity: number
  price: number
  total_price: number
  added_at: string
  updated_at: string
}

interface CheckoutSession {
  id: number
  user_id: number
  user_name: string
  user_email: string
  session_id: string
  status: 'pending' | 'completed' | 'abandoned' | 'expired'
  total_amount: number
  items_count: number
  created_at: string
  updated_at: string
  completed_at?: string
  payment_method?: string
  shipping_address?: string
}

export default function CartCheckoutManagement() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [checkoutSessions, setCheckoutSessions] = useState<CheckoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'cart' | 'checkout'>('cart')
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null)
  const [selectedSession, setSelectedSession] = useState<CheckoutSession | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchCartCheckoutData()
  }, [])

  const fetchCartCheckoutData = async () => {
    try {
      setLoading(true)
      const [cartResponse, checkoutResponse] = await Promise.all([
        fetch('/api/admin/cart/items'),
        fetch('/api/admin/checkout/sessions')
      ])

      if (cartResponse.ok) {
        const cartData = await cartResponse.json()
        setCartItems(cartData.items || [])
      }

      if (checkoutResponse.ok) {
        const checkoutData = await checkoutResponse.json()
        setCheckoutSessions(checkoutData.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching cart/checkout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCartItems = cartItems.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.user_email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const filteredCheckoutSessions = checkoutSessions.filter(session => {
    const matchesSearch = session.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.session_id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleUpdateCartItemQuantity = async (itemId: number, quantity: number) => {
    try {
      const response = await fetch(`/api/admin/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })
      if (response.ok) {
        setCartItems(cartItems.map(item => 
          item.id === itemId ? { ...item, quantity, total_price: item.price * quantity } : item
        ))
      } else {
        alert('Failed to update cart item quantity')
      }
    } catch (error) {
      console.error('Error updating cart item:', error)
      alert('Error updating cart item')
    }
  }

  const handleRemoveCartItem = async (itemId: number) => {
    if (confirm('Are you sure you want to remove this item from cart?')) {
      try {
        const response = await fetch(`/api/admin/cart/items/${itemId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setCartItems(cartItems.filter(item => item.id !== itemId))
        } else {
          alert('Failed to remove cart item')
        }
      } catch (error) {
        console.error('Error removing cart item:', error)
        alert('Error removing cart item')
      }
    }
  }

  const handleUpdateSessionStatus = async (sessionId: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/checkout/sessions/${sessionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (response.ok) {
        setCheckoutSessions(sessions => sessions.map(s => 
          s.id === sessionId ? { ...s, status: status as any } : s
        ))
      } else {
        alert('Failed to update session status')
      }
    } catch (error) {
      console.error('Error updating session status:', error)
      alert('Error updating session status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'abandoned': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cart & Checkout Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage user carts and checkout sessions</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'cart', label: 'Cart Items', icon: ShoppingCart },
              { id: 'checkout', label: 'Checkout Sessions', icon: CreditCard }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search cart/checkout data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        {activeTab === 'checkout' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
            <option value="expired">Expired</option>
          </select>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cart Items</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{cartItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Checkout Sessions</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{checkoutSessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Sessions</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {checkoutSessions.filter(s => s.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cart Value</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ₹{cartItems.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Items Tab */}
      {activeTab === 'cart' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCartItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-lg object-cover"
                            src={item.product_image || '/placeholder-product.png'}
                            alt={item.product_name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.product_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {item.product_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.user_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateCartItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          -
                        </button>
                        <span className="text-sm text-gray-900 dark:text-white min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity + 1)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ₹{item.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ₹{item.total_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.added_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCartItem(item)
                            setShowDetailsModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Checkout Sessions Tab */}
      {activeTab === 'checkout' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCheckoutSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {session.session_id}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {session.id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {session.user_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {session.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ₹{session.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {session.items_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSession(session)
                            setShowDetailsModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {session.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateSessionStatus(session.id, 'completed')}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (selectedCartItem || selectedSession) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {selectedCartItem ? 'Cart Item Details' : 'Checkout Session Details'}
              </h3>
              <div className="space-y-4">
                {selectedCartItem ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Product</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedCartItem.product_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedCartItem.user_name} ({selectedCartItem.user_email})
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedCartItem.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unit Price</p>
                        <p className="text-sm text-gray-900 dark:text-white">₹{selectedCartItem.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Price</p>
                        <p className="text-sm text-gray-900 dark:text-white">₹{selectedCartItem.total_price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Added At</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(selectedCartItem.added_at).toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : selectedSession ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Session ID</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedSession.session_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedSession.user_name} ({selectedSession.user_email})
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</p>
                        <p className="text-sm text-gray-900 dark:text-white">₹{selectedSession.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Items Count</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedSession.items_count}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSession.status)}`}>
                          {selectedSession.status}
                        </span>
                      </div>
                    </div>
                    {selectedSession.payment_method && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Method</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedSession.payment_method}</p>
                      </div>
                    )}
                    {selectedSession.shipping_address && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping Address</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedSession.shipping_address}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(selectedSession.created_at).toLocaleString()}
                      </p>
                    </div>
                    {selectedSession.completed_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed At</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(selectedSession.completed_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedCartItem(null)
                    setSelectedSession(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
