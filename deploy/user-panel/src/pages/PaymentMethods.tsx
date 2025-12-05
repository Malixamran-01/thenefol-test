import React, { useState } from 'react'
import { CreditCard, Plus, Trash2, Edit, Shield, Check } from 'lucide-react'

interface PaymentMethod {
  id: string
  type: 'card' | 'upi' | 'wallet'
  name: string
  number: string
  expiry?: string
  isDefault: boolean
}

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      name: 'Visa Card',
      number: '**** **** **** 1234',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: '2',
      type: 'upi',
      name: 'Google Pay',
      number: 'user@paytm',
      isDefault: false
    },
    {
      id: '3',
      type: 'wallet',
      name: 'Paytm Wallet',
      number: '**** 5678',
      isDefault: false
    }
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  })

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault()
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: newPaymentMethod.type as 'card' | 'upi' | 'wallet',
      name: newPaymentMethod.name,
      number: newPaymentMethod.type === 'card' 
        ? `**** **** **** ${newPaymentMethod.number.slice(-4)}`
        : newPaymentMethod.number,
      expiry: newPaymentMethod.expiry,
      isDefault: paymentMethods.length === 0
    }
    setPaymentMethods([...paymentMethods, newMethod])
    setNewPaymentMethod({ type: 'card', name: '', number: '', expiry: '', cvv: '' })
    setShowAddForm(false)
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    })))
  }

  const handleDeleteMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id))
  }

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      case 'upi':
        return <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
      case 'wallet':
        return <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
      default:
        return <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
    }
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Payment Methods
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Manage your saved payment methods for faster checkout.
          </p>
        </div>

        {/* Payment Methods List */}
        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => (
            <div key={method.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    {getPaymentIcon(method.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {method.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {method.number}
                      {method.expiry && ` • Expires ${method.expiry}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault && (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <Check className="w-4 h-4 mr-1" />
                      Default
                    </span>
                  )}
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                    >
                      Set as Default
                    </button>
                  )}
                  <button className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMethod(method.id)}
                    className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Payment Method */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Payment Method
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Add New Payment Method
            </h2>
            
            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Payment Type
                </label>
                <select
                  value={newPaymentMethod.type}
                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, type: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI</option>
                  <option value="wallet">Digital Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {newPaymentMethod.type === 'card' ? 'Card Name' : 'Account Name'}
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.name}
                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder={newPaymentMethod.type === 'card' ? 'John Doe' : 'Account Holder Name'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {newPaymentMethod.type === 'card' ? 'Card Number' : 'Account Number/ID'}
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.number}
                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, number: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder={newPaymentMethod.type === 'card' ? '1234 5678 9012 3456' : 'Account Number or UPI ID'}
                  required
                />
              </div>

              {newPaymentMethod.type === 'card' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={newPaymentMethod.expiry}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, expiry: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={newPaymentMethod.cvv}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Add Payment Method
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 py-3 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Your Payment Information is Secure
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We use industry-standard encryption to protect your payment information. 
            Your card details are never stored on our servers and are processed securely through our payment partners.
          </p>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• SSL encryption for all data transmission</li>
            <li>• PCI DSS compliant payment processing</li>
            <li>• No storage of sensitive card information</li>
            <li>• Regular security audits and monitoring</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
