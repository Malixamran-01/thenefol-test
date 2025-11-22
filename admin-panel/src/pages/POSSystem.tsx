import React, { useState, useEffect } from 'react'

interface POSTransaction {
  id: number
  transaction_number: string
  total: number
  payment_method: string
  created_at: string
  staff_name: string
}

export default function POSSystem() {
  const [transactions, setTransactions] = useState<POSTransaction[]>([])
  const [openSession, setOpenSession] = useState({ staff_id: '', opening_amount: '' })

  const fetchTransactions = async () => {
    const resp = await fetch('/api/pos/transactions')
    const data = await resp.json()
    if (data.success) setTransactions(data.data)
  }

  const handleOpenSession = async () => {
    const resp = await fetch('/api/pos/sessions/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: Number(openSession.staff_id),
        opening_amount: Number(openSession.opening_amount)
      })
    })
    const data = await resp.json()
    if (data.success) {
      alert('POS session opened')
      setOpenSession({ staff_id: '', opening_amount: '' })
    }
  }

  const createTransaction = async (items: any[], total: number, paymentMethod: string) => {
    const resp = await fetch('/api/pos/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 1,
        items,
        subtotal: total,
        total,
        payment_method: paymentMethod
      })
    })
    const data = await resp.json()
    if (data.success) {
      alert('Transaction created')
      fetchTransactions()
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return (
    <div className="p-6 space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      <div>
        <h1 
          className="text-3xl font-light mb-2 tracking-[0.15em]" 
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
            letterSpacing: '0.15em'
          }}
        >
          POS System
        </h1>
        <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Manage point of sale transactions and sessions
        </p>
      </div>

      <div className="metric-card">
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Open POS Session</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="number"
            value={openSession.staff_id}
            onChange={(e) => setOpenSession({ ...openSession, staff_id: e.target.value })}
            placeholder="Staff ID"
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          />
          <input
            type="number"
            value={openSession.opening_amount}
            onChange={(e) => setOpenSession({ ...openSession, opening_amount: e.target.value })}
            placeholder="Opening amount"
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          />
          <button onClick={handleOpenSession} className="btn-primary">
            Open Session
          </button>
        </div>
      </div>

      <div className="metric-card">
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No transactions</p>
        ) : (
          <div className="space-y-3">
            {transactions.map(t => (
              <div key={t.id} className="border p-4 rounded-xl transition-colors hover:bg-[var(--arctic-blue-lighter)]" style={{ borderColor: 'var(--arctic-blue-light)' }}>
                <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}><strong>Transaction:</strong> {t.transaction_number}</p>
                <p style={{ color: 'var(--text-secondary)' }}><strong>Total:</strong> ₹{t.total}</p>
                <p style={{ color: 'var(--text-secondary)' }}><strong>Method:</strong> {t.payment_method}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

