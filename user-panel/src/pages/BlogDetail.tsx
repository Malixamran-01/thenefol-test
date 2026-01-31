import React, { useState, useEffect } from 'react'
import { Calendar, ArrowLeft, X } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author_name: string
  author_email: string
  user_id?: string | number
  images: string[]
  created_at: string
  updated_at: string
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
  meta_title?: string
  meta_description?: string
  meta_keywords?: string[] | string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  categories?: string[] | string
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

  useEffect(() => {
    if (!post) return

    const setMeta = (key: string, value: string, attr: 'name' | 'property' = 'name') => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute(attr, key)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', value)
    }

    const setLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', rel)
        document.head.appendChild(link)
      }
      link.setAttribute('href', href)
    }

    const keywords = Array.isArray(post.meta_keywords)
      ? post.meta_keywords.join(', ')
      : typeof post.meta_keywords === 'string'
        ? post.meta_keywords
        : ''

    const ogImage = post.og_image || post.images?.[0] || ''
    const pageUrl = post.canonical_url || window.location.href

    document.title = post.meta_title || post.title
    setMeta('description', post.meta_description || post.excerpt || '')
    if (keywords) setMeta('keywords', keywords)

    setMeta('og:title', post.og_title || post.meta_title || post.title, 'property')
    setMeta('og:description', post.og_description || post.meta_description || post.excerpt || '', 'property')
    if (ogImage) setMeta('og:image', ogImage, 'property')
    setMeta('og:type', 'article', 'property')
    setMeta('og:url', pageUrl, 'property')

    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary', 'property')
    setMeta('twitter:title', post.og_title || post.meta_title || post.title, 'property')
    setMeta('twitter:description', post.og_description || post.meta_description || post.excerpt || '', 'property')
    if (ogImage) setMeta('twitter:image', ogImage, 'property')

    if (pageUrl) setLink('canonical', pageUrl)
  }, [post])

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

  const handleClose = () => {
    window.location.hash = '#/user/blog'
  }

  const handleAuthorClick = () => {
    if (!post) return
    const authorId = post.user_id ?? 'guest'
    sessionStorage.setItem('blog_author_profile', JSON.stringify({
      id: authorId,
      name: post.author_name,
      email: post.author_email
    }))
    window.location.hash = `#/user/author/${authorId}`
  }

  const getReadingTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, ' ')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    const minutes = Math.max(1, Math.round(words / 200))
    return `${minutes} min read`
  }

  const parseCategories = (value: BlogPost['categories']) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return value.split(',').map(item => item.trim()).filter(Boolean)
      }
    }
    return []
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
              style={{backgroundColor: 'rgb(75,151,201)'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </button>
          </div>
        </div>
      </main>
    )
  }

  const categories = parseCategories(post.categories)
  const readingTime = getReadingTime(post.content || '')

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-10">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{color: '#1B4965'}}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </button>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 leading-tight">
          {post.title}
        </h1>

        {/* Author Block */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <button
            onClick={handleAuthorClick}
            className="inline-flex items-center gap-2 hover:text-gray-900 transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-semibold">
              {post.author_name?.charAt(0) || 'U'}
            </span>
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900">Posted by {post.author_name}</div>
              <div className="text-xs text-gray-500">{post.author_email || 'Author'}</div>
            </div>
          </button>
          <span className="text-gray-400">•</span>
          <div className="inline-flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(post.created_at)}
          </div>
          <span className="text-gray-400">•</span>
          <div>{readingTime}</div>
        </div>

        {/* Hero Image (16:9) */}
        {post.images && post.images.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-2xl bg-gray-100">
            <div className="aspect-video w-full">
              <img
                src={post.images[0]}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-8 text-lg sm:text-xl leading-relaxed text-gray-700">
            {post.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none mt-10 text-gray-800"
          style={{
            lineHeight: '1.85',
            fontSize: '1.0625rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
          }}
        >
          {post.content ? (
            post.content.includes('<') && post.content.includes('>') ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {post.content.split('\n').map((paragraph, index) =>
                  paragraph.trim() ? <p key={index}>{paragraph}</p> : null
                )}
              </div>
            )
          ) : (
            <p style={{ color: '#9DB4C0' }}>No content available.</p>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {categories.map(category => (
              <span
                key={category}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {category}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg hover:opacity-90"
            style={{backgroundColor: '#1B4965'}}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg hover:opacity-90 border-2"
            style={{borderColor: '#1B4965', backgroundColor: 'transparent', color: '#1B4965'}}
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </main>
  )
}

