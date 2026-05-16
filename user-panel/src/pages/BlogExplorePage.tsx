import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  BookOpen,
  Compass,
  Heart,
  MessageCircle,
  Search,
  Tag,
  UserPlus,
  Users,
  X,
  ChevronRight,
  TrendingUp,
  Clock,
  Star,
  MapPin,
} from 'lucide-react'
import { AuthorVerifiedBadge } from '../components/AuthorVerifiedBadge'
import { blogActivityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string
  title: string
  excerpt: string
  cover_image?: string | null
  author_name: string
  author_id?: number | string | null
  author_unique_user_id?: string | null
  author_is_verified?: boolean
  categories?: string[] | string | null
  meta_keywords?: string[] | string | null
  likes_count?: number
  comments_count?: number
  featured?: boolean
  created_at: string
}

interface Author {
  author_id: number
  author_name: string
  author_handle: string
  is_verified?: boolean
  bio?: string | null
  profile_image?: string | null
  writing_categories?: string[] | null
  location?: string | null
  follower_count: number
  subscriber_count: number
  post_count: number
  total_likes: number
  isFollowing?: boolean
}

type Tab = 'posts' | 'authors' | 'tags'
type SortOption = 'latest' | 'popular' | 'featured'

const PAGE_SIZE = 20

const AUTHOR_SEARCH_HISTORY_KEY = 'blog_explore_author_history_v1'
const MAX_AUTHOR_HISTORY = 14

function loadAuthorSearchHistory(): Author[] {
  try {
    const raw = localStorage.getItem(AUTHOR_SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x: unknown) => x && typeof (x as Author).author_id === 'number') as Author[]
  } catch {
    return []
  }
}

function mergeAuthorHistory(prev: Author[], fromResults: Author[]): Author[] {
  const seen = new Set<number>()
  const out: Author[] = []
  for (const a of [...fromResults, ...prev]) {
    if (!a || seen.has(a.author_id)) continue
    seen.add(a.author_id)
    out.push(a)
    if (out.length >= MAX_AUTHOR_HISTORY) break
  }
  return out
}

const ALL_CATEGORIES = ['All', ...BLOG_CATEGORY_OPTIONS.map((c) => c.charAt(0).toUpperCase() + c.slice(1))]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function extractCategories(post: Post): string[] {
  const raw = post.categories
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((c) => String(c))
  try { const p = JSON.parse(raw as string); return Array.isArray(p) ? p.map(String) : [String(raw)] }
  catch { return [String(raw)] }
}

function extractTags(post: Post): string[] {
  const raw = post.meta_keywords
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((t) => String(t))
  try { const p = JSON.parse(raw as string); return Array.isArray(p) ? p.map(String) : [] }
  catch { return [] }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#c8dff0] text-[9px] font-bold text-[#1B4965]">
      {(name || 'U').slice(0, 2).toUpperCase()}
    </div>
  )
}

