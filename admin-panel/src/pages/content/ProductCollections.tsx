import React, { useEffect, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import ConfirmDialog from '../../components/ConfirmDialog'
import { uploadFile } from '../../utils/upload'
import { getApiBaseUrl } from '../../utils/apiUrl'

type CollectionType = 'offers' | 'new_arrivals' | 'best_sellers' | 'recommendations'

interface ProductCollection {
  id: number
  collection_type: CollectionType
  product_id: number | null
  product_title?: string
  product_slug?: string
  product_image?: string
  title: string | null
  subtitle: string | null
  description: string | null
  image_url: string | null
  code: string | null
  expiry_date: string | null
  discount_percent: number | null
  discount_amount: number | null
  is_featured: boolean
  is_published: boolean
  order_index: number
  created_at: string
  updated_at: string
}

interface RecommendationPost {
  id: number
  title: string
  content: string | null
  image_url: string | null
  product_ids: number[] | null
  products?: Array<{
    id: number
    title: string
    slug: string
    list_image: string
    price: string
  }>
  is_published: boolean
  published_at: string | null
  order_index: number
  created_at: string
  updated_at: string
}

interface Product {
  id: number
  title: string
  slug: string
  list_image: string
  price: string
}

export default function ProductCollections() {
  const { notify } = useToast()
  const [activeTab, setActiveTab] = useState<CollectionType | 'recommendation_posts'>('offers')
  const [collections, setCollections] = useState<ProductCollection[]>([])
  const [recommendationPosts, setRecommendationPosts] = useState<RecommendationPost[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [editing, setEditing] = useState<ProductCollection | RecommendationPost | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; type: 'collection' | 'post' } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const apiBase = getApiBaseUrl()

  useEffect(() => {
    loadProducts()
    if (activeTab === 'recommendation_posts') {
      loadRecommendationPosts()
    } else {
      loadCollections()
    }
  }, [activeTab])

  const loadProducts = async () => {
    try {
      setProductsLoading(true)
      console.log('🔄 Loading products from API:', `${apiBase}/products`)
      const res = await fetch(`${apiBase}/products?_=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      console.log('📦 Raw API response:', typeof data, Array.isArray(data) ? `Array with ${data.length} items` : 'Object')
      
      // Handle both array response and {success, data} response
      let productsList: any[] = []
      if (Array.isArray(data)) {
        productsList = data
        console.log('✅ Response is array:', productsList.length)
      } else if (data && data.success && Array.isArray(data.data)) {
        productsList = data.data
        console.log('✅ Response has success.data:', productsList.length)
      } else if (data && Array.isArray(data.data)) {
        productsList = data.data
        console.log('✅ Response has data array:', productsList.length)
      } else {
        console.warn('⚠️ Unexpected response format:', data)
      }
      
      // Filter out products without essential data
      const validProducts = productsList
        .filter((p: any) => p && p.id && p.title)
        .map((p: any) => ({
          id: p.id,
          title: p.title || '',
          slug: p.slug || '',
          list_image: p.list_image || p.listImage || '',
          price: p.price || ''
        }))
      
      console.log(`✅ Valid products: ${validProducts.length}`)
      setProducts(validProducts)
      
      if (validProducts.length === 0) {
        console.warn('⚠️ No valid products found after filtering')
      }
    } catch (err) {
      console.error('❌ Failed to load products:', err)
      notify('error', 'Failed to load products. Please check the console for details.')
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  const loadCollections = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/collections?type=${activeTab}`)
      const data = await res.json()
      if (data.success) {
        setCollections(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load collections:', err)
      notify('error', 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendationPosts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/recommendation-posts`)
      const data = await res.json()
      if (data.success) {
        setRecommendationPosts(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load recommendation posts:', err)
      notify('error', 'Failed to load recommendation posts')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData: any) => {
    try {
      const token = localStorage.getItem('auth_token')
      const role = localStorage.getItem('role') || 'admin'
      const permissions = localStorage.getItem('permissions') || 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
      
      const url = editing?.id
        ? `${apiBase}/${activeTab === 'recommendation_posts' ? 'recommendation-posts' : 'collections'}/${editing.id}`
        : `${apiBase}/${activeTab === 'recommendation_posts' ? 'recommendation-posts' : 'collections'}`
      
      const method = editing?.id ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-permissions': permissions,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.success) {
        notify('success', editing?.id ? 'Updated successfully' : 'Created successfully')
        setShowForm(false)
        setEditing(null)
        if (activeTab === 'recommendation_posts') {
          loadRecommendationPosts()
        } else {
          loadCollections()
        }
      } else {
        notify('error', data.message || 'Failed to save')
      }
    } catch (err) {
      console.error('Failed to save:', err)
      notify('error', 'Failed to save')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      const token = localStorage.getItem('auth_token')
      const role = localStorage.getItem('role') || 'admin'
      const permissions = localStorage.getItem('permissions') || 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
      
      const url = deleteConfirm.type === 'post'
        ? `${apiBase}/recommendation-posts/${deleteConfirm.id}`
        : `${apiBase}/collections/${deleteConfirm.id}`

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-user-role': role,
          'x-user-permissions': permissions,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      const data = await res.json()
      if (data.success) {
        notify('success', 'Deleted successfully')
        setDeleteConfirm(null)
        if (activeTab === 'recommendation_posts') {
          loadRecommendationPosts()
        } else {
          loadCollections()
        }
      } else {
        notify('error', data.message || 'Failed to delete')
      }
    } catch (err) {
      console.error('Failed to delete:', err)
      notify('error', 'Failed to delete')
    }
  }

  const tabs = [
    { id: 'offers' as CollectionType, label: 'Offers', icon: '🎁' },
    { id: 'new_arrivals' as CollectionType, label: 'New Arrivals', icon: '🆕' },
    { id: 'best_sellers' as CollectionType, label: 'Best Sellers', icon: '⭐' },
    { id: 'recommendations' as CollectionType, label: 'Recommendations', icon: '💡' },
    { id: 'recommendation_posts' as const, label: 'Recommendation Posts', icon: '📝' },
  ]

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
            Product Collections
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage product collections and recommendations
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="btn-primary"
        >
          Add {activeTab === 'recommendation_posts' ? 'Recommendation Post' : 'Item'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--arctic-blue-light)' }}>
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? ''
                  : 'border-transparent'
              }`}
              style={activeTab === tab.id 
                ? { borderColor: 'var(--arctic-blue-primary)', color: 'var(--arctic-blue-primary-dark)' }
                : { color: 'var(--text-muted)' }
              }
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Collections Table */}
      {activeTab !== 'recommendation_posts' && (
        <CollectionsTable
          collections={collections}
          loading={loading}
          onEdit={(item) => {
            setEditing(item)
            setShowForm(true)
          }}
          onDelete={(id) => setDeleteConfirm({ id, type: 'collection' })}
          onTogglePublish={async (id, isPublished) => {
            try {
              const token = localStorage.getItem('auth_token')
              const role = localStorage.getItem('role') || 'admin'
              const permissions = localStorage.getItem('permissions') || 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
              
              const res = await fetch(`${apiBase}/collections/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-role': role,
                  'x-user-permissions': permissions,
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({ is_published: !isPublished }),
              })
              const data = await res.json()
              if (data.success) {
                notify('success', 'Updated successfully')
                loadCollections()
              }
            } catch (err) {
              notify('error', 'Failed to update')
            }
          }}
        />
      )}

      {/* Recommendation Posts Table */}
      {activeTab === 'recommendation_posts' && (
        <RecommendationPostsTable
          posts={recommendationPosts}
          loading={loading}
          onEdit={(item) => {
            setEditing(item)
            setShowForm(true)
          }}
          onDelete={(id) => setDeleteConfirm({ id, type: 'post' })}
          onTogglePublish={async (id, isPublished) => {
            try {
              const token = localStorage.getItem('auth_token')
              const role = localStorage.getItem('role') || 'admin'
              const permissions = localStorage.getItem('permissions') || 'orders:read,orders:update,shipping:read,shipping:update,invoices:read,products:update'
              
              const res = await fetch(`${apiBase}/recommendation-posts/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-role': role,
                  'x-user-permissions': permissions,
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({ is_published: !isPublished }),
              })
              const data = await res.json()
              if (data.success) {
                notify('success', 'Updated successfully')
                loadRecommendationPosts()
              }
            } catch (err) {
              notify('error', 'Failed to update')
            }
          }}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <CollectionForm
          type={activeTab}
          editing={editing}
          products={products}
          productsLoading={productsLoading}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          open={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
        />
      )}
    </div>
  )
}

function CollectionsTable({
  collections,
  loading,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  collections: ProductCollection[]
  loading: boolean
  onEdit: (item: ProductCollection) => void
  onDelete: (id: number) => void
  onTogglePublish: (id: number, isPublished: boolean) => void
}) {
  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()
  
  const toAbs = (u?: string) => {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    const base = apiBase.replace(/\/$/, '')
    const path = u.startsWith('/') ? u : `/${u}`
    return `${base}${path}`
  }
  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (collections.length === 0) {
    return <div className="text-center py-8 text-gray-500">No items found</div>
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {collections.map((item) => (
            <tr key={item.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {(item.product_image || item.image_url) && (
                    <img
                      src={toAbs(item.product_image || item.image_url || '')}
                      alt={item.product_title || ''}
                      className="h-12 w-12 rounded object-cover mr-3"
                      style={{ aspectRatio: '1/1' }}
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {item.product_title || item.title || 'No Product'}
                    </div>
                    {item.product_id && (
                      <div className="text-sm text-gray-500">ID: {item.product_id}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{item.title || '-'}</div>
                {item.subtitle && (
                  <div className="text-sm text-gray-500">{item.subtitle}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{item.code || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onTogglePublish(item.id, item.is_published)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    item.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.is_published ? 'Published' : 'Draft'}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.order_index}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-900 mr-4">
                  Edit
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecommendationPostsTable({
  posts,
  loading,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  posts: RecommendationPost[]
  loading: boolean
  onEdit: (item: RecommendationPost) => void
  onDelete: (id: number) => void
  onTogglePublish: (id: number, isPublished: boolean) => void
}) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (posts.length === 0) {
    return <div className="text-center py-8 text-gray-500">No posts found</div>
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Products
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Published
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {posts.map((post) => (
            <tr key={post.id}>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{post.title}</div>
                {post.content && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">{post.content}</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">
                  {post.products?.length || post.product_ids?.length || 0} products
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onTogglePublish(post.id, post.is_published)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    post.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {post.is_published ? 'Published' : 'Draft'}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {post.published_at
                  ? new Date(post.published_at).toLocaleDateString()
                  : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => onEdit(post)} className="text-blue-600 hover:text-blue-900 mr-4">
                  Edit
                </button>
                <button onClick={() => onDelete(post.id)} className="text-red-600 hover:text-red-900">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CollectionForm({
  type,
  editing,
  products,
  productsLoading,
  onClose,
  onSave,
}: {
  type: CollectionType | 'recommendation_posts'
  editing: ProductCollection | RecommendationPost | null
  products: Product[]
  productsLoading: boolean
  onClose: () => void
  onSave: (data: any) => void
}) {
  const { notify } = useToast()
  const isRecommendationPost = type === 'recommendation_posts'
  const isEditing = !!editing
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

  const toAbs = (u?: string) => {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    const base = apiBase.replace(/\/$/, '')
    const path = u.startsWith('/') ? u : `/${u}`
    return `${base}${path}`
  }

  const [formData, setFormData] = useState<any>(() => {
    if (editing) {
      if (isRecommendationPost) {
        const post = editing as RecommendationPost
        return {
          title: post.title || '',
          content: post.content || '',
          image_url: post.image_url || '',
          product_ids: post.product_ids || [],
          is_published: post.is_published || false,
          order_index: post.order_index || 0,
        }
      } else {
        const collection = editing as ProductCollection
        return {
          collection_type: collection.collection_type,
          product_id: collection.product_id || '',
          title: collection.title || '',
          subtitle: collection.subtitle || '',
          description: collection.description || '',
          image_url: collection.image_url || '',
          code: collection.code || '',
          expiry_date: collection.expiry_date || '',
          discount_percent: collection.discount_percent || '',
          discount_amount: collection.discount_amount || '',
          is_featured: collection.is_featured || false,
          is_published: collection.is_published || false,
          order_index: collection.order_index || 0,
        }
      }
    }
    return {
      collection_type: type,
      product_id: '',
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      code: '',
      expiry_date: '',
      discount_percent: '',
      discount_amount: '',
      is_featured: false,
      is_published: false,
      order_index: 0,
      ...(isRecommendationPost && {
        title: '',
        content: '',
        image_url: '',
        product_ids: [],
        is_published: false,
        order_index: 0,
      }),
    }
  })

  useEffect(() => {
    // Set image preview when editing or when image_url changes
    if (formData.image_url) {
      // If already absolute URL, use it; otherwise convert to absolute
      const previewUrl = /^https?:\/\//i.test(formData.image_url) 
        ? formData.image_url 
        : toAbs(formData.image_url)
      setImagePreview(previewUrl)
      console.log('🖼️ Image preview updated:', { image_url: formData.image_url, previewUrl })
    } else {
      setImagePreview(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.image_url])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify('error', 'Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify('error', 'Image size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      const absoluteUrl = await uploadFile(file, apiBase)
      // Extract relative path from absolute URL for database storage
      // uploadFile returns: http://host:port/uploads/filename.jpg
      // We need: /uploads/filename.jpg
      const relativePath = absoluteUrl.replace(/^https?:\/\/[^/]+/, '')
      
      console.log('📤 Uploaded image:', { absoluteUrl, relativePath })
      
      setFormData({ ...formData, image_url: relativePath })
      setImagePreview(absoluteUrl) // Use absolute URL for preview
      notify('success', 'Image uploaded successfully')
    } catch (err) {
      console.error('Upload failed:', err)
      notify('error', 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...formData }
    
    // Normalize image_url: if it's an absolute URL, convert to relative path
    if (data.image_url) {
      if (/^https?:\/\//i.test(data.image_url)) {
        // Extract relative path from absolute URL
        data.image_url = data.image_url.replace(/^https?:\/\/[^/]+/, '')
      } else if (!data.image_url.startsWith('/')) {
        // Ensure it starts with /
        data.image_url = `/${data.image_url}`
      }
    }
    
    if (!isRecommendationPost) {
      data.product_id = data.product_id ? parseInt(data.product_id) : null
      data.discount_percent = data.discount_percent ? parseFloat(data.discount_percent) : null
      data.discount_amount = data.discount_amount ? parseFloat(data.discount_amount) : null
      data.order_index = parseInt(data.order_index) || 0
    } else {
      data.product_ids = Array.isArray(data.product_ids) ? data.product_ids : []
      data.order_index = parseInt(data.order_index) || 0
    }
    
    console.log('💾 Saving collection with data:', { ...data, image_url: data.image_url })
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {isEditing ? 'Edit' : 'Add'} {isRecommendationPost ? 'Recommendation Post' : 'Collection Item'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRecommendationPost && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Product *</label>
                <select
                  value={formData.product_id || ''}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={productsLoading}
                >
                  <option value="">{productsLoading ? 'Loading products...' : 'Select Product'}</option>
                  {productsLoading ? (
                    <option disabled>Loading products...</option>
                  ) : products.length === 0 ? (
                    <option disabled>No products available</option>
                  ) : (
                    products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.price ? `- ₹${p.price}` : ''}
                      </option>
                    ))
                  )}
                </select>
                {productsLoading && (
                  <p className="mt-1 text-sm text-blue-600">Loading products from server...</p>
                )}
                {!productsLoading && products.length === 0 && (
                  <p className="mt-1 text-sm text-red-500">
                    No products available. Please add products first in the Products page.
                    <button
                      type="button"
                      onClick={() => window.open('/admin/products', '_blank')}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      Go to Products
                    </button>
                  </p>
                )}
                {!productsLoading && products.length > 0 && (
                  <p className="mt-1 text-sm text-green-600">{products.length} product(s) available</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </>
          )}

          {isRecommendationPost && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Products</label>
                <select
                  multiple
                  value={formData.product_ids?.map(String) || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) =>
                      parseInt(option.value)
                    )
                    setFormData({ ...formData, product_ids: selected })
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  size={5}
                >
                  {products.length === 0 ? (
                    <option disabled>Loading products...</option>
                  ) : (
                    products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.price ? `- ₹${p.price}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple products</p>
                {formData.product_ids?.length > 0 && (
                  <p className="mt-1 text-sm text-blue-600">
                    Selected: {formData.product_ids.length} product(s)
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Image</label>
            <div className="mt-1 space-y-3">
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative w-full bg-gray-100 rounded-lg p-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto rounded-lg border border-gray-300 object-contain"
                    style={{ maxHeight: '256px', width: 'auto', margin: '0 auto', display: 'block' }}
                    onError={(e) => {
                      console.error('❌ Image preview failed to load:', imagePreview)
                      const target = e.currentTarget
                      target.style.display = 'none'
                      notify('error', 'Failed to load image preview')
                    }}
                    onLoad={() => {
                      console.log('✅ Image preview loaded:', imagePreview)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, image_url: '' })
                      setImagePreview(null)
                    }}
                    className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploading ? (
                      <span className="text-sm text-gray-600">Uploading...</span>
                    ) : (
                      <span className="text-sm text-gray-700">📷 Upload Image</span>
                    )}
                  </div>
                </label>
                
                {/* Or enter URL */}
                <span className="text-sm text-gray-500">or</span>
                
                <input
                  type="url"
                  value={formData.image_url || ''}
                  onChange={(e) => {
                    const url = e.target.value
                    setFormData({ ...formData, image_url: url })
                    if (url) {
                      // If it's already an absolute URL, use it directly
                      // Otherwise convert relative path to absolute
                      const previewUrl = /^https?:\/\//i.test(url) ? url : toAbs(url)
                      setImagePreview(previewUrl)
                    } else {
                      setImagePreview(null)
                    }
                  }}
                  placeholder="Enter image URL (e.g., /uploads/image.jpg or http://...)"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">Upload an image or enter a URL. Recommended: 1200x800px or similar aspect ratio</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Order Index</label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div className="flex items-center space-x-4 mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_featured || false}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="mr-2"
                />
                Featured
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="mr-2"
                />
                Published
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || (!isRecommendationPost && !formData.product_id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
