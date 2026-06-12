import React, { useState } from 'react'
import { CreditCard, Plus, Trash2, Edit, Shield, Check, ArrowLeft, Wallet, Smartphone, X } from 'lucide-react'

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
    if (confirm('Remove this payment method?')) {
      setPaymentMethods(paymentMethods.filter(method => method.id !== id))
    }
  }

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="w-5 h-5 text-white" />
      case 'upi':
        return <Smartphone className="w-5 h-5 text-white" />
      case 'wallet':
        return <Wallet className="w-5 h-5 text-white" />
      default:
        return <CreditCard className="w-5 h-5 text-white" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'card': return 'rgb(75,151,201)'
      case 'upi': return '#4caf82'
      case 'wallet': return '#9b7fd4'
      default: return 'rgb(75,151,201)'
    }
  }

  return (
    <main
      className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20"
      style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => window.location.hash = '#/user/profile'}
            className="inline-flex items-center gap-2 font-light tracking-wide transition-colors hover:opacity-70"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Profile</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{ backgroundColor: 'rgb(75,151,201)' }}
          >
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Payment Methods
          </h1>
          <p
            className="text-sm sm:text-base font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Manage your saved payment methods for faster checkout.
          </p>
        </div>

        {/* Payment Methods List */}
        <div className="space-y-3 mb-6">
          {paymentMethods.length === 0 && (
            <div className="text-center py-14 border border-dashed rounded-xl" style={{ borderColor: '#e0e0e0', color: '#999' }}>
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-light tracking-wide text-sm">No payment methods saved yet.</p>
            </div>
          )}
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between px-5 py-4 rounded-xl border transition-all"
              style={{
                borderColor: method.isDefault ? 'rgb(75,151,201)' : '#e8e8e8',
                backgroundColor: method.isDefault ? 'rgba(75,151,201,0.04)' : '#fafafa'
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getIconBg(method.type) }}
                >
                  {getPaymentIcon(method.type)}
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#1a1a1a' }}>{method.name}</p>
                  <p className="text-xs font-light mt-0.5" style={{ color: '#888' }}>
                    {method.number}{method.expiry && ` · Expires ${method.expiry}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {method.isDefault ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'rgb(75,151,201)', color: '#fff' }}
                  >
                    <Check className="w-3 h-3" />
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="text-xs font-light tracking-wide transition-opacity hover:opacity-70"
                    style={{ color: 'rgb(75,151,201)' }}
                  >
                    Set Default
                  </button>
                )}
                <button
                  className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                  style={{ color: '#aaa' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgb(75,151,201)')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteMethod(method.id)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                  style={{ color: '#aaa' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Payment Method Button / Form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed font-light text-sm tracking-wide transition-all hover:opacity-80"
            style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
          >
            <Plus className="w-4 h-4" />
            Add New Payment Method
          </button>
        ) : (
          <div className="border rounded-xl p-6 mt-2" style={{ borderColor: '#e8e8e8', backgroundColor: '#fafafa' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-light tracking-widest text-sm uppercase" style={{ color: '#1a1a1a', letterSpacing: '0.12em' }}>
                Add Payment Method
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: '#aaa' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {(['card', 'upi', 'wallet'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewPaymentMethod({ ...newPaymentMethod, type: t })}
                    className="flex-1 py-2.5 rounded-lg text-xs font-medium tracking-wide border transition-all"
                    style={{
                      borderColor: newPaymentMethod.type === t ? 'rgb(75,151,201)' : '#e0e0e0',
                      backgroundColor: newPaymentMethod.type === t ? 'rgba(75,151,201,0.08)' : '#fff',
                      color: newPaymentMethod.type === t ? 'rgb(75,151,201)' : '#888'
                    }}
                  >
                    {t === 'card' ? 'Card' : t === 'upi' ? 'UPI' : 'Wallet'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-light tracking-widest uppercase mb-1.5" style={{ color: '#888', letterSpacing: '0.1em' }}>
                  {newPaymentMethod.type === 'card' ? 'Cardholder Name' : 'Account Name'}
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.name}
                  onChange={e => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border text-sm font-light outline-none focus:ring-0 transition-colors"
                  style={{ borderColor: '#e0e0e0', color: '#1a1a1a', backgroundColor: '#fff' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgb(75,151,201)')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
                  placeholder={newPaymentMethod.type === 'card' ? 'John Doe' : 'Account Holder Name'}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-light tracking-widest uppercase mb-1.5" style={{ color: '#888', letterSpacing: '0.1em' }}>
                  {newPaymentMethod.type === 'card' ? 'Card Number' : 'Account / UPI ID'}
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.number}
                  onChange={e => setNewPaymentMethod({ ...newPaymentMethod, number: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border text-sm font-light outline-none transition-colors"
                  style={{ borderColor: '#e0e0e0', color: '#1a1a1a', backgroundColor: '#fff' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgb(75,151,201)')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
                  placeholder={newPaymentMethod.type === 'card' ? '1234 5678 9012 3456' : 'user@upi or account number'}
                  required
                />
              </div>

              {newPaymentMethod.type === 'card' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-light tracking-widest uppercase mb-1.5" style={{ color: '#888', letterSpacing: '0.1em' }}>
                      Expiry
                    </label>
                    <input
                      type="text"
                      value={newPaymentMethod.expiry}
                      onChange={e => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2, 4)
                        setNewPaymentMethod({ ...newPaymentMethod, expiry: value })
                      }}
                      maxLength={5}
                      className="w-full px-4 py-3 rounded-lg border text-sm font-light outline-none transition-colors"
                      style={{ borderColor: '#e0e0e0', color: '#1a1a1a', backgroundColor: '#fff' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgb(75,151,201)')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-light tracking-widest uppercase mb-1.5" style={{ color: '#888', letterSpacing: '0.1em' }}>
                      CVV
                    </label>
                    <input
                      type="password"
                      value={newPaymentMethod.cvv}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setNewPaymentMethod({ ...newPaymentMethod, cvv: value })
                      }}
                      className="w-full px-4 py-3 rounded-lg border text-sm font-light outline-none transition-colors"
                      style={{ borderColor: '#e0e0e0', color: '#1a1a1a', backgroundColor: '#fff' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgb(75,151,201)')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
                      placeholder="•••"
                      inputMode="numeric"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'rgb(75,151,201)' }}
                >
                  Save Method
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-3 rounded-lg text-sm font-light tracking-wide border transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#e0e0e0', color: '#666' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-10 flex items-start gap-4 px-5 py-4 rounded-xl" style={{ backgroundColor: '#f7fafe', border: '1px solid rgba(75,151,201,0.15)' }}>
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(75,151,201)' }} />
          <div>
            <p className="text-xs font-medium tracking-wide mb-1" style={{ color: '#1a1a1a' }}>
              Your payment info is secure
            </p>
            <p className="text-xs font-light leading-relaxed" style={{ color: '#888' }}>
              SSL-encrypted · PCI DSS compliant · Card details are never stored on our servers.
            </p>
          </div>
        </div>

      </div>
    </main>
  )
}
