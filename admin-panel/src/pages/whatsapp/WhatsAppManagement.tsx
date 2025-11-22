import React, { useState, useEffect } from 'react'
import { 
  MessageCircle, Settings, Send, FileText, Zap, Users, BarChart3, 
  CheckCircle, XCircle, Save, RefreshCw, Eye, Edit, Trash2, Plus,
  Phone, Clock, TrendingUp, AlertCircle, Key, Smartphone
} from 'lucide-react'

interface WhatsAppConfig {
  accessToken: string
  phoneNumberId: string
  businessAccountId: string
  webhookUrl: string
  verifyToken: string
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  status: 'pending' | 'approved' | 'rejected'
  language: string
}

interface Automation {
  id: string
  name: string
  trigger: string
  action: string
  template: string
  isActive: boolean
}

interface Session {
  id: string
  customerName: string
  customerPhone: string
  lastMessage: string
  lastMessageTime: string
  status: string
}

export default function WhatsAppManagement() {
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'automations' | 'sessions' | 'analytics'>('config')
  const [config, setConfig] = useState<WhatsAppConfig>({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookUrl: '',
    verifyToken: ''
  })
  const [templates, setTemplates] = useState<Template[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  
  // Modals
  const [showTestModal, setShowTestModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showAutomationModal, setShowAutomationModal] = useState(false)
  
  // Form states
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', category: 'MARKETING', language: 'en_US' })
  const [newAutomation, setNewAutomation] = useState({ name: '', trigger: '', action: '', template: '' })

  const apiBase = (import.meta as any).env.VITE_API_URL || 'https://thenefol.com/api'

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load config from backend
      const configRes = await fetch(`${apiBase}/api/whatsapp/config`)
      if (configRes.ok) {
        const data = await configRes.json()
        if (data.success) setConfig(data.data)
      }

      // Load templates
      const templatesRes = await fetch(`${apiBase}/api/whatsapp-chat/templates`)
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setTemplates(Array.isArray(data) ? data : [])
      }

      // Load automations
      const automationsRes = await fetch(`${apiBase}/api/whatsapp-chat/automations`)
      if (automationsRes.ok) {
        const data = await automationsRes.json()
        setAutomations(Array.isArray(data) ? data : [])
      }

      // Load sessions
      const sessionsRes = await fetch(`${apiBase}/api/whatsapp-chat/sessions`)
      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        setSessions(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setSaveStatus('saving')
    try {
      const response = await fetch(`${apiBase}/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        setSaveStatus('success')
        alert('✅ Configuration saved successfully!')
      } else {
        setSaveStatus('error')
        alert('❌ Failed to save configuration')
      }
    } catch (error) {
      setSaveStatus('error')
      alert('❌ Network error')
    }
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      alert('Please enter phone number and message')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/whatsapp-chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone, message: testMessage })
      })

      const data = await response.json()
      if (response.ok) {
        alert('✅ Message sent successfully!')
        setTestPhone('')
        setTestMessage('')
        setShowTestModal(false)
        loadAllData()
      } else {
        alert(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('❌ Network error')
    }
  }

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      alert('Please fill all fields')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/whatsapp/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })

      if (response.ok) {
        alert('✅ Template created!')
        setShowTemplateModal(false)
        setNewTemplate({ name: '', content: '', category: 'MARKETING', language: 'en_US' })
        loadAllData()
      } else {
        alert('❌ Failed to create template')
      }
    } catch (error) {
      alert('❌ Network error')
    }
  }

  const createAutomation = async () => {
    if (!newAutomation.name || !newAutomation.trigger) {
      alert('Please fill all fields')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/whatsapp/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation)
      })

      if (response.ok) {
        alert('✅ Automation created!')
        setShowAutomationModal(false)
        setNewAutomation({ name: '', trigger: '', action: '', template: '' })
        loadAllData()
      } else {
        alert('❌ Failed to create automation')
      }
    } catch (error) {
      alert('❌ Network error')
    }
  }

  const renderConfigTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">How to get these credentials?</h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" className="underline">developers.facebook.com</a></li>
              <li>Select your app → WhatsApp → API Setup</li>
              <li>Copy Access Token and Phone Number ID</li>
              <li>Paste them below and click Save</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Key className="inline h-4 w-4 mr-1" />
            Access Token *
          </label>
          <textarea
            value={config.accessToken}
            onChange={(e) => setConfig({...config, accessToken: e.target.value})}
            placeholder="EAAQy..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Smartphone className="inline h-4 w-4 mr-1" />
            Phone Number ID *
          </label>
          <input
            type="text"
            value={config.phoneNumberId}
            onChange={(e) => setConfig({...config, phoneNumberId: e.target.value})}
            placeholder="368410443015784"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Business Account ID (Optional)
          </label>
          <input
            type="text"
            value={config.businessAccountId}
            onChange={(e) => setConfig({...config, businessAccountId: e.target.value})}
            placeholder="353217381206675"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Webhook URL (Optional)
          </label>
          <input
            type="text"
            value={config.webhookUrl}
            onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
            placeholder="https://yourdomain.com/webhook"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={saveConfiguration}
          disabled={saveStatus === 'saving'}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}</span>
        </button>
        
        <button
          onClick={() => setShowTestModal(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>Send Test Message</span>
        </button>
      </div>
    </div>
  )

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Message Templates</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Create reusable message templates</p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Template</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No templates yet. Create your first template!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">{template.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  template.status === 'approved' ? 'bg-green-100 text-green-800' :
                  template.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {template.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{template.category} • {template.language}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-3">{template.content}</p>
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Eye className="inline h-3 w-3 mr-1" />
                  View
                </button>
                <button className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Edit className="inline h-3 w-3" />
                </button>
                <button className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50">
                  <Trash2 className="inline h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAutomationsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WhatsApp Automations</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Automate messages based on triggers</p>
        </div>
        <button
          onClick={() => setShowAutomationModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Automation</span>
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <Zap className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No automations yet. Create your first automation!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => (
            <div key={automation.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{automation.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      automation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {automation.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Trigger:</strong> {automation.trigger}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Action:</strong> {automation.action}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50">
                    <Edit className="inline h-3 w-3" />
                  </button>
                  <button className={`px-3 py-1 text-sm rounded ${
                    automation.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {automation.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSessionsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Chat Sessions</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Recent WhatsApp conversations</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No chat sessions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{session.customerName}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{session.customerPhone}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{session.lastMessage}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{session.lastMessageTime}</span>
                  <span className={`block mt-1 px-2 py-1 text-xs rounded-full ${
                    session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WhatsApp Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <Users className="h-8 w-8 mb-2" />
          <p className="text-sm opacity-90">Total Messages</p>
          <p className="text-3xl font-bold">{sessions.length}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <MessageCircle className="h-8 w-8 mb-2" />
          <p className="text-sm opacity-90">Active Chats</p>
          <p className="text-3xl font-bold">{sessions.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <FileText className="h-8 w-8 mb-2" />
          <p className="text-sm opacity-90">Templates</p>
          <p className="text-3xl font-bold">{templates.length}</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <Zap className="h-8 w-8 mb-2" />
          <p className="text-sm opacity-90">Automations</p>
          <p className="text-3xl font-bold">{automations.filter(a => a.isActive).length}</p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
        <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Detailed analytics coming soon...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      {/* Header */}
      <div>
        <h1 
          className="text-3xl font-light mb-2 tracking-[0.15em]" 
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
            letterSpacing: '0.15em'
          }}
        >
          WhatsApp Business Management
        </h1>
        <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Complete WhatsApp integration - Configuration, Templates, Automations, and More
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--arctic-blue-light)' }}>
        <div className="flex space-x-8">
          {[
            { id: 'config', label: 'Configuration', icon: Settings },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'automations', label: 'Automations', icon: Zap },
            { id: 'sessions', label: 'Sessions', icon: MessageCircle },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? ''
                  : 'border-transparent'
              }`}
              style={activeTab === tab.id 
                ? { borderColor: 'var(--arctic-blue-primary)', color: 'var(--arctic-blue-primary-dark)' }
                : { color: 'var(--text-muted)' }
              }
            >
              <tab.icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'config' && renderConfigTab()}
            {activeTab === 'templates' && renderTemplatesTab()}
            {activeTab === 'automations' && renderAutomationsTab()}
            {activeTab === 'sessions' && renderSessionsTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
          </>
        )}
      </div>

      {/* Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Send Test Message</h2>
              <button onClick={() => setShowTestModal(false)}>
                <XCircle className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="917355384939"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
              <button
                onClick={sendTestMessage}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Template</h2>
              <button onClick={() => setShowTemplateModal(false)}>
                <XCircle className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Template Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="welcome_message"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                  placeholder="Welcome to Nefol! ..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
              <button
                onClick={createTemplate}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automation Modal */}
      {showAutomationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Automation</h2>
              <button onClick={() => setShowAutomationModal(false)}>
                <XCircle className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Automation Name</label>
                <input
                  type="text"
                  value={newAutomation.name}
                  onChange={(e) => setNewAutomation({...newAutomation, name: e.target.value})}
                  placeholder="Order Confirmation"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trigger</label>
                <select
                  value={newAutomation.trigger}
                  onChange={(e) => setNewAutomation({...newAutomation, trigger: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Select trigger...</option>
                  <option value="order_placed">Order Placed</option>
                  <option value="order_shipped">Order Shipped</option>
                  <option value="order_delivered">Order Delivered</option>
                  <option value="cart_abandoned">Cart Abandoned</option>
                  <option value="user_registered">User Registered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Action</label>
                <input
                  type="text"
                  value={newAutomation.action}
                  onChange={(e) => setNewAutomation({...newAutomation, action: e.target.value})}
                  placeholder="Send WhatsApp message"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>
              <button
                onClick={createAutomation}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

