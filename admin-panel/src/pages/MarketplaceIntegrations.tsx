import React, { useState, useEffect } from 'react'

interface MarketplaceAccount {
  id: number
  channel: string
  name: string
  is_active: boolean
}

export default function MarketplaceIntegrations() {
  const [amazonAccounts, setAmazonAccounts] = useState<MarketplaceAccount[]>([])
  const [flipkartAccounts, setFlipkartAccounts] = useState<MarketplaceAccount[]>([])
  const [newAccount, setNewAccount] = useState({ name: '', channel: 'amazon' as string, credentials: { api_key: '', api_secret: '' } })

  const fetchAccounts = async (channel: string) => {
    const resp = await fetch(`/api/marketplaces/${channel}/accounts`)
    const data = await resp.json()
    if (data.success) {
      if (channel === 'amazon') setAmazonAccounts(data.data)
      else setFlipkartAccounts(data.data)
    }
  }

  const createAccount = async () => {
    const endpoint = newAccount.channel === 'amazon' ? '/api/marketplaces/amazon/accounts' : '/api/marketplaces/flipkart/accounts'
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAccount.name, credentials: newAccount.credentials })
    })
    const data = await resp.json()
    if (data.success) {
      alert('Account created successfully')
      setNewAccount({ name: '', channel: 'amazon', credentials: { api_key: '', api_secret: '' } })
      fetchAccounts(newAccount.channel)
    }
  }

  useEffect(() => {
    fetchAccounts('amazon')
    fetchAccounts('flipkart')
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Marketplace Integrations</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Add New Marketplace Account</h2>
        <select
          value={newAccount.channel}
          onChange={(e) => setNewAccount({ ...newAccount, channel: e.target.value })}
          className="border p-2 rounded mr-2"
        >
          <option value="amazon">Amazon</option>
          <option value="flipkart">Flipkart</option>
        </select>
        <input
          type="text"
          value={newAccount.name}
          onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
          placeholder="Account name"
          className="border p-2 rounded mr-2"
        />
        <input
          type="text"
          value={newAccount.credentials.api_key}
          onChange={(e) => setNewAccount({ ...newAccount, credentials: { ...newAccount.credentials, api_key: e.target.value } })}
          placeholder="API Key"
          className="border p-2 rounded mr-2"
        />
        <input
          type="text"
          value={newAccount.credentials.api_secret}
          onChange={(e) => setNewAccount({ ...newAccount, credentials: { ...newAccount.credentials, api_secret: e.target.value } })}
          placeholder="API Secret"
          className="border p-2 rounded mr-2"
        />
        <button onClick={createAccount} className="px-4 py-2 bg-blue-500 text-white rounded">
          Create Account
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Amazon Accounts</h3>
          {amazonAccounts.length === 0 ? (
            <p className="text-gray-500">No accounts</p>
          ) : (
            <div className="space-y-2">
              {amazonAccounts.map(acc => (
                <div key={acc.id} className="border p-3 rounded">
                  <p><strong>{acc.name}</strong></p>
                  <p className="text-sm text-gray-500">{acc.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Flipkart Accounts</h3>
          {flipkartAccounts.length === 0 ? (
            <p className="text-gray-500">No accounts</p>
          ) : (
            <div className="space-y-2">
              {flipkartAccounts.map(acc => (
                <div key={acc.id} className="border p-3 rounded">
                  <p><strong>{acc.name}</strong></p>
                  <p className="text-sm text-gray-500">{acc.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

