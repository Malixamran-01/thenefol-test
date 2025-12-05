import React, { useState, useEffect } from 'react'
import { Plus, Calendar, User, Eye } from 'lucide-react'
import BlogRequestForm from '../components/BlogRequestForm'
import { getApiBase } from '../utils/apiBase'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author_name: string
  author_email: string
  images: string[]
  created_at: string
  updated_at: string
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [error, setError] = useState('')

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
  const fallbackPosts = [
    {
      id: 'origin-blue-tea',
      title: 'The Origin of Blue Tea Flower',
      excerpt: 'Blue tea, commonly known as butterfly pea flower tea, originates from Southeast Asia, particularly Thailand, Vietnam, Malaysia, and India. The tea is derived from the Clitoria ternatea plant...',
      content: '',
      author_name: 'Nefol Team',
      author_email: '',
      images: ['/IMAGES/FACE SERUM (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: true
    },
    {
      id: 'diy-skincare-tips',
      title: 'DIY Skincare Tips Using Blue Pea Flower Extract',
      excerpt: 'While professional skincare products provide formulated benefits, incorporating DIY treatments can enhance your routine. Here are some simple recipes using Blue Pea Flower extract...',
      content: '',
      author_name: 'Nefol Team',
      author_email: '',
      images: ['/IMAGES/HYDRATING MOISTURIZER (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false
    },
    {
      id: 'combat-skin-issues',
      title: 'How to Combat Common Skin Issues with Nefol\'s Skincare Line',
      excerpt: 'Everyone\'s skin is unique, but many of us face similar challenges. Whether it\'s acne, dryness, or signs of aging, Nefol\'s Blue Pea Flower-infused products can help address these concerns...',
      content: '',
      author_name: 'Nefol Team',
      author_email: '',
      images: ['/IMAGES/FACE MASK (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false
    },
    {
      id: 'skincare-routine-guide',
      title: 'A Comprehensive Guide to Nefol\'s Skincare Routine',
      excerpt: 'Achieving healthy, glowing skin doesn\'t have to be complicated. With the right products and a consistent routine, you can nurture your skin effectively...',
      content: '',
      author_name: 'Nefol Team',
      author_email: '',
      images: ['/IMAGES/FACE CLEANSER (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false
    },
    {
      id: 'natural-ingredients',
      title: 'Natural Ingredients for Glowing Skin: The Power of Blue Pea Flower and More',
      excerpt: 'Natural skincare offers a path to healthier, more radiant skin. By choosing products infused with powerful botanicals like the Blue Pea Flower...',
      content: '',
      author_name: 'Nefol Team',
      author_email: '',
      images: ['/IMAGES/BODY LOTION (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false
    },
    {
      id: 'blue-pea-benefits',
      title: 'Top 5 Skincare Benefits of Using Blue Pea Flower-Infused Products',
      excerpt: 'When it comes to skincare, natural ingredients are becoming increasingly popular for their gentle yet effective properties. The Blue Pea Flower stands out as a powerhouse ingredient...',
      content: '',
      author_name: 'Nefol Team',
      author_email: '',
      images: ['/IMAGES/HAIR MASK (5).jpg'],
      created_at: '2025-05-01',
      updated_at: '2025-05-01',
      status: 'approved' as const,
      featured: false
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

        {/* Featured Post */}
        {displayPosts.filter(post => post.featured).map((post) => (
          <div key={post.id} className="mb-16">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="relative">
                  <img 
                    src={post.images[0] || '/IMAGES/default-blog.jpg'} 
                    alt={post.title}
                    className="w-full h-96 lg:h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="text-white px-3 py-1 text-xs font-medium tracking-wide uppercase rounded-full" style={{backgroundColor: '#4B97C9'}}>
                      FEATURED
                    </span>
                  </div>
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="mb-4 flex items-center gap-4 text-sm" style={{color: '#9DB4C0'}}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {post.author_name}
                    </div>
                  </div>
                  <h2 className="text-3xl font-serif mb-4" style={{color: '#1B4965'}}>
                    {post.title}
                  </h2>
                  <p className="text-lg font-light mb-6 leading-relaxed" style={{color: '#9DB4C0'}}>
                    {post.excerpt}
                  </p>
                  <a 
                    href={`#/user/blog/${post.id}`}
                    className="inline-block px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg"
                    style={{backgroundColor: '#1B4965'}}
                  >
                    READ MORE
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayPosts.filter(post => !post.featured).map((post) => (
            <article key={post.id} className="bg-white rounded-lg shadow-sm group overflow-hidden">
              <div className="relative overflow-hidden">
                <img 
                  src={post.images[0] || '/IMAGES/default-blog.jpg'} 
                  alt={post.title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                  <span className="text-white px-3 py-1 text-xs font-medium tracking-wide uppercase rounded-full" style={{backgroundColor: '#4B97C9'}}>
                    BLOG
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-4 text-sm" style={{color: '#9DB4C0'}}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(post.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {post.author_name}
                  </div>
                </div>
                <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>
                  {post.title}
                </h3>
                <p className="text-sm font-light mb-4 leading-relaxed" style={{color: '#9DB4C0'}}>
                  {post.excerpt}
                </p>
                <a 
                  href={`#/user/blog/${post.id}`}
                  className="inline-block px-6 py-3 text-white font-medium transition-all duration-300 text-xs tracking-wide uppercase shadow-lg"
                  style={{backgroundColor: '#4B97C9'}}
                >
                  READ MORE
                </a>
              </div>
            </article>
          ))}
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
              onClick={() => setShowRequestForm(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm tracking-wide uppercase shadow-lg"
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
    </main>
  )
}
