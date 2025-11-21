import React, { useState, useEffect } from 'react'
import { CreditCard, Smartphone, Wallet, Building, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import apiService from '../services/api'

interface PaymentGateway {
  id: number
  name: string
  type: string
  api_key: string
  secret_key: string
  webhook_url: string
  merchant_id?: string
  processing_fee_percentage: number
  processing_fee_fixed: number
  min_amount: number
  max_amount: number
  supported_methods: string[]
  is_active: boolean
  created_at: string
}

const paymentTypes = [
  { value: 'razorpay', label: 'Razorpay', icon: '💳', color: 'bg-blue-500' },
  { value: 'easybuzz', label: 'Easybuzz', icon: '🏦', color: 'bg-green-500' },
  { value: 'phonepe', label: 'PhonePe', icon: '📱', color: 'bg-purple-500' },
  { value: 'googlepay', label: 'Google Pay', icon: '🔵', color: 'bg-blue-600' },
  { value: 'paytm', label: 'Paytm', icon: '🟡', color: 'bg-yellow-500' },
  { value: 'navi', label: 'Navi', icon: '🚀', color: 'bg-indigo-500' },
  { value: 'bhim', label: 'BHIM', icon: '🏛️', color: 'bg-orange-500' },
  { value: 'stripe', label: 'Stripe', icon: '💎', color: 'bg-purple-600' },
  { value: 'paypal', label: 'PayPal', icon: '🔵', color: 'bg-blue-700' }
]

export default function PaymentOptions() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'razorpay',
    api_key: '',
    secret_key: '',
    webhook_url: '',
    merchant_id: '',
    processing_fee_percentage: 0,
    processing_fee_fixed: 0,
    min_amount: 0,
    max_amount: 999999,
    supported_methods: [] as string[],
    is_active: true
  })

  useEffect(() => {
    fetchGateways()
  }, [])

  const fetchGateways = async () => {
    try {
      setLoading(true)
      const data = await apiService.getPaymentGateways()
      setGateways(data as PaymentGateway[])
    } catch (error) {
      console.error('Failed to fetch payment gateways:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingGateway) {
        // Update existing gateway
        await apiService.updatePaymentGateway(editingGateway.id, formData)
      } else {
        // Create new gateway
        await apiService.createPaymentGateway(formData)
      }
      
      setShowForm(false)
      setEditingGateway(null)
      setFormData({
        name: '',
        type: 'razorpay',
        api_key: '',
        secret_key: '',
        webhook_url: '',
        merchant_id: '',
        processing_fee_percentage: 0,
        processing_fee_fixed: 0,
        min_amount: 0,
        max_amount: 999999,
        supported_methods: [],
        is_active: true
      })
      fetchGateways()
    } catch (error) {
      console.error('Failed to save payment gateway:', error)
    }
  }

  const handleEdit = (gateway: PaymentGateway) => {
    setEditingGateway(gateway)
    setFormData({
      name: gateway.name,
      type: gateway.type,
      api_key: gateway.api_key,
      secret_key: gateway.secret_key,
      webhook_url: gateway.webhook_url,
      merchant_id: gateway.merchant_id || '',
      processing_fee_percentage: gateway.processing_fee_percentage,
      processing_fee_fixed: gateway.processing_fee_fixed,
      min_amount: gateway.min_amount,
      max_amount: gateway.max_amount,
      supported_methods: gateway.supported_methods || [],
      is_active: gateway.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this payment gateway?')) {
      try {
        await apiService.deletePaymentGateway(id)
        fetchGateways()
      } catch (error) {
        console.error('Failed to delete payment gateway:', error)
      }
    }
  }

  const toggleActive = async (gateway: PaymentGateway) => {
    try {
      await apiService.updatePaymentGateway(gateway.id, { is_active: !gateway.is_active })
      fetchGateways()
    } catch (error) {
      console.error('Failed to toggle gateway status:', error)
    }
  }

  const getPaymentTypeInfo = (type: string) => {
    return paymentTypes.find(p => p.value === type) || paymentTypes[0]
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Payment Options</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage payment gateways and processing fees</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Payment Gateway
        </button>
      </div>

      {/* Payment Rules Info */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">Payment Rules</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Orders below ₹1000: Prepaid and Postpaid options available</li>
          <li>• Orders above ₹1000: Prepaid only</li>
          <li>• All payment gateways support both prepaid and postpaid modes</li>
        </ul>
      </div>

      {/* Payment Gateways Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gateways.map((gateway) => {
            const typeInfo = getPaymentTypeInfo(gateway.type)
            return (
              <div key={gateway.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center text-white text-lg`}>
                      {typeInfo.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{gateway.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{typeInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {gateway.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Processing Fee:</span>
                    <span className="font-medium">
                      {gateway.processing_fee_percentage}% + ₹{gateway.processing_fee_fixed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Amount Range:</span>
                    <span className="font-medium">₹{gateway.min_amount} - ₹{gateway.max_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Methods:</span>
                    <span className="font-medium">{gateway.supported_methods?.length || 0} methods</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(gateway)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => toggleActive(gateway)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                      gateway.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {gateway.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(gateway.id)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-slate-800 p-6 m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gateway Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {paymentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={formData.secret_key}
                  onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Merchant ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.merchant_id}
                  onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Processing Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.processing_fee_percentage}
                    onChange={(e) => setFormData({ ...formData, processing_fee_percentage: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fixed Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.processing_fee_fixed}
                    onChange={(e) => setFormData({ ...formData, processing_fee_fixed: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.max_amount}
                    onChange={(e) => setFormData({ ...formData, max_amount: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 transition-colors"
                >
                  {editingGateway ? 'Update Gateway' : 'Add Gateway'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingGateway(null)
                  }}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
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




