import React, { useState, useEffect } from 'react'
import { 
  Mail, Phone, User, MessageSquare, Calendar, Search, Filter,
  CheckCircle, XCircle, Clock, Trash2, Eye, Download
} from 'lucide-react'
import apiService from '../services/api'

interface ContactMessage {
  id: number
  name: string
  email: string
  phone?: string
  message: string
  status: 'unread' | 'read' | 'replied' | 'archived'
  created_at: string
  updated_at: string
}

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchMessages()
    
    // Listen for real-time updates
    const socket = (window as any).socketService
    if (socket) {
      socket.subscribe('contact_message_created', (data: ContactMessage) => {
        setMessages(prev => [data, ...prev])
      })
      
      socket.subscribe('contact_message_updated', (data: ContactMessage) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.id ? data : msg
        ))
      })
    }
    
    return () => {
      if (socket) {
        socket.unsubscribe('contact_message_created')
        socket.unsubscribe('contact_message_updated')
      }
    }
  }, [])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const data = await apiService.getContactMessages() as ContactMessage[]
      setMessages(data || [])
    } catch (error) {
      console.error('Failed to fetch contact messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMessageStatus = async (id: number, status: string) => {
    try {
      await apiService.updateContactMessageStatus(id, status)
      setMessages(prev => prev.map(msg => 
        msg.id === id ? { ...msg, status: status as any } : msg
      ))
    } catch (error) {
      console.error('Failed to update message status:', error)
    }
  }

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const unreadCount = messages.filter(msg => msg.status === 'unread').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-100 text-blue-800'
      case 'read':
        return 'bg-gray-100 text-gray-800'
      case 'replied':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Contact Messages
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage and respond to customer inquiries
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              {unreadCount} new messages
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {messages.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Unread</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {unreadCount}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Replied</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {messages.filter(msg => msg.status === 'replied').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Read</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {messages.filter(msg => msg.status === 'read').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading messages...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 text-center shadow">
          <Mail className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No messages found
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No contact messages yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {message.name}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{message.email}</span>
                        </div>
                        {message.phone && (
                          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                            <Phone className="w-4 h-4" />
                            <span>{message.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900 dark:text-slate-100 max-w-md truncate">
                          {message.message}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(message.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {message.status === 'unread' && (
                          <button
                            onClick={() => updateMessageStatus(message.id, 'read')}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {message.status !== 'replied' && (
                          <button
                            onClick={() => updateMessageStatus(message.id, 'replied')}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                            title="Mark as replied"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => updateMessageStatus(message.id, 'archived')}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded"
                          title="Archive"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

