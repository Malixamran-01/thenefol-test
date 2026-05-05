import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Calendar, User, Heart, MessageCircle, Tag, FileText, Eye, Pencil, Trash2, X, Repeat2, Bookmark } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { clearLocalDraft, getLocalDraft } from '../utils/blogDraft'
import { useAuth } from '../contexts/AuthContext'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'
import { authorAPI } from '../services/authorAPI'
import AuthorPromptModal from '../components/AuthorPromptModal'
import { BlogCardAuthor } from '../components/BlogCardAuthor'
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

// ─── Dominant-colour extraction ─────────────────────────────────────────────
// Samples the bottom-third of a cover image on a hidden canvas and returns
// a darkened version of that colour so the title card is always on-theme yet
// readable with white text.
function useImageThemeColor(src: string | undefined): string {
  const DEFAULT = 'rgba(28,28,28,0.88)'
  const [bg, setBg] = useState(DEFAULT)
  const prevSrc = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!src || src === prevSrc.current) return
    prevSrc.current = src

    const img = new Image()
    // Only set crossOrigin for truly external URLs; same-origin images work without it
    if (src.startsWith('http') && !src.includes(window.location.hostname)) {
      img.crossOrigin = 'anonymous'
    }

    img.onload = () => {
      try {
        const W = 80, H = 80
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, W, H)

        // Sample the bottom 35% of the image (where the info bar sits)
        const startY = Math.floor(H * 0.65)
        const sampleH = H - startY
        const { data } = ctx.getImageData(0, startY, W, sampleH)

        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
        }
        if (n === 0) return

        // Darken by ~55% so white text stays legible over any hue
        const f = 0.45
        setBg(`rgba(${Math.round(r / n * f)},${Math.round(g / n * f)},${Math.round(b / n * f)},0.97)`)
      } catch {
        // Canvas tainted (CORS) – fall back to default dark overlay
        setBg(DEFAULT)
      }
    }
    img.onerror = () => setBg(DEFAULT)
    img.src = src
  }, [src])

  return bg
}

