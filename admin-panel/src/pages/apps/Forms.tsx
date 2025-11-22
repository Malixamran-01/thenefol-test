import React, { useState, useEffect } from 'react'

type Form = {
  id: number
  name: string
  type: 'contact' | 'newsletter' | 'feedback' | 'survey'
  submissions: number
  status: 'active' | 'inactive'
  createdAt: string
}

type Submission = {
  form: string
  name: string
  email: string
  message: string
  submittedAt: string
}

export default function Forms() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`

  // Fetch forms and submissions from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        
        const [formsRes, submissionsRes] = await Promise.all([
          fetch(`${apiBase}/api/forms`),
          fetch(`${apiBase}/api/forms/submissions`)
        ])

        if (formsRes.ok) {
          const formsData = await formsRes.json()
          setForms(formsData.forms || [])
        } else {
          console.error('Failed to fetch forms')
          setForms([])
        }

        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json()
          setSubmissions(submissionsData.submissions || [])
        } else {
          console.error('Failed to fetch submissions')
          setSubmissions([])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load forms data')
        setForms([])
        setSubmissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const [activeTab, setActiveTab] = useState<'forms' | 'submissions' | 'create'>('forms')

  const getTypeIcon = (type: Form['type']) => {
    switch (type) {
      case 'contact': return '📞'
      case 'newsletter': return '📧'
      case 'feedback': return '💬'
      case 'survey': return '📋'
      default: return '📝'
    }
  }

  const getStatusColor = (status: Form['status']) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
            Forms
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Create and manage contact forms and surveys
          </p>
        </div>
        <button className="btn-primary">Create Form</button>
      </div>

      {/* Error State */}
      {error && (
        <div className="metric-card bg-red-50 border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-600">{error}</span>
            <button 
              onClick={() => window.location.reload()}
              className="ml-auto text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="metric-card animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="metric-card animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && !error && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'forms', name: 'Forms', count: forms.length },
              { id: 'submissions', name: 'Submissions', count: forms.reduce((sum, f) => sum + f.submissions, 0) },
              { id: 'create', name: 'Create New', count: 0 }
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
      )}

      {/* Forms Tab */}
      {!loading && !error && activeTab === 'forms' && (
        <div className="space-y-6">
          {/* Form Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Total Forms', value: forms.length, icon: '📝' },
              { title: 'Active', value: forms.filter(f => f.status === 'active').length, icon: '✅' },
              { title: 'Total Submissions', value: forms.reduce((sum, f) => sum + f.submissions, 0), icon: '📊' },
              { title: 'Avg. Submissions', value: forms.length > 0 ? Math.round(forms.reduce((sum, f) => sum + f.submissions, 0) / forms.length) : 0, icon: '📈' }
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

          {/* Forms Table */}
          <div className="metric-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4">Form</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Submissions</th>
                    <th className="py-3 pr-4">Created</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4">
                        <div className="flex items-center space-x-2">
                          <span>{getTypeIcon(form.type)}</span>
                          <span className="font-medium text-gray-900">{form.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="capitalize text-gray-600">{form.type}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(form.status)}`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{form.submissions}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {new Date(form.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex space-x-2">
                          <button className="btn-secondary text-xs px-2 py-1">Edit</button>
                          <button className="btn-secondary text-xs px-2 py-1">View</button>
                          <button className="btn-secondary text-xs px-2 py-1">Submissions</button>
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

      {/* Submissions Tab */}
      {!loading && !error && activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
            <button className="btn-secondary">Export All</button>
          </div>

          <div className="metric-card">
            <div className="space-y-4">
              {submissions.length > 0 ? (
                submissions.map((submission, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{submission.name}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-sm text-gray-600">{submission.email}</span>
                        </div>
                        <p className="text-gray-700 mb-2">{submission.message}</p>
                        <p className="text-xs text-gray-500">
                          Via {submission.form} • {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="btn-secondary text-xs px-2 py-1">Reply</button>
                        <button className="btn-secondary text-xs px-2 py-1">View</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No form submissions available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Tab */}
      {!loading && !error && activeTab === 'create' && (
        <div className="space-y-6">
          <div className="metric-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Form</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                  <input 
                    type="text" 
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="Contact Form"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none">
                    <option value="contact">Contact</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="feedback">Feedback</option>
                    <option value="survey">Survey</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Fields</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Name (required)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Email (required)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Message</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Phone Number</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button type="button" className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Form</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}








