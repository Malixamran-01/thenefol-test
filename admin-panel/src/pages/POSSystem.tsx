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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">POS System</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Open POS Session</h2>
        <input
          type="number"
          value={openSession.staff_id}
          onChange={(e) => setOpenSession({ ...openSession, staff_id: e.target.value })}
          placeholder="Staff ID"
          className="border p-2 rounded mr-2"
        />
        <input
          type="number"
          value={openSession.opening_amount}
          onChange={(e) => setOpenSession({ ...openSession, opening_amount: e.target.value })}
          placeholder="Opening amount"
          className="border p-2 rounded mr-2"
        />
        <button onClick={handleOpenSession} className="px-4 py-2 bg-green-500 text-white rounded">
          Open Session
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="border p-3 rounded">
                <p><strong>Transaction:</strong> {t.transaction_number}</p>
                <p><strong>Total:</strong> ₹{t.total}</p>
                <p><strong>Method:</strong> {t.payment_method}</p>
                <p className="text-sm text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