// ─── Individual post card ────────────────────────────────────────────────────
function BlogPostCard({ post, initialLikes, initialComments }: {
  post: BlogPost
  initialLikes: number
  initialComments: number
}) {
  const coverImage = post.cover_image || (post.images && post.images[0]) || '/IMAGES/default-blog.jpg'
  const cardBg = useImageThemeColor(coverImage)
  const apiBase = getApiBase()

  // ── Interaction state (optimistic) ──────────────────────────────────────
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [reposts, setReposts] = useState(post.reposts_count ?? 0)
  const [reposted, setReposted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [actionPending, setActionPending] = useState<'like' | 'repost' | 'bookmark' | null>(null)

  const token = localStorage.getItem('token')
  const isLoggedIn = !!token

  // Fetch per-user status (liked / reposted / saved) once on mount
  useEffect(() => {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      fetch(`${apiBase}/api/blog/posts/${post.id}/likes`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/blog/posts/${post.id}/reposts`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/blog/posts/${post.id}/bookmarks`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([likeData, repostData, bookmarkData]) => {
      if (likeData) { setLikes(likeData.count); setLiked(!!likeData.liked) }
      if (repostData) { setReposts(repostData.count); setReposted(!!repostData.reposted) }
      if (bookmarkData) { setSaved(!!bookmarkData.saved) }
    }).catch(() => {/* silently ignore */})
  }, [post.id, apiBase, token])

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!isLoggedIn) { window.location.hash = '#/user/login'; return }
    if (actionPending === 'like') return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes(n => wasLiked ? n - 1 : n + 1)
    setActionPending('like')
    try {
      const endpoint = wasLiked ? 'unlike' : 'like'
      const res = await fetch(`${apiBase}/api/blog/posts/${post.id}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLikes(data.count)
      } else {
        setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1)
      }
    } catch { setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1) }
    finally { setActionPending(null) }
  }, [liked, isLoggedIn, actionPending, apiBase, post.id, token])

  const handleRepost = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!isLoggedIn) { window.location.hash = '#/user/login'; return }
    if (actionPending === 'repost') return
    const wasReposted = reposted
    setReposted(!wasReposted)
    setReposts(n => wasReposted ? n - 1 : n + 1)
    setActionPending('repost')
    try {
      const endpoint = wasReposted ? 'unrepost' : 'repost'
      const res = await fetch(`${apiBase}/api/blog/posts/${post.id}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReposts(data.count)
      } else {
        setReposted(wasReposted); setReposts(n => wasReposted ? n + 1 : n - 1)
      }
    } catch { setReposted(wasReposted); setReposts(n => wasReposted ? n + 1 : n - 1) }
    finally { setActionPending(null) }
  }, [reposted, isLoggedIn, actionPending, apiBase, post.id, token])

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!isLoggedIn) { window.location.hash = '#/user/login'; return }
    if (actionPending === 'bookmark') return
    const wasSaved = saved
    setSaved(!wasSaved)
    setActionPending('bookmark')
    try {
      const endpoint = wasSaved ? 'unbookmark' : 'bookmark'
      await fetch(`${apiBase}/api/blog/posts/${post.id}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
    } catch { setSaved(wasSaved) }
    finally { setActionPending(null) }
  }, [saved, isLoggedIn, actionPending, apiBase, post.id, token])

  return (
    <a
      href={`#/user/blog/${post.id}`}
      className="group relative block h-[420px] overflow-hidden rounded-2xl bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer"
      style={{ textDecoration: 'none' }}
    >
      {/* Cover image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ backgroundImage: `url(${coverImage})` }}
      />

      {/* Featured badge */}
      {post.featured && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-[#4B97C9] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow">
          Featured
        </span>
      )}

      {/* Theme-coloured info card at the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col justify-between overflow-hidden px-5 py-4"
        style={{ background: cardBg, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
      >
        {/* Title & excerpt */}
        <div className="flex-1 overflow-hidden">
          <h3
            className="mb-1.5 text-[15px] font-semibold leading-snug text-white"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {post.title}
          </h3>
          <p
            className="text-[13px] leading-relaxed text-white/70"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {post.excerpt}
          </p>
        </div>

        {/* Action bar */}
        <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
          <div className="flex items-center gap-1">
            {/* Like */}
            <button
              onClick={handleLike}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10 active:scale-95"
              title={liked ? 'Unlike' : 'Like'}
            >
              <Heart
                className="h-4 w-4 transition-colors"
                style={{ color: liked ? '#ff5e7e' : 'rgba(255,255,255,0.85)', fill: liked ? '#ff5e7e' : 'none' }}
              />
              <span className="text-[12px] font-medium text-white/85 min-w-[14px] text-center">{likes}</span>
            </button>

            {/* Comment (navigates to post) */}
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10"
              title="Comments"
            >
              <MessageCircle className="h-4 w-4 text-white/85" />
              <span className="text-[12px] font-medium text-white/85 min-w-[14px] text-center">{initialComments}</span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10 active:scale-95"
              title={reposted ? 'Undo repost' : 'Repost'}
            >
              <Repeat2
                className="h-4 w-4 transition-colors"
                style={{ color: reposted ? '#4ade80' : 'rgba(255,255,255,0.85)' }}
              />
              <span
                className="text-[12px] font-medium min-w-[14px] text-center"
                style={{ color: reposted ? '#4ade80' : 'rgba(255,255,255,0.85)' }}
              >{reposts}</span>
            </button>
          </div>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            className="rounded-lg p-2 transition-colors hover:bg-white/10 active:scale-95"
            title={saved ? 'Remove from saved' : 'Save for later'}
          >
            <Bookmark
              className="h-4 w-4 transition-colors"
              style={{ color: saved ? '#fbbf24' : 'rgba(255,255,255,0.85)', fill: saved ? '#fbbf24' : 'none' }}
            />
          </button>
        </div>
      </div>
    </a>
  )
}

export default function Blog() {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showAuthorPrompt, setShowAuthorPrompt] = useState(false)
  const [showDraftsModal, setShowDraftsModal] = useState(false)
  const [drafts, setDrafts] = useState<BlogDraft[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [expandedDraftId, setExpandedDraftId] = useState<number | null>(null)
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null)
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

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => {
            const { likes, comments } = getPostStats(post)
            return (
              <div key={post.id} className="flex flex-col gap-3">
                {/* Author Header */}
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={async () => {
                  if (!isAuthenticated) {
                    setShowAuthPrompt(true)
                    return
                  }

                  // Check if user has an author profile
                  try {
                    const eligibility = await authorAPI.checkEligibility()

                    const canSubmitDirectly =
                      Boolean(eligibility.hasAuthorRole) &&
                      Boolean(eligibility.hasAuthorProfile) &&
                      Boolean(eligibility.onboardingCompleted)

                    if (canSubmitDirectly) {
                      // User is an author, proceed to blog request form
                      window.location.hash = '#/user/blog/request?new=1'
                    } else {
                      // User needs to create author profile
                      setShowAuthorPrompt(true)
                    }
                  } catch (err) {
                    // If API fails, show author prompt (safe fallback)
                    setShowAuthorPrompt(true)
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
              <button
                onClick={openDraftsModal}
                className="inline-flex items-center gap-2 px-6 py-4 font-medium rounded-lg transition-colors text-sm tracking-wide uppercase border-2"
                style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(75,151,201,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <FileText className="w-5 h-5" />
                Drafts
              </button>
            </div>
          </div>
        </div>
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

      {/* Author Profile Prompt Modal */}
      <AuthorPromptModal 
        isOpen={showAuthorPrompt} 
        onClose={() => setShowAuthorPrompt(false)} 
      />
    </main>
  )
}
