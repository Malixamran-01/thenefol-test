import React, { useState, useEffect } from 'react'
import { Bot, Sparkles, Brain, Zap, Target, Users, ShoppingCart, TrendingUp, Settings, Play, Pause, RotateCcw } from 'lucide-react'

interface AIFeature {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'learning'
  impact: 'high' | 'medium' | 'low'
  category: 'personalization' | 'recommendations' | 'automation' | 'analytics'
  metrics: {
    accuracy: number
    usage: number
    improvement: number
  }
}

interface AITask {
  id: string
  name: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'pending'
  progress: number
  estimatedTime: string
  results?: any
}

export default function AIBox() {
  const [features, setFeatures] = useState<AIFeature[]>([])
  const [tasks, setTasks] = useState<AITask[]>([])
  const [activeTab, setActiveTab] = useState('features')

  useEffect(() => {
    loadAIData()
  }, [])

  const loadAIData = async () => {
    try {
      const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`
      const [featuresRes, tasksRes] = await Promise.all([
        fetch(`${apiBase}/api/ai/features`),
        fetch(`${apiBase}/api/ai/tasks`)
      ])
      
      if (featuresRes.ok) {
        const featuresData = await featuresRes.json()
        setFeatures(featuresData)
      }
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }
    } catch (error) {
      console.error('Failed to load AI data:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
      case 'learning': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'running': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const tabs = [
    { id: 'features', label: 'AI Features', icon: Bot },
    { id: 'tasks', label: 'AI Tasks', icon: Zap },
    { id: 'insights', label: 'AI Insights', icon: Brain }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            AI Box
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Intelligent automation and AI-powered features for your store
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Enable AI</span>
          </button>
        </div>
      </div>

      {/* AI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active AI Features</h3>
              <p className="text-3xl font-bold">{features.filter(f => f.status === 'active').length}</p>
            </div>
            <Bot className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">AI Accuracy</h3>
              <p className="text-3xl font-bold">
                {features.length > 0 ? (features.reduce((sum, f) => sum + (f.metrics?.accuracy || 0), 0) / features.length).toFixed(1) : '0.0'}%
              </p>
            </div>
            <Target className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Tasks Completed</h3>
              <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'completed').length}</p>
            </div>
            <Zap className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Performance Boost</h3>
              <p className="text-3xl font-bold">
                +{features.length > 0 ? (features.reduce((sum, f) => sum + (f.metrics?.improvement || 0), 0) / features.length).toFixed(1) : '0.0'}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8" />
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
          {/* AI Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature) => (
                  <div key={feature.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {feature.name}
                      </h4>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(feature.status)}`}>
                          {feature.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(feature.impact)}`}>
                          {feature.impact} impact
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {feature.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Accuracy</span>
                        <span className="font-semibold text-green-600">{feature.metrics?.accuracy || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Usage</span>
                        <span className="font-semibold text-blue-600">{feature.metrics?.usage || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Improvement</span>
                        <span className="font-semibold text-purple-600">+{feature.metrics?.improvement || 0}%</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                        Configure
                      </button>
                      <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        {feature.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Tasks
              </h3>
              
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {task.name}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {task.description}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                        <span className="font-semibold">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Estimated Time</span>
                        <span className="font-semibold">{task.estimatedTime}</span>
                      </div>
                    </div>
                    
                    {task.results && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                        <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2">Results</h5>
                        <div className="space-y-1 text-sm">
                          {Object.entries(task.results).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-green-700 dark:text-green-300">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </span>
                              <span className="font-semibold text-green-800 dark:text-green-200">
                                {typeof value === 'number' ? (key.includes('Increase') ? `+${value}%` : value.toLocaleString()) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Insights
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Performance Insights
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">AI Efficiency</span>
                      <span className="font-semibold text-green-600">94.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Cost Reduction</span>
                      <span className="font-semibold text-blue-600">23.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Time Saved</span>
                      <span className="font-semibold text-purple-600">45 hours/week</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Recommendations
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Enable dynamic pricing for skincare products to increase revenue by 15%
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Implement AI chatbot for customer support to reduce response time
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        Use AI for inventory prediction to reduce stockouts by 30%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Box Best Practices */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">AI Box Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Start Small</h3>
            <p className="text-sm opacity-90">
              Begin with simple AI features and gradually expand to more complex automation.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Monitor Performance</h3>
            <p className="text-sm opacity-90">
              Regularly track AI accuracy and performance to ensure optimal results.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Continuous Learning</h3>
            <p className="text-sm opacity-90">
              Allow AI systems to learn from new data and improve over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
