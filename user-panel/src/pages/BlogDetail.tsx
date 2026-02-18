import React, { useState, useEffect } from 'react'
import { Calendar, ArrowLeft, X, MessageCircle, ThumbsUp, Share2 } from 'lucide-react'
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
  cover_image?: string
  detail_image?: string
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
  allow_comments?: boolean
}

interface BlogComment {
  id: string
  post_id: string
  parent_id: string | null
  ancestors?: number[] | null
  depth?: number
  user_id?: string | number | null
  author_name?: string
  author_email?: string
  content: string
  created_at: string
  like_count?: number
  liked?: boolean
  children?: BlogComment[]
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
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [activeEditId, setActiveEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState<Record<string, string>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({})
  const [commentSort, setCommentSort] = useState<'new' | 'old' | 'top' | 'replies'>('new')
  const [showShareMenu, setShowShareMenu] = useState(false)

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
          
          // Convert relative image paths to full URLs (required for og:image, etc.)
          const toFullUrl = (url: string | undefined) =>
            url && url.startsWith('/uploads/') ? `${apiBase}${url}` : url
          const postWithFullImageUrls = {
            ...data,
            cover_image: toFullUrl(data.cover_image) || data.cover_image,
            detail_image: toFullUrl(data.detail_image) || data.detail_image,
            og_image: toFullUrl(data.og_image) || data.og_image,
            images: images.map((imagePath: string) => toFullUrl(imagePath) || imagePath)
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
  }, [post, commentSort])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showShareMenu && !target.closest('.share-menu-container')) {
        setShowShareMenu(false)
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

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

    // Fallback chain (matches backend meta page)
    const title = post.meta_title || post.title
    const description = post.meta_description || post.excerpt || ''
    const ogTitle = post.og_title || title
    const ogDescription = post.og_description || description
    const base = getApiBase().replace(/\/$/, '')
    const canonicalUrl = post.canonical_url?.startsWith('http') ? post.canonical_url : `${base}/blog/${post.id}`
    const ogImage = post.og_image || post.cover_image || post.detail_image || ''

    document.title = title
    setMeta('description', description)
    if (keywords) setMeta('keywords', keywords)

    setMeta('og:title', ogTitle, 'property')
    setMeta('og:description', ogDescription, 'property')
    setMeta('og:url', canonicalUrl, 'property')
    setMeta('og:type', 'article', 'property')
    setMeta('og:site_name', 'The Nefol', 'property')
    if (ogImage) {
      setMeta('og:image', ogImage, 'property')
      setMeta('og:image:width', '1200', 'property')
      setMeta('og:image:height', '630', 'property')
    }
    setMeta('article:published_time', post.created_at, 'property')
    setMeta('article:modified_time', post.updated_at || post.created_at, 'property')
    setMeta('article:author', post.author_name || '', 'property')

    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary', 'property')
    setMeta('twitter:title', ogTitle, 'property')
    setMeta('twitter:description', ogDescription, 'property')
    if (ogImage) setMeta('twitter:image', ogImage, 'property')

    setLink('canonical', canonicalUrl)

    // JSON-LD (separate from meta – huge for SEO rich results)
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description: description.replace(/<[^>]*>/g, '').slice(0, 200),
      author: { '@type': 'Person', name: post.author_name || 'Unknown' },
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl }
    }
    if (ogImage) jsonLd.image = ogImage
    let script = document.querySelector('script[data-blog-jsonld]') as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.setAttribute('type', 'application/ld+json')
      script.setAttribute('data-blog-jsonld', '')
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(jsonLd)

    return () => {
      script?.remove()
    }
  }, [post])

  const processContentImages = (content: string, apiBase: string, postImages: string[] = []): string => {
    if (!content) return content
    
    console.log('Original content:', content)
    console.log('Available images:', postImages)
    
    let processedContent = content
    
    // Replace relative image URLs in img tags with full URLs
    processedContent = processedContent
      // Handle standard src="/uploads/..." format
      .replace(/src="(\/uploads\/[^"]+)"/g, `src="${apiBase}$1"`)
      // Handle src='/uploads/...' format (single quotes)
      .replace(/src='(\/uploads\/[^']+)'/g, `src="${apiBase}$1"`)
      // Handle cases where there might be extra spaces
      .replace(/src\s*=\s*"(\/uploads\/[^"]+)"/g, `src="${apiBase}$1"`)
      .replace(/src\s*=\s*'(\/uploads\/[^']+)'/g, `src="${apiBase}$1"`)
    
    // Replace blob URLs or data-filename references with actual uploaded images
    processedContent = processedContent.replace(
      /<img[^>]*data-filename="([^"]+)"[^>]*>/gi,
      (match, filename) => {
        console.log('Found img with data-filename:', filename)
        // Find the matching image in postImages array
        const matchingImage = postImages.find(img => img.includes(filename) || filename.includes(img.split('/').pop() || ''))
        if (matchingImage) {
          console.log('Matched with:', matchingImage)
          return `<img src="${matchingImage}" alt="Blog image" style="max-width: 100%; height: auto; margin: 20px auto; display: block; border-radius: 8px;" />`
        }
        // If no match found, try to construct the path
        const imagePath = filename.startsWith('/uploads/') ? `${apiBase}${filename}` : `${apiBase}/uploads/blog/${filename}`
        return `<img src="${imagePath}" alt="Blog image" style="max-width: 100%; height: auto; margin: 20px auto; display: block; border-radius: 8px;" />`
      }
    )
    
    // Handle cases where image paths might be stored as plain text (not in img tags)
    // Convert standalone /uploads/ paths to proper img tags
    processedContent = processedContent.replace(
      /(?<!src=["'])(\/uploads\/blog\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|svg))(?!["'])/gi,
      `<img src="${apiBase}$1" alt="Blog image" style="max-width: 100%; height: auto; margin: 20px auto; display: block; border-radius: 8px;" />`
    )
    
    // Also handle just the filename without path (in case it's stored that way)
    processedContent = processedContent.replace(
      /(?<!src=["']|\/)([\w-]+\.(?:jpg|jpeg|png|gif|webp|svg))(?!["'])/gi,
      (match, filename) => {
        // Check if this looks like an uploaded blog image filename (has UUID pattern)
        if (filename.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)) {
          // Try to find it in the postImages array first
          const matchingImage = postImages.find(img => img.includes(filename))
          if (matchingImage) {
            return `<img src="${matchingImage}" alt="Blog image" style="max-width: 100%; height: auto; margin: 20px auto; display: block; border-radius: 8px;" />`
          }
          return `<img src="${apiBase}/uploads/blog/${filename}" alt="Blog image" style="max-width: 100%; height: auto; margin: 20px auto; display: block; border-radius: 8px;" />`
        }
        return match
      }
    )

    // Fix image width styles to stay within content frame (no viewport overflow)
    processedContent = processedContent.replace(
      /<img([^>]*)>/gi,
      (match) => {
        const widthStyleMatch = match.match(/data-width-style=["'](full|wide|normal)["']/i)
        const style = widthStyleMatch ? widthStyleMatch[1].toLowerCase() : null
        const styleAttr = match.match(/style=["']([^"']*)["']/)?.[1] ?? ''
        const hasOverflow = /100vw|calc\(|120%/.test(styleAttr)
        const widthCss = style === 'full' ? 'width:100%;max-width:100%' : style === 'wide' ? 'width:50%;max-width:50%' : 'width:auto;max-width:100%'
        const newStyle = `height:auto;margin:10px auto;display:block;${widthCss}`
        if (style || hasOverflow) {
          if (match.includes('style=')) {
            return match.replace(/\s*style=["'][^"']*["']/, ` style="${newStyle}"`)
          }
          return match.replace(/<img/, `<img style="${newStyle}"`)
        }
        return match
      }
    )

    console.log('Processed content:', processedContent)
    return processedContent
  }

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
      const response = await fetch(`${apiBase}/api/blog/posts/${post.id}/comments?sort=${commentSort}`)
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
          setActiveReplyId(null)
        } else {
          setCommentText('')
        }
      }
    } catch (err) {
      console.error('Failed to submit comment:', err)
    }
  }

  const submitEdit = async (commentId: string) => {
    if (!post) return
    if (!isAuthenticated) return
    const content = editText[commentId]
    if (!content || !content.trim()) return
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiBase}/api/blog/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content })
      })
      if (response.ok) {
        await fetchComments()
        setActiveEditId(null)
      }
    } catch (err) {
      console.error('Failed to edit comment:', err)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!post) return
    if (!isAuthenticated) return
    if (!confirm('Delete this comment?')) return
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiBase}/api/blog/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (response.ok) {
        await fetchComments()
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const toggleText = (commentId: string) => {
    setExpandedText(prev => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const toggleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!post) return
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
      return
    }
    try {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiBase}/api/blog/comments/${commentId}/${isLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (response.ok) {
        await fetchComments()
      }
    } catch (err) {
      console.error('Failed to toggle comment like:', err)
    }
  }

  const buildCommentTree = (items: BlogComment[]) => {
    // Always use parent_id method since it works reliably
    const byParent: Record<string, BlogComment[]> = {}
    items.forEach((comment) => {
      const key = comment.parent_id || 'root'
      if (!byParent[key]) byParent[key] = []
      byParent[key].push(comment)
    })
    
    const sortByOldest = (a: BlogComment, b: BlogComment) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    
    const build = (parentId: string | null): BlogComment[] =>
      (byParent[parentId || 'root'] || [])
        .sort(sortByOldest)
        .map((comment) => ({
          ...comment,
          children: build(comment.id)
        })) as any
    
    return build(null)
  }

  const commentTree = buildCommentTree(comments)
  const sortedRoots = [...commentTree].sort((a: any, b: any) => {
    if (commentSort === 'new') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (commentSort === 'old') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    if (commentSort === 'replies') {
      const countReplies = (comment: BlogComment): number => {
        return (comment.children?.length || 0) + (comment.children?.reduce((sum, c) => sum + countReplies(c), 0) || 0)
      }
      return countReplies(b) - countReplies(a)
    }
    return (b.like_count || 0) - (a.like_count || 0)
  })

  // Recursive component to render nested comments
  const renderComment = (comment: BlogComment, depth: number = 0) => {
    const replies = comment.children || []
    const isExpanded = expandedComments[comment.id] ?? false // Collapsed by default
    const isEditing = activeEditId === comment.id
    const textExpanded = expandedText[comment.id] ?? false
    const showTruncate = (comment.content || '').length > 220
    const displayText = showTruncate && !textExpanded
      ? `${comment.content.slice(0, 220)}...`
      : comment.content
    
    // Calculate indentation based on depth (max 8 levels deep for visual clarity)
    const indentLevel = Math.min(depth, 8)
    const marginLeft = indentLevel * 16 // 16px per level for tighter nesting
    
    return (
      <div key={comment.id} className="mb-3">
        <div 
          className={`rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors shadow-sm ${depth > 0 ? 'ml-6' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">
                {comment.author_name || 'User'}
                {post?.user_id && String(comment.user_id || '') === String(post.user_id) && (
                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    Author
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
            {isAuthenticated && String(comment.user_id || '') === String(user?.id || '') && (
              <div className="relative">
                <button
                  onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                  className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                >
                  ⋯
                </button>
                {openMenuId === comment.id && (
                  <div className="absolute right-0 mt-2 w-28 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                    <button
                      onClick={() => {
                        setActiveEditId(comment.id)
                        setEditText(prev => ({ ...prev, [comment.id]: comment.content }))
                        setOpenMenuId(null)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null)
                        deleteComment(comment.id)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap mt-2">
              {displayText}
              {showTruncate && (
                <button
                  onClick={() => toggleText(comment.id)}
                  className="ml-2 text-xs text-blue-600 hover:underline"
                >
                  {textExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText[comment.id] || ''}
                onChange={(e) => setEditText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setActiveEditId(null)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitEdit(comment.id)}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
            <button
              onClick={() => toggleCommentLike(comment.id, !!comment.liked)}
              className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
            >
              <ThumbsUp className={`w-3 h-3 ${comment.liked ? 'text-blue-600 fill-current' : 'text-gray-500'}`} />
              {comment.like_count || 0}
            </button>
            <button
              onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
              className="hover:text-gray-900 transition-colors"
            >
              Reply
            </button>
            {replies.length > 0 && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="hover:text-gray-900 transition-colors inline-flex items-center gap-1"
              >
                {isExpanded ? 'Hide replies' : 'Show replies'}
                <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                  {replies.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Reply input */}
        {activeReplyId === comment.id && (
          <div className={`mt-2 ${depth > 0 ? 'ml-6' : ''}`}>
            <div className="flex items-center gap-2">
              <input
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder={isAuthenticated ? 'Write a reply…' : 'Sign in to reply'}
                disabled={!isAuthenticated}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && isAuthenticated && replyText[comment.id]?.trim()) {
                    submitComment(comment.id)
                  }
                }}
              />
              <button
                onClick={() => submitComment(comment.id)}
                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                disabled={!isAuthenticated || !(replyText[comment.id] || '').trim()}
              >
                Reply
              </button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {isExpanded && replies.length > 0 && (
          <div className={`mt-3 space-y-3 ${depth > 0 ? 'ml-6' : ''} border-l-2 border-gray-100 pl-3`}>
            {replies.map((child: BlogComment) => renderComment(child, depth + 1))}
          </div>
        )}
      </div>
    )
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

  // Use path-based URL for sharing - crawlers (WhatsApp, Facebook) fetch this and get OG meta tags
  const getShareUrl = () => {
    if (!post) return ''
    const base = getApiBase()
    return post.canonical_url && post.canonical_url.startsWith('http') ? post.canonical_url : `${base}/blog/${post.id}`
  }

  const handleShare = async () => {
    if (!post) return

    const shareUrl = getShareUrl()
    const shareTitle = post.og_title || post.meta_title || post.title
    const shareText = post.og_description || post.meta_description || post.excerpt || ''
    
    // Try native Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        })
        setShowShareMenu(false)
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err)
          setShowShareMenu(true) // Show fallback menu
        }
      }
    } else {
      // Fallback: show share menu with social media options
      setShowShareMenu(!showShareMenu)
    }
  }

  const copyToClipboard = async () => {
    if (!post) return
    const shareUrl = getShareUrl()
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('Link copied to clipboard!')
      setShowShareMenu(false)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareToSocial = (platform: string) => {
    if (!post) return
    const shareUrl = encodeURIComponent(getShareUrl())
    const shareTitle = encodeURIComponent(post.og_title || post.meta_title || post.title)
    const shareText = encodeURIComponent(post.og_description || post.meta_description || post.excerpt || '')
    
    let url = ''
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`
        break
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`
        break
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`
        break
      case 'whatsapp':
        url = `https://wa.me/?text=${shareTitle}%20${shareUrl}`
        break
      case 'telegram':
        url = `https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`
        break
      case 'email':
        url = `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${shareUrl}`
        break
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
      setShowShareMenu(false)
    }
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
        {/* Header with Back Button and Share Button */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{color: '#1B4965'}}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </button>

          {/* Share Button */}
          <div className="relative share-menu-container">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-md hover:shadow-lg"
              style={{backgroundColor: '#1B4965'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c5f7d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1B4965'}
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            {/* Share Menu Dropdown */}
            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                <div className="p-2">
                  <button
                    onClick={copyToClipboard}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </button>
                  <button
                    onClick={() => shareToSocial('whatsapp')}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter
                  </button>
                  <button
                    onClick={() => shareToSocial('linkedin')}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </button>
                  <button
                    onClick={() => shareToSocial('telegram')}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </button>
                  <button
                    onClick={() => shareToSocial('email')}
                    className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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

        {/* Detail Image (appears below title) */}
        {post.detail_image && (
          <div className="mt-8 overflow-hidden rounded-2xl bg-gray-100">
            <div className="aspect-video w-full">
              <img
                src={post.detail_image}
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
          onError={(e) => {
            // Handle image load errors
            const target = e.target as HTMLImageElement
            if (target.tagName === 'IMG' && target.src) {
              console.error('Failed to load image:', target.src)
              target.style.border = '2px dashed #e5e7eb'
              target.style.padding = '20px'
              target.alt = 'Image failed to load'
            }
          }}
        >
          {post.content ? (
            post.content.includes('<') && post.content.includes('>') ? (
              <div dangerouslySetInnerHTML={{ __html: processContentImages(post.content, getApiBase(), post.images || []) }} />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {post.content.split('\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim()
                  
                  // Check if this paragraph is a full image path
                  if (trimmed.match(/^\/uploads\/blog\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)$/i)) {
                    return (
                      <div key={index} style={{ textAlign: 'center', margin: '20px 0' }}>
                        <img 
                          src={`${getApiBase()}${trimmed}`}
                          alt="Blog image"
                          style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '8px' }}
                        />
                      </div>
                    )
                  }
                  
                  // Check if this paragraph is just a filename (UUID pattern)
                  if (trimmed.match(/^[\w-]+\.(?:jpg|jpeg|png|gif|webp|svg)$/i) && 
                      trimmed.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)) {
                    // Try to find the image in the images array first
                    const matchingImage = (post.images || []).find(img => 
                      typeof img === 'string' && img.includes(trimmed)
                    )
                    const imageSrc = matchingImage || `${getApiBase()}/uploads/blog/${trimmed}`
                    
                    return (
                      <div key={index} style={{ textAlign: 'center', margin: '20px 0' }}>
                        <img 
                          src={imageSrc}
                          alt="Blog image"
                          style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '8px' }}
                        />
                      </div>
                    )
                  }
                  
                  return trimmed ? <p key={index}>{paragraph}</p> : null
                })}
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
          {!post.allow_comments ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Comments are turned off for this post.
            </div>
          ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {comments.length}
            </span>
            <div className="ml-auto">
              <select
                value={commentSort}
                onChange={(e) => setCommentSort(e.target.value as 'new' | 'old' | 'top' | 'replies')}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="new">Newest</option>
                <option value="old">Oldest</option>
                <option value="top">Top</option>
                <option value="replies">Most Replies</option>
              </select>
            </div>
            </div>

          <div className="mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => submitComment()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!isAuthenticated || !commentText.trim()}
              >
                Post Comment
              </button>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder={isAuthenticated ? 'Add a comment…' : 'Sign in to comment'}
                disabled={!isAuthenticated}
              />
            </div>
          </div>

          <div className="space-y-4">
            {commentTree.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet. Be the first to comment.</p>
            ) : (
              <div className="relative">
                {sortedRoots.map((comment: BlogComment) => renderComment(comment, 0))}
              </div>
            )}
          </div>
          </div>
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

