import React, { useState, useEffect } from 'react'
import { Settings, Key, Code, Database, Mail, MessageSquare, Bell, ShoppingCart, CreditCard, Globe, Smartphone, Shield, Save, Eye, EyeOff, Copy, Check, AlertCircle, ExternalLink, Plus, Trash2, Edit2, X } from 'lucide-react'
import { useToast } from './ToastProvider'
import apiService from '../services/api'

interface APIConfig {
  id: string
  name: string
  description: string
  category: 'payment' | 'email' | 'sms' | 'push' | 'analytics' | 'social' | 'shipping' | 'database' | 'ai' | 'other'
  fields: APIField[]
  status: 'active' | 'inactive' | 'testing'
  lastUpdated: string
}

interface APIField {
  id: string
  name: string
  label: string
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'textarea'
  value: string
  placeholder?: string
  required: boolean
  description?: string
  options?: { value: string; label: string }[]
  sensitive: boolean
}

// Icon and color mapping for categories
const categoryIcons: Record<string, React.ComponentType<any>> = {
  payment: CreditCard,
  email: Mail,
  sms: MessageSquare,
  push: Bell,
  analytics: Globe,
  social: Smartphone,
  shipping: ShoppingCart,
  database: Database,
  ai: Shield,
  other: Settings
}

const categoryColors: Record<string, string> = {
  payment: 'bg-green-500',
  email: 'bg-blue-500',
  sms: 'bg-purple-500',
  push: 'bg-orange-500',
  analytics: 'bg-indigo-500',
  social: 'bg-pink-500',
  shipping: 'bg-yellow-500',
  database: 'bg-cyan-500',
  ai: 'bg-emerald-500',
  other: 'bg-gray-500'
}

