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

interface TemplateComponent {
  type: string
  format?: string
  text?: string
  example?: any
  buttons?: Array<{
    type: string
    text: string
    url?: string
    phone_number?: string
  }>
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  status: string
  language: string
  is_approved?: boolean
  meta_template_id?: string
  components?: TemplateComponent[]
  updated_at?: string
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
  const [syncingTemplates, setSyncingTemplates] = useState(false)
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null)
  
  // Modals
  const [showTestModal, setShowTestModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showAutomationModal, setShowAutomationModal] = useState(false)
  
  // Form states
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en',
    headerType: 'none',
    headerText: '',
    headerExample: '',
    bodyText: '',
    bodyExamples: [''],
    footerText: '',
    buttonType: 'none',
    buttonText: '',
    buttonUrl: '',
    buttonPhone: '',
    allowCategoryChange: false
  })
  const [newAutomation, setNewAutomation] = useState({ name: '', trigger: '', action: '', template: '' })

  const getApiBase = () => {
    // Always use production URL - no environment variables
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
        return `${window.location.protocol}//${window.location.host}/api`
      }
    }
    return 'https://thenefol.com/api'
  }
  const apiBase = getApiBase()

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
        const configData = data?.data ?? data
        if (configData) setConfig(configData)
      }

      // Load templates
      const templatesRes = await fetch(`${apiBase}/api/whatsapp-chat/templates`)
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        const templatesData = data?.data ?? data
        setTemplates(Array.isArray(templatesData) ? templatesData : [])
      }

      // Load automations
      const automationsRes = await fetch(`${apiBase}/api/whatsapp-chat/automations`)
      if (automationsRes.ok) {
        const data = await automationsRes.json()
        const automationsData = data?.data ?? data
        setAutomations(Array.isArray(automationsData) ? automationsData : [])
      }

      // Load sessions
      const sessionsRes = await fetch(`${apiBase}/api/whatsapp-chat/sessions`)
      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        const sessionData = data?.data ?? data
        setSessions(Array.isArray(sessionData) ? sessionData : [])
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

  const syncTemplates = async () => {
    try {
      setSyncingTemplates(true)
      const response = await fetch(`${apiBase}/api/whatsapp/templates/sync`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to sync templates')
      }
      const templatesData = data?.data ?? data
      setTemplates(Array.isArray(templatesData) ? templatesData : [])
      alert('✅ Templates synced from Meta successfully.')
    } catch (error: any) {
      console.error('Sync templates failed:', error)
      alert(`❌ ${error?.message || 'Failed to sync templates.'}`)
    } finally {
      setSyncingTemplates(false)
    }
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
    if (!newTemplate.name || !newTemplate.bodyText.trim()) {
      alert('Please provide template name and body text.')
      return
    }

    const hasPlaceholders = newTemplate.bodyText.match(/{{\d+}}/g)
    if (hasPlaceholders && newTemplate.bodyExamples.filter(Boolean).length === 0) {
      alert('Please provide example values for all placeholders in the body.')
      return
    }

    const components = buildTemplateComponents()
    if (!components.length) {
      alert('A template must contain at least a BODY component.')
      return
    }

    try {
      const payload = {
        name: newTemplate.name,
        category: newTemplate.category,
        language: newTemplate.language,
        components,
        allow_category_change: newTemplate.allowCategoryChange
      }

      const response = await fetch(`${apiBase}/api/whatsapp/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (response.ok) {
        alert('✅ Template submitted to Meta! It may take a few minutes to get approved.')
        setShowTemplateModal(false)
        setNewTemplate({
          name: '',
          category: 'UTILITY',
          language: 'en',
          headerType: 'none',
          headerText: '',
          headerExample: '',
          bodyText: '',
          bodyExamples: [''],
          footerText: '',
          buttonType: 'none',
          buttonText: '',
          buttonUrl: '',
          buttonPhone: '',
          allowCategoryChange: false
        })
        const templatesData = data?.data ?? data
        if (templatesData) {
          loadAllData()
        }
      } else {
        alert(`❌ Failed: ${data?.error || 'Unable to create template'}`)
      }
    } catch (error) {
      console.error('create template', error)
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

  const buildTemplateComponents = (): TemplateComponent[] => {
    const components: TemplateComponent[] = []
    if (newTemplate.headerType === 'text' && newTemplate.headerText.trim()) {
      const headerComponent: TemplateComponent = {
        type: 'HEADER',
        format: 'TEXT',
        text: newTemplate.headerText.trim()
      }
      if (newTemplate.headerExample.trim()) {
        headerComponent.example = {
          header_text: [[newTemplate.headerExample.trim()]]
        }
      }
      components.push(headerComponent)
    }

    if (newTemplate.bodyText.trim()) {
      const bodyComponent: TemplateComponent = {
        type: 'BODY',
        text: newTemplate.bodyText.trim()
      }
      const exampleValues = newTemplate.bodyExamples.map((item) => item.trim()).filter(Boolean)
      if (exampleValues.length) {
        bodyComponent.example = { body_text: [exampleValues] }
      }
      components.push(bodyComponent)
    }

    if (newTemplate.footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: newTemplate.footerText.trim()
      })
    }

    if (newTemplate.buttonType !== 'none' && newTemplate.buttonText.trim()) {
      const buttons: any[] = []
      if (newTemplate.buttonType === 'quick_reply') {
        buttons.push({ type: 'QUICK_REPLY', text: newTemplate.buttonText.trim() })
      } else if (newTemplate.buttonType === 'url' && newTemplate.buttonUrl.trim()) {
        const urlValue = newTemplate.buttonUrl.trim().startsWith('http')
          ? newTemplate.buttonUrl.trim()
          : `https://${newTemplate.buttonUrl.trim()}`
        buttons.push({ type: 'URL', text: newTemplate.buttonText.trim(), url: urlValue })
      } else if (newTemplate.buttonType === 'phone' && newTemplate.buttonPhone.trim()) {
        buttons.push({ type: 'PHONE_NUMBER', text: newTemplate.buttonText.trim(), phone_number: newTemplate.buttonPhone.trim() })
      }
      if (buttons.length) {
        components.push({
          type: 'BUTTONS',
          buttons
        })
      }
    }

    return components
  }

  const updateBodyExample = (index: number, value: string) => {
    setNewTemplate((prev) => {
      const next = [...prev.bodyExamples]
      next[index] = value
      return { ...prev, bodyExamples: next }
    })
  }

  const addBodyExample = () => {
    setNewTemplate((prev) => ({ ...prev, bodyExamples: [...prev.bodyExamples, ''] }))
  }

  const removeBodyExample = (index: number) => {
    setNewTemplate((prev) => {
      const next = prev.bodyExamples.filter((_, i) => i !== index)
      return { ...prev, bodyExamples: next.length ? next : [''] }
    })
  }

  const deleteTemplate = async (template: Template) => {
    if (!template.id) return
    if (!confirm(`Delete template "${template.name}"? This will also delete it on Meta.`)) return
    try {
      const response = await fetch(`${apiBase}/api/whatsapp/templates/${template.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete template')
      }
      setTemplates((prev) => prev.filter((t) => t.id !== template.id))
      alert('✅ Template deleted')
    } catch (error: any) {
      alert(`❌ ${error?.message || 'Failed to delete template'}`)
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Message Templates</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            View Meta-approved templates or submit new ones for review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={syncTemplates}
            disabled={syncingTemplates}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-2 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncingTemplates ? 'animate-spin' : ''}`} />
            <span>{syncingTemplates ? 'Syncing…' : 'Sync from Meta'}</span>
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No templates yet. Sync or create your first template!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{template.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full uppercase ${
                      template.status?.toLowerCase() === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : template.status?.toLowerCase() === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {template.status || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {template.category} • {template.language?.replace('_', '-')}
                    {template.meta_template_id && (
                      <span className="ml-2 text-slate-400">ID: {template.meta_template_id}</span>
                    )}
                  </p>
                  {template.updated_at && (
                    <p className="text-xs text-slate-400">
                      Updated {new Date(template.updated_at).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                    {template.content?.length > 120 ? `${template.content.slice(0, 120)}…` : template.content}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewTemplate(template)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => deleteTemplate(template)}
                    className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Preview Modal */}
      {viewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{viewTemplate.name}</h2>
                <p className="text-xs text-slate-500">
                  {viewTemplate.category} • {viewTemplate.language} • Status: {viewTemplate.status}
                </p>
              </div>
              <button onClick={() => setViewTemplate(null)}>
                <XCircle className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              {(viewTemplate.components || []).map((component, index) => (
                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {component.type}
                  </h4>
                  {component.text && <p className="mt-2 text-slate-800 whitespace-pre-wrap">{component.text}</p>}
                  {component.buttons && component.buttons.length > 0 && (
                    <ul className="mt-2 text-sm list-disc list-inside text-slate-600">
                      {component.buttons.map((btn, idx) => (
                        <li key={idx}>
                          {btn.type}: {btn.text} {btn.url || btn.phone_number || ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <pre className="bg-slate-100 dark:bg-slate-900 text-xs p-3 rounded-lg overflow-auto">
                {JSON.stringify(viewTemplate.components ?? viewTemplate.content, null, 2)}
              </pre>
            </div>
          </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create WhatsApp Template</h2>
                <p className="text-sm text-slate-500">
                  Name must be lowercase with underscores. Body supports placeholders like {'{{1}}'}.
                </p>
              </div>
              <button onClick={() => setShowTemplateModal(false)}>
                <XCircle className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  placeholder="welcome_message"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  value={newTemplate.language}
                  onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="en">English</option>
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                  <option value="MARKETING">Marketing</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="allowCategoryChange"
                  type="checkbox"
                  checked={newTemplate.allowCategoryChange}
                  onChange={(e) => setNewTemplate({ ...newTemplate, allowCategoryChange: e.target.checked })}
                />
                <label htmlFor="allowCategoryChange" className="text-sm text-slate-600">Allow Meta to change category</label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Header</label>
                <select
                  value={newTemplate.headerType}
                  onChange={(e) => setNewTemplate({ ...newTemplate, headerType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg mb-2"
                >
                  <option value="none">No Header</option>
                  <option value="text">Text Header</option>
                </select>
                {newTemplate.headerType === 'text' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTemplate.headerText}
                      onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })}
                      placeholder="Header text"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      value={newTemplate.headerExample}
                      onChange={(e) => setNewTemplate({ ...newTemplate, headerExample: e.target.value })}
                      placeholder="Example value (for {{1}})"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Body (required)</label>
                <textarea
                  value={newTemplate.bodyText}
                  onChange={(e) => setNewTemplate({ ...newTemplate, bodyText: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Hello {{1}}, your order {{2}} has been packed."
                />
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Example values for placeholders</span>
                    <button
                      type="button"
                      onClick={addBodyExample}
                      className="text-xs text-blue-600 underline"
                    >
                      Add example
                    </button>
                  </div>
                  {newTemplate.bodyExamples.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateBodyExample(index, e.target.value)}
                        placeholder={`Value for {{${index + 1}}}`}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                      {newTemplate.bodyExamples.length > 1 && (
                        <button type="button" onClick={() => removeBodyExample(index)} className="text-red-500 text-xs">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Footer (optional)</label>
                <input
                  type="text"
                  value={newTemplate.footerText}
                  onChange={(e) => setNewTemplate({ ...newTemplate, footerText: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Powered by Nefol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Button</label>
                <select
                  value={newTemplate.buttonType}
                  onChange={(e) => setNewTemplate({ ...newTemplate, buttonType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg mb-2"
                >
                  <option value="none">No Button</option>
                  <option value="quick_reply">Quick Reply</option>
                  <option value="url">Website URL</option>
                  <option value="phone">Call Phone Number</option>
                </select>
                {newTemplate.buttonType !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newTemplate.buttonText}
                      onChange={(e) => setNewTemplate({ ...newTemplate, buttonText: e.target.value })}
                      placeholder="Button text"
                      className="px-3 py-2 border rounded-lg"
                    />
                    {newTemplate.buttonType === 'url' && (
                      <input
                        type="text"
                        value={newTemplate.buttonUrl}
                        onChange={(e) => setNewTemplate({ ...newTemplate, buttonUrl: e.target.value })}
                        placeholder="https://example.com"
                        className="px-3 py-2 border rounded-lg"
                      />
                    )}
                    {newTemplate.buttonType === 'phone' && (
                      <input
                        type="text"
                        value={newTemplate.buttonPhone}
                        onChange={(e) => setNewTemplate({ ...newTemplate, buttonPhone: e.target.value })}
                        placeholder="917355384939"
                        className="px-3 py-2 border rounded-lg"
                      />
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={createTemplate}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
              >
                Submit to Meta for approval
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

