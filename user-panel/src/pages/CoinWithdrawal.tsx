import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'
import { 
  Wallet, 
  ArrowLeft, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  AlertCircle,
  ArrowRight
} from 'lucide-react'

interface Withdrawal {
  id: number
  amount: number
  withdrawal_method: string
  account_holder_name: string
  account_number?: string
  ifsc_code?: string
  bank_name?: string
  upi_id?: string
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed'
  transaction_id?: string
  admin_notes?: string
  rejection_reason?: string
  created_at: string
  processed_at?: string
}

export default function CoinWithdrawal() {
  const { user } = useAuth()
  const [nefolCoins, setNefolCoins] = useState(0)
  const [loyaltyCoinsOnly, setLoyaltyCoinsOnly] = useState(0)
  const [loading, setLoading] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    withdrawal_method: 'upi',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    upi_id: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCoinsData()
    fetchWithdrawals()
    
    // Auto-refresh every 30 seconds to catch status updates from admin
    const refreshInterval = setInterval(() => {
      fetchWithdrawals()
      fetchCoinsData()
    }, 30000)
    
    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  const fetchCoinsData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch loyalty points (Nefol coins) with available coins calculation
      const coinsResponse = await fetch(`${getApiBase()}/api/nefol-coins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      let loyaltyCoins = 0
      let availableCoins = 0
      if (coinsResponse.ok) {
        const coinsData = await coinsResponse.json()
        loyaltyCoins = coinsData.nefol_coins || 0
        // Use available_coins if provided (excludes referral coins less than 8 days old)
        // Otherwise fall back to total coins
        availableCoins = coinsData.available_coins !== undefined ? coinsData.available_coins : loyaltyCoins
      }
      
      // Set available coins (excludes referral coins less than 8 days old)
      setLoyaltyCoinsOnly(availableCoins)
      
      // Fetch affiliate earnings to calculate total display coins (for display only, not withdrawal)
      let affiliateCoins = 0
      try {
        const affiliateResponse = await fetch(`${getApiBase()}/api/affiliate/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (affiliateResponse.ok) {
          const affiliateData = await affiliateResponse.json()
          if (affiliateData.total_earnings) {
            // Calculate coins from affiliate earnings: 1 rupee = 10 coins
            // Note: These are for display only - actual coins are added to loyalty_points when processed
            affiliateCoins = Math.floor(affiliateData.total_earnings * 10)
          }
        }
      } catch (error) {
        // Ignore affiliate errors - user might not be an affiliate
        console.log('Affiliate check failed (user may not be affiliate)')
      }
      
      // Total for display
      setNefolCoins(loyaltyCoins + affiliateCoins)
    } catch (error) {
      console.error('Failed to fetch coins:', error)
    }
  }

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${getApiBase()}/api/coin-withdrawals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWithdrawals(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (parseFloat(formData.amount) < 10) {
      newErrors.amount = 'Minimum withdrawal is 10 coins'
    } else if (parseFloat(formData.amount) > loyaltyCoinsOnly) {
      newErrors.amount = `Insufficient coins. You have ${loyaltyCoinsOnly} withdrawable coins available. (Affiliate earnings are added to your balance when processed)`
    }

    if (!formData.account_holder_name) {
      newErrors.account_holder_name = 'Account holder name is required'
    }

    if (formData.withdrawal_method === 'bank') {
      if (!formData.account_number) {
        newErrors.account_number = 'Account number is required'
      }
      if (!formData.ifsc_code) {
        newErrors.ifsc_code = 'IFSC code is required'
      }
      if (!formData.bank_name) {
        newErrors.bank_name = 'Bank name is required'
      }
    } else {
      if (!formData.upi_id) {
        newErrors.upi_id = 'UPI ID is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please login to continue')
        return
      }

      const payload: any = {
        amount: parseFloat(formData.amount),
        withdrawal_method: formData.withdrawal_method,
        account_holder_name: formData.account_holder_name
      }

      if (formData.withdrawal_method === 'bank') {
        payload.account_number = formData.account_number
        payload.ifsc_code = formData.ifsc_code
        payload.bank_name = formData.bank_name
      } else {
        payload.upi_id = formData.upi_id
      }

      const response = await fetch(`${getApiBase()}/api/coin-withdrawals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        alert('Withdrawal request submitted successfully!')
        setShowForm(false)
        setFormData({
          amount: '',
          withdrawal_method: 'upi',
          account_holder_name: '',
          account_number: '',
          ifsc_code: '',
          bank_name: '',
          upi_id: ''
        })
        // Refresh all data
        await fetchCoinsData()
        await fetchWithdrawals()
        
        // Trigger a custom event to refresh coins page
        const event = new CustomEvent('coinsUpdated')
        window.dispatchEvent(event)
      } else {
        alert(data.message || 'Failed to submit withdrawal request')
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error)
      alert('Failed to submit withdrawal request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'rejected':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'processing': 'bg-blue-100 text-blue-800 border-blue-300',
      'completed': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'failed': 'bg-red-100 text-red-800 border-red-300'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles['pending']}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-8 sm:py-12 md:py-16" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12">
          <button
            onClick={() => window.location.hash = '#/user/nefol-coins'}
            className="flex items-center gap-2 mb-6 text-sm font-light tracking-wide transition-opacity hover:opacity-70"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            <ArrowLeft className="w-4 h-4" />
            back to coins
          </button>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[0.15em] mb-6"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            coin withdrawal
          </h1>
          <p 
            className="text-sm sm:text-base font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Withdraw your nefol coins to bank or UPI
          </p>
        </div>

        {/* Available Balance Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between gap-6">
            <div className="text-center sm:text-left">
              <p 
                className="text-xs sm:text-sm font-light mb-3 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                available coins
              </p>
              <div 
                className="flex items-baseline gap-2 justify-center sm:justify-start"
                style={{ 
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: '1'
                }}
              >
                <p className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(26, 26, 26)' }}>{loyaltyCoinsOnly.toLocaleString()}</p>
                <span className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(26, 26, 26)' }}>coins</span>
              </div>
              <p 
                className="text-xs mt-2 font-light tracking-wide"
                style={{ color: '#999', letterSpacing: '0.02em' }}
              >
                (₹{(loyaltyCoinsOnly / 10).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 sm:px-8 py-3 text-xs sm:text-sm font-light transition-all duration-300 tracking-[0.15em] uppercase rounded-xl"
              style={{ 
                backgroundColor: showForm ? '#999' : 'var(--arctic-blue-primary)',
                color: '#fff',
                letterSpacing: '0.15em'
              }}
              onMouseEnter={(e) => {
                if (!showForm) {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!showForm) {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }
              }}
            >
              {showForm ? 'cancel' : 'request withdrawal'}
            </button>
          </div>
        </div>

        {/* Withdrawal Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-8 shadow-sm">
            <h2 
              className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              request withdrawal
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount */}
              <div>
                <label 
                  className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  amount (coins)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="1"
                  max={loyaltyCoinsOnly}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.amount ? 'border-red-500' : 'border-slate-200'
                  } bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all`}
                  style={{ 
                    fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                    letterSpacing: '0.02em'
                  }}
                  placeholder="Enter amount to withdraw"
                />
                {errors.amount && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.amount}
                  </p>
                )}
                <p 
                  className="mt-2 text-xs font-light tracking-wide"
                  style={{ color: '#999', letterSpacing: '0.02em' }}
                >
                  Minimum withdrawal: 10 coins (₹1)
                  <br />
                  <span>1 rupee = 10 coins</span>
                  {loyaltyCoinsOnly < nefolCoins && (
                    <>
                      <br />
                      <span className="text-amber-600">Note: Affiliate earnings ({nefolCoins - loyaltyCoinsOnly} coins) will be added to your balance when processed</span>
                    </>
                  )}
                </p>
              </div>

              {/* Withdrawal Method */}
              <div>
                <label 
                  className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  withdrawal method
                </label>
                <select
                  name="withdrawal_method"
                  value={formData.withdrawal_method}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
                  style={{ 
                    fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                    letterSpacing: '0.02em'
                  }}
                >
                  <option value="upi">UPI Transfer</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {/* Account Holder Name */}
              <div>
                <label 
                  className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  account holder name
                </label>
                <input
                  type="text"
                  name="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.account_holder_name ? 'border-red-500' : 'border-slate-200'
                  } bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all`}
                  style={{ 
                    fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                    letterSpacing: '0.02em'
                  }}
                  placeholder="Enter account holder name"
                />
                {errors.account_holder_name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.account_holder_name}
                  </p>
                )}
              </div>

              {/* UPI Fields */}
              {formData.withdrawal_method === 'upi' && (
                <div>
                  <label 
                    className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    upi id
                  </label>
                  <input
                    type="text"
                    name="upi_id"
                    value={formData.upi_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.upi_id ? 'border-red-500' : 'border-slate-200'
                    } bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all`}
                    style={{ 
                      fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                      letterSpacing: '0.02em'
                    }}
                    placeholder="yourname@upi"
                  />
                  {errors.upi_id && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.upi_id}
                    </p>
                  )}
                </div>
              )}

              {/* Bank Fields */}
              {formData.withdrawal_method === 'bank' && (
                <>
                  <div>
                    <label 
                      className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      account number
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={formData.account_number}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.account_number ? 'border-red-500' : 'border-slate-200'
                      } bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all`}
                      style={{ 
                        fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                        letterSpacing: '0.02em'
                      }}
                      placeholder="Enter account number"
                    />
                    {errors.account_number && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.account_number}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label 
                        className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                        style={{ color: '#666', letterSpacing: '0.05em' }}
                      >
                        ifsc code
                      </label>
                      <input
                        type="text"
                        name="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.ifsc_code ? 'border-red-500' : 'border-slate-200'
                        } bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all`}
                        style={{ 
                          fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                          letterSpacing: '0.02em'
                        }}
                        placeholder="Enter IFSC code"
                      />
                      {errors.ifsc_code && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.ifsc_code}
                        </p>
                      )}
                    </div>

                    <div>
                      <label 
                        className="block text-xs sm:text-sm font-light mb-2 tracking-wide"
                        style={{ color: '#666', letterSpacing: '0.05em' }}
                      >
                        bank name
                      </label>
                      <input
                        type="text"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.bank_name ? 'border-red-500' : 'border-slate-200'
                        } bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all`}
                        style={{ 
                          fontFamily: 'var(--font-body-family, Inter, sans-serif)',
                          letterSpacing: '0.02em'
                        }}
                        placeholder="Enter bank name"
                      />
                      {errors.bank_name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.bank_name}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 text-xs sm:text-sm font-light transition-all duration-300 tracking-[0.15em] uppercase rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: loading ? '#999' : 'var(--arctic-blue-primary)',
                  color: '#fff',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                  }
                }}
              >
                {loading ? 'submitting...' : 'submit request'}
              </button>
            </form>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            payout history
          </h2>

          {withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto mb-4" style={{ color: '#999' }} />
              <p 
                className="text-sm font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.02em' }}
              >
                No withdrawal requests yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 hover:opacity-70 transition-opacity"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4 flex-1">
                      {withdrawal.withdrawal_method === 'bank' ? (
                        <Building2 className="w-5 h-5 text-blue-600 mt-1" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-purple-600 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <p 
                            className="text-base sm:text-lg font-light"
                            style={{ 
                              color: '#1a1a1a',
                              fontVariantNumeric: 'tabular-nums',
                              lineHeight: '1',
                              letterSpacing: '0.02em'
                            }}
                          >
                            {withdrawal.amount} coins
                          </p>
                          <p 
                            className="text-lg sm:text-xl font-bold"
                            style={{ 
                              color: 'rgb(26, 26, 26)',
                              fontVariantNumeric: 'tabular-nums',
                              lineHeight: '1'
                            }}
                          >
                            (₹{(withdrawal.amount / 10).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </p>
                        </div>
                        <p 
                          className="text-xs font-light tracking-wide mb-2"
                          style={{ color: '#999', letterSpacing: '0.02em' }}
                        >
                          {formatDateTime(withdrawal.created_at)}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          {getStatusIcon(withdrawal.status)}
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="text-sm font-light tracking-wide space-y-1 ml-9"
                    style={{ color: '#666', letterSpacing: '0.02em' }}
                  >
                    <p>
                      <span className="font-medium">Method:</span>{' '}
                      {withdrawal.withdrawal_method === 'bank' ? 'Bank Transfer' : 'UPI Transfer'}
                    </p>
                    <p>
                      <span className="font-medium">Account:</span> {withdrawal.account_holder_name}
                    </p>
                    {withdrawal.withdrawal_method === 'bank' && (
                      <p>
                        <span className="font-medium">Bank:</span> {withdrawal.bank_name}
                      </p>
                    )}
                    {withdrawal.withdrawal_method === 'upi' && withdrawal.upi_id && (
                      <p>
                        <span className="font-medium">UPI:</span> {withdrawal.upi_id}
                      </p>
                    )}
                    {withdrawal.transaction_id && (
                      <p>
                        <span className="font-medium">Transaction ID:</span> {withdrawal.transaction_id}
                      </p>
                    )}
                    {withdrawal.rejection_reason && (
                      <p className="text-red-600">
                        <span className="font-medium">Reason:</span> {withdrawal.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