function AuthorAvatar({ name, avatar, size = 'md' }: { name: string | null; avatar: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const apiBase = getApiBase()
  const src = avatar
    ? avatar.startsWith('/uploads/') ? `${apiBase}${avatar}` : avatar
    : null
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-base' : size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs'
  const initials = (name || 'U').slice(0, 2).toUpperCase()
  return src ? (
    <img src={src} alt={name || ''} className={`${sizeClass} flex-shrink-0 rounded-full object-cover ring-2 ring-white`} />
  ) : (
    <div className={`flex ${sizeClass} flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c8dff0] to-[#9bc5e0] font-bold text-[#1B4965] ring-2 ring-white`}>
      {initials}
    </div>
  )
}

function PostCard({ post, onTagClick }: { post: Post; onTagClick: (tag: string) => void }) {
  const apiBase = getApiBase()
  const tags = extractTags(post).slice(0, 3)
  const cats = extractCategories(post).slice(0, 2)
  const imgSrc = post.cover_image
    ? post.cover_image.startsWith('/uploads/') ? `${apiBase}${post.cover_image}` : post.cover_image
    : null

  return (
    <a
      href={`#/user/blog/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {imgSrc && (
        <div className="relative h-40 overflow-hidden sm:h-44">
          <img src={imgSrc} alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          {post.featured && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              <Star className="h-2.5 w-2.5" /> Featured
            </span>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span key={c} className="rounded-full bg-[#edf4f9] px-2 py-0.5 text-[10px] font-medium text-[#4B97C9]">
                {c}
              </span>
            ))}
          </div>
        )}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 group-hover:text-[#1B4965]">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">{post.excerpt}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <button
                key={t}
                onClick={(e) => { e.preventDefault(); onTagClick(t) }}
                className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-400 transition-colors hover:border-[#4B97C9] hover:text-[#4B97C9]"
              >
                #{t}
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            <PostAvatar name={post.author_name} />
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              {post.author_name}
              {post.author_is_verified === true ? <AuthorVerifiedBadge size="md" /> : null}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-gray-400">
            <span className="flex items-center gap-0.5 text-[11px]">
              <Heart className="h-3.5 w-3.5" />{formatCount(post.likes_count ?? 0)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageCircle className="h-3.5 w-3.5" />{formatCount(post.comments_count ?? 0)}
            </span>
            <span className="text-[10px] text-gray-300">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>
    </a>
  )
}

function AuthorCard({
  author,
  onFollow,
  followingSet,
  followingInProgress,
}: {
  author: Author
  onFollow: (id: number) => void
  followingSet: Set<number>
  followingInProgress: Set<number>
}) {
  const { isAuthenticated } = useAuth()
  const isFollowing = followingSet.has(author.author_id)
  const pending = followingInProgress.has(author.author_id)

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <a href={`#/user/author/${author.author_id}`} className="flex-shrink-0">
        <AuthorAvatar name={author.author_name} avatar={author.profile_image ?? null} />
      </a>
      <div className="min-w-0 flex-1">
        <a href={`#/user/author/${author.author_id}`} className="group block">
          <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">
            <span className="truncate">{author.author_name}</span>
            {author.is_verified === true ? <AuthorVerifiedBadge size="md" className="shrink-0" /> : null}
          </p>
          <p className="text-[11px] text-gray-400">@{author.author_handle}</p>
        </a>
        {author.bio && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{author.bio}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">{formatCount(author.follower_count)}</span> followers
          </span>
          <span className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">{formatCount(author.post_count)}</span> posts
          </span>
          {author.location && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <MapPin className="h-3 w-3" />{author.location}
            </span>
          )}
        </div>
        {author.writing_categories && Array.isArray(author.writing_categories) && author.writing_categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {author.writing_categories.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-[#edf4f9] px-2 py-0.5 text-[10px] font-medium text-[#4B97C9]">{c}</span>
            ))}
          </div>
        )}
      </div>
      {isAuthenticated && (
        <button
          onClick={() => onFollow(author.author_id)}
          disabled={pending}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
            isFollowing
              ? 'border border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:text-red-500'
              : 'bg-[#1B4965] text-white hover:bg-[#163d52]'
          }`}
        >
          {pending ? '…' : isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}

function TagCloud({
  tags,
  selected,
  onSelect,
}: {
  tags: { tag: string; count: number }[]
  selected: string | null
  onSelect: (t: string) => void
}) {
  if (tags.length === 0) return null
  const max = Math.max(...tags.map((t) => t.count), 1)
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const weight = Math.ceil((count / max) * 4)
        const active = selected === tag
        return (
          <button
            key={tag}
            onClick={() => onSelect(tag)}
            className={`rounded-full border px-3 py-1.5 transition-colors ${
              weight >= 4 ? 'text-[13px] font-semibold' :
              weight === 3 ? 'text-[12px] font-medium' :
              weight === 2 ? 'text-[11px]' : 'text-[10px] text-gray-400'
            } ${
              active
                ? 'border-[#1B4965] bg-[#1B4965] text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-[#4B97C9] hover:text-[#4B97C9]'
            }`}
          >
            #{tag}
            <span className={`ml-1 ${active ? 'text-blue-200' : 'text-gray-400'} text-[10px]`}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlogExplorePage() {
  const { isAuthenticated } = useAuth()

  // Search / filter state
  const [query, setQuery]             = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTab, setActiveTab]     = useState<Tab>('posts')
  const [category, setCategory]       = useState('All')
  const [activeTag, setActiveTag]     = useState<string | null>(null)
  const [sort, setSort]               = useState<SortOption>('latest')

  // Data
  const [posts, setPosts]             = useState<Post[]>([])
  const [authors, setAuthors]         = useState<Author[]>([])
  const [tags, setTags]               = useState<{ tag: string; count: number }[]>([])
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [suggestedAuthors, setSuggestedAuthors] = useState<Author[]>([])
  const [authorSearchHistory, setAuthorSearchHistory] = useState<Author[]>(() => loadAuthorSearchHistory())

  // Pagination
  const [postOffset, setPostOffset]   = useState(0)
  const [authorOffset, setAuthorOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts]   = useState(true)
  const [hasMoreAuthors, setHasMoreAuthors] = useState(true)

  // Loading
  const [loadingPosts, setLoadingPosts]   = useState(false)
  const [loadingAuthors, setLoadingAuthors] = useState(false)
  const [loadingTags, setLoadingTags]     = useState(false)
  const [loadingTrending, setLoadingTrending] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Follow state
  const [followingSet, setFollowingSet]   = useState<Set<number>>(new Set())
  const [followingInProgress, setFollowingInProgress] = useState<Set<number>>(new Set())

  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Debounce query ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // ── Fetch posts ────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async (reset = false, overrideOffset?: number) => {
    setLoadingPosts(true)
    const offset = reset ? 0 : (overrideOffset ?? postOffset)
    try {
      const data: Post[] = await blogActivityAPI.searchPosts({
        q: debouncedQuery || undefined,
        category: category !== 'All' ? category.toLowerCase() : undefined,
        tag: activeTag ?? undefined,
        sort,
        limit: PAGE_SIZE,
        offset,
      })
      const list = Array.isArray(data) ? data : []
      setPosts((prev) => reset ? list : [...prev, ...list])
      setHasMorePosts(list.length === PAGE_SIZE)
      setPostOffset(offset + list.length)
    } catch (err) {
      console.error('[Explore] fetchPosts error:', err)
    }
    finally { setLoadingPosts(false) }
  }, [debouncedQuery, category, activeTag, sort, postOffset])

  // ── Fetch authors ──────────────────────────────────────────────────────────

  const fetchAuthors = useCallback(async (reset = false, overrideOffset?: number) => {
    const q = debouncedQuery.trim()
    if (!q) {
      setLoadingAuthors(false)
      return
    }
    setLoadingAuthors(true)
    const offset = reset ? 0 : (overrideOffset ?? authorOffset)
    try {
      const data: Author[] = await blogActivityAPI.searchAuthors(q, PAGE_SIZE, offset)
      const list = Array.isArray(data) ? data : []
      setAuthors((prev) => (reset ? list : [...prev, ...list]))
      setHasMoreAuthors(list.length === PAGE_SIZE)
      setAuthorOffset(offset + list.length)
      if (list.length > 0) {
        setAuthorSearchHistory((prev) => {
          const merged = mergeAuthorHistory(prev, list)
          try {
            localStorage.setItem(AUTHOR_SEARCH_HISTORY_KEY, JSON.stringify(merged))
          } catch {
            /* ignore quota */
          }
          return merged
        })
      }
    } catch (err) {
      console.error('[Explore] fetchAuthors error:', err)
    }
    finally {
      setLoadingAuthors(false)
    }
  }, [debouncedQuery, authorOffset])

  // ── Fetch tags ─────────────────────────────────────────────────────────────

  const fetchTags = useCallback(async () => {
    setLoadingTags(true)
    try {
      const apiBase = getApiBase()
      const res = await fetch(`${apiBase}/api/blog/tags`)
      if (!res.ok) return
      const rawTags: string[] = await res.json()
      // Count occurrences: fetch posts with each tag is too heavy, just show all with equal weight
      // We'll count by checking all posts we already have or just show them as-is with count=1
      const countMap: Record<string, number> = {}
      rawTags.forEach((t) => { countMap[t] = (countMap[t] ?? 0) + 1 })
      // Enrich with post counts by fetching posts per tag in parallel (top 60 tags max)
      const topTags = rawTags.slice(0, 60)
      setTags(topTags.map((t) => ({ tag: t, count: 1 })))
      // Async enrich: get counts from a lightweight query
      try {
        const countData = await Promise.allSettled(
          topTags.slice(0, 20).map(async (t) => {
            const r = await blogActivityAPI.searchPosts({ tag: t, limit: 1, offset: 0 })
            return { tag: t, count: Array.isArray(r) ? (r.length > 0 ? 10 : 0) : 0 }
          })
        )
        const enriched = topTags.map((t) => {
          const found = countData.find(
            (r): r is PromiseFulfilledResult<{ tag: string; count: number }> =>
              r.status === 'fulfilled' && r.value.tag === t
          )
          return { tag: t, count: found ? found.value.count : 1 }
        })
        setTags(enriched)
      } catch { /* keep flat list */ }
    } catch { /* silent */ }
    finally { setLoadingTags(false) }
  }, [])

  // ── Fetch trending posts (no search, popular) ──────────────────────────────

  const fetchTrending = useCallback(async () => {
    setLoadingTrending(true)
    try {
      const data: Post[] = await blogActivityAPI.searchPosts({ sort: 'popular', limit: 6, offset: 0 })
      setTrendingPosts(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
    finally { setLoadingTrending(false) }
  }, [])

  // ── Fetch suggested authors ────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    try {
      if (isAuthenticated) {
        const data: Author[] = await blogActivityAPI.getAuthorSuggestions(8)
        setSuggestedAuthors(Array.isArray(data) ? data : [])
      } else {
        const data: Author[] = await blogActivityAPI.searchAuthors('', 8, 0)
        setSuggestedAuthors(Array.isArray(data) ? data : [])
      }
    } catch { /* silent */ }
    finally { setLoadingSuggestions(false) }
  }, [isAuthenticated])

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTrending()
    fetchSuggestions()
    fetchTags()
  }, [])

  // ── Re-fetch when search/filter changes ────────────────────────────────────
  // We pass overrideOffset=0 so we never rely on the stale postOffset/authorOffset state

  useEffect(() => {
    if (activeTab === 'posts') {
      setPosts([])
      setPostOffset(0)
      setHasMorePosts(true)
      fetchPosts(true, 0)
    }
    if (activeTab === 'authors') {
      setAuthors([])
      setAuthorOffset(0)
      setHasMoreAuthors(true)
      if (debouncedQuery.trim()) {
        fetchAuthors(true, 0)
      } else {
        setHasMoreAuthors(false)
        setLoadingAuthors(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, category, activeTag, sort, activeTab])

  // ── Follow/Unfollow ────────────────────────────────────────────────────────

  const handleFollow = useCallback(async (authorId: number) => {
    if (!isAuthenticated) { window.location.hash = '#/user/login'; return }
    const isFollowing = followingSet.has(authorId)
    setFollowingInProgress((s) => { const n = new Set(s); n.add(authorId); return n })
    try {
      if (isFollowing) {
        await blogActivityAPI.unfollowAuthor(String(authorId))
        setFollowingSet((s) => { const n = new Set(s); n.delete(authorId); return n })
      } else {
        await blogActivityAPI.followAuthor(String(authorId))
        setFollowingSet((s) => { const n = new Set(s); n.add(authorId); return n })
      }
    } catch { /* silent */ }
    finally {
      setFollowingInProgress((s) => { const n = new Set(s); n.delete(authorId); return n })
    }
  }, [followingSet, isAuthenticated])

  // ── Tag click (from post card) ─────────────────────────────────────────────

  const handleTagClick = useCallback((tag: string) => {
    setActiveTab('posts')
    setActiveTag(tag)
    setQuery('')
  }, [])

  const clearFilters = () => {
    setQuery('')
    setCategory('All')
    setActiveTag(null)
    setSort('latest')
  }

  const hasFilters = query || category !== 'All' || activeTag || sort !== 'latest'
  const isSearching = Boolean(debouncedQuery || category !== 'All' || activeTag)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-2">
        <Compass strokeWidth={2.75} className="h-7 w-7 text-[#1B4965]" />
        <h1 className="text-2xl font-bold text-[#1B4965]">Explore</h1>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, authors, tags…"
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm shadow-sm outline-none ring-0 transition focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Category chips ── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setActiveTab('posts') }}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              category === cat
                ? 'bg-[#1B4965] text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-[#4B97C9] hover:text-[#4B97C9]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Active filters row ── */}
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeTag && (
            <span className="flex items-center gap-1 rounded-full bg-[#edf4f9] px-3 py-1 text-[11px] font-medium text-[#1B4965]">
              <Tag className="h-3 w-3" />#{activeTag}
              <button onClick={() => setActiveTag(null)} className="ml-0.5"><X className="h-3 w-3" /></button>
            </span>
          )}
          {sort !== 'latest' && (
            <span className="flex items-center gap-1 rounded-full bg-[#edf4f9] px-3 py-1 text-[11px] font-medium text-[#1B4965]">
              <TrendingUp className="h-3 w-3" />{sort}
              <button onClick={() => setSort('latest')} className="ml-0.5"><X className="h-3 w-3" /></button>
            </span>
          )}
          <button onClick={clearFilters} className="ml-auto text-[11px] text-gray-400 underline hover:text-gray-600">
            Clear all
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
        {(['posts', 'authors', 'tags'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white shadow-sm text-[#1B4965]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'posts' && <BookOpen strokeWidth={2.75} className="h-5 w-5" />}
            {tab === 'authors' && <Users strokeWidth={2.75} className="h-5 w-5" />}
            {tab === 'tags' && <Tag strokeWidth={2.75} className="h-5 w-5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* ══ POSTS TAB ══════════════════════════════════════════════════════════ */}

      {activeTab === 'posts' && (
        <>
          {/* Sort row */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[12px] text-gray-400">
              {isSearching ? 'Filtered results' : 'All posts'}
            </p>
            <div className="flex gap-1 rounded-xl border border-gray-200 p-0.5">
              {(['latest', 'popular', 'featured'] as SortOption[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`rounded-lg px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                    sort === s ? 'bg-[#1B4965] text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Trending banner (only when no search/filter active) */}
          {!isSearching && trendingPosts.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <h2 className="text-base font-bold text-[#1B4965]">Trending Now</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {trendingPosts.slice(0, 4).map((post) => (
                  <PostCard key={post.id} post={post} onTagClick={handleTagClick} />
                ))}
              </div>
            </div>
          )}

          {/* Main posts grid */}
          {loadingPosts && posts.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <BookOpen className="mb-3 h-12 w-12 text-gray-200" />
              <p className="font-medium text-gray-400">No posts found</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-2 text-sm text-[#4B97C9] underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              {isSearching && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onTagClick={handleTagClick} />
                  ))}
                </div>
              )}
              {!isSearching && (
                <>
                  <div className="mb-3 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#4B97C9]" />
                    <h2 className="text-base font-bold text-[#1B4965]">Latest Posts</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} onTagClick={handleTagClick} />
                    ))}
                  </div>
                </>
              )}
              {hasMorePosts && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => fetchPosts(false)}
                    disabled={loadingPosts}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-[#4B97C9] hover:text-[#4B97C9] disabled:opacity-50"
                  >
                    {loadingPosts
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
                      : <ChevronRight className="h-4 w-4" />}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══ AUTHORS TAB ════════════════════════════════════════════════════════ */}

      {activeTab === 'authors' && (
        <>
          {(() => {
            const suggestedIds = new Set(suggestedAuthors.map((a) => a.author_id))
            const historyAuthors = authorSearchHistory.filter((a) => !suggestedIds.has(a.author_id))
            const hasQuery = Boolean(debouncedQuery.trim())
            const showEmptyHint =
              !hasQuery && suggestedAuthors.length === 0 && historyAuthors.length === 0

            return (
              <>
                {!hasQuery && suggestedAuthors.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4 text-[#4B97C9]" />
                      <h2 className="text-base font-bold text-[#1B4965]">
                        {isAuthenticated ? 'Suggested for you' : 'Popular authors'}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {suggestedAuthors.map((a) => (
                        <AuthorCard
                          key={a.author_id}
                          author={a}
                          onFollow={handleFollow}
                          followingSet={followingSet}
                          followingInProgress={followingInProgress}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!hasQuery && historyAuthors.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <h2 className="text-base font-bold text-[#1B4965]">Searched earlier</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {historyAuthors.map((a) => (
                        <AuthorCard
                          key={a.author_id}
                          author={a}
                          onFollow={handleFollow}
                          followingSet={followingSet}
                          followingInProgress={followingInProgress}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {hasQuery && (
                  <>
                    <div className="mb-3 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gray-400" />
                      <h2 className="text-base font-bold text-[#1B4965]">
                        Results for &quot;{debouncedQuery}&quot;
                      </h2>
                    </div>

                    {loadingAuthors && authors.length === 0 ? (
                      <div className="flex justify-center py-12">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
                      </div>
                    ) : authors.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <Users className="mb-3 h-12 w-12 text-gray-200" />
                        <p className="font-medium text-gray-400">No authors found</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {authors.map((a) => (
                            <AuthorCard
                              key={a.author_id}
                              author={a}
                              onFollow={handleFollow}
                              followingSet={followingSet}
                              followingInProgress={followingInProgress}
                            />
                          ))}
                        </div>
                        {hasMoreAuthors && (
                          <div className="mt-6 flex justify-center">
                            <button
                              onClick={() => fetchAuthors(false)}
                              disabled={loadingAuthors}
                              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-[#4B97C9] hover:text-[#4B97C9] disabled:opacity-50"
                            >
                              {loadingAuthors ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              Load more
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {showEmptyHint && (
                  <div className="flex flex-col items-center py-14 text-center">
                    <Search className="mb-3 h-10 w-10 text-gray-200" />
                    <p className="max-w-sm text-sm text-gray-500">
                      Search by name or handle to find authors. Authors you open from results appear here for quick access.
                    </p>
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {/* ══ TAGS TAB ═══════════════════════════════════════════════════════════ */}

      {activeTab === 'tags' && (
        <>
          <div className="mb-3 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-[#4B97C9]" />
            <h2 className="text-base font-bold text-[#1B4965]">Browse by Tag</h2>
          </div>
          {loadingTags ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
            </div>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Tag className="mb-3 h-12 w-12 text-gray-200" />
              <p className="font-medium text-gray-400">No tags found</p>
            </div>
          ) : (
            <>
              <TagCloud
                tags={tags}
                selected={activeTag}
                onSelect={(t) => {
                  setActiveTag(t === activeTag ? null : t)
                  setActiveTab('posts')
                }}
              />
              <p className="mt-4 text-[11px] text-gray-400">
                Click a tag to browse all posts with that topic.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
