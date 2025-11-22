import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, ChevronUp, ChevronDown, Wifi, WifiOff, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react'
import { socketService } from '../services/socket'

interface CMSPage {
  id: number
  page_name: string
  page_title: string
  page_subtitle: string
  meta_description: string
  created_at: string
  updated_at: string
}

interface CMSSection {
  id: number
  page_name: string
  section_key: string
  section_title: string
  section_type: string
  content: any
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function CMS() {
  const [pages, setPages] = useState<CMSPage[]>([])
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [sections, setSections] = useState<CMSSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null)
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null)
  const [showPageForm, setShowPageForm] = useState(false)
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Blog management state
  const [activeTab, setActiveTab] = useState<'cms' | 'blog'>('cms')
  const [blogRequests, setBlogRequests] = useState<any[]>([])
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [blogLoading, setBlogLoading] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://192.168.1.36:2000'

  // Fetch all pages
  const fetchPages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cms/pages`)
      const data = await response.json()
      setPages(data)
      if (data.length > 0 && !selectedPage) {
        setSelectedPage(data[0].page_name)
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    }
  }

  // Fetch sections for selected page
  const fetchSections = async (pageName: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/cms/sections/${pageName}`)
      const data = await response.json()
      setSections(data)
    } catch (error) {
      console.error('Failed to fetch sections:', error)
    }
  }

  useEffect(() => {
    fetchPages().then(() => setLoading(false))

    // Setup real-time updates
    socketService.connect()
    setIsRealtimeConnected(socketService.isConnected())

    // Listen for CMS updates from other admin users or user panel
    const unsubscribe = socketService.subscribe('cms-update', (data: any) => {
      console.log('📡 Real-time CMS update received:', data)
      setLastUpdate(new Date())
      
      // Refresh data based on update type
      if (data.event.includes('page')) {
        fetchPages()
      }
      
      if (data.event.includes('section') && selectedPage) {
        fetchSections(selectedPage)
      }
    })

    // Monitor connection status
    const checkConnection = setInterval(() => {
      setIsRealtimeConnected(socketService.isConnected())
    }, 3000)

    return () => {
      clearInterval(checkConnection)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'blog') {
      fetchBlogRequests()
      fetchBlogPosts()
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedPage) {
      fetchSections(selectedPage)
    }
  }, [selectedPage])

  // Save page
  const handleSavePage = async (pageData: Partial<CMSPage>) => {
    try {
      const response = await fetch(`${API_BASE}/api/cms/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      })
      
      if (response.ok) {
        await fetchPages()
        setShowPageForm(false)
        setEditingPage(null)
      }
    } catch (error) {
      console.error('Failed to save page:', error)
    }
  }

  // Delete page
  const handleDeletePage = async (pageName: string) => {
    if (!confirm('Are you sure you want to delete this page and all its sections?')) return
    
    try {
      await fetch(`${API_BASE}/api/cms/pages/${pageName}`, { method: 'DELETE' })
      await fetchPages()
      if (selectedPage === pageName) {
        setSelectedPage('')
      }
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }

  // Save section
  const handleSaveSection = async (sectionData: Partial<CMSSection>) => {
    try {
      const response = await fetch(`${API_BASE}/api/cms/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sectionData,
          page_name: selectedPage
        })
      })
      
      if (response.ok) {
        await fetchSections(selectedPage)
        setShowSectionForm(false)
        setEditingSection(null)
      }
    } catch (error) {
      console.error('Failed to save section:', error)
    }
  }

  // Delete section
  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return
    
    try {
      await fetch(`${API_BASE}/api/cms/sections/${sectionId}`, { method: 'DELETE' })
      await fetchSections(selectedPage)
    } catch (error) {
      console.error('Failed to delete section:', error)
    }
  }

  // Toggle section visibility
  const toggleSectionVisibility = async (section: CMSSection) => {
    await handleSaveSection({
      ...section,
      is_active: !section.is_active
    })
  }

  // Move section up/down
  const moveSectionOrder = async (section: CMSSection, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? section.order_index - 1 : section.order_index + 1
    const otherSection = sections.find(s => s.order_index === newIndex)
    
    if (otherSection) {
      await handleSaveSection({ ...section, order_index: newIndex })
      await handleSaveSection({ ...otherSection, order_index: section.order_index })
      await fetchSections(selectedPage)
    }
  }

  // Blog management functions
  const fetchBlogRequests = async () => {
    try {
      setBlogLoading(true)
      const response = await fetch(`${API_BASE}/api/blog/admin/requests`)
      const data = await response.json()
      setBlogRequests(data)
    } catch (error) {
      console.error('Failed to fetch blog requests:', error)
    } finally {
      setBlogLoading(false)
    }
  }

  const fetchBlogPosts = async () => {
    try {
      setBlogLoading(true)
      const response = await fetch(`${API_BASE}/api/blog/admin/posts`)
      const data = await response.json()
      setBlogPosts(data)
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      setBlogLoading(false)
    }
  }

  const approveBlogRequest = async (requestId: string, featured = false) => {
    try {
      const response = await fetch(`${API_BASE}/api/blog/admin/approve/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured })
      })
      
      if (response.ok) {
        await fetchBlogRequests()
        await fetchBlogPosts()
      }
    } catch (error) {
      console.error('Failed to approve blog request:', error)
    }
  }

  const rejectBlogRequest = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/blog/admin/reject/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      
      if (response.ok) {
        await fetchBlogRequests()
      }
    } catch (error) {
      console.error('Failed to reject blog request:', error)
    }
  }

  const deleteBlogPost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/blog/admin/posts/${postId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchBlogPosts()
      }
    } catch (error) {
      console.error('Failed to delete blog post:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading CMS...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
            Content Management System
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {isRealtimeConnected ? (
              <>
                <Wifi className="w-4 h-4" style={{ color: '#059669' }} />
                <span className="text-sm" style={{ color: '#059669' }}>Live • Real-time updates enabled</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Offline • Changes may not sync</span>
              </>
            )}
            {lastUpdate && (
              <span className="text-xs ml-4" style={{ color: 'var(--text-muted)' }}>
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        {activeTab === 'cms' && (
          <button
            onClick={() => {
              setEditingPage(null)
              setShowPageForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            New Page
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('cms')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'cms'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          CMS Pages
        </button>
        <button
          onClick={() => setActiveTab('blog')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'blog'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Blog Management
        </button>
      </div>

      {activeTab === 'cms' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pages Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Pages</h2>
            <div className="space-y-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                    selectedPage === page.page_name
                      ? 'bg-blue-100 border-blue-500 border'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedPage(page.page_name)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{page.page_title || page.page_name}</div>
                    <div className="text-xs text-gray-500">{page.page_name}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPage(page)
                        setShowPageForm(true)
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePage(page.page_name)
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sections Content */}
          <div className="lg:col-span-3">
            {selectedPage ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    Sections for {pages.find(p => p.page_name === selectedPage)?.page_title || selectedPage}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingSection(null)
                      setShowSectionForm(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-5 h-5" />
                    Add Section
                  </button>
                </div>

                <div className="space-y-4">
                  {sections.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No sections yet. Add your first section to get started.
                    </div>
                  ) : (
                    sections.map((section) => (
                      <div
                        key={section.id}
                        className={`border rounded-lg p-4 ${
                          section.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium">{section.section_title}</h3>
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                                {section.section_type}
                              </span>
                              {!section.is_active && (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">{section.section_key}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveSectionOrder(section, 'up')}
                              disabled={section.order_index === 0}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ChevronUp className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => moveSectionOrder(section, 'down')}
                              disabled={section.order_index === sections.length - 1}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ChevronDown className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => toggleSectionVisibility(section)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {section.is_active ? (
                                <Eye className="w-5 h-5 text-green-600" />
                              ) : (
                                <EyeOff className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingSection(section)
                                setShowSectionForm(true)
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Edit2 className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3 text-sm">
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {JSON.stringify(section.content, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                Select a page from the sidebar to view and edit its sections
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Blog Management Content */
        <div className="space-y-6">
          {/* Blog Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Pending Blog Requests</h2>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">{blogRequests.length} pending</span>
              </div>
            </div>

            {blogLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading blog requests...</p>
              </div>
            ) : blogRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No pending blog requests
              </div>
            ) : (
              <div className="space-y-4">
                {blogRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{request.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {request.author_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{request.excerpt}</p>
                        {request.images && request.images.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {request.images.map((image: string, index: number) => (
                              <img
                                key={index}
                                src={`${API_BASE}${image}`}
                                alt={`Blog image ${index + 1}`}
                                className="w-16 h-16 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveBlogRequest(request.id, false)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => approveBlogRequest(request.id, true)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Featured
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection:')
                            if (reason) rejectBlogRequest(request.id, reason)
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-3 text-sm">
                      <div className="font-medium mb-2">Full Content:</div>
                      <div className="whitespace-pre-wrap">{request.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Blog Posts */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Approved Blog Posts</h2>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">{blogPosts.length} published</span>
              </div>
            </div>

            {blogLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading blog posts...</p>
              </div>
            ) : blogPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No approved blog posts yet
              </div>
            ) : (
              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{post.title}</h3>
                          {post.featured && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {post.author_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-gray-700">{post.excerpt}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteBlogPost(post.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                    {post.images && post.images.length > 0 && (
                      <div className="flex gap-2">
                        {post.images.map((image: string, index: number) => (
                          <img
                            key={index}
                            src={`${API_BASE}${image}`}
                            alt={`Blog image ${index + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Form Modal */}
      {showPageForm && (
        <PageFormModal
          page={editingPage}
          onSave={handleSavePage}
          onClose={() => {
            setShowPageForm(false)
            setEditingPage(null)
          }}
        />
      )}

      {/* Section Form Modal */}
      {showSectionForm && (
        <SectionFormModal
          section={editingSection}
          pageName={selectedPage}
          onSave={handleSaveSection}
          onClose={() => {
            setShowSectionForm(false)
            setEditingSection(null)
          }}
        />
      )}
    </div>
  )
}

// Page Form Modal Component
function PageFormModal({
  page,
  onSave,
  onClose
}: {
  page: CMSPage | null
  onSave: (page: Partial<CMSPage>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    page_name: page?.page_name || '',
    page_title: page?.page_title || '',
    page_subtitle: page?.page_subtitle || '',
    meta_description: page?.meta_description || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{page ? 'Edit Page' : 'Create New Page'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Page Name (URL Slug)</label>
            <input
              type="text"
              value={formData.page_name}
              onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="home, about, contact"
              required
              disabled={!!page}
            />
            <p className="text-xs text-gray-500 mt-1">Used in the URL, cannot be changed after creation</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Page Title</label>
            <input
              type="text"
              value={formData.page_title}
              onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Home Page"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Page Subtitle</label>
            <input
              type="text"
              value={formData.page_subtitle}
              onChange={(e) => setFormData({ ...formData, page_subtitle: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Welcome to our store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Meta Description</label>
            <textarea
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Description for SEO"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Page
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Section Form Modal Component
function SectionFormModal({
  section,
  pageName,
  onSave,
  onClose
}: {
  section: CMSSection | null
  pageName: string
  onSave: (section: Partial<CMSSection>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    section_key: section?.section_key || '',
    section_title: section?.section_title || '',
    section_type: section?.section_type || 'text',
    content: section?.content ? JSON.stringify(section.content, null, 2) : '{}',
    order_index: section?.order_index || 0,
    is_active: section?.is_active !== false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const contentObj = JSON.parse(formData.content)
      onSave({
        ...formData,
        content: contentObj
      })
    } catch (error) {
      alert('Invalid JSON content')
    }
  }

  const sectionTypes = [
    'hero', 'text', 'grid', 'list', 'gallery', 'form', 'testimonials', 
    'features', 'pricing', 'cta', 'contact', 'faq', 'team', 'stats'
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{section ? 'Edit Section' : 'Create New Section'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Section Key (Unique Identifier)</label>
            <input
              type="text"
              value={formData.section_key}
              onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="hero_banner, features_section"
              required
              disabled={!!section}
            />
            <p className="text-xs text-gray-500 mt-1">Unique key for this section, cannot be changed after creation</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Section Title</label>
            <input
              type="text"
              value={formData.section_title}
              onChange={(e) => setFormData({ ...formData, section_title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Hero Banner"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Section Type</label>
            <select
              value={formData.section_type}
              onChange={(e) => setFormData({ ...formData, section_type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {sectionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content (JSON)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={15}
              placeholder='{"title": "Welcome", "description": "..."}'
            />
            <p className="text-xs text-gray-500 mt-1">Enter valid JSON content for this section</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Order Index</label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Active (Visible on website)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Section
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

