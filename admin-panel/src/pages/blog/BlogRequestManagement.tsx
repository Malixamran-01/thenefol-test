import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Clock, User, Calendar, Eye, EyeOff, Star, Filter, Search } from 'lucide-react'

interface BlogRequest {
  id: string
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email: string
  images: string[]
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
  created_at: string
  updated_at: string
  rejection_reason?: string
}

export default function BlogRequestManagement() {
  const [blogRequests, setBlogRequests] = useState<BlogRequest[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'requests' | 'posts'>('requests')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<BlogRequest | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://192.168.1.36:2000'

  // Fetch blog requests
  const fetchBlogRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/blog/admin/requests`)
      const data = await response.json()
      setBlogRequests(data)
    } catch (error) {
      console.error('Failed to fetch blog requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch blog posts
  const fetchBlogPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/blog/admin/posts`)
      const data = await response.json()
      setBlogPosts(data)
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchBlogRequests()
    } else {
      fetchBlogPosts()
    }
  }, [activeTab])

  // Approve blog request
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

  // Reject blog request
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

  // Delete blog post
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

  // Filter and search functions
  const filteredRequests = blogRequests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.author_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Blog Request Management</h1>
          <p className="text-gray-600 mt-2">Manage blog submissions and published posts</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-600">
              {blogRequests.filter(r => r.status === 'pending').length} pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">
              {blogPosts.filter(p => p.status === 'approved').length} published
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Blog Requests
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'posts'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Published Posts
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {activeTab === 'requests' && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'requests' ? (
            filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No blog requests found
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        {request.featured && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Featured
                          </span>
                        )}
                      </div>
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
                        onClick={() => {
                          setSelectedRequest(request)
                          setShowDetails(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      {request.status === 'pending' && (
                        <>
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
                            <Star className="w-4 h-4" />
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
                        </>
                      )}
                    </div>
                  </div>
                  {request.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                      <p className="text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {request.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No published posts yet
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{post.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                        {post.featured && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" />
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
                        onClick={() => {
                          setSelectedRequest(post)
                          setShowDetails(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
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
              ))
            )
          )}
        </div>
      )}

      {/* Blog Details Modal */}
      {showDetails && selectedRequest && (
        <BlogDetailsModal
          blog={selectedRequest}
          onClose={() => {
            setShowDetails(false)
            setSelectedRequest(null)
          }}
        />
      )}
    </div>
  )
}

// Blog Details Modal Component
function BlogDetailsModal({
  blog,
  onClose
}: {
  blog: BlogRequest
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{blog.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {blog.author_name} ({blog.author_email})
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(blog.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-semibold mb-2">Excerpt:</h3>
            <p className="text-gray-700">{blog.excerpt}</p>
          </div>

          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-semibold mb-2">Full Content:</h3>
            <div className="whitespace-pre-wrap text-gray-700">{blog.content}</div>
          </div>

          {blog.images && blog.images.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Images:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {blog.images.map((image: string, index: number) => (
                  <img
                    key={index}
                    src={`${API_BASE}${image}`}
                    alt={`Blog image ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {blog.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="font-semibold text-red-800 mb-2">Rejection Reason:</h3>
              <p className="text-red-700">{blog.rejection_reason}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
