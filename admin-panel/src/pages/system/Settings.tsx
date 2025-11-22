import React, { useState } from 'react'

export default function Settings() {
  const [storeName, setStoreName] = useState('Nefol Store')
  const [supportEmail, setSupportEmail] = useState('support@nefol.com')
  const [theme, setTheme] = useState('Light')
  const [currency, setCurrency] = useState('INR (₹)')

  const handleSave = () => {
    // Save settings to backend or localStorage
    alert('Settings saved successfully!')
    console.log('Settings:', { storeName, supportEmail, theme, currency })
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Settings
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Configure your store settings and preferences
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="btn-primary"
        >
          Save Changes
        </button>
      </div>
      
      <div className="metric-card">
        <h2 className="mb-4 text-xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Store Settings</h2>
        <p className="mb-6" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>Configure your store settings and preferences.</p>
        
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">General</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none" 
                  placeholder="Nefol Store" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                <input 
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none" 
                  placeholder="support@nefol.com" 
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">Appearance</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                >
                  <option>Light</option>
                  <option>Dark</option>
                  <option>Auto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                >
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
