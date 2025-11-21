import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, X, HelpCircle, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { userSocketService } from '../services/socket'
import { useAuth } from '../contexts/AuthContext'

interface LiveChatMessage {
  id: string
  sender: 'customer' | 'agent'
  senderName?: string
  message: string
  timestamp: string
}

export default function LiveChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [input, setInput] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ subject: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high' })
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [lastCustomerMessageTime, setLastCustomerMessageTime] = useState<number | null>(null)
  const [showRaiseRequestButton, setShowRaiseRequestButton] = useState(false)
  const lastCustomerMessageTimeRef = useRef<number | null>(null)
  const raiseRequestTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Initialize or restore session once (even if widget is closed)
  useEffect(() => {
    let cancelled = false
    const initSession = async () => {
      try {
        // Try restore from storage
        const storedId = localStorage.getItem('live_chat_session_id')
        let s = storedId ? { id: storedId } as any : null
        if (!s) {
          // Generate or get persistent guest identifier for anonymous users
          const getOrCreateGuestId = (): string => {
            let guestId = localStorage.getItem('guest_id')
            if (!guestId) {
              // Generate a unique guest identifier: guest_timestamp_randomstring
              const timestamp = Date.now()
              const randomStr = Math.random().toString(36).substring(2, 11) // 9 chars
              guestId = `guest_${timestamp}_${randomStr}`
              localStorage.setItem('guest_id', guestId)
            }
            return guestId
          }
          
          // Prepare session data - ensure at least one identifier is provided
          const sessionData: { userId?: string | number, customerName?: string, customerEmail?: string, customerPhone?: string } = {}
          
          if (user?.id) {
            // Authenticated user: use real user data
            sessionData.userId = user.id.toString()
            sessionData.customerName = user.name
            sessionData.customerEmail = user.email
          } else {
            // Anonymous user: use persistent guest identifier
            const guestId = getOrCreateGuestId()
            sessionData.userId = guestId
            sessionData.customerName = 'Guest User'
          }
          
          s = await api.liveChat.createSession(sessionData)
          localStorage.setItem('live_chat_session_id', String(s.id))
        }
        if (cancelled) return
        setSession(s)
        // Join session room
        userSocketService.emit('live-chat:join-session', { sessionId: s.id })
        // Load existing messages
        const msgs = await api.liveChat.getMessages(s.id)
        if (cancelled) return
        const mapped = Array.isArray(msgs) ? msgs.map((m: any) => ({
          id: String(m.id),
          sender: m.sender,
          senderName: m.sender_name,
          message: m.message,
          timestamp: m.created_at
        })) : []
        const uniqueById = Array.from(new Map(mapped.map((m: any) => [m.id, m])).values())
        setMessages(uniqueById)
        
        // Show welcome message if no messages (only on first open)
        if (uniqueById.length === 0 && open && messages.length === 0) {
          const welcomeMsg = {
            id: 'welcome',
            sender: 'agent' as const,
            senderName: 'NEFOL bot',
            message: 'Hello! I\'m NEFOL bot, here to help you with product information and general questions. How can I assist you today?',
            timestamp: new Date().toISOString()
          }
          setMessages([welcomeMsg])
        }
      } catch (e) {
        console.error('Live chat init failed', e)
      }
    }
    initSession()
    return () => { cancelled = true }
  }, [user?.id, open])

  // Subscribe to socket events when session is ready (even if widget is closed)
  useEffect(() => {
    if (!session?.id) return
    const unsubMsg = userSocketService.subscribe('live-chat:message', (data: any) => {
      if (data?.session_id?.toString() === session.id.toString()) {
        const incoming = {
          id: String(data.id),
          sender: data.sender,
          senderName: data.sender_name,
          message: data.message,
          timestamp: data.created_at
        }
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
        
        // If it's an automated response, clear the raise request timeout
        if (data.sender === 'agent') {
          if (raiseRequestTimeoutRef.current) {
            clearTimeout(raiseRequestTimeoutRef.current)
            raiseRequestTimeoutRef.current = null
          }
          // Reset the customer message time to indicate we got a response
          lastCustomerMessageTimeRef.current = null
        }
      }
    })
    const unsubTyping = userSocketService.subscribe('live-chat:typing', () => {})
    return () => {
      unsubMsg()
      unsubTyping()
    }
  }, [session?.id, lastCustomerMessageTime])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !session) return
    try {
      // Clear input immediately for snappy UX and stop typing
      setInput('')
      setShowRaiseRequestButton(false) // Hide button when new message is sent
      userSocketService.emit('live-chat:typing', { sessionId: session.id, sender: 'customer', isTyping: false })

      // Create on server and append immediately on success
      const created = await api.liveChat.sendMessage({ sessionId: session.id, sender: 'customer', senderName: user?.name, message: text, type: 'text' })
      const newMsg = {
        id: String(created?.id || `temp-${Date.now()}`),
        sender: 'customer' as const,
        senderName: user?.name,
        message: text,
        timestamp: created?.created_at || new Date().toISOString()
      }
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      
      // Track when customer sends message
      const customerMsgTime = Date.now()
      setLastCustomerMessageTime(customerMsgTime)
      lastCustomerMessageTimeRef.current = customerMsgTime
      
      // Clear any existing timeout
      if (raiseRequestTimeoutRef.current) {
        clearTimeout(raiseRequestTimeoutRef.current)
      }
      
      // Show raise request button after 15 seconds if no automated response
      raiseRequestTimeoutRef.current = setTimeout(() => {
        // Check if we still have the same last customer message (no automated response came)
        if (lastCustomerMessageTimeRef.current === customerMsgTime) {
          setShowRaiseRequestButton(true)
        }
      }, 15000)
    } catch (e) {
      console.error('Send failed', e)
      // Restore text on failure
      setInput(text)
    }
  }

  const handleCreateSupportRequest = async () => {
    if (!session || !requestForm.subject.trim() || !requestForm.description.trim()) return
    
    setIsSubmittingRequest(true)
    try {
      await api.liveChat.createSupportRequest({
        sessionId: session.id,
        subject: requestForm.subject,
        description: requestForm.description,
        priority: requestForm.priority
      })
      setShowRequestModal(false)
      setRequestForm({ subject: '', description: '', priority: 'medium' })
      setShowRaiseRequestButton(false)
    } catch (e) {
      console.error('Failed to create support request', e)
      alert('Failed to create support request. Please try again.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 text-white shadow-lg"
        aria-label="Open live chat"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    )
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden z-50">
        <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">Support</span>
            <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">AI Assistant</span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 hover:bg-blue-500 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 h-64 overflow-y-auto space-y-2 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation!</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={`${m.id}-${m.timestamp || ''}`} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
              <div className={`${m.sender === 'customer' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'} px-3 py-2 rounded-lg max-w-[80%]`}>
                {m.sender === 'agent' && m.senderName === 'NEFOL bot' && (
                  <div className="text-xs text-blue-600 mb-1 font-semibold">NEFOL bot</div>
                )}
                <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                <div className={`${m.sender === 'customer' ? 'text-blue-100' : 'text-gray-500'} text-[10px] mt-1`}>
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {showRaiseRequestButton && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-800 font-medium mb-1">Need more help?</p>
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                  >
                    Raise a Request
                  </button>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (session) userSocketService.emit('live-chat:typing', { sessionId: session.id, sender: 'customer', isTyping: e.target.value.length > 0 })
              }}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={sendMessage} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            className="mt-2 w-full text-xs text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <HelpCircle className="h-3 w-3" />
            <span>Raise a Support Request</span>
          </button>
        </div>
      </div>

      {/* Support Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Raise a Support Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={requestForm.subject}
                  onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  placeholder="Please provide details about your issue..."
                  rows={4}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={requestForm.priority}
                  onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSupportRequest}
                disabled={isSubmittingRequest || !requestForm.subject.trim() || !requestForm.description.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


