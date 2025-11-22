import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, Check } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

interface Card {
  id: string
  card_number: string
  expiry: string
  type: string
  name: string
  is_default: boolean
}

export default function SavedCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCard, setNewCard] = useState({
    card_number: '',
    expiry: '',
    cvv: '',
    name: '',
    type: 'Visa'
  })

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiBase = getApiBase()
      
      const response = await fetch(`${apiBase}/api/users/saved-cards`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCards(data.data || data || [])
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement card addition logic
    alert('Card addition functionality coming soon!')
    setShowAddForm(false)
    setNewCard({
      card_number: '',
      expiry: '',
      cvv: '',
      name: '',
      type: 'Visa'
    })
  }

  const handleDelete = async (cardId: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      // TODO: Implement card deletion logic
      alert('Card deletion functionality coming soon!')
    }
  }

  const maskCardNumber = (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\s/g, '')
    if (cleaned.length <= 4) return cleaned
    return '**** **** **** ' + cleaned.slice(-4)
  }

  const getCardIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visa':
        return 'V'
      case 'mastercard':
        return 'MC'
      case 'amex':
        return 'AX'
      default:
        return 'CC'
    }
  }

  const getCardColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visa':
        return 'from-blue-500 to-blue-700'
      case 'mastercard':
        return 'from-orange-500 to-red-600'
      case 'amex':
        return 'from-green-500 to-green-700'
      default:
        return 'from-gray-500 to-gray-700'
    }
  }

  if (loading) {
    return (
      <main className="py-10 dark:bg-slate-900 min-h-screen">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">Loading your cards...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Saved Cards
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Manage your payment methods
          </p>
        </div>

        {/* Add Card Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Card
          </button>
        </div>

        {/* Add Card Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Add New Card
            </h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={newCard.card_number}
                  onChange={(e) => setNewCard({ ...newCard, card_number: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={newCard.expiry}
                    onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                    placeholder="123"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Card Type
                </label>
                <select
                  value={newCard.type}
                  onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                >
                  <option value="Visa">Visa</option>
                  <option value="MasterCard">MasterCard</option>
                  <option value="Amex">American Express</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Card
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cards List */}
        {cards.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No Cards Saved
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Add a card to make checkout faster
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`bg-gradient-to-r ${getCardColor(card.type)} rounded-xl shadow-lg p-6 text-white relative`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                      {getCardIcon(card.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{card.type}</h3>
                      <p className="text-sm text-white/80">{maskCardNumber(card.card_number)}</p>
                    </div>
                  </div>
                  {card.is_default && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Default</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80">Expires</p>
                    <p className="font-semibold">{card.expiry}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

