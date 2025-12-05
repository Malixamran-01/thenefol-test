import React, { useState, useEffect } from 'react'
import { User, Settings, Bell, Shield, CreditCard, Gift } from 'lucide-react'

export default function Account() {
  const [accountStats, setAccountStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccountStats()
  }, [])

  const fetchAccountStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      // Fetch user profile for loyalty points
      const profileResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setAccountStats(prev => ({
          ...prev,
          loyaltyPoints: profileData.loyalty_points || 0,
          totalOrders: profileData.total_orders || 0
        }))
      }

      // Fetch orders for total spent calculation
      const ordersResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        const totalSpent = ordersData.reduce((sum: number, order: any) => sum + (order.total || 0), 0)
        setAccountStats(prev => ({
          ...prev,
          totalSpent: totalSpent
        }))
      }
    } catch (error) {
      console.error('Failed to fetch account stats:', error)
      // Fallback to zero values
      setAccountStats({ totalOrders: 0, totalSpent: 0, loyaltyPoints: 0 })
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            My Account
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Manage your account settings, preferences, and personal information.
          </p>
        </div>

        {/* Account Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <a 
            href="#/user/profile" 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Personal Information
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Update your name, email, phone number, and address information.
            </p>
          </a>

          <a 
            href="#/user/orders" 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Order History
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              View and track all your past and current orders.
            </p>
          </a>

          <a 
            href="#/user/notifications" 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Notifications
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Manage your email and SMS notification preferences.
            </p>
          </a>

          <a 
            href="#/user/privacy-security" 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Privacy & Security
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Manage your password, privacy settings, and security options.
            </p>
          </a>

          <a 
            href="#/user/payment-methods" 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Payment Methods
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Manage your saved payment methods and billing information.
            </p>
          </a>

          <a 
            href="#/user/loyalty-rewards" 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow group"
          >
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Gift className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Loyalty & Rewards
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              View your loyalty points, rewards, and special offers.
            </p>
          </a>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="#/user/profile" 
              className="bg-white dark:bg-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow flex items-center"
            >
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Edit Profile</span>
            </a>
            <a 
              href="#/user/orders" 
              className="bg-white dark:bg-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow flex items-center"
            >
              <Settings className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
              <span className="font-medium text-slate-900 dark:text-slate-100">View Orders</span>
            </a>
            <a 
              href="#/user/shop" 
              className="bg-white dark:bg-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow flex items-center"
            >
              <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Continue Shopping</span>
            </a>
            <a 
              href="#/user/contact" 
              className="bg-white dark:bg-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow flex items-center"
            >
              <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Contact Support</span>
            </a>
          </div>
        </div>

        {/* Account Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Account Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {loading ? '...' : accountStats.totalOrders}
              </div>
              <p className="text-slate-600 dark:text-slate-400">Total Orders</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {loading ? '...' : `₹${accountStats.totalSpent.toLocaleString()}`}
              </div>
              <p className="text-slate-600 dark:text-slate-400">Total Spent</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {loading ? '...' : accountStats.loyaltyPoints}
              </div>
              <p className="text-slate-600 dark:text-slate-400">Loyalty Points</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
