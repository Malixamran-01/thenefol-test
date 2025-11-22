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
          Marketplace Integrations
        </h1>
        <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Connect and manage marketplace accounts
        </p>
      </div>

      <div className="metric-card">
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Add New Marketplace Account</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={newAccount.channel}
            onChange={(e) => setNewAccount({ ...newAccount, channel: e.target.value })}
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          >
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
          </select>
          <input
            type="text"
            value={newAccount.name}
            onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
            placeholder="Account name"
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          />
          <input
            type="text"
            value={newAccount.credentials.api_key}
            onChange={(e) => setNewAccount({ ...newAccount, credentials: { ...newAccount.credentials, api_key: e.target.value } })}
            placeholder="API Key"
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          />
          <input
            type="text"
            value={newAccount.credentials.api_secret}
            onChange={(e) => setNewAccount({ ...newAccount, credentials: { ...newAccount.credentials, api_secret: e.target.value } })}
            placeholder="API Secret"
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          />
          <button onClick={createAccount} className="btn-primary">
            Create Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="metric-card">
          <h3 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Amazon Accounts</h3>
          {amazonAccounts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No accounts</p>
          ) : (
            <div className="space-y-3">
              {amazonAccounts.map(acc => (
                <div key={acc.id} className="border p-4 rounded-xl transition-colors hover:bg-[var(--arctic-blue-lighter)]" style={{ borderColor: 'var(--arctic-blue-light)' }}>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}><strong>{acc.name}</strong></p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{acc.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="metric-card">
          <h3 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Flipkart Accounts</h3>
          {flipkartAccounts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No accounts</p>
          ) : (
            <div className="space-y-3">
              {flipkartAccounts.map(acc => (
                <div key={acc.id} className="border p-4 rounded-xl transition-colors hover:bg-[var(--arctic-blue-lighter)]" style={{ borderColor: 'var(--arctic-blue-light)' }}>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}><strong>{acc.name}</strong></p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{acc.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

