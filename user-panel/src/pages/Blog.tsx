import React, { useState, useEffect, useRef, useCallback } from 'react'
import { User, Tag, FileText, Eye, Pencil, Trash2, X, Bookmark } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { clearLocalDraft, getLocalDraft } from '../utils/blogDraft'
import { useAuth } from '../contexts/AuthContext'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'
import { BlogCardAuthor } from '../components/BlogCardAuthor'
import { BlogPostCard } from '../components/BlogPostCard'
import CustomSelect from '../components/CustomSelect'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author_name: string
  author_is_verified?: boolean
  author_email: string
  author_id?: number | string | null
  author_unique_user_id?: string | null
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
  reposts_count?: number
}

interface BlogDraft {
  id: number
  title: string
  excerpt: string
  name: string
  status: 'auto' | 'manual'
  created_at: string
  updated_at: string
}

const BLOG_FEED_PAGE_SIZE = 15

export default function Blog() {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)
  const feedOffsetRef = useRef(0)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const hasMoreFeedRef = useRef(true)
  const loadingRef = useRef(false)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    hasMoreFeedRef.current = hasMoreFeed
  }, [hasMoreFeed])
  useEffect(() => {
    loadingRef.current = loading
  }, [loading])
  useEffect(() => {
    loadingMoreRef.current = loadingMore
  }, [loadingMore])

  const fetchBlogFeedRef = useRef<(reset: boolean) => Promise<void>>(async () => {})
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showDraftsModal, setShowDraftsModal] = useState(false)
  const [drafts, setDrafts] = useState<BlogDraft[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [expandedDraftId, setExpandedDraftId] = useState<number | null>(null)
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showSaved, setShowSaved] = useState(false)
  const [savedPosts, setSavedPosts] = useState<BlogPost[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedError, setSavedError] = useState('')

  const mapPostUrls = (post: BlogPost, apiBase: string): BlogPost => ({
    ...post,
    cover_image: post.cover_image && post.cover_image.startsWith('/uploads/')
      ? `${apiBase}${post.cover_image}`
      : post.cover_image,
    detail_image: post.detail_image && post.detail_image.startsWith('/uploads/')
      ? `${apiBase}${post.detail_image}`
      : post.detail_image,
    images: (post.images || []).map((imagePath: string) =>
      imagePath.startsWith('/uploads/') ? `${apiBase}${imagePath}` : imagePath
    ),
  })

  /** Paginated approved posts; resets when category changes (see effect) */
  const fetchBlogFeedPage = async (reset: boolean) => {
    if (showSaved) return
    if (reset) {
      setLoading(true)
      feedOffsetRef.current = 0
      setHasMoreFeed(true)
      hasMoreFeedRef.current = true
    } else {
      if (!hasMoreFeedRef.current || loadingRef.current || loadingMoreRef.current) return
      setLoadingMore(true)
    }
    setError('')
    try {
      const apiBase = getApiBase()
      const offset = feedOffsetRef.current
      const params = new URLSearchParams({
        limit: String(BLOG_FEED_PAGE_SIZE),
        offset: String(offset),
      })
      if (selectedCategory !== 'All') {
        params.set('category', selectedCategory.toLowerCase())
      }
      const response = await fetch(`${apiBase}/api/blog/posts?${params}`)
      if (response.ok) {
        const data: BlogPost[] = await response.json()
        const postsWithFullImageUrls = data
          .filter((post) => post.status === 'approved')
          .map((post) => mapPostUrls(post, apiBase))
        feedOffsetRef.current = offset + postsWithFullImageUrls.length
        const more = postsWithFullImageUrls.length === BLOG_FEED_PAGE_SIZE
        setHasMoreFeed(more)
        hasMoreFeedRef.current = more
        setPosts((prev) => (reset ? postsWithFullImageUrls : [...prev, ...postsWithFullImageUrls]))
      } else {
        setError('Failed to load blog posts')
        if (reset) {
          setPosts([])
          setHasMoreFeed(false)
          hasMoreFeedRef.current = false
        }
      }
    } catch {
      setError('Network error loading blog posts')
      if (reset) {
        setPosts([])
        setHasMoreFeed(false)
        hasMoreFeedRef.current = false
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  fetchBlogFeedRef.current = fetchBlogFeedPage

  useEffect(() => {
    if (showSaved) return
    fetchBlogFeedPage(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, showSaved])

  useEffect(() => {
    if (showSaved) return
    const el = loadMoreSentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        void fetchBlogFeedRef.current(false)
      },
      { root: null, rootMargin: '280px', threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [showSaved, selectedCategory, posts.length])

  const loadSavedPosts = async () => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.hash = '#/user/login'; return }
    setSavedLoading(true)
    setSavedError('')
    try {
      const apiBase = getApiBase()
      const res = await fetch(`${apiBase}/api/blog/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: BlogPost[] = await res.json()
        const normalized = data.map((p) => ({
          ...p,
          cover_image: p.cover_image && p.cover_image.startsWith('/uploads/')
            ? `${apiBase}${p.cover_image}` : p.cover_image,
        }))
        setSavedPosts(normalized)
      } else {
        const err = await res.json().catch(() => ({}))
        setSavedError((err as any).message || `Server error (${res.status})`)
      }
    } catch (e) {
      setSavedError('Could not reach the server. Make sure the backend is running.')
    }
    finally { setSavedLoading(false) }
  }

  const handleToggleSaved = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash || '#/user/blog')
      window.location.hash = '#/user/login'
      return
    }
    if (!showSaved) {
      setShowSaved(true)
      loadSavedPosts()
    } else {
      setShowSaved(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) setShowSaved(false)
  }, [isAuthenticated])

  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('drafts=1')) {
      openDraftsModal()
      const clean = hash.replace(/[?&]drafts=1/, '').replace(/\?&/, '?').replace(/\?$/, '') || '#/user/blog'
      window.location.hash = clean
    }
  }, [])

  const fetchDrafts = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setDraftsLoading(true)
    try {
      const res = await fetch(`${getApiBase()}/api/blog/drafts?include_auto=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDrafts(data)
      } else {
        setDrafts([])
      }
    } catch {
      setDrafts([])
    } finally {
      setDraftsLoading(false)
    }
  }

  const openDraftsModal = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    setShowDraftsModal(true)
    await fetchDrafts()
  }

  const handleEditDraft = (draftId: number) => {
    setShowDraftsModal(false)
    window.location.hash = `#/user/blog/request?draft=${draftId}`
  }

  const handleDeleteDraft = async (draftId: number) => {
    if (!window.confirm('Delete this draft permanently? This cannot be undone.')) return
    const token = localStorage.getItem('token')
    if (!token) return
    setDeletingDraftId(draftId)
    try {
      const res = await fetch(`${getApiBase()}/api/blog/drafts/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId))
        const local = getLocalDraft()
        if (local?.draftId === draftId) clearLocalDraft()
      }
    } catch {
      // ignore
    } finally {
      setDeletingDraftId(null)
    }
  }

  // Fallback posts if API fails
  const fallbackPosts: BlogPost[] = [
    {
      id: 'origin-blue-tea',
      title: 'The Origin of Blue Tea Flower',
      excerpt: 'Blue tea, commonly known as butterfly pea flower tea, originates from Southeast Asia, particularly Thailand, Vietnam, Malaysia, and India. The tea is derived from the Clitoria ternatea plant...',
      content: '',
      author_name: 'NEFOL Team',
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
      author_name: 'NEFOL Team',
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
      title: 'How to Combat Common Skin Issues with NEFOL\'s Skincare Line',
      excerpt: 'Everyone\'s skin is unique, but many of us face similar challenges. Whether it\'s acne, dryness, or signs of aging, NEFOL\'s Blue Pea Flower-infused products can help address these concerns...',
      content: '',
      author_name: 'NEFOL Team',
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
      title: 'A Comprehensive Guide to NEFOL\'s Skincare Routine',
      excerpt: 'Achieving healthy, glowing skin doesn\'t have to be complicated. With the right products and a consistent routine, you can nurture your skin effectively...',
      content: '',
      author_name: 'NEFOL Team',
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
      author_name: 'NEFOL Team',
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
      author_name: 'NEFOL Team',
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

  const usingApiFeed = posts.length > 0
  const displayPosts = usingApiFeed ? posts : !error && !loading ? fallbackPosts : []
  const filteredPosts =
    usingApiFeed || selectedCategory === 'All'
      ? displayPosts
      : displayPosts.filter((post) => extractCategories(post).includes(selectedCategory))

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

  return (
    <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-10">
          <p className="text-base sm:text-lg font-light max-w-xl mx-auto" style={{color: '#9DB4C0'}}>
            Share your thoughts, stories, and ideas with the NEFOL community.
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

        {/* View tabs: All Posts / Saved */}
        <div className="mb-6 flex items-center gap-1 rounded-xl bg-white border border-[#DCE6EE] p-1 w-fit shadow-sm">
          <button
            type="button"
            onClick={() => setShowSaved(false)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              !showSaved ? 'text-white shadow-sm' : 'text-[#1B4965] hover:bg-[#F4F9F9]'
            }`}
            style={{ backgroundColor: !showSaved ? '#1B4965' : 'transparent' }}
          >
            <FileText strokeWidth={2.75} className="h-5 w-5" />
            All Posts
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleToggleSaved}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                showSaved ? 'text-white shadow-sm' : 'text-[#1B4965] hover:bg-[#F4F9F9]'
              }`}
              style={{ backgroundColor: showSaved ? '#1B4965' : 'transparent' }}
            >
              <Bookmark
                strokeWidth={2.75}
                className="h-5 w-5"
                style={{ fill: showSaved ? 'white' : 'none' }}
              />
              Saved
            </button>
          )}
        </div>

        {/* Category Filters (only in All Posts view) */}
        {!showSaved && (
          <div className="mb-10">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#1B4965]">
                <Tag strokeWidth={2.75} className="h-5 w-5" />
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
                    style={{ backgroundColor: selectedCategory === category ? '#1B4965' : 'white' }}
                  >
                    {category === 'All' ? 'All' : formatCategoryLabel(category)}
                  </button>
                ))}
              </div>
              <div className="w-full sm:hidden">
                <CustomSelect
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={categories.map(c => ({ value: c, label: c === 'All' ? 'All' : formatCategoryLabel(c) }))}
                  align="left"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Saved Posts View */}
        {showSaved ? (
          savedLoading ? (
            <div className="text-center py-20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#1B4965] border-t-transparent mb-3" />
              <p className="text-sm" style={{ color: '#9DB4C0' }}>Loading your saved postsâ€¦</p>
            </div>
          ) : savedError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm font-medium text-red-500">{savedError}</p>
              <button
                onClick={loadSavedPosts}
                className="px-5 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: '#1B4965' }}
              >
                Try again
              </button>
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="rounded-full bg-white p-5 shadow-sm">
                <Bookmark className="h-10 w-10" style={{ color: '#9DB4C0' }} />
              </div>
              <p className="text-lg font-medium" style={{ color: '#1B4965' }}>No saved posts yet</p>
              <p className="text-sm text-center max-w-xs" style={{ color: '#9DB4C0' }}>
                Tap the bookmark icon on any post to save it here for later reading.
              </p>
              <button
                onClick={() => setShowSaved(false)}
                className="mt-2 px-5 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: '#1B4965' }}
              >
                Browse posts
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedPosts.map((post) => {
                const { likes, comments } = getPostStats(post)
                return (
                  <div key={post.id} className="flex flex-col gap-3">
                    <BlogCardAuthor
                      authorId={post.author_id}
                      authorUniqueUserId={post.author_unique_user_id}
                      authorName={post.author_name}
                      authorVerified={post.author_is_verified === true}
                    />
                    <BlogPostCard
                      post={post}
                      initialLikes={likes}
                      initialComments={comments}
                      initialSaved={true}
                      onUnsave={() => setSavedPosts(prev => prev.filter(p => p.id !== post.id))}
                    />
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => {
                const { likes, comments } = getPostStats(post)
                return (
                  <div key={post.id} className="flex flex-col gap-3">
                    <BlogCardAuthor
                      authorId={post.author_id}
                      authorUniqueUserId={post.author_unique_user_id}
                      authorName={post.author_name}
                      authorVerified={post.author_is_verified === true}
                    />
                    <BlogPostCard post={post} initialLikes={likes} initialComments={comments} />
                  </div>
                )
              })}
            </div>
            {usingApiFeed && (
              <>
                <div ref={loadMoreSentinelRef} className="h-1 w-full" aria-hidden />
                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B4965] border-t-transparent" />
                  </div>
                )}
                {!hasMoreFeed && !loading && posts.length > 0 && (
                  <p className="py-10 text-center text-sm" style={{ color: '#9DB4C0' }}>
                    You&apos;re all caught up.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Drafts Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold" style={{ color: '#1B4965' }}>
                My Drafts
              </h3>
              <button
                onClick={() => setShowDraftsModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {draftsLoading ? (
                <p className="text-center py-8 text-gray-500">Loading drafts...</p>
              ) : drafts.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No drafts yet. Start writing to save drafts.</p>
              ) : (
                <ul className="space-y-3">
                  {drafts.map((draft) => (
                    <li
                      key={draft.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {draft.title || draft.name || 'Untitled'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  draft.status === 'auto'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {draft.status === 'auto' ? 'Auto-save' : 'Manual'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(draft.updated_at)}
                              </span>
                            </div>
                            {expandedDraftId === draft.id && draft.excerpt && (
                              <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                                {draft.excerpt}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() =>
                                setExpandedDraftId((prev) => (prev === draft.id ? null : draft.id))
                              }
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View preview"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleEditDraft(draft.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit draft"
                            >
                              <Pencil className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteDraft(draft.id)}
                              disabled={deletingDraftId === draft.id}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
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