export default function APICodeManager() {
  const { notify } = useToast()
  const [configs, setConfigs] = useState<APIConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedConfig, setSelectedConfig] = useState<APIConfig | null>(null)
  const [showSensitive, setShowSensitive] = useState<{ [key: string]: boolean }>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [editingConfig, setEditingConfig] = useState<APIConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newConfig, setNewConfig] = useState<Partial<APIConfig>>({
    name: '',
    description: '',
    category: 'other',
    status: 'inactive',
    fields: []
  })

  // Fetch configurations from backend
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAPIConfigurations()
      
      // Backend returns data directly as array or object with data property
      const data = Array.isArray(response) ? response : (response as any)?.data || []
      
      // Transform backend data to match frontend structure
      const transformed = data.map((config: any) => ({
        ...config,
        fields: config.fields || [],
        lastUpdated: config.lastUpdated || config.updated_at || config.created_at || new Date().toISOString()
      }))
      setConfigs(transformed)
    } catch (error: any) {
      console.error('Failed to load API configurations:', error)
      notify('error', error.message || 'Failed to load API configurations')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (config: APIConfig) => {
    try {
      setSaving(config.id)
      const data = {
        id: config.id,
        name: config.name,
        description: config.description,
        category: config.category,
        status: config.status,
        fields: config.fields
      }

      if (config.id && config.id !== 'new') {
        await apiService.updateAPIConfiguration(config.id, data)
        notify('success', `${config.name} updated successfully`)
      } else {
        const result = await apiService.createAPIConfiguration(data) as any
        notify('success', `${config.name} created successfully`)
        if (result.data) {
          setEditingConfig(null)
          setShowAddForm(false)
        }
      }
      
      await loadConfigs()
    } catch (error: any) {
      console.error('Failed to save configuration:', error)
      notify('error', error.message || 'Failed to save configuration')
    } finally {
      setSaving(null)
    }
  }

  const deleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API configuration?')) {
      return
    }

    try {
      await apiService.deleteAPIConfiguration(id)
      notify('success', 'API configuration deleted successfully')
      await loadConfigs()
      if (selectedConfig?.id === id) {
        setSelectedConfig(null)
      }
      if (editingConfig?.id === id) {
        setEditingConfig(null)
      }
    } catch (error: any) {
      console.error('Failed to delete configuration:', error)
      notify('error', error.message || 'Failed to delete configuration')
    }
  }

  const updateFieldValue = (configId: string, fieldId: string, value: string) => {
    setConfigs(prev => prev.map(config => {
      if (config.id === configId) {
        return {
          ...config,
          fields: config.fields.map(field => 
            field.id === fieldId ? { ...field, value } : field
          )
        }
      }
      return config
    }))

    if (editingConfig?.id === configId) {
      setEditingConfig(prev => prev ? {
        ...prev,
        fields: prev.fields.map(field => 
          field.id === fieldId ? { ...field, value } : field
        )
      } : null)
    }
  }

  const updateConfigField = (field: keyof APIConfig, value: any) => {
    if (editingConfig) {
      setEditingConfig({ ...editingConfig, [field]: value })
    }
  }

  const addFieldToNewConfig = () => {
    setNewConfig(prev => ({
      ...prev,
      fields: [
        ...(prev.fields || []),
        {
          id: `field_${Date.now()}`,
          name: '',
          label: '',
          type: 'text',
          value: '',
          required: false,
          sensitive: false
        }
      ]
    }))
  }

  const updateNewConfigField = (fieldId: string, updates: Partial<APIField>) => {
    setNewConfig(prev => ({
      ...prev,
      fields: (prev.fields || []).map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    }))
  }

  const removeFieldFromNewConfig = (fieldId: string) => {
    setNewConfig(prev => ({
      ...prev,
      fields: (prev.fields || []).filter(f => f.id !== fieldId)
    }))
  }

  const createNewConfig = async () => {
    if (!newConfig.name || !newConfig.category) {
      notify('error', 'Name and category are required')
      return
    }

    try {
      setSaving('new')
      const data = {
        name: newConfig.name,
        description: newConfig.description || '',
        category: newConfig.category,
        status: newConfig.status || 'inactive',
        fields: newConfig.fields || []
      }

      await apiService.createAPIConfiguration(data)
      notify('success', `${newConfig.name} created successfully`)
      setShowAddForm(false)
      setNewConfig({
        name: '',
        description: '',
        category: 'other',
        status: 'inactive',
        fields: []
      })
      await loadConfigs()
    } catch (error: any) {
      console.error('Failed to create configuration:', error)
      notify('error', error.message || 'Failed to create configuration')
    } finally {
      setSaving(null)
    }
  }

  const testAPI = async (configId: string, testType: string = 'connection') => {
    try {
      const result = await apiService.testAPIConfiguration(configId, testType) as any
      notify('success', result.message || 'API test completed successfully')
    } catch (error: any) {
      notify('error', error.message || 'API test failed')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      case 'testing': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || Settings
    return <IconComponent className="h-4 w-4" />
  }

  const toggleSensitive = (fieldId: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }))
  }

  const copyToClipboard = async (value: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const tabs = [
    { id: 'overview', label: 'API Overview', icon: Settings },
    { id: 'configs', label: 'Configurations', icon: Key },
    { id: 'test', label: 'Test APIs', icon: Code }
  ]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading API configurations...</p>
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
            API & Code Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage all your API keys, codes, and integration settings
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service</span>
          </button>
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <ExternalLink className="h-4 w-4" />
            <span>Export Config</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total APIs</h3>
              <p className="text-3xl font-bold">{configs.length}</p>
            </div>
            <Settings className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active APIs</h3>
              <p className="text-3xl font-bold">{configs.filter(c => c.status === 'active').length}</p>
            </div>
            <Key className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Testing APIs</h3>
              <p className="text-3xl font-bold">{configs.filter(c => c.status === 'testing').length}</p>
            </div>
            <Code className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Sensitive Keys</h3>
              <p className="text-3xl font-bold">
                {configs.reduce((sum, c) => sum + c.fields.filter(f => f.sensitive).length, 0)}
              </p>
            </div>
            <Shield className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* API Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                API Configurations Overview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map((config) => {
                  const IconComponent = categoryIcons[config.category] || Settings
                  const color = categoryColors[config.category] || 'bg-gray-500'
                  return (
                    <div key={config.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {config.name}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {config.category}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(config.status)}`}>
                          {config.status}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        {config.description}
                      </p>
                      
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Fields:</span>
                          <span className="font-semibold">{config.fields.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Sensitive:</span>
                          <span className="font-semibold text-red-600">
                            {config.fields.filter(f => f.sensitive).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Last Updated:</span>
                          <span className="font-semibold">{new Date(config.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingConfig(config)
                            setSelectedConfig(config)
                          }}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => testAPI(config.id)}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => deleteConfig(config.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 text-sm rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Configurations Tab */}
          {activeTab === 'configs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  API Configuration Management
                </h3>
              </div>
              
              <div className="space-y-6">
                {configs.map((config) => {
                  const IconComponent = categoryIcons[config.category] || Settings
                  const color = categoryColors[config.category] || 'bg-gray-500'
                  const isEditing = editingConfig?.id === config.id
                  const configToDisplay = isEditing ? editingConfig : config
                  
                  return (
                    <div key={config.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={configToDisplay?.name || ''}
                                onChange={(e) => updateConfigField('name', e.target.value)}
                                className="text-lg font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-full"
                              />
                            ) : (
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                {config.name}
                              </h4>
                            )}
                            {isEditing ? (
                              <input
                                type="text"
                                value={configToDisplay?.description || ''}
                                onChange={(e) => updateConfigField('description', e.target.value)}
                                placeholder="Description"
                                className="text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-full mt-1"
                              />
                            ) : (
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {config.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <select
                              value={configToDisplay?.status || 'inactive'}
                              onChange={(e) => updateConfigField('status', e.target.value)}
                              className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="testing">Testing</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(config.status)}`}>
                              {config.status}
                            </span>
                          )}
                          {isEditing ? (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => {
                                  if (configToDisplay) saveConfig(configToDisplay)
                                }}
                                disabled={saving === config.id}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                {saving === config.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingConfig(null)
                                  loadConfigs()
                                }}
                                className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingConfig({ ...config })}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(configToDisplay?.fields || []).map((field) => (
                          <div key={field.id} className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="relative">
                              <input
                                type={field.sensitive && !showSensitive[field.id] ? 'password' : field.type === 'password' ? 'password' : 'text'}
                                value={field.value}
                                onChange={(e) => {
                                  if (isEditing && configToDisplay) {
                                    updateFieldValue(configToDisplay.id, field.id, e.target.value)
                                  }
                                }}
                                disabled={!isEditing}
                                placeholder={field.placeholder}
                                className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20 ${!isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
                              />
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                                {field.sensitive && (
                                  <button
                                    onClick={() => toggleSensitive(field.id)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                  >
                                    {showSensitive[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => copyToClipboard(field.value, field.id)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                  {copiedField === field.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            {field.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {field.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Test APIs Tab */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                API Testing & Validation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {configs.map((config) => {
                  const IconComponent = categoryIcons[config.category] || Settings
                  const color = categoryColors[config.category] || 'bg-gray-500'
                  return (
                    <div key={config.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                            {config.name}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Test API connectivity and authentication
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Connection Test</span>
                          <button
                            onClick={() => testAPI(config.id, 'connection')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Test
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Authentication</span>
                          <button
                            onClick={() => testAPI(config.id, 'authentication')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            Validate
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Rate Limits</span>
                          <button
                            onClick={() => testAPI(config.id, 'rate_limits')}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                          >
                            Check
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add New Service Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Add New API Service
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewConfig({
                    name: '',
                    description: '',
                    category: 'other',
                    status: 'inactive',
                    fields: []
                  })
                }}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={newConfig.name || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    placeholder="e.g., Payment Gateway"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={newConfig.category || 'other'}
                    onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  >
                    <option value="payment">Payment</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push Notifications</option>
                    <option value="analytics">Analytics</option>
                    <option value="social">Social Media</option>
                    <option value="shipping">Shipping</option>
                    <option value="database">Database</option>
                    <option value="ai">AI Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newConfig.description || ''}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  placeholder="Describe what this API service does"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={newConfig.status || 'inactive'}
                  onChange={(e) => setNewConfig({ ...newConfig, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="testing">Testing</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    API Fields
                  </label>
                  <button
                    onClick={addFieldToNewConfig}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Field</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {(newConfig.fields || []).map((field, index) => (
                    <div key={field.id} className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateNewConfigField(field.id, { name: e.target.value })}
                          placeholder="Field name (e.g., api_key)"
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        />
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateNewConfigField(field.id, { label: e.target.value })}
                          placeholder="Field label (e.g., API Key)"
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={field.type}
                          onChange={(e) => updateNewConfigField(field.id, { type: e.target.value as any })}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        >
                          <option value="text">Text</option>
                          <option value="password">Password</option>
                          <option value="url">URL</option>
                          <option value="number">Number</option>
                          <option value="textarea">Textarea</option>
                        </select>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateNewConfigField(field.id, { required: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Required</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.sensitive}
                            onChange={(e) => updateNewConfigField(field.id, { sensitive: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Sensitive</span>
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateNewConfigField(field.id, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        />
                        <button
                          onClick={() => removeFieldFromNewConfig(field.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={createNewConfig}
                  disabled={saving === 'new'}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving === 'new' ? 'Creating...' : 'Create Service'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewConfig({
                      name: '',
                      description: '',
                      category: 'other',
                      status: 'inactive',
                      fields: []
                    })
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Details Modal */}
      {selectedConfig && !showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Configure: {selectedConfig.name}
              </h3>
              <button
                onClick={() => setSelectedConfig(null)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-slate-600 dark:text-slate-400">
                  {selectedConfig.description}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedConfig.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={field.sensitive && !showSensitive[field.id] ? 'password' : field.type === 'password' ? 'password' : 'text'}
                        value={field.value}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                        readOnly
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        {field.sensitive && (
                          <button
                            onClick={() => toggleSensitive(field.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showSensitive[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(field.value, field.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {copiedField === field.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {field.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setEditingConfig(selectedConfig)
                    setSelectedConfig(null)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Configuration
                </button>
                <button
                  onClick={() => testAPI(selectedConfig.id)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Test API
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Manager Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">API Management Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Secure Storage</h3>
            <p className="text-sm opacity-90">
              Store sensitive API keys securely and never expose them in client-side code.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Regular Rotation</h3>
            <p className="text-sm opacity-90">
              Regularly rotate API keys and monitor usage to maintain security.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Test & Monitor</h3>
            <p className="text-sm opacity-90">
              Continuously test API connections and monitor performance metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
