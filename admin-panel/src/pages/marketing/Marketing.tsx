import React, { useState, useEffect } from 'react'
import { getApiBaseUrl } from '../../utils/apiUrl'

type Campaign = {
  id: number
  name: string
  type: 'email' | 'social' | 'push' | 'sms'
  status: 'draft' | 'active' | 'paused' | 'completed'
  audience: string
  sent: number
  opened: number
  clicked: number
  converted: number
  createdAt: string
  scheduledFor?: string
}

type EmailTemplate = {
  id: number
  name: string
  subject: string
  preview: string
  createdAt: string
}

export default function Marketing() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'audiences'>('campaigns')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

  useEffect(() => {
    loadCampaigns()
    loadTemplates()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/marketing/campaigns`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      // Ensure data is an array
      setCampaigns(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load campaigns:', error)
      setCampaigns([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/api/marketing/templates`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      // Ensure data is an array
      setTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load templates:', error)
      setTemplates([]) // Set empty array on error
    }
  }

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: Campaign['type']) => {
    switch (type) {
      case 'email': return '📧'
      case 'social': return '📱'
      case 'push': return '🔔'
      case 'sms': return '💬'
      default: return '📧'
    }
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
            Marketing
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage your marketing campaigns and templates
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'campaigns', name: 'Campaigns', count: campaigns.length },
            { id: 'templates', name: 'Templates', count: templates.length },
            { id: 'audiences', name: 'Audiences', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Total Campaigns', value: campaigns.length, icon: '📊' },
              { title: 'Active', value: campaigns.filter(c => c.status === 'active').length, icon: '✅' },
              { title: 'Total Sent', value: campaigns.reduce((sum, c) => sum + c.sent, 0).toLocaleString(), icon: '📤' },
              { title: 'Conversion Rate', value: '3.2%', icon: '🎯' }
            ].map((stat, index) => (
              <div key={index} className="metric-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="text-2xl">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Campaigns Table */}
          <div className="metric-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4">Campaign</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Audience</th>
                    <th className="py-3 pr-4">Sent</th>
                    <th className="py-3 pr-4">Opened</th>
                    <th className="py-3 pr-4">Clicked</th>
                    <th className="py-3 pr-4">Converted</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium text-gray-900">{campaign.name}</p>
                          <p className="text-sm text-gray-500">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center space-x-1">
                          <span>{getTypeIcon(campaign.type)}</span>
                          <span className="capitalize">{campaign.type}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{campaign.audience}</td>
                      <td className="py-3 pr-4 font-medium">{campaign.sent.toLocaleString()}</td>
                      <td className="py-3 pr-4">{campaign.opened.toLocaleString()}</td>
                      <td className="py-3 pr-4">{campaign.clicked.toLocaleString()}</td>
                      <td className="py-3 pr-4 font-semibold text-green-600">{campaign.converted}</td>
                      <td className="py-3 pr-4">
                        <div className="flex space-x-2">
                          <button className="btn-secondary text-xs px-2 py-1">Edit</button>
                          <button className="btn-secondary text-xs px-2 py-1">View</button>
                          <button className="bg-red-600 text-white px-2 py-1 text-xs rounded hover:bg-red-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
            <button className="btn-primary">Create Template</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="metric-card">
                <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                <p className="text-sm text-gray-500 mb-4">{template.preview}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{new Date(template.createdAt).toLocaleDateString()}</span>
                  <div className="flex space-x-2">
                    <button className="btn-secondary text-xs px-2 py-1">Edit</button>
                    <button className="btn-secondary text-xs px-2 py-1">Preview</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audiences Tab */}
      {activeTab === 'audiences' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Audience Segments</h2>
            <button className="btn-primary">Create Audience</button>
          </div>

          <div className="metric-card">
            <p className="text-gray-600">Audience management features coming soon. This will include creating customer segments, importing lists, and managing subscriber preferences.</p>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-6 text-xl font-semibold">Create New Campaign</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const newCampaign = {
                id: campaigns.length + 1,
                name: formData.get('name') as string,
                type: formData.get('type') as Campaign['type'],
                status: 'draft' as const,
                audience: formData.get('audience') as string,
                sent: 0,
                opened: 0,
                clicked: 0,
                converted: 0,
                createdAt: new Date().toISOString().split('T')[0]
              }
              setCampaigns([...campaigns, newCampaign])
              setShowCreateModal(false)
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Summer Sale Campaign"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Campaign Type</label>
                <select
                  name="type"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="email">Email</option>
                  <option value="social">Social Media</option>
                  <option value="push">Push Notification</option>
                  <option value="sms">SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <input
                  type="text"
                  name="audience"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="All customers"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}




