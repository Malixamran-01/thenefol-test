import React, { useState, useEffect } from 'react'
import { Gift, Star, Trophy, Clock, ShoppingBag, Heart, Share2 } from 'lucide-react'

interface Reward {
  id: string
  title: string
  description: string
  points: number
  type: 'discount' | 'freebie' | 'exclusive'
  isRedeemed: boolean
  expiryDate?: string
}

export default function LoyaltyRewards() {
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [tier, setTier] = useState('Bronze')
  const [nextTierPoints, setNextTierPoints] = useState(0)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLoyaltyData()
  }, [])

  const fetchLoyaltyData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      // Fetch user loyalty points
      const pointsResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/loyalty/points`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json()
        setLoyaltyPoints(pointsData.points || 0)
        setTier(pointsData.tier || 'Bronze')
        setNextTierPoints(pointsData.nextTierPoints || 0)
      }

      // Fetch available rewards
      const rewardsResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/loyalty/rewards`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json()
        setRewards(rewardsData)
      }
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error)
      // Fallback to empty data
      setLoyaltyPoints(0)
      setTier('Bronze')
      setNextTierPoints(0)
      setRewards([])
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemReward = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId)
    if (reward && loyaltyPoints >= reward.points) {
      setLoyaltyPoints(loyaltyPoints - reward.points)
      setRewards(rewards.map(r => 
        r.id === rewardId ? { ...r, isRedeemed: true } : r
      ))
      alert(`Reward "${reward.title}" redeemed successfully!`)
    } else {
      alert('Insufficient points to redeem this reward.')
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold':
        return 'from-yellow-400 to-yellow-600'
      case 'Silver':
        return 'from-gray-400 to-gray-600'
      case 'Bronze':
        return 'from-orange-400 to-orange-600'
      default:
        return 'from-blue-400 to-blue-600'
    }
  }

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return <ShoppingBag className="w-6 h-6 text-green-600 dark:text-green-400" />
      case 'freebie':
        return <Gift className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      case 'exclusive':
        return <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
      default:
        return <Gift className="w-6 h-6 text-gray-600 dark:text-gray-400" />
    }
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Loyalty & Rewards
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Earn points with every purchase and redeem amazing rewards.
          </p>
        </div>

        {/* Loyalty Status */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Your Loyalty Status
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {tier} Member • {loyaltyPoints} Points Available
              </p>
            </div>
            <div className={`w-16 h-16 bg-gradient-to-r ${getTierColor(tier)} rounded-full flex items-center justify-center`}>
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Progress to Next Tier
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {nextTierPoints} points to go
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${((1500 - nextTierPoints) / 1500) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Available Rewards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rewards.filter(reward => !reward.isRedeemed).map((reward) => (
              <div key={reward.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mr-4">
                      {getRewardIcon(reward.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {reward.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {reward.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {reward.points}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      points
                    </div>
                  </div>
                </div>

                {reward.expiryDate && (
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <Clock className="w-4 h-4 mr-2" />
                    Expires: {new Date(reward.expiryDate).toLocaleDateString()}
                  </div>
                )}

                <button
                  onClick={() => handleRedeemReward(reward.id)}
                  disabled={loyaltyPoints < reward.points}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    loyaltyPoints >= reward.points
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {loyaltyPoints >= reward.points ? 'Redeem Now' : 'Insufficient Points'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Redeemed Rewards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Redeemed Rewards
          </h2>
          <div className="space-y-4">
            {rewards.filter(reward => reward.isRedeemed).map((reward) => (
              <div key={reward.id} className="bg-slate-100 dark:bg-slate-700 rounded-xl p-6 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center mr-4">
                      {getRewardIcon(reward.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {reward.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {reward.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      Redeemed
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {reward.points} points
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            How to Earn Points
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <ShoppingBag className="w-8 h-8 text-green-600 dark:text-green-400 mr-4" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Make Purchases
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Earn 1 point for every ₹10 spent
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Heart className="w-8 h-8 text-red-600 dark:text-red-400 mr-4" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Write Reviews
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Earn 50 points for each product review
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Share2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-4" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Refer Friends
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Earn 100 points for each successful referral
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Star className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mr-4" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Social Media
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Earn 25 points for sharing on social media
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
