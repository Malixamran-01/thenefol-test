import React, { useState, useEffect } from 'react'
import { Plus, Calendar, User, Heart, MessageCircle, Tag } from 'lucide-react'
import BlogRequestForm from '../components/BlogRequestForm'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author_name: string
  author_email: string
  cover_image?: string
  detail_image?: string
  images: string[]
  created_at: string
  updated_at: string
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
  category?: string
  categories?: string[] | string
  likes_count?: number
  comments_count?: number
}

export default function Blog() {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Fetch approved blog posts
  const fetchBlogPosts = async () => {
    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/blog/posts`)
      if (response.ok) {
        const data = await response.json()
        // Convert relative image paths to full URLs
        const postsWithFullImageUrls = data.filter((post: BlogPost) => post.status === 'approved').map((post: BlogPost) => ({
          ...post,
          cover_image: post.cover_image && post.cover_image.startsWith('/uploads/') 
            ? `${apiBase}${post.cover_image}` 
            : post.cover_image,
          detail_image: post.detail_image && post.detail_image.startsWith('/uploads/') 
            ? `${apiBase}${post.detail_image}` 
            : post.detail_image,
          images: post.images.map((imagePath: string) => {
            if (imagePath.startsWith('/uploads/')) {
              return `${apiBase}${imagePath}`
            }
            return imagePath
          })
        }))
        setPosts(postsWithFullImageUrls)
      } else {
        setError('Failed to load blog posts')
      }
    } catch (error) {
      setError('Network error loading blog posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlogPosts()
  }, [])

  // Fallback posts if API fails
  const fallbackPosts: BlogPost[] = [
    {
      id: 'origin-blue-tea',
      title: 'The Origin of Blue Tea Flower',
      excerpt: 'Blue tea, commonly known as butterfly pea flower tea, originates from Southeast Asia, particularly Thailand, Vietnam, Malaysia, and India. The tea is derived from the Clitoria ternatea plant...',
      content: '',
      author_name: 'NEFOL® Team',
      author_email: '',
      cover_image: '/IMAGES/FACE SERUM (5).jpg',
      images: ['/IMAGES/FACE SERUM (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: true,
      categories: ['ingredients'],
      likes_count: 312,
      comments_count: 24
    },
    {
      id: 'diy-skincare-tips',
      title: 'DIY Skincare Tips Using Blue Pea Flower Extract',
      excerpt: 'While professional skincare products provide formulated benefits, incorporating DIY treatments can enhance your routine. Here are some simple recipes using Blue Pea Flower extract...',
      content: '',
      author_name: 'NEFOL® Team',
      author_email: '',
      cover_image: '/IMAGES/HYDRATING MOISTURIZER (5).jpg',
      images: ['/IMAGES/HYDRATING MOISTURIZER (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false,
      categories: ['diy'],
      likes_count: 198,
      comments_count: 17
    },
    {
      id: 'combat-skin-issues',
      title: 'How to Combat Common Skin Issues with NEFOL®\'s Skincare Line',
      excerpt: 'Everyone\'s skin is unique, but many of us face similar challenges. Whether it\'s acne, dryness, or signs of aging, NEFOL®\'s Blue Pea Flower-infused products can help address these concerns...',
      content: '',
      author_name: 'NEFOL® Team',
      author_email: '',
      cover_image: '/IMAGES/FACE MASK (5).jpg',
      images: ['/IMAGES/FACE MASK (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false,
      categories: ['concerns'],
      likes_count: 241,
      comments_count: 29
    },
    {
      id: 'skincare-routine-guide',
      title: 'A Comprehensive Guide to NEFOL®\'s Skincare Routine',
      excerpt: 'Achieving healthy, glowing skin doesn\'t have to be complicated. With the right products and a consistent routine, you can nurture your skin effectively...',
      content: '',
      author_name: 'NEFOL® Team',
      author_email: '',
      cover_image: '/IMAGES/FACE CLEANSER (5).jpg',
      images: ['/IMAGES/FACE CLEANSER (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false,
      categories: ['routine'],
      likes_count: 276,
      comments_count: 22
    },
    {
      id: 'natural-ingredients',
      title: 'Natural Ingredients for Glowing Skin: The Power of Blue Pea Flower and More',
      excerpt: 'Natural skincare offers a path to healthier, more radiant skin. By choosing products infused with powerful botanicals like the Blue Pea Flower...',
      content: '',
      author_name: 'NEFOL® Team',
      author_email: '',
      cover_image: '/IMAGES/BODY LOTION (5).jpg',
      images: ['/IMAGES/BODY LOTION (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false,
      categories: ['ingredients'],
      likes_count: 164,
      comments_count: 13
    },
    {
      id: 'blue-pea-benefits',
      title: 'Top 5 Skincare Benefits of Using Blue Pea Flower-Infused Products',
      excerpt: 'When it comes to skincare, natural ingredients are becoming increasingly popular for their gentle yet effective properties. The Blue Pea Flower stands out as a powerhouse ingredient...',
      content: '',
      author_name: 'NEFOL® Team',
      author_email: '',
      cover_image: '/IMAGES/HAIR MASK (5).jpg',
      images: ['/IMAGES/HAIR MASK (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false,
      categories: ['benefits'],
      likes_count: 221,
      comments_count: 19
    },
  ]

  const displayPosts = posts.length > 0 ? posts : fallbackPosts

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCategoryLabel = (category: string) =>
    category
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const extractCategories = (post: BlogPost) => {
    if (Array.isArray(post.categories)) {
      return post.categories.map((category) => category.trim().toLowerCase()).filter(Boolean)
    }
    if (typeof post.categories === 'string') {
      const trimmed = post.categories.trim()
      if (!trimmed) return []
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((category) => String(category).trim().toLowerCase()).filter(Boolean)
        }
      } catch {
        // fall through to comma separation
      }
      return trimmed.split(',').map((category) => category.trim().toLowerCase()).filter(Boolean)
    }
    if (post.category) {
      const trimmed = post.category.trim()
      return trimmed ? [trimmed.toLowerCase()] : []
    }
    return []
  }

  const getPrimaryCategory = (post: BlogPost) => {
    const categories = extractCategories(post)
    return categories[0] ?? 'general'
  }

  const getPostStats = (post: BlogPost) => {
    const seedSource = (post.id ?? post.title ?? '').toString()
    const base = seedSource.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
    const likes = post.likes_count ?? (base % 420) + 35
    const comments = post.comments_count ?? (base % 60) + 6
    return { likes, comments }
  }

  const postCategories = displayPosts.flatMap((post) => extractCategories(post))
  const categories = ['All', ...Array.from(new Set([...BLOG_CATEGORY_OPTIONS, ...postCategories]))]
  const filteredPosts = selectedCategory === 'All'
    ? displayPosts
    : displayPosts.filter((post) => extractCategories(post).includes(selectedCategory))

  return (
    <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif mb-4" style={{color: '#1B4965'}}>BLOG</h1>
          <p className="text-lg font-light max-w-2xl mx-auto mb-6" style={{color: '#9DB4C0'}}>
            Discover the latest insights on natural skincare, beauty tips, and the science behind our ingredients.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p style={{color: '#9DB4C0'}}>Loading blog posts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">No posts available at the moment</p>
          </div>
        ) : null}

        {/* Category Filters */}
        <div className="mb-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm uppercase tracking-widest" style={{ color: '#9DB4C0' }}>
              <Tag className="h-4 w-4" />
              Browse by category
            </div>
            <div className="hidden sm:flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                    selectedCategory === category
                      ? 'text-white border-transparent'
                      : 'text-[#1B4965] border-[#DCE6EE] bg-white'
                  }`}
                  style={{
                    backgroundColor: selectedCategory === category ? '#1B4965' : 'white'
                  }}
                >
                  {category === 'All' ? 'All' : formatCategoryLabel(category)}
                </button>
              ))}
            </div>
            <div className="w-full sm:hidden">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-12 rounded-full border border-[#DCE6EE] px-4 text-sm focus:border-[#1B4965] focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{ color: '#1B4965' }}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'All' ? 'All' : formatCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => {
            const { likes, comments } = getPostStats(post)
            const coverImage = post.cover_image || post.images[0] || '/IMAGES/default-blog.jpg'
            return (
              <div key={post.id} className="flex flex-col gap-3">
                {/* Author Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#1B4965' }}>
                      {post.author_name}
                    </span>
                  </div>
                  <button
                    className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                    style={{ 
                      backgroundColor: '#1B4965',
                      color: 'white'
                    }}
                  >
                    Subscribe
                  </button>
                </div>

                {/* Card */}
                <article className="group relative h-[420px] overflow-hidden rounded-2xl bg-white bg-cover bg-center shadow-sm transition-all duration-300 hover:shadow-lg">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${coverImage})` }}
                  />
                  <div className="absolute inset-0">
                    {post.featured && (
                      <span className="absolute left-4 top-4 rounded-full bg-[#4B97C9] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex h-[35%] flex-col justify-between overflow-hidden bg-[#3C3936]/40 px-6 py-4 text-white backdrop-blur-sm">
                    <div className="flex-1 overflow-hidden">
                      <h3
                        className="mb-2 text-lg font-semibold leading-tight"
                        style={{
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {post.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed text-white/80"
                        style={{
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/20 pt-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-4 w-4" />
                          <span className="text-sm font-medium">{likes}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{comments}</span>
                        </div>
                      </div>
                      <a
                        href={`#/user/blog/${post.id}`}
                        className="rounded-lg bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-white hover:text-[#1B4965]"
                      >
                        Read more
                      </a>
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
        </div>

        {/* Subscription Section */}
        <div className="mt-16">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h3 className="text-2xl font-serif mb-4" style={{color: '#1B4965'}}>Stay Updated</h3>
            <p className="text-lg font-light mb-6" style={{color: '#9DB4C0'}}>
              Subscribe to our WhatsApp updates for the latest beauty tips, product updates, and exclusive offers.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="tel" 
                placeholder="Enter your WhatsApp number"
                className="flex-1 h-12 rounded-lg border border-gray-300 px-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required 
              />
              <button 
                type="submit"
                className="px-8 py-3 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
                style={{backgroundColor: '#1B4965'}}
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </div>

        {/* Submit Blog Request Button */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-2xl font-serif mb-4" style={{color: '#1B4965'}}>Share Your Story</h3>
            <p className="text-lg font-light mb-6" style={{color: '#9DB4C0'}}>
              Have a skincare tip, beauty secret, or personal journey to share? Submit your blog post and inspire our community.
            </p>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowRequestForm(true)
                } else {
                  setShowAuthPrompt(true)
                }
              }}
              className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium rounded-lg transition-colors text-sm tracking-wide uppercase shadow-lg"
              style={{ backgroundColor: 'rgb(75,151,201)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
            >
              <Plus className="w-5 h-5" />
              Submit Your Blog Post
            </button>
          </div>
        </div>
      </div>

      {/* Blog Request Form Modal */}
      {showRequestForm && (
        <BlogRequestForm
          onClose={() => setShowRequestForm(false)}
          onSubmitSuccess={() => {
            // Refresh blog posts after successful submission
            fetchBlogPosts()
          }}
        />
      )}

      {/* Authentication Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgb(75,151,201,0.1)' }}>
                  <User className="w-8 h-8" style={{ color: 'rgb(75,151,201)' }} />
                </div>
              </div>
              <h3 className="text-2xl font-serif mb-3" style={{color: '#1B4965'}}>
                Sign In Required
              </h3>
              <p className="text-base mb-6" style={{color: '#9DB4C0'}}>
                Please sign in to your account to submit a blog post. If you don't have an account yet, you can create one in just a few moments.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    // Save the current page to redirect back after login
                    sessionStorage.setItem('post_login_redirect', '#/user/blog')
                    window.location.hash = '#/user/login'
                  }}
                  className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgb(75,151,201)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    // Save the current page to redirect back after signup
                    sessionStorage.setItem('post_login_redirect', '#/user/blog')
                    window.location.hash = '#/user/signup'
                  }}
                  className="flex-1 px-6 py-3 font-medium rounded-lg transition-colors border-2"
                  style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'rgb(75,151,201)'
                  }}
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="mt-4 text-sm underline"
                style={{color: '#9DB4C0'}}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
