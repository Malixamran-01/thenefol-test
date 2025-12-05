import React, { useState, useEffect } from 'react'
import { Calendar, User, ArrowLeft } from 'lucide-react'
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

export default function BlogDetail() {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadBlogPost = async () => {
      const hash = window.location.hash || '#/'
      const match = hash.match(/^#\/user\/blog\/([^?#]+)/)
      const postId = match?.[1]
      
      if (!postId) {
        setError('Invalid blog post ID')
        setLoading(false)
        return
      }

      try {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/blog/posts/${postId}`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Parse images if it's a JSON string, otherwise use as-is
          let images: string[] = []
          if (typeof data.images === 'string') {
            try {
              images = JSON.parse(data.images)
            } catch (e) {
              console.warn('Could not parse images JSON:', e)
              images = []
            }
          } else if (Array.isArray(data.images)) {
            images = data.images
          }
          
          // Convert relative image paths to full URLs
          const postWithFullImageUrls = {
            ...data,
            images: images.map((imagePath: string) => {
              if (imagePath.startsWith('/uploads/')) {
                return `${apiBase}${imagePath}`
              }
              return imagePath
            })
          }
          setPost(postWithFullImageUrls)
        } else if (response.status === 404) {
          setError('Blog post not found')
        } else {
          setError('Failed to load blog post')
        }
      } catch (error) {
        console.error('Error loading blog post:', error)
        setError('Network error loading blog post')
      } finally {
        setLoading(false)
      }
    }

    loadBlogPost()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleBack = () => {
    window.location.hash = '#/user/blog'
  }

  if (loading) {
    return (
      <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <p style={{color: '#9DB4C0'}}>Loading blog post...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error || 'Blog post not found'}</p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
              style={{backgroundColor: '#1B4965'}}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-4xl px-4">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{color: '#1B4965'}}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </button>

        {/* Blog Post Content */}
        <article className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Featured Image */}
          {post.images && post.images.length > 0 && (
            <div className="relative w-full h-96">
              <img 
                src={post.images[0]} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
              {post.featured && (
                <div className="absolute top-4 left-4">
                  <span className="text-white px-3 py-1 text-xs font-medium tracking-wide uppercase rounded-full" style={{backgroundColor: '#4B97C9'}}>
                    FEATURED
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Post Content */}
          <div className="p-8">
            {/* Meta Information */}
            <div className="mb-6 flex items-center gap-4 text-sm" style={{color: '#9DB4C0'}}>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {post.author_name}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-serif mb-6" style={{color: '#1B4965'}}>
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl font-light mb-8 leading-relaxed" style={{color: '#9DB4C0'}}>
                {post.excerpt}
              </p>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none mb-8"
              style={{
                color: '#1B4965',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap'
              }}
            >
              {post.content ? (
                post.content.includes('<') && post.content.includes('>') ? (
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                ) : (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
                )
              ) : (
                <p style={{ color: '#9DB4C0' }}>No content available.</p>
              )}
            </div>

            {/* Additional Images */}
            {post.images && post.images.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {post.images.slice(1).map((image, index) => (
                  <img 
                    key={index}
                    src={image} 
                    alt={`${post.title} - Image ${index + 2}`}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            {/* Author Info */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center" style={{backgroundColor: '#9DB4C0'}}>
                  <User className="w-8 h-8" style={{color: '#1B4965'}} />
                </div>
                <div>
                  <p className="font-semibold" style={{color: '#1B4965'}}>{post.author_name}</p>
                  {post.author_email && (
                    <p className="text-sm" style={{color: '#9DB4C0'}}>{post.author_email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Back to Blog Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
            style={{backgroundColor: '#1B4965'}}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Posts
          </button>
        </div>
      </div>
    </main>
  )
}

