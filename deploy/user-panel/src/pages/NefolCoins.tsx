import React, { useState, useEffect } from 'react'
import { Coins, Gift, ShoppingBag, TrendingUp, Clock, Wallet, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

interface Transaction {
  id: number
  amount: number
  type: 'earned' | 'redeemed' | 'purchase_bonus' | 'withdrawal_pending' | 'withdrawal_processing' | 'withdrawal_completed' | 'withdrawal_rejected' | 'withdrawal_failed' | 'referral_bonus' | 'order_bonus' | 'cashback'
  description: string
  date: string
  status?: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed' | 'cancelled'
}

interface CashbackWallet {
  balance: number
  totalSpent: number
  transactions: Transaction[]
}

interface CoinTransaction {
  id: number
  amount: number
  type: string
  description: string
  status: string
  order_id?: number
  withdrawal_id?: number
  metadata?: any
  created_at: string
}

export default function NefolCoins() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<CashbackWallet | null>(null)
  const [nefolCoins, setNefolCoins] = useState(0)
  const [affiliateEarningsCoins, setAffiliateEarningsCoins] = useState(0)
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([])

  useEffect(() => {
    fetchCoinsData()
    
    // Listen for updates from other pages
    const handleCoinsUpdate = () => {
      fetchCoinsData()
    }
    
    window.addEventListener('coinsUpdated', handleCoinsUpdate)
    
    // Auto-refresh every 30 seconds to catch status updates
    const refreshInterval = setInterval(() => {
      fetchCoinsData()
    }, 30000)
    
    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate)
      clearInterval(refreshInterval)
    }
  }, [])

  const fetchCoinsData = async () => {
    try {
      // Don't show loading spinner on auto-refresh
      const isInitialLoad = coinTransactions.length === 0
      if (isInitialLoad) {
        setLoading(true)
      }
      
      const token = localStorage.getItem('token')
      
      // Process retroactive cashback for orders that don't have cashback transactions (only on initial load)
      if (isInitialLoad) {
        try {
          await fetch(`${getApiBase()}/api/cashback/process-retroactive`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        } catch (err) {
          console.log('Retroactive cashback processing failed (non-critical):', err)
        }
      }
      
      // Fetch Nefol coins
      const coinsResponse = await fetch(`${getApiBase()}/api/nefol-coins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (coinsResponse.ok) {
        const coinsData = await coinsResponse.json()
        setNefolCoins(coinsData.nefol_coins || 0)
      }

      // Fetch affiliate earnings to calculate coins (1 rupee = 10 coins)
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
            const coinsFromEarnings = Math.floor(affiliateData.total_earnings * 10)
            setAffiliateEarningsCoins(coinsFromEarnings)
            console.log('Affiliate earnings coins calculated:', coinsFromEarnings, 'from ₹', affiliateData.total_earnings)
          }
        } else if (affiliateResponse.status === 404) {
          // No affiliate account found - this is normal
          setAffiliateEarningsCoins(0)
        }
      } catch (error) {
        console.error('Failed to fetch affiliate earnings:', error)
        // Don't fail the whole page if affiliate fetch fails
      }

      // Fetch cashback wallet data
      const walletResponse = await fetch(`${getApiBase()}/api/cashback/wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (walletResponse.ok) {
        const walletData = await walletResponse.json()
        setWallet(walletData)
      }

      // Fetch coin transaction history
      const transactionsResponse = await fetch(`${getApiBase()}/api/coin-transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        // Handle both response formats: {data: [...]} or direct array
        const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData.data || [])
        setCoinTransactions(transactions)
      }
    } catch (error) {
      console.error('Failed to fetch coins data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} mins ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
      case 'referral_bonus':
      case 'order_bonus':
      case 'cashback':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'redeemed':
        return <Gift className="w-5 h-5 text-blue-600" />
      case 'purchase_bonus':
        return <ShoppingBag className="w-5 h-5 text-purple-600" />
      case 'withdrawal_pending':
      case 'withdrawal_processing':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'withdrawal_completed':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'withdrawal_rejected':
      case 'withdrawal_failed':
        return <Coins className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'processing': 'bg-blue-100 text-blue-800 border-blue-300',
      'completed': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'failed': 'bg-red-100 text-red-800 border-red-300',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-300'
    }
    
    if (!status) return null
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles['pending']}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="text-center">
          <p className="text-slate-600" style={{ color: '#666' }}>Loading your coins...</p>
        </div>
      </main>
    )
  }

  // Total coins = loyalty points (already includes affiliate coins and cashback coins)
  const totalCoins = nefolCoins
  // Calculate cashback coins for display (cashback in rupees * 10)
  const cashbackCoins = wallet?.balance ? Math.floor(Number(wallet.balance) * 10) : 0

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
        <div className="mb-12 sm:mb-16">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[0.15em] mb-6"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            nefol coins
          </h1>
          <p 
            className="text-sm sm:text-base font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Earn coins with every purchase and enjoy exclusive rewards
          </p>
        </div>

        {/* Main Balance Dashboard Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-8 shadow-sm">
          <div className="text-center mb-8">
            <p 
              className="text-sm sm:text-base font-light mb-4 tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              your total balance
            </p>
            <div 
              className="mb-6"
              style={{ 
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <p className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(26, 26, 26)', fontVariantNumeric: 'tabular-nums', lineHeight: '1' }}>{totalCoins.toLocaleString()}</p>
              <span className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(26, 26, 26)' }}>coins</span>
            </div>
            
            {nefolCoins >= 10 && (
              <button
                onClick={() => window.location.hash = '#/user/coin-withdrawal'}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 text-xs sm:text-sm font-light transition-all duration-300 tracking-[0.15em] uppercase rounded-xl"
                style={{ 
                  backgroundColor: 'var(--arctic-blue-primary)',
                  color: '#fff',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                withdraw coins
              </button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pt-8 border-t border-slate-100">
            <div className="text-center">
              <p 
                className="text-xs sm:text-sm font-light mb-3 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                loyalty points
              </p>
              <p 
                className="text-lg sm:text-xl font-bold"
                style={{ 
                  color: '#1a1a1a',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: '1'
                }}
              >
                {nefolCoins.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p 
                className="text-xs sm:text-sm font-light mb-3 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                cashback
              </p>
              <p 
                className="text-lg sm:text-xl font-bold"
                style={{ 
                  color: '#1a1a1a',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: '1'
                }}
              >
                ₹{(Number(wallet?.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {cashbackCoins > 0 && (
                <p 
                  className="text-xs mt-1 font-light tracking-wide"
                  style={{ color: '#999', letterSpacing: '0.02em' }}
                >
                  ({cashbackCoins.toLocaleString()} coins)
                </p>
              )}
            </div>
            {affiliateEarningsCoins > 0 && (
              <div className="text-center">
                <p 
                  className="text-xs sm:text-sm font-light mb-3 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  from referrals
                </p>
                <p 
                  className="text-lg sm:text-xl font-bold mb-1"
                  style={{ 
                    color: '#1a1a1a',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: '1'
                  }}
                >
                  {affiliateEarningsCoins.toLocaleString()}
                </p>
                <p 
                  className="text-lg sm:text-xl font-bold"
                  style={{ 
                    color: '#1a1a1a',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: '1'
                  }}
                >
                  (₹{(affiliateEarningsCoins / 10).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* How to Earn Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <h3 
              className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              how to earn
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <ShoppingBag className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                </div>
                <div>
                  <h4 
                    className="text-base sm:text-lg font-light mb-1 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    make a purchase
                  </h4>
                  <p 
                    className="text-sm font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.02em' }}
                  >
                    Earn coins for every purchase you make
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <Gift className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                </div>
                <div>
                  <h4 
                    className="text-base sm:text-lg font-light mb-1 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    refer friends
                  </h4>
                  <p 
                    className="text-sm font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.02em' }}
                  >
                    Earn coins from affiliate referrals (1 rupee earned = 10 coins)
                  </p>
                  {affiliateEarningsCoins > 0 && (
                    <p 
                      className="text-xs mt-2 font-light tracking-wide"
                      style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.02em' }}
                    >
                      {affiliateEarningsCoins.toLocaleString()} coins earned
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                </div>
                <div>
                  <h4 
                    className="text-base sm:text-lg font-light mb-1 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    loyalty rewards
                  </h4>
                  <p 
                    className="text-sm font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.02em' }}
                  >
                    Earn 5% cashback on all orders
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          {wallet && wallet.totalSpent > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
              <h3 
                className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                your statistics
              </h3>
              <div className="space-y-6">
                <div className="pb-6 border-b border-slate-100">
                  <p 
                    className="text-xs sm:text-sm font-light mb-2 tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    total spent
                  </p>
                  <p 
                    className="text-2xl sm:text-3xl font-light"
                    style={{ 
                      color: '#1a1a1a',
                      fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: '1',
                      letterSpacing: '0.05em'
                    }}
                  >
                    ₹{wallet.totalSpent.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p 
                    className="text-xs sm:text-sm font-light mb-2 tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    cashback earned
                  </p>
                  <p 
                    className="text-2xl sm:text-3xl font-light"
                    style={{ 
                      color: '#1a1a1a',
                      fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: '1',
                      letterSpacing: '0.05em'
                    }}
                  >
                    ₹{(Number(wallet.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-2xl sm:text-3xl font-light tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              recent transactions
            </h3>
            {coinTransactions.length > 0 && (
              <a
                href="#/user/coin-withdrawal"
                className="flex items-center gap-1 text-sm font-light tracking-wide transition-opacity hover:opacity-70"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                view all
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
          
          {coinTransactions.length > 0 ? (
            <div className="space-y-4">
              {coinTransactions.slice(0, 10).map((transaction) => {
                const isDebit = transaction.type.includes('withdrawal')
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 hover:opacity-70 transition-opacity"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {getTransactionIcon(transaction.type)}
                      <div className="flex-1">
                        <p 
                          className="text-sm sm:text-base font-light mb-1 tracking-wide"
                          style={{ color: '#1a1a1a', letterSpacing: '0.02em' }}
                        >
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <p 
                            className="text-xs font-light tracking-wide"
                            style={{ color: '#999', letterSpacing: '0.02em' }}
                          >
                            {formatDateTime(transaction.created_at)}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-base sm:text-lg font-light tracking-wide ${
                          isDebit ? 'text-red-600' : 'text-green-600'
                        }`}
                        style={{ 
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: '1',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {isDebit ? '-' : '+'}
                        {transaction.amount.toLocaleString()}
                      </p>
                      <p 
                        className="text-xs font-light tracking-wide mt-1"
                        style={{ color: '#999', letterSpacing: '0.02em' }}
                      >
                        coins
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: '#999' }} />
              <p 
                className="text-sm font-light tracking-wide mb-6"
                style={{ color: '#666', letterSpacing: '0.02em' }}
              >
                No transactions yet. Start shopping to earn coins!
              </p>
              <a
                href="#/user/shop"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase rounded-xl"
                style={{ 
                  backgroundColor: 'var(--arctic-blue-primary)',
                  color: '#fff',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                start shopping
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
