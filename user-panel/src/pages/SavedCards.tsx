import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, Check, ArrowLeft } from 'lucide-react'
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
      case 'rupay':
        return 'RP'
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
      case 'rupay':
        return 'from-indigo-500 to-purple-600'
      default:
        return 'from-gray-500 to-gray-700'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>Loading your cards...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: 'rgb(75,151,201)' }}>
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
            Saved Cards
          </h1>
          <p 
            className="text-sm sm:text-base font-light tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Manage your payment methods
          </p>
        </div>

        {/* Add Card Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 text-white px-6 py-3 rounded-lg font-light tracking-[0.15em] uppercase transition-colors text-xs"
            style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
          >
            <Plus className="w-5 h-5" />
            Add New Card
          </button>
        </div>

        {/* Add Card Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-100">
            <h3 
              className="text-xl sm:text-2xl font-light mb-4 tracking-[0.1em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.1em'
              }}
            >
              Add New Card
            </h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                  Card Number
                </label>
                <input
                  type="text"
                  value={newCard.card_number}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    // Format with spaces every 4 digits
                    value = value.match(/.{1,4}/g)?.join(' ') || value
                    setNewCard({ ...newCard, card_number: value })
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-light"
                  style={{ letterSpacing: '0.02em' }}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={newCard.expiry}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '') // Remove non-digits
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4)
                      }
                      setNewCard({ ...newCard, expiry: value })
                    }}
                    maxLength={5}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-light"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="MM/YY"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                    CVV
                  </label>
                  <input
                    type="text"
                    value={newCard.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setNewCard({ ...newCard, cvv: value })
                    }}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-light"
                    style={{ letterSpacing: '0.02em' }}
                    placeholder="123"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-light"
                  style={{ letterSpacing: '0.02em' }}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-light text-slate-700 mb-2 uppercase tracking-[0.1em]" style={{ letterSpacing: '0.1em' }}>
                  Card Type
                </label>
                <select
                  value={newCard.type}
                  onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-light"
                  style={{ letterSpacing: '0.02em' }}
                >
                  <option value="Visa">Visa</option>
                  <option value="MasterCard">MasterCard</option>
                  <option value="Amex">American Express</option>
                  <option value="RuPay">RuPay</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 text-white px-6 py-2.5 rounded-lg transition-colors text-xs font-light tracking-[0.15em] uppercase"
                  style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
                >
                  Save Card
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 border border-slate-900 text-slate-900 px-6 py-2.5 rounded-lg hover:bg-slate-900 hover:text-white transition-colors text-xs font-light tracking-[0.15em] uppercase"
                  style={{ letterSpacing: '0.15em' }}
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
            <CreditCard className="w-16 h-16 mx-auto mb-4" style={{ color: '#ccc' }} />
            <h3 
              className="text-xl sm:text-2xl font-light mb-2 tracking-[0.1em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.1em'
              }}
            >
              No Cards Saved
            </h3>
            <p 
              className="mb-6 font-light tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Add a card to make checkout faster
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-block text-white px-6 py-3 rounded-lg transition-colors text-xs font-light tracking-[0.15em] uppercase"
              style={{ backgroundColor: 'rgb(75,151,201)', letterSpacing: '0.15em' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
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

