import React, { useState } from 'react'

export default function OnlineStore() {
  const [storeSettings, setStoreSettings] = useState({
    name: 'Nefol Store',
    description: 'Premium skincare products for healthy, glowing skin',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    language: 'en',
    domain: 'nefol.com',
    status: 'live'
  })

  const [themes] = useState([
    { id: 1, name: 'Nefol Classic', active: true, preview: '/IMAGES/light theme logo.png' },
    { id: 2, name: 'Nefol Dark', active: false, preview: '/IMAGES/dark theme logo.png' },
    { id: 3, name: 'Minimal', active: false, preview: '/IMAGES/light theme logo.png' }
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Online Store</h1>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Store is live</span>
        </div>
      </div>

      {/* Store Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Store Status</p>
              <p className="text-2xl font-bold text-green-600">Live</p>
            </div>
            <div className="text-2xl">🟢</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Domain</p>
              <p className="text-lg font-bold text-gray-900">nefol.com</p>
            </div>
            <div className="text-2xl">🌐</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Theme</p>
              <p className="text-lg font-bold text-gray-900">Nefol Classic</p>
            </div>
            <div className="text-2xl">🎨</div>
          </div>
        </div>
      </div>

      {/* Store Settings */}
      <div className="metric-card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input 
              type="text" 
              value={storeSettings.name}
              onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select 
              value={storeSettings.currency}
              onChange={(e) => setStoreSettings({...storeSettings, currency: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select 
              value={storeSettings.timezone}
              onChange={(e) => setStoreSettings({...storeSettings, timezone: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
            >
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select 
              value={storeSettings.language}
              onChange={(e) => setStoreSettings({...storeSettings, language: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Description</label>
          <textarea 
            value={storeSettings.description}
            onChange={(e) => setStoreSettings({...storeSettings, description: e.target.value})}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div className="mt-6 flex justify-end">
          <button className="btn-primary">Save Settings</button>
        </div>
      </div>

      {/* Themes */}
      <div className="metric-card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Themes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div key={theme.id} className={`border-2 rounded-lg p-4 ${theme.active ? 'border-brand-primary' : 'border-gray-200'}`}>
              <img 
                src={theme.preview} 
                alt={theme.name}
                className="w-full h-32 object-cover rounded mb-3"
              />
              <h3 className="font-semibold text-gray-900 mb-2">{theme.name}</h3>
              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  theme.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {theme.active ? 'Active' : 'Inactive'}
                </span>
                <button className="btn-secondary text-xs px-2 py-1">
                  {theme.active ? 'Customize' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Settings */}
      <div className="metric-card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Domain</label>
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                value={storeSettings.domain}
                onChange={(e) => setStoreSettings({...storeSettings, domain: e.target.value})}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
              />
              <button className="btn-secondary">Update</button>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">ℹ️</span>
              <div>
                <p className="text-sm text-blue-800 font-medium">Domain Configuration</p>
                <p className="text-sm text-blue-700">Make sure to update your DNS settings to point to our servers.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}








