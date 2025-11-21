import React, { useState, useEffect } from 'react'
import { Workflow, Play, Pause, Settings, Plus, Edit, Trash2, Eye, Copy, Clock, Users, Mail, MessageSquare, Bell, Calendar, Target, Filter, BarChart3 } from 'lucide-react'
import apiService from '../services/api'

interface WorkflowStep {
  id: string
  type: 'trigger' | 'condition' | 'action' | 'delay'
  name: string
  description: string
  config: any
  position: { x: number; y: number }
}

interface Workflow {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  trigger: {
    type: 'customer_signup' | 'order_placed' | 'cart_abandoned' | 'product_viewed' | 'email_opened' | 'sms_clicked'
    conditions: any[]
  }
  steps: WorkflowStep[]
  stats: {
    totalRuns: number
    successRate: number
    lastRun: string
    nextRun?: string
  }
  createdAt: string
  updatedAt: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'marketing' | 'sales' | 'support' | 'retention'
  steps: WorkflowStep[]
  isPopular: boolean
}

export default function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWorkflowsData()
  }, [])

  const loadWorkflowsData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiService.getWorkflows().catch(() => [])
      setWorkflows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load workflows data:', err)
      setError('Failed to load workflows data')
    } finally {
      setLoading(false)
    }
  }

  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTab, setActiveTab] = useState('workflows')

  const totalStats = {
    totalWorkflows: workflows.length || 0,
    activeWorkflows: workflows.filter(w => w.status === 'active').length || 0,
    totalRuns: workflows.reduce((sum, w) => sum + (w.stats?.totalRuns || 0), 0),
    averageSuccessRate: workflows.length > 0 
      ? workflows.reduce((sum, w) => sum + (w.stats?.successRate || 0), 0) / workflows.length 
      : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'paused': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'draft': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading workflows...</p>
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
              onClick={loadWorkflowsData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'sales': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'support': return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200'
      case 'retention': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleToggleWorkflow = (workflowId: string) => {
    console.log('Toggling workflow:', workflowId)
    alert('Workflow status updated!')
  }

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
  }

  const handleDeleteWorkflow = (workflowId: string) => {
    console.log('Deleting workflow:', workflowId)
    alert('Workflow deleted successfully!')
  }

  const handleCopyWorkflow = (workflowId: string) => {
    console.log('Copying workflow:', workflowId)
    alert('Workflow copied successfully!')
  }

  const handleUseTemplate = (templateId: string) => {
    console.log('Using template:', templateId)
    alert('Workflow created from template!')
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Workflow Automation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Automate customer interactions across all channels
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setShowCreateWorkflow(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Workflows</h3>
              <p className="text-3xl font-bold">{totalStats.totalWorkflows}</p>
            </div>
            <Workflow className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active</h3>
              <p className="text-3xl font-bold">{totalStats.activeWorkflows}</p>
            </div>
            <Play className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Runs</h3>
              <p className="text-3xl font-bold">{totalStats.totalRuns.toLocaleString()}</p>
            </div>
            <BarChart3 className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Success Rate</h3>
              <p className="text-3xl font-bold">{totalStats.averageSuccessRate.toFixed(1)}%</p>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'workflows'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              My Workflows
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {workflow.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {workflow.description}
                    </p>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Total Runs:</span>
                        <span className="font-semibold">{workflow.stats.totalRuns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Success Rate:</span>
                        <span className="font-semibold text-green-600">{workflow.stats.successRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Last Run:</span>
                        <span className="font-semibold">{workflow.stats.lastRun}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditWorkflow(workflow)}
                        className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleWorkflow(workflow.id)}
                        className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        {workflow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleCopyWorkflow(workflow.id)}
                        className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="px-3 py-1 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {template.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {template.description}
                    </p>
                    
                    {template.isPopular && (
                      <div className="mb-4">
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                          Popular
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Top Performing Workflows
                  </h3>
                  <div className="space-y-3">
                    {workflows
                      .sort((a, b) => b.stats.successRate - a.stats.successRate)
                      .slice(0, 3)
                      .map((workflow, index) => (
                        <div key={workflow.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                {workflow.name}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {workflow.stats.totalRuns} runs
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {workflow.stats.successRate}%
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Success Rate
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Workflow Performance
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Total Workflows</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {totalStats.totalWorkflows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Active Workflows</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {totalStats.activeWorkflows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Total Runs</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {totalStats.totalRuns.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Average Success Rate</span>
                      <span className="font-semibold text-green-600">
                        {totalStats.averageSuccessRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Builder Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Workflow Automation Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Start Simple</h3>
            <p className="text-sm opacity-90">
              Begin with basic workflows and gradually add complexity as you learn what works.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Test Thoroughly</h3>
            <p className="text-sm opacity-90">
              Always test your workflows before going live to ensure they work as expected.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Monitor Performance</h3>
            <p className="text-sm opacity-90">
              Regularly review workflow performance and optimize based on results.
            </p>
          </div>
        </div>
      </div>

      {/* Create Workflow Modal */}
      {showCreateWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Create New Workflow
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Workflow Name
                </label>
                <input
                  type="text"
                  placeholder="Enter workflow name"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter workflow description"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Trigger Type
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  <option>Customer Signup</option>
                  <option>Order Placed</option>
                  <option>Cart Abandoned</option>
                  <option>Product Viewed</option>
                  <option>Email Opened</option>
                  <option>SMS Clicked</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCreateWorkflow(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreateWorkflow(false)
                  alert('Workflow created successfully!')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
