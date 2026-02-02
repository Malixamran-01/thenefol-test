import React, { useState, useEffect } from 'react'
import { Calendar, ArrowLeft, X, MessageCircle, ThumbsUp } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

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

interface BlogComment {
  id: string
  post_id: string
  parent_id: string | null
  user_id?: string | number | null
  author_name?: string
  author_email?: string
  content: string
  created_at: string
}

export default function BlogDetail() {
  const { isAuthenticated, user } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [likesCount, setLikesCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState<Record<string, string>>({})

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
    fetchLikes()
    fetchComments()
  }, [post])

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

  const fetchLikes = async () => {
    if (!post) return
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`${apiBase}/api/blog/posts/${post.id}/likes`, { headers })
      if (response.ok) {
        const data = await response.json()
        setLikesCount(data.count || 0)
        setLiked(!!data.liked)
      } else {
        setLikesCount(0)
        setLiked(false)
      }
    } catch {
      setLikesCount(0)
      setLiked(false)
    }
  }

  const fetchComments = async () => {
    if (!post) return
    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/blog/posts/${post.id}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (err) {
      console.error('Failed to load comments:', err)
    }
  }

  const handleLikeToggle = async () => {
    if (!post) return
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
      return
    }
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiBase}/api/blog/posts/${post.id}/${liked ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLikesCount(data.count || 0)
        setLiked(!liked)
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  const submitComment = async (parentId?: string) => {
    if (!post) return
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
      return
    }
    const content = parentId ? replyText[parentId] : commentText
    if (!content || !content.trim()) return
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiBase}/api/blog/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          content,
          parent_id: parentId || null,
          author_name: user?.name,
          author_email: user?.email
        })
      })
      if (response.ok) {
        await fetchComments()
        if (parentId) {
          setReplyText(prev => ({ ...prev, [parentId]: '' }))
        } else {
          setCommentText('')
        }
      }
    } catch (err) {
      console.error('Failed to submit comment:', err)
    }
  }

  const buildCommentTree = (items: BlogComment[]) => {
    const byParent: Record<string, BlogComment[]> = {}
    items.forEach((comment) => {
      const key = comment.parent_id || 'root'
      if (!byParent[key]) byParent[key] = []
      byParent[key].push(comment)
    })
    const build = (parentId: string | null): BlogComment[] =>
      (byParent[parentId || 'root'] || []).map((comment) => ({
        ...comment,
        children: build(comment.id)
      })) as any
    return build(null)
  }

  const commentTree = buildCommentTree(comments)

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

        {/* Likes */}
        <div className="mt-10 flex items-center gap-3">
          <button
            onClick={handleLikeToggle}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              liked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            {liked ? 'Liked' : 'Like'}
          </button>
          <span className="text-sm text-gray-600">{likesCount} likes</span>
        </div>

        {/* Comments */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
            <span className="text-sm text-gray-500">({comments.length})</span>
          </div>

          <div className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              rows={3}
              placeholder={isAuthenticated ? 'Write a comment...' : 'Sign in to comment'}
              disabled={!isAuthenticated}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => submitComment()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!isAuthenticated || !commentText.trim()}
              >
                Post Comment
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {commentTree.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet. Be the first to comment.</p>
            ) : (
              commentTree.map((comment: any) => (
                <div key={comment.id} className="border-l-2 border-gray-100 pl-4">
                  <div className="rounded-lg border border-gray-100 bg-white p-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {comment.author_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(comment.created_at).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</div>
                  </div>

                  <div className="mt-2">
                    <textarea
                      value={replyText[comment.id] || ''}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      rows={2}
                      placeholder={isAuthenticated ? 'Reply...' : 'Sign in to reply'}
                      disabled={!isAuthenticated}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => submitComment(comment.id)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        disabled={!isAuthenticated || !(replyText[comment.id] || '').trim()}
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  {comment.children && comment.children.length > 0 && (
                    <div className="mt-4 space-y-3 pl-4 border-l border-gray-100">
                      {comment.children.map((child: any) => (
                        <div key={child.id} className="rounded-lg border border-gray-100 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {child.author_name || 'User'}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(child.created_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{child.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
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

