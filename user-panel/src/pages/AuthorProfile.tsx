import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Check,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  UserRound,
  Users
} from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

interface AuthorSeedData {
  id: string | number
  name: string
  email?: string
}

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
  categories?: string[] | string
  likes_count?: number
  comments_count?: number
  views_count?: number
}

type TabType = 'activity' | 'posts' | 'about'
type SortType = 'newest' | 'oldest' | 'popular'

const formatCompactNumber = (value: number) => {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const normalize = (value?: string | number | null) => String(value || '').trim().toLowerCase()

const hashFromText = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000003
  }
  return hash
}

const parseCategories = (value: BlogPost['categories']) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean)
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

const getReadingTime = (content: string, excerpt: string) => {
  const text = (content || excerpt || '').replace(/<[^>]*>/g, ' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

export default function AuthorProfile() {
  const { isAuthenticated } = useAuth()
  const [authorSeed, setAuthorSeed] = useState<AuthorSeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('activity')
  const [sortBy, setSortBy] = useState<SortType>('newest')
  const [query, setQuery] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('blog_author_profile')
    if (raw) {
      try {
        setAuthorSeed(JSON.parse(raw) as AuthorSeedData)
      } catch {
        setAuthorSeed(null)
      }
    }
  }, [])

  const routeAuthorId = useMemo(() => {
    const hash = window.location.hash || ''
    const match = hash.match(/^#\/user\/author\/([^/?#]+)/)
    return match?.[1] || ''
  }, [])

  const authorKey = useMemo(() => {
    const stableId = normalize(authorSeed?.id || routeAuthorId)
    if (stableId) return stableId
    if (authorSeed?.email) return normalize(authorSeed.email)
    return normalize(authorSeed?.name || 'author')
  }, [authorSeed, routeAuthorId])

  const profileStorageKey = `blog_author_profile_state_${authorKey}`

  useEffect(() => {
    if (!authorKey) return
    const raw = localStorage.getItem(profileStorageKey)
    if (!raw) {
      setIsFollowing(false)
      setIsSubscribed(false)
      return
    }
    try {
      const parsed = JSON.parse(raw) as { following?: boolean; subscribed?: boolean }
      setIsFollowing(Boolean(parsed.following))
      setIsSubscribed(Boolean(parsed.subscribed))
    } catch {
      setIsFollowing(false)
      setIsSubscribed(false)
    }
  }, [authorKey, profileStorageKey])

  useEffect(() => {
    if (!authorKey) return
    localStorage.setItem(profileStorageKey, JSON.stringify({ following: isFollowing, subscribed: isSubscribed }))
  }, [authorKey, isFollowing, isSubscribed, profileStorageKey])

  useEffect(() => {
    const fetchAuthorPosts = async () => {
      setLoading(true)
      setError('')
      try {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/blog/posts`)
        if (!response.ok) {
          setError('Could not load author profile right now.')
          setLoading(false)
          return
        }

        const data = (await response.json()) as BlogPost[]
        const approvedPosts = data.filter((post) => post.status === 'approved')

        const matched = approvedPosts
          .filter((post) => {
            const matchesId =
              routeAuthorId && routeAuthorId !== 'guest'
                ? normalize(post.user_id) === normalize(routeAuthorId)
                : false
            const matchesEmail = authorSeed?.email
              ? normalize(post.author_email) === normalize(authorSeed.email)
              : false
            const matchesName = authorSeed?.name
              ? normalize(post.author_name) === normalize(authorSeed.name)
              : false

            return matchesId || matchesEmail || matchesName
          })
          .map((post) => ({
            ...post,
            cover_image:
              post.cover_image && post.cover_image.startsWith('/uploads/')
                ? `${apiBase}${post.cover_image}`
                : post.cover_image,
            detail_image:
              post.detail_image && post.detail_image.startsWith('/uploads/')
                ? `${apiBase}${post.detail_image}`
                : post.detail_image,
            images: Array.isArray(post.images)
              ? post.images.map((imagePath: string) =>
                  imagePath.startsWith('/uploads/') ? `${apiBase}${imagePath}` : imagePath
                )
              : []
          }))
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

        setPosts(matched)
      } catch (err) {
        setError('Network issue while loading author details.')
      } finally {
        setLoading(false)
      }
    }

    fetchAuthorPosts()
  }, [authorSeed, routeAuthorId])

  const resolvedAuthor = useMemo(() => {
    const fallbackName = posts[0]?.author_name || authorSeed?.name || 'Author'
    const fallbackEmail = posts[0]?.author_email || authorSeed?.email || ''
    const fallbackId = posts[0]?.user_id || authorSeed?.id || routeAuthorId || 'guest'
    return {
      id: fallbackId,
      name: fallbackName,
      email: fallbackEmail
    }
  }, [authorSeed, posts, routeAuthorId])

  const handle = useMemo(() => {
    const fromEmail = resolvedAuthor.email ? resolvedAuthor.email.split('@')[0] : ''
    if (fromEmail) return `@${fromEmail.toLowerCase()}`
    return `@${normalize(resolvedAuthor.name).replace(/\s+/g, '') || 'author'}`
  }, [resolvedAuthor])

  const coverImage = posts[0]?.detail_image || posts[0]?.cover_image || posts[0]?.images?.[0] || ''
  const profileImage = posts.find((post) => post.cover_image)?.cover_image || posts[0]?.images?.[0] || ''

  const authorStats = useMemo(() => {
    const totalPosts = posts.length
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count ?? 0), 0)
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count ?? 0), 0)
    const totalReads =
      posts.reduce((sum, post) => sum + (post.views_count ?? 0), 0) ||
      posts.reduce((sum, post) => sum + getReadingTime(post.content, post.excerpt) * 125, 0)

    const seed = `${authorKey}:${resolvedAuthor.name}:${resolvedAuthor.email}`
    const hash = hashFromText(seed || 'author')
    const baseFollowers = Math.max(85, totalPosts * 210 + totalLikes * 2 + (hash % 1500))
    const baseSubscribers = Math.max(30, Math.round(baseFollowers * 0.36) + (hash % 350))

    return {
      posts: totalPosts,
      likes: totalLikes,
      comments: totalComments,
      reads: totalReads,
      followers: baseFollowers + (isFollowing ? 1 : 0),
      subscribers: baseSubscribers + (isSubscribed ? 1 : 0)
    }
  }, [authorKey, isFollowing, isSubscribed, posts, resolvedAuthor.email, resolvedAuthor.name])

  const featuredCategories = useMemo(() => {
    const categories = posts.flatMap((post) => parseCategories(post.categories))
    const seen = new Map<string, number>()
    categories.forEach((category) => {
      const key = category.toLowerCase()
      seen.set(key, (seen.get(key) ?? 0) + 1)
    })
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name)
  }, [posts])

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    let next = [...posts]

    if (normalizedQuery) {
      next = next.filter((post) => {
        const haystack = `${post.title} ${post.excerpt} ${parseCategories(post.categories).join(' ')}`
        return haystack.toLowerCase().includes(normalizedQuery)
      })
    }

    next.sort((a, b) => {
      if (sortBy === 'newest') return +new Date(b.created_at) - +new Date(a.created_at)
      if (sortBy === 'oldest') return +new Date(a.created_at) - +new Date(b.created_at)
      const scoreA = (a.likes_count ?? 0) + (a.comments_count ?? 0) * 2 + (a.views_count ?? 0) / 80
      const scoreB = (b.likes_count ?? 0) + (b.comments_count ?? 0) * 2 + (b.views_count ?? 0) / 80
      return scoreB - scoreA
    })

    return next
  }, [posts, query, sortBy])

  const activityFeed = useMemo(() => {
    return posts.slice(0, 5).map((post, index) => ({
      id: post.id,
      headline:
        index === 0
          ? `Published “${post.title}”`
          : index % 2 === 0
            ? `Updated readers on “${post.title}”`
            : `Post gained fresh engagement on “${post.title}”`,
      summary: `${post.likes_count ?? 0} likes • ${post.comments_count ?? 0} comments • ${Math.max(
        1,
        Math.round((post.views_count ?? 150) / 10)
      )} min engagement`,
      date: formatDate(post.updated_at || post.created_at)
    }))
  }, [posts])

  const aboutText = useMemo(() => {
    if (!posts.length) {
      return `${resolvedAuthor.name} shares thoughtful stories, practical ideas, and personal insights on NEFOL. Follow for new posts, subscriber updates, and focused discussions.`
    }
    const topics = featuredCategories.length ? featuredCategories.join(', ') : 'culture, skincare, and storytelling'
    return `${resolvedAuthor.name} is a featured writer on NEFOL covering ${topics}. With ${authorStats.posts} published posts and a growing community, this profile highlights their latest writing, reader activity, and subscriber updates.`
  }, [authorStats.posts, featuredCategories, posts.length, resolvedAuthor.name])

  const ensureAuthForAction = () => {
    if (isAuthenticated) return true
    sessionStorage.setItem('post_login_redirect', window.location.hash)
    window.location.hash = '#/user/login'
    return false
  }

  const handleFollow = () => {
    if (!ensureAuthForAction()) return
    setIsFollowing((prev) => !prev)
  }

  const handleSubscribe = () => {
    if (!ensureAuthForAction()) return
    setIsSubscribed((prev) => !prev)
  }

  const handleShareProfile = async () => {
    const shareUrl = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${resolvedAuthor.name} on NEFOL`,
          text: `Read ${resolvedAuthor.name}'s latest posts on NEFOL.`,
          url: shareUrl
        })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setShowCopied(true)
        window.setTimeout(() => setShowCopied(false), 1800)
      }
    } catch {
      // User cancelled native share; no-op
    }
  }

  const handleBack = () => {
    window.location.hash = '#/user/blog'
  }

  return (
    <main className="min-h-screen bg-[#F4F9F9] pb-16">
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:pt-10">
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: '#1B4965' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </button>

        <section className="overflow-hidden rounded-3xl border border-[#dbe7ef] bg-white shadow-sm">
          <div className="relative h-44 w-full bg-gradient-to-r from-[#1B4965] via-[#2d6688] to-[#4B97C9]">
            {coverImage && (
              <img src={coverImage} alt={resolvedAuthor.name} className="h-full w-full object-cover opacity-80" />
            )}
            <div className="absolute inset-0 bg-black/15" />
          </div>

          <div className="relative px-5 pb-6 sm:px-8">
            <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-md">
                  {profileImage ? (
                    <img src={profileImage} alt={resolvedAuthor.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-2xl font-semibold text-gray-600">
                      {resolvedAuthor.name?.charAt(0) || 'A'}
                    </div>
                  )}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">{resolvedAuthor.name}</h1>
                  <p className="text-sm font-medium text-[#1B4965]/80">{handle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleFollow}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-95"
                  style={{ backgroundColor: isFollowing ? '#0f2f42' : '#4B97C9' }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={handleSubscribe}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: isSubscribed ? '#1B4965' : '#d7e5ee',
                    color: isSubscribed ? '#1B4965' : '#35556b',
                    backgroundColor: isSubscribed ? '#e8f2f8' : 'white'
                  }}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
                <button
                  onClick={handleShareProfile}
                  className="rounded-xl border border-[#d7e5ee] bg-white px-3 py-2 text-[#1B4965] transition-colors hover:bg-[#f3f8fb]"
                  aria-label="Share author profile"
                >
                  {showCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-gray-700">{aboutText}</p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-[#f1f7fb] px-3 py-1 font-medium text-[#1B4965]">
                {formatCompactNumber(authorStats.followers)} followers
              </span>
              <span className="rounded-full bg-[#f1f7fb] px-3 py-1 font-medium text-[#1B4965]">
                {formatCompactNumber(authorStats.subscribers)} subscribers
              </span>
              {resolvedAuthor.email && (
                <a
                  href={`mailto:${resolvedAuthor.email}`}
                  className="rounded-full bg-[#f8fafb] px-3 py-1 text-gray-600 transition-colors hover:bg-[#eef4f8]"
                >
                  {resolvedAuthor.email}
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Posts', value: formatCompactNumber(authorStats.posts), icon: UserRound },
            { label: 'Total Likes', value: formatCompactNumber(authorStats.likes), icon: Heart },
            { label: 'Comments', value: formatCompactNumber(authorStats.comments), icon: MessageCircle },
            { label: 'Reads', value: formatCompactNumber(authorStats.reads), icon: Users }
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-[#dbe7ef] bg-white p-4 shadow-sm">
              <item.icon className="mb-2 h-4 w-4 text-[#4B97C9]" />
              <div className="text-2xl font-semibold text-[#1B4965]">{item.value}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{item.label}</div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#dbe7ef] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6eff5] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 rounded-xl bg-[#f2f8fc] p-1">
              {(['activity', 'posts', 'about'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab ? 'bg-white text-[#1B4965] shadow-sm' : 'text-gray-500 hover:text-[#1B4965]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'posts' && (
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 w-40 rounded-lg border border-[#dbe7ef] px-3 text-sm outline-none transition-colors focus:border-[#4B97C9] sm:w-56"
                  placeholder="Search posts"
                />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortType)}
                  className="h-9 rounded-lg border border-[#dbe7ef] px-2 text-sm text-gray-700 outline-none focus:border-[#4B97C9]"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Popular</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Loading author profile...</div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">{error}</div>
          ) : activeTab === 'activity' ? (
            <div className="space-y-4 px-4 py-5 sm:px-6">
              {activityFeed.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet. Posts from this author will appear here.</p>
              ) : (
                activityFeed.map((item) => (
                  <article key={item.id} className="rounded-xl border border-[#e7f0f5] bg-[#fbfdff] p-4">
                    <div className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-[#4B97C9]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Latest activity
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">{item.headline}</h3>
                    <p className="mt-1 text-sm text-gray-600">{item.summary}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.date}
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : activeTab === 'posts' ? (
            <div className="space-y-4 px-4 py-5 sm:px-6">
              {filteredPosts.length === 0 ? (
                <p className="text-sm text-gray-500">No posts found for this filter.</p>
              ) : (
                filteredPosts.map((post) => {
                  const cover = post.cover_image || post.detail_image || post.images?.[0]
                  const categories = parseCategories(post.categories)
                  return (
                    <article
                      key={post.id}
                      className="overflow-hidden rounded-2xl border border-[#e6eff5] bg-white transition-shadow hover:shadow-md"
                    >
                      {cover && (
                        <div className="h-44 w-full bg-[#edf3f8]">
                          <img src={cover} alt={post.title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-4 sm:p-5">
                        <h3 className="text-xl font-semibold text-gray-900">{post.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{post.excerpt}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(post.created_at)}</span>
                          <span>•</span>
                          <span>{getReadingTime(post.content, post.excerpt)} min read</span>
                          <span>•</span>
                          <span>{post.likes_count ?? 0} likes</span>
                          <span>•</span>
                          <span>{post.comments_count ?? 0} comments</span>
                        </div>

                        {categories.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {categories.slice(0, 4).map((category) => (
                              <span
                                key={`${post.id}-${category}`}
                                className="rounded-full bg-[#f0f7fc] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#1B4965]"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4">
                          <a
                            href={`#/user/blog/${post.id}`}
                            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-95"
                            style={{ backgroundColor: '#1B4965' }}
                          >
                            Read post
                          </a>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          ) : (
            <div className="px-4 py-5 sm:px-6">
              <div className="rounded-2xl border border-[#e6eff5] bg-[#fbfdff] p-5">
                <h3 className="text-lg font-semibold text-gray-900">About {resolvedAuthor.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{aboutText}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Publishing cadence</div>
                    <div className="mt-1 text-sm font-semibold text-[#1B4965]">
                      {authorStats.posts > 8 ? 'Weekly' : authorStats.posts > 3 ? 'Bi-weekly' : 'Occasional'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Community</div>
                    <div className="mt-1 text-sm font-semibold text-[#1B4965]">
                      {formatCompactNumber(authorStats.followers)} followers •{' '}
                      {formatCompactNumber(authorStats.subscribers)} subscribers
                    </div>
                  </div>
                </div>

                {featuredCategories.length > 0 && (
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Popular topics</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {featuredCategories.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-[#dce9f2] bg-white px-3 py-1 text-xs font-medium text-[#1B4965]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
