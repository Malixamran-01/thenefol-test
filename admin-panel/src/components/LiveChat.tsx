import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Search, MoreVertical, Phone, Video, Image as ImageIcon, Smile, Mic, Paperclip } from 'lucide-react'
import apiService from '../services/api'
import { socketService } from '../services/socket'

interface ChatMessage {
  id: string
  sender: 'customer' | 'agent'
  senderName: string
  message: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'voice' | 'emoji'
  isRead: boolean
  attachments?: string[]
  isTyping?: boolean
}

interface ChatSession {
  id: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  status: 'active' | 'waiting' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedAgent?: string
  lastMessage: string
  lastMessageTime: string
  messageCount: number
  tags: string[]
  notes: string
  customerLocation?: string
  deviceInfo?: string
  referrer?: string
}

export default function LiveChat() {
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChatData()
  }, [])

  const loadChatData = async () => {
    try {
      setLoading(true)
      setError('')
      const sessionsData = await apiService.getLiveChatSessions().catch(() => [])
      // Normalize API (snake_case -> camelCase) and ensure name/email fallbacks
      const normalized = Array.isArray(sessionsData) ? sessionsData.map((s: any) => ({
        id: String(s.id),
        customerName: s.customerName || s.customer_name || s.customerEmail || s.customer_email || 'User',
        customerEmail: s.customerEmail || s.customer_email || '',
        customerPhone: s.customerPhone || s.customer_phone,
        status: s.status || 'active',
        priority: s.priority || 'low',
        assignedAgent: s.assignedAgent || s.assigned_agent,
        lastMessage: s.lastMessage || s.last_message || '',
        lastMessageTime: s.lastMessageTime || s.last_message_time || '',
        messageCount: Number(s.messageCount ?? s.message_count ?? 0),
        tags: s.tags || [],
        notes: s.notes || '',
        customerLocation: s.customerLocation || s.customer_location,
        deviceInfo: s.deviceInfo || s.device_info,
        referrer: s.referrer
      })) : []

      if (normalized.length > 0) {
        setActiveSessions(normalized)
        if (!currentSession) {
          setCurrentSession(normalized[0])
        }
      } else {
        setActiveSessions([])
        setCurrentSession(null)
      }
      
      setMessages([])
    } catch (err) {
      console.error('Failed to load chat data:', err)
      setError('Failed to load chat data')
      setActiveSessions([])
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  // Load messages when session changes and subscribe to socket events
  useEffect(() => {
    let unsubscribeMsg: (() => void) | undefined
    let unsubscribeTyping: (() => void) | undefined
    const joinAndFetch = async () => {
      if (!currentSession) {
        setMessages([])
        return
      }
      socketService.emit('live-chat:join-session', { sessionId: currentSession.id })
      try {
        const data = await apiService.getLiveChatMessages(currentSession.id)
        const mapped: ChatMessage[] = Array.isArray(data) ? data.map((m: any) => ({
          id: String(m.id),
          sender: m.sender,
          senderName: m.sender_name || '',
          message: m.message,
          timestamp: m.created_at,
          type: m.type || 'text',
          isRead: !!m.is_read
        })) : []
        const uniqueById = Array.from(new Map(mapped.map(m => [m.id, m])).values())
        setMessages(uniqueById)
      } catch (e) {
        console.error('Failed to load messages', e)
        setMessages([])
      }
      unsubscribeMsg = socketService.subscribe('live-chat:message', (data: any) => {
        if (data?.session_id?.toString() === currentSession.id.toString()) {
          const incoming: ChatMessage = {
            id: String(data.id),
            sender: data.sender,
            senderName: data.sender_name || '',
            message: data.message,
            timestamp: data.created_at,
            type: data.type || 'text',
            isRead: !!data.is_read
          }
          setMessages(prev => {
            if (prev.some(m => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        }
      })
      unsubscribeTyping = socketService.subscribe('live-chat:typing', (data: any) => {
        if (data?.sessionId?.toString() === currentSession.id.toString()) {
          setIsTyping(!!data.isTyping && data.sender === 'customer')
        }
      })
    }
    joinAndFetch()
    return () => {
      if (unsubscribeMsg) unsubscribeMsg()
      if (unsubscribeTyping) unsubscribeTyping()
    }
  }, [currentSession])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!currentSession) return
    const text = newMessage.trim()
    if (!text) return
    try {
      await apiService.sendLiveChatMessage({
        sessionId: currentSession.id,
        sender: 'agent',
        senderName: 'Admin Agent',
        message: text,
        type: 'text'
      })
      setNewMessage('')
      socketService.emit('live-chat:typing', { sessionId: currentSession.id, sender: 'agent', isTyping: false })
    } catch (e) {
      console.error('Failed to send message', e)
    }
  }

  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSession(session)
    setNewMessage('')
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true)
      if (currentSession) {
        socketService.emit('live-chat:typing', { sessionId: currentSession.id, sender: 'agent', isTyping: true })
      }
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false)
      if (currentSession) {
        socketService.emit('live-chat:typing', { sessionId: currentSession.id, sender: 'agent', isTyping: false })
      }
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 1) return 'Just now'
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return date.toLocaleDateString()
    } catch {
      return timestamp
    }
  }

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timestamp
    }
  }

  const filteredSessions = activeSessions.filter(session => {
    const name = (session.customerName || '').toLowerCase()
    const email = (session.customerEmail || '').toLowerCase()
    const q = (searchQuery || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading live chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-slate-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - User List (WhatsApp style) */}
        <div className="w-1/3 border-r border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-green-600 dark:bg-green-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-white">Chats</h1>
              <button
                onClick={loadChatData}
                className="text-white hover:text-gray-200 transition-colors"
                title="Refresh"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No chat sessions found</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionSelect(session)}
                  className={`p-4 border-b border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                    currentSession?.id === session.id ? 'bg-gray-100 dark:bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {((session.customerName || session.customerEmail || 'U').charAt(0) || 'U').toUpperCase()}
                      </span>
                    </div>
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {session.customerName || session.customerEmail || 'User'}
                        </h3>
                        {session.lastMessageTime && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(session.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {session.customerEmail && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                          {session.customerEmail}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {session.lastMessage || 'No messages yet'}
                      </p>
                      {session.status === 'active' && (
                        <span className="inline-block mt-1 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Messages */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900">
          {currentSession ? (
            <>
              {/* Chat Header */}
              <div className="bg-green-600 dark:bg-green-700 px-4 py-3 flex items-center justify-between border-b border-green-700 dark:border-green-800">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold">
                      {((currentSession.customerName || currentSession.customerEmail || 'U').charAt(0) || 'U').toUpperCase()}
                    </span>
                  </div>
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {currentSession.customerName || currentSession.customerEmail || 'User'}
                    </h3>
                    {currentSession.customerEmail && (
                      <p className="text-sm text-green-100 truncate">
                        {currentSession.customerEmail}
                      </p>
                    )}
                  </div>
                </div>
                {/* Actions removed as requested */}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#ECE5DD] dark:bg-slate-800">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={`${message.id}-${message.timestamp || ''}`}
                        className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                          message.sender === 'customer'
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                            : 'bg-green-500 text-white'
                        }`}>
                          {message.sender === 'customer' && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            message.sender === 'customer'
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-green-50'
                          }`}>
                            <span className="text-xs">
                              {formatMessageTime(message.timestamp)}
                            </span>
                            {message.sender === 'agent' && message.isRead && (
                              <span className="text-xs">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-700 px-3 py-2 rounded-lg shadow-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-gray-100 dark:bg-slate-800 px-4 py-3 border-t border-gray-300 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message"
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 rounded-full text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {newMessage.trim() ? (
                    <button
                      onClick={handleSendMessage}
                      className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  ) : (
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="h-20 w-20 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a chat to start messaging</p>
                <p className="text-sm mt-2">Choose a conversation from the left panel</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
