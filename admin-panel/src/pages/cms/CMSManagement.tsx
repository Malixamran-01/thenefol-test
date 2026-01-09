import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, ChevronUp, ChevronDown, Wifi, WifiOff, Settings } from 'lucide-react'
import { socketService } from '../../services/socket'
import { useToast } from '../../components/ToastProvider'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getApiBaseUrl } from '../../utils/apiUrl'

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

export default function CMSManagement() {
  const { notify } = useToast()
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
  const [activeTab, setActiveTab] = useState<'pages' | 'sections' | 'settings'>('pages')

  // Use centralized API URL utility that respects VITE_API_URL
  const API_BASE = getApiBaseUrl()

  // Fetch all pages
  const fetchPages = async () => {
    try {
      const response = await fetch(`${API_BASE}/cms/pages`)
      const data = await response.json()
      // Transform data to match our interface
      const transformedData = data.map((page: any) => ({
        id: page.id,
        page_name: page.slug,
        page_title: page.title,
        page_subtitle: '',
        meta_description: page.meta_description || '',
        created_at: page.created_at,
        updated_at: page.updated_at
      }))
      setPages(transformedData)
      if (transformedData.length > 0 && !selectedPage) {
        setSelectedPage(transformedData[0].page_name)
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error)
      notify('error','Failed to fetch pages')
    }
  }

  // Fetch sections for selected page
  const fetchSections = async (pageName: string) => {
    try {
      const response = await fetch(`${API_BASE}/cms/sections/${pageName}`)
      const data = await response.json()
      // Transform data to match our interface
      const transformedData = data.map((section: any) => ({
        id: section.id,
        page_name: pageName,
        section_key: section.section_type,
        section_title: section.title || section.section_type,
        section_type: section.section_type,
        content: section.content,
        order_index: section.order_index,
        is_active: section.is_active,
        created_at: section.created_at,
        updated_at: section.updated_at
      }))
      setSections(transformedData)
    } catch (error) {
      console.error('Failed to fetch sections:', error)
      notify('error','Failed to fetch sections')
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
    if (selectedPage) {
      fetchSections(selectedPage)
    }
  }, [selectedPage])

  // Save page
  const handleSavePage = async (pageData: Partial<CMSPage>) => {
    try {
      const response = await fetch(`${API_BASE}/cms/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: pageData.page_name,
          title: pageData.page_title,
          content: {},
          meta_description: pageData.meta_description
        })
      })
      
      if (response.ok) {
        await fetchPages()
        setShowPageForm(false)
        setEditingPage(null)
        notify('success','Page saved')
      }
    } catch (error) {
      console.error('Failed to save page:', error)
      notify('error','Failed to save page')
    }
  }

  // Delete page
  const [confirmDeletePage, setConfirmDeletePage] = useState<string | null>(null)
  const handleDeletePage = async (pageName: string) => {
    try {
      await fetch(`${API_BASE}/cms/pages/${pageName}`, { method: 'DELETE' })
      await fetchPages()
      if (selectedPage === pageName) {
        setSelectedPage('')
      }
      notify('success','Page deleted')
    } catch (error) {
      console.error('Failed to delete page:', error)
      notify('error','Failed to delete page')
    }
  }

  // Save section
  const handleSaveSection = async (sectionData: Partial<CMSSection>) => {
    try {
      const response = await fetch(`${API_BASE}/cms/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_slug: selectedPage,
          section_type: sectionData.section_type,
          title: sectionData.section_title,
          content: sectionData.content,
          order_index: sectionData.order_index,
          is_active: sectionData.is_active
        })
      })
      
      if (response.ok) {
        await fetchSections(selectedPage)
        setShowSectionForm(false)
        setEditingSection(null)
        notify('success','Section saved')
      }
    } catch (error) {
      console.error('Failed to save section:', error)
      notify('error','Failed to save section')
    }
  }

  // Delete section
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<number | null>(null)
  const handleDeleteSection = async (sectionId: number) => {
    try {
      await fetch(`${API_BASE}/cms/sections/${sectionId}`, { method: 'DELETE' })
      await fetchSections(selectedPage)
      notify('success','Section deleted')
    } catch (error) {
      console.error('Failed to delete section:', error)
      notify('error','Failed to delete section')
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
        <button
          onClick={() => {
            setEditingPage(null)
            setShowPageForm(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Page
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'pages'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pages
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'sections'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sections
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </button>
      </div>

      {activeTab === 'pages' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">CMS Pages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <div
                key={page.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{page.page_title || page.page_name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{page.page_name}</p>
                    {page.page_subtitle && (
                      <p className="text-sm text-gray-600 mb-2">{page.page_subtitle}</p>
                    )}
                    {page.meta_description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{page.meta_description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingPage(page)
                        setShowPageForm(true)
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => setConfirmDeletePage(page.page_name)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Created: {new Date(page.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pages Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Select Page</h2>
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
                              onClick={() => setConfirmDeleteSection(section.id)}
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
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">CMS Settings</h2>
          <div className="text-center py-12 text-gray-500">
            CMS Settings panel coming soon...
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
      <ConfirmDialog open={!!confirmDeletePage} onClose={()=>setConfirmDeletePage(null)} onConfirm={()=>{ if (confirmDeletePage) handleDeletePage(confirmDeletePage) }} title="Delete this page?" description="This will remove all its sections." confirmText="Delete" />
      <ConfirmDialog open={!!confirmDeleteSection} onClose={()=>setConfirmDeleteSection(null)} onConfirm={()=>{ if (confirmDeleteSection!=null) handleDeleteSection(confirmDeleteSection) }} title="Delete this section?" description="This action cannot be undone." confirmText="Delete" />
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
