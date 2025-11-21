import React, { useState, useEffect } from 'react'
import { Search, Filter, Edit, Trash2, Eye, FileText, Globe, Settings, Save } from 'lucide-react'

interface StaticPage {
  id: number
  slug: string
  title: string
  content: string
  meta_description: string
  is_active: boolean
  created_at: string
  updated_at: string
  page_type: 'about' | 'faq' | 'policy' | 'terms' | 'shipping' | 'refund' | 'privacy' | 'contact' | 'custom'
}

export default function StaticPagesManagement() {
  const [pages, setPages] = useState<StaticPage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedPage, setSelectedPage] = useState<StaticPage | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  useEffect(() => {
    fetchStaticPages()
  }, [])

  const fetchStaticPages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/static-pages')
      if (response.ok) {
        const data = await response.json()
        setPages(data.pages || [])
      } else {
        console.error('Failed to fetch static pages')
        setPages([])
      }
    } catch (error) {
      console.error('Error fetching static pages:', error)
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || page.page_type === typeFilter
    return matchesSearch && matchesType
  })

  const handleCreatePage = async (pageData: Partial<StaticPage>) => {
    try {
      const response = await fetch('/api/admin/static-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      })
      if (response.ok) {
        const newPage = await response.json()
        setPages([newPage, ...pages])
        setShowCreateModal(false)
      } else {
        alert('Failed to create static page')
      }
    } catch (error) {
      console.error('Error creating static page:', error)
      alert('Error creating static page')
    }
  }

  const handleUpdatePage = async (pageId: number, pageData: Partial<StaticPage>) => {
    try {
      const response = await fetch(`/api/admin/static-pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      })
      if (response.ok) {
        setPages(pages.map(p => 
          p.id === pageId ? { ...p, ...pageData } : p
        ))
        setShowEditModal(false)
        setSelectedPage(null)
      } else {
        alert('Failed to update static page')
      }
    } catch (error) {
      console.error('Error updating static page:', error)
      alert('Error updating static page')
    }
  }

  const handleDeletePage = async (pageId: number) => {
    if (confirm('Are you sure you want to delete this static page?')) {
      try {
        const response = await fetch(`/api/admin/static-pages/${pageId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setPages(pages.filter(p => p.id !== pageId))
        } else {
          alert('Failed to delete static page')
        }
      } catch (error) {
        console.error('Error deleting static page:', error)
        alert('Error deleting static page')
      }
    }
  }

  const handleToggleActive = async (pageId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/static-pages/${pageId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })
      if (response.ok) {
        setPages(pages.map(p => 
          p.id === pageId ? { ...p, is_active: !isActive } : p
        ))
      } else {
        alert('Failed to toggle page status')
      }
    } catch (error) {
      console.error('Error toggling page status:', error)
      alert('Error toggling page status')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'about': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'faq': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'policy': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'terms': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'shipping': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case 'refund': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'privacy': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'contact': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'custom': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Static Pages Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage static pages like About Us, FAQ, Policies, etc.</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="about">About</option>
          <option value="faq">FAQ</option>
          <option value="policy">Policy</option>
          <option value="terms">Terms</option>
          <option value="shipping">Shipping</option>
          <option value="refund">Refund</option>
          <option value="privacy">Privacy</option>
          <option value="contact">Contact</option>
          <option value="custom">Custom</option>
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Create Page
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{pages.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Pages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {pages.filter(p => p.is_active).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Settings className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Policy Pages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {pages.filter(p => ['policy', 'terms', 'privacy', 'shipping', 'refund'].includes(p.page_type)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Custom Pages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {pages.filter(p => p.page_type === 'custom').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {page.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {page.meta_description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(page.page_type)}`}>
                      {page.page_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    /{page.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(page.id, page.is_active)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                        page.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {page.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPage(page)
                          setShowPreviewModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPage(page)
                          setShowEditModal(true)
                        }}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePage(page.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedPage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit Static Page
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                handleUpdatePage(selectedPage.id, {
                  title: formData.get('title') as string,
                  slug: formData.get('slug') as string,
                  content: formData.get('content') as string,
                  meta_description: formData.get('meta_description') as string,
                  page_type: formData.get('page_type') as any,
                  is_active: formData.get('is_active') === 'on'
                })
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={selectedPage.title}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Slug
                    </label>
                    <input
                      type="text"
                      name="slug"
                      defaultValue={selectedPage.slug}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page Type
                  </label>
                  <select
                    name="page_type"
                    defaultValue={selectedPage.page_type}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="about">About</option>
                    <option value="faq">FAQ</option>
                    <option value="policy">Policy</option>
                    <option value="terms">Terms</option>
                    <option value="shipping">Shipping</option>
                    <option value="refund">Refund</option>
                    <option value="privacy">Privacy</option>
                    <option value="contact">Contact</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Meta Description
                  </label>
                  <textarea
                    name="meta_description"
                    rows={2}
                    defaultValue={selectedPage.meta_description}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content
                  </label>
                  <textarea
                    name="content"
                    rows={10}
                    defaultValue={selectedPage.content}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={selectedPage.is_active}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Active Page
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 inline mr-2" />
                    Update Page
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedPage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Page Preview: {selectedPage.title}
              </h3>
              <div className="prose max-w-none dark:prose-invert">
                <h1>{selectedPage.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: selectedPage.content }} />
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
