import React, { useState, useEffect } from 'react'
import { MessageCircle, Users, Send, BarChart3, Calendar, Target, Eye, MousePointer, Clock, TrendingUp, Filter, Plus, Phone, Video, FileText, Image, Smile, CheckCircle, XCircle } from 'lucide-react'
import apiService from '../services/api'

interface ChatMessage {
  id: string
  sender: 'customer' | 'agent'
  senderName: string
  message: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'voice'
  isRead: boolean
  attachments?: string[]
}

interface ChatSession {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  status: 'active' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedAgent?: string
  lastMessage: string
  lastMessageTime: string
  messageCount: number
  tags: string[]
  notes: string
}

interface WhatsAppTemplate {
  id: string
  name: string
  category: string
  content: string
  variables: string[]
  isApproved: boolean
}

interface WhatsAppAutomation {
  id: string
  name: string
  trigger: string
  condition: string
  action: string
  isActive: boolean
  messagesSent: number
  responseRate: number
}

export default function WhatsAppChat() {
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [automations, setAutomations] = useState<WhatsAppAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAutomations, setShowAutomations] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showCreateAutomation, setShowCreateAutomation] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendResult, setSendResult] = useState<any>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')
  const [newTemplateCategory, setNewTemplateCategory] = useState('Custom')
  const [newTemplateScheduledDate, setNewTemplateScheduledDate] = useState('')
  const [newTemplateScheduledTime, setNewTemplateScheduledTime] = useState('')
  const [newTemplateIsScheduled, setNewTemplateIsScheduled] = useState(false)
  const [newAutoName, setNewAutoName] = useState('')
  const [newAutoTrigger, setNewAutoTrigger] = useState('')
  const [newAutoScheduledDate, setNewAutoScheduledDate] = useState('')
  const [newAutoScheduledTime, setNewAutoScheduledTime] = useState('')
  const [newAutoIsScheduled, setNewAutoIsScheduled] = useState(false)

  useEffect(() => {
    loadWhatsAppData()
  }, [])

  const loadWhatsAppData = async () => {
    try {
      setLoading(true)
      setError('')
      const [sessionsData, templatesData, automationsData] = await Promise.all([
        apiService.getWhatsAppChats().catch(() => [] as ChatSession[]),
        apiService.getWhatsAppTemplates().catch(() => [] as WhatsAppTemplate[]),
        apiService.getWhatsAppAutomations().catch(() => [] as WhatsAppAutomation[])
      ])
      
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : []
      setActiveSessions(sessionsArray)
      setTemplates(Array.isArray(templatesData) ? templatesData : [])
      setAutomations(Array.isArray(automationsData) ? automationsData : [])
      
      if (sessionsArray && sessionsArray.length > 0) {
        setCurrentSession(sessionsArray[0])
      }
    } catch (err) {
      console.error('Failed to load WhatsApp data:', err)
      setError('Failed to load WhatsApp data')
    } finally {
      setLoading(false)
    }
  }

  const totalStats = {
    totalSessions: activeSessions.length,
    activeSessions: activeSessions.filter(s => s.status === 'active').length,
    waitingSessions: activeSessions.filter(s => s.status === 'waiting').length,
    resolvedSessions: activeSessions.filter(s => s.status === 'resolved').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'waiting': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'resolved': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'closed': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message via WhatsApp API
      console.log('Sending message:', newMessage)
      setNewMessage('')
    }
  }

  const handleTestSendMessage = async () => {
    if (!testPhoneNumber.trim() || !testMessage.trim()) {
      alert('Please enter both phone number and message')
      return
    }

    setSendingMessage(true)
    setSendResult(null)

    try {
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
      
      const response = await fetch(`${apiBase}/api/whatsapp-chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testPhoneNumber,
          message: testMessage
        })
      })

      const data = await response.json()
      setSendResult(data)

      if (response.ok) {
        alert('✅ Message sent successfully!')
        setTestPhoneNumber('')
        setTestMessage('')
      } else {
        alert(`❌ Failed to send message: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      setSendResult({ error: 'Network error: ' + (error as Error).message })
      alert('❌ Network error occurred')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      alert('Please enter template name and content')
      return
    }

    try {
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
      
      const requestBody: any = {
        name: newTemplateName,
        content: newTemplateContent,
        category: newTemplateCategory
      }

      if (newTemplateIsScheduled) {
        requestBody.scheduled_date = newTemplateScheduledDate
        requestBody.scheduled_time = newTemplateScheduledTime
        requestBody.is_scheduled = true
      }

      const response = await fetch(`${apiBase}/api/whatsapp/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Template created successfully!')
        setShowCreateTemplate(false)
        setNewTemplateName('')
        setNewTemplateContent('')
        setNewTemplateCategory('Custom')
        setNewTemplateScheduledDate('')
        setNewTemplateScheduledTime('')
        setNewTemplateIsScheduled(false)
        loadWhatsAppData() // Reload templates
      } else {
        alert(`❌ Failed to create template: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('❌ Network error occurred')
    }
  }

  const handleCreateAutomation = async () => {
    if (!newAutoName.trim() || !newAutoTrigger.trim()) {
      alert('Please enter automation name and trigger')
      return
    }

    try {
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
      
      const requestBody: any = {
        name: newAutoName,
        trigger: newAutoTrigger,
        action: 'Send WhatsApp Message'
      }

      if (newAutoIsScheduled) {
        requestBody.scheduled_date = newAutoScheduledDate
        requestBody.scheduled_time = newAutoScheduledTime
        requestBody.is_scheduled = true
      }

      const response = await fetch(`${apiBase}/api/whatsapp/automations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Automation created successfully!')
        setShowCreateAutomation(false)
        setNewAutoName('')
        setNewAutoTrigger('')
        setNewAutoScheduledDate('')
        setNewAutoScheduledTime('')
        setNewAutoIsScheduled(false)
        loadWhatsAppData() // Reload automations
      } else {
        alert(`❌ Failed to create automation: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to create automation:', error)
      alert('❌ Network error occurred')
    }
  }

  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSession(session)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading WhatsApp data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={loadWhatsAppData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            WhatsApp Chat Support
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage customer conversations and provide instant support
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Test WhatsApp</span>
          </button>
          <button
            onClick={loadWhatsAppData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setShowAutomations(true)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Automations</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Sessions</h3>
              <p className="text-3xl font-bold">{totalStats.totalSessions}</p>
            </div>
            <MessageCircle className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active</h3>
              <p className="text-3xl font-bold">{totalStats.activeSessions}</p>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Waiting</h3>
              <p className="text-3xl font-bold">{totalStats.waitingSessions}</p>
            </div>
            <Clock className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Resolved</h3>
              <p className="text-3xl font-bold">{totalStats.resolvedSessions}</p>
            </div>
            <CheckCircle className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Chat Sessions
            </h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {activeSessions.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No chat sessions available</p>
              </div>
            ) : (
              activeSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionSelect(session)}
                className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${
                  currentSession?.id === session.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {session.customerName}
                  </h3>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(session.priority)}`}>
                      {session.priority}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  {session.customerPhone}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 truncate">
                  {session.lastMessage}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {session.lastMessageTime}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {session.messageCount} messages
                  </span>
                </div>
                {session.assignedAgent && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Assigned to: {session.assignedAgent}
                  </p>
                )}
              </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col">
          {currentSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {currentSession.customerName}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {currentSession.customerPhone}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {currentSession.tags && currentSession.tags.length > 0 && (
                  <div className="flex space-x-2 mt-2">
                    {currentSession.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto max-h-96">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'customer'
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'customer'
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-blue-100'
                        }`}>
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex space-x-2">
                  <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <Image className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <FileText className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <Smile className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Select a chat session to start conversation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Templates */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            WhatsApp Templates
          </h2>
          <button 
            onClick={() => setShowCreateTemplate(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Create Template
          </button>
        </div>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No templates available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
            <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {template.name}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  template.isApproved 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {template.isApproved ? 'Approved' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {template.category}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                {template.content}
              </p>
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                  Use Template
                </button>
                <button className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* WhatsApp Automations */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            WhatsApp Automations
          </h2>
          <button 
            onClick={() => setShowCreateAutomation(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Automation
          </button>
        </div>
        {automations.length === 0 ? (
          <div className="text-center py-8">
            <Plus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No automations available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => (
            <div key={automation.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {automation.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    automation.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {automation.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Edit
                  </button>
                  <button className={`px-3 py-1 text-sm rounded transition-colors ${
                    automation.isActive
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}>
                    {automation.isActive ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Trigger:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{automation.trigger}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Condition:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{automation.condition}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Action:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{automation.action}</p>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex space-x-4">
                  <span className="text-slate-600 dark:text-slate-400">
                    Messages Sent: <span className="font-semibold">{automation.messagesSent}</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Response Rate: <span className="font-semibold text-green-600">{automation.responseRate}%</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* WhatsApp Best Practices */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">WhatsApp Business Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Quick Response</h3>
            <p className="text-sm opacity-90">
              Respond to customer messages within 24 hours to maintain good business rating.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Use Templates</h3>
            <p className="text-sm opacity-90">
              Create approved templates for common messages to ensure consistency and compliance.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Personal Touch</h3>
            <p className="text-sm opacity-90">
              Use customer names and personalize messages to create better engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create WhatsApp Template</h2>
              <button onClick={() => setShowCreateTemplate(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Welcome Message"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Template Content</label>
                <textarea
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="Enter your template message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="Custom">Custom</option>
                  <option value="Welcome">Welcome</option>
                  <option value="Promotional">Promotional</option>
                  <option value="Transactional">Transactional</option>
                  <option value="Reminder">Reminder</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="scheduleTemplate"
                  checked={newTemplateIsScheduled}
                  onChange={(e) => setNewTemplateIsScheduled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="scheduleTemplate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Schedule this template
                </label>
              </div>

              {newTemplateIsScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Scheduled Date</label>
                    <input
                      type="date"
                      value={newTemplateScheduledDate}
                      onChange={(e) => setNewTemplateScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Scheduled Time</label>
                    <input
                      type="time"
                      value={newTemplateScheduledTime}
                      onChange={(e) => setNewTemplateScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateTemplate}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Create Template
                </button>
                <button
                  onClick={() => setShowCreateTemplate(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Automation Modal */}
      {showCreateAutomation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create WhatsApp Automation</h2>
              <button onClick={() => setShowCreateAutomation(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Automation Name</label>
                <input
                  type="text"
                  value={newAutoName}
                  onChange={(e) => setNewAutoName(e.target.value)}
                  placeholder="e.g., Order Confirmation"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trigger</label>
                <input
                  type="text"
                  value={newAutoTrigger}
                  onChange={(e) => setNewAutoTrigger(e.target.value)}
                  placeholder="e.g., When order is placed"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="scheduleAutomation"
                  checked={newAutoIsScheduled}
                  onChange={(e) => setNewAutoIsScheduled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="scheduleAutomation" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Schedule this automation
                </label>
              </div>

              {newAutoIsScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Scheduled Date</label>
                    <input
                      type="date"
                      value={newAutoScheduledDate}
                      onChange={(e) => setNewAutoScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Scheduled Time</label>
                    <input
                      type="time"
                      value={newAutoScheduledTime}
                      onChange={(e) => setNewAutoScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateAutomation}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Create Automation
                </button>
                <button
                  onClick={() => setShowCreateAutomation(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test WhatsApp Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Test WhatsApp Message
              </h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone Number (with country code)
                </label>
                <input
                  type="text"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="917355384939"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Include country code (e.g., 91 for India, 1 for USA)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter your test message here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              {sendResult && (
                <div className={`p-3 rounded-lg ${
                  sendResult.success 
                    ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  <pre className="text-xs overflow-auto">{JSON.stringify(sendResult, null, 2)}</pre>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleTestSendMessage}
                  disabled={sendingMessage}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 flex items-center justify-center space-x-2"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowTestModal(false)
                    setSendResult(null)
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
