import React, { useState, useEffect } from 'react'
import { Calendar, User, ArrowLeft, X } from 'lucide-react'
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
          {/* Desktop Layout: Image on Left, Text on Right */}
          {post.images && post.images.length > 0 ? (
            <div className="hidden md:flex md:flex-row gap-0">
              {/* Image on Left */}
              <div className="relative w-1/2 min-h-[600px] flex-shrink-0">
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
              {/* Text Content on Right */}
              <div className="w-1/2 p-8 lg:p-12 overflow-y-auto">
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
                <h1 className="text-3xl lg:text-4xl font-serif mb-6" style={{
                  color: '#1B4965', 
                  fontWeight: 600, 
                  letterSpacing: '-0.01em',
                  lineHeight: '1.3',
                  fontFamily: 'Georgia, "Times New Roman", serif'
                }}>
                  {post.title}
                </h1>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-lg lg:text-xl font-light mb-8 leading-relaxed" style={{
                    color: '#4B97C9', 
                    fontSize: '1.125rem',
                    lineHeight: '1.7',
                    letterSpacing: '0.01em',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {post.excerpt}
                  </p>
                )}

                {/* Content */}
                <div 
                  className="prose prose-lg max-w-none mb-8"
                  style={{
                    color: '#1a1a1a',
                    lineHeight: '1.8',
                    fontSize: '1.0625rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                    fontWeight: 400,
                    letterSpacing: '0.01em'
                  }}
                >
                  {post.content ? (
                    post.content.includes('<') && post.content.includes('>') ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: post.content }}
                        style={{
                          color: '#1a1a1a',
                          lineHeight: '1.8',
                          fontSize: '1.0625rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      />
                    ) : (
                      <div 
                        style={{ 
                          whiteSpace: 'pre-wrap',
                          color: '#1a1a1a',
                          lineHeight: '1.8',
                          fontSize: '1.0625rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {post.content.split('\n').map((paragraph, index) => (
                          paragraph.trim() ? (
                            <p key={index} style={{ 
                              marginBottom: '1.25rem', 
                              marginTop: index === 0 ? 0 : '1.25rem',
                              color: '#1a1a1a',
                              lineHeight: '1.8'
                            }}>
                              {paragraph}
                            </p>
                          ) : null
                        ))}
                      </div>
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
            </div>
          ) : (
            /* No image - show content in single column */
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
              <h1 className="text-4xl font-serif mb-6" style={{color: '#1B4965', fontWeight: 600, letterSpacing: '-0.02em'}}>
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-xl font-light mb-8 leading-relaxed" style={{color: '#4B97C9', fontSize: '1.25rem', lineHeight: '1.75'}}>
                  {post.excerpt}
                </p>
              )}

              {/* Content */}
              <div 
                className="prose prose-lg max-w-none mb-8"
                style={{
                  color: '#2d3748',
                  lineHeight: '1.85',
                  fontSize: '1.125rem',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 400
                }}
              >
                {post.content ? (
                  post.content.includes('<') && post.content.includes('>') ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: post.content }}
                      style={{
                        color: '#2d3748',
                        lineHeight: '1.85',
                        fontSize: '1.125rem'
                      }}
                    />
                  ) : (
                    <div 
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        color: '#2d3748',
                        lineHeight: '1.85',
                        fontSize: '1.125rem',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}
                    >
                      {post.content.split('\n').map((paragraph, index) => (
                        paragraph.trim() ? (
                          <p key={index} style={{ marginBottom: '1.5rem', marginTop: index === 0 ? 0 : '1.5rem' }}>
                            {paragraph}
                          </p>
                        ) : null
                      ))}
                    </div>
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
          )}

          {/* Mobile Layout: Image Above, Content Below */}
          {post.images && post.images.length > 0 && (
            <div className="md:hidden">
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
            </div>
          )}

          {/* Post Content - Mobile or when no image */}
          <div className={`p-8 ${post.images && post.images.length > 0 ? 'md:hidden' : ''}`}>
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
            <h1 className="text-4xl font-serif mb-6" style={{color: '#1B4965', fontWeight: 600, letterSpacing: '-0.02em'}}>
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl font-light mb-8 leading-relaxed" style={{color: '#4B97C9', fontSize: '1.25rem', lineHeight: '1.75'}}>
                {post.excerpt}
              </p>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none mb-8"
              style={{
                color: '#1a1a1a',
                lineHeight: '1.8',
                fontSize: '1.0625rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                fontWeight: 400,
                letterSpacing: '0.01em'
              }}
            >
              {post.content ? (
                post.content.includes('<') && post.content.includes('>') ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: post.content }}
                    style={{
                      color: '#1a1a1a',
                      lineHeight: '1.8',
                      fontSize: '1.0625rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                      letterSpacing: '0.01em'
                    }}
                  />
                ) : (
                  <div 
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      color: '#1a1a1a',
                      lineHeight: '1.8',
                      fontSize: '1.0625rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                      letterSpacing: '0.01em'
                    }}
                  >
                    {post.content.split('\n').map((paragraph, index) => (
                      paragraph.trim() ? (
                        <p key={index} style={{ 
                          marginBottom: '1.25rem', 
                          marginTop: index === 0 ? 0 : '1.25rem',
                          color: '#1a1a1a',
                          lineHeight: '1.8'
                        }}>
                          {paragraph}
                        </p>
                      ) : null
                    ))}
                  </div>
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

        {/* Back and Close Buttons */}
        <div className="mt-8 flex items-center justify-center gap-4">
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

