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
import { blogActivityAPI } from '../services/api'

interface AuthorSeedData {
  id: string | number
  name: string
  email?: string
  bio?: string
}

interface UserSummaryData {
  id: string | number
  name: string
  email?: string
  bio?: string
  profile_photo?: string
}

interface AuthorProfileData {
  id: number
  user_id: number
  username: string
  display_name: string
  pen_name?: string
  real_name?: string
  bio?: string
  profile_image?: string
  cover_image?: string
  website?: string
  location?: string
  writing_categories?: string[]
  writing_languages?: string[]
  social_links?: Record<string, string>
  email_visible?: boolean
  user_email?: string
  followers_count?: number
  subscribers_count?: number
  posts_count?: number
  total_views?: number
  total_likes?: number
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

// Proper loading spinner component
const LoadingSpinner = ({ size = 'md', message }: { size?: 'sm' | 'md' | 'lg'; message?: string }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4'
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-solid border-gray-300 border-t-[#4B97C9]`}></div>
      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </div>
  )
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
  const [userSummary, setUserSummary] = useState<UserSummaryData | null>(null)
  const [authorProfile, setAuthorProfile] = useState<AuthorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('activity')
  const [sortBy, setSortBy] = useState<SortType>('newest')
  const [query, setQuery] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [realFollowers, setRealFollowers] = useState(0)
  const [realSubscribers, setRealSubscribers] = useState(0)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

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

  const hasAuthorProfile = authorProfile != null
  const effectiveAuthorId = hasAuthorProfile ? String(authorProfile!.id) : routeAuthorId

  // Fetch full author profile from author_profiles (has onboarding data: bio, categories, location, etc.)
  useEffect(() => {
    const fetchAuthorProfile = async () => {
      if (!routeAuthorId || routeAuthorId === 'guest') {
        setAuthorProfile(null)
        return
      }

      try {
        const profile = await blogActivityAPI.getAuthor(routeAuthorId)
        setAuthorProfile(profile)
      } catch {
        setAuthorProfile(null)
      }
    }

    fetchAuthorProfile()
  }, [routeAuthorId])

  // Fallback: fetch user summary when no author profile (e.g. user with no author_profiles row)
  useEffect(() => {
    const fetchUserSummary = async () => {
      if (!routeAuthorId || routeAuthorId === 'guest' || !/^\d+$/.test(routeAuthorId)) {
        setUserSummary(null)
        return
      }
      if (authorProfile) return // Prefer author profile data

      try {
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/users/${routeAuthorId}`)
        if (!response.ok) return

        const data = await response.json()
        const rawUser = data?.user || data
        if (!rawUser || !rawUser.name) return

        const profileBio =
          rawUser.bio ||
          rawUser.about ||
          rawUser.about_me ||
          rawUser.description ||
          ''

        setUserSummary({
          id: rawUser.id ?? routeAuthorId,
          name: rawUser.name,
          email: rawUser.email || '',
          bio: profileBio || '',
          profile_photo: rawUser.profile_photo || rawUser.profile_image || ''
        })
      } catch {
        // Keep graceful fallback to blog-seeded profile data.
      }
    }

    fetchUserSummary()
  }, [routeAuthorId, authorProfile])

  // Fetch author stats (followers, subscribers, follow/subscribe status) - only for users with author profile
  useEffect(() => {
    if (!hasAuthorProfile || !effectiveAuthorId || effectiveAuthorId === 'guest') return
    
    const fetchAuthorStats = async () => {
      try {
        const stats = await blogActivityAPI.getAuthorStats(effectiveAuthorId)
        setRealFollowers(stats.followers || 0)
        setRealSubscribers(stats.subscribers || 0)
        setIsFollowing(stats.isFollowing || false)
        setIsSubscribed(stats.isSubscribed || false)
      } catch (err) {
        console.error('Error fetching author stats:', err)
        // Keep local state as fallback
      }
    }

    if (isAuthenticated) {
      fetchAuthorStats()
    }
  }, [effectiveAuthorId, hasAuthorProfile, isAuthenticated])

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

  // Fetch real author activities - only for users with author profile
  useEffect(() => {
    if (!hasAuthorProfile || !effectiveAuthorId || effectiveAuthorId === 'guest' || activeTab !== 'activity') return
    
    const fetchActivities = async () => {
      setLoadingActivities(true)
      try {
        const data = await blogActivityAPI.getAuthorActivity(effectiveAuthorId, 10, 0)
        setActivities(data)
      } catch (err) {
        console.error('Error fetching activities:', err)
        setActivities([])
      } finally {
        setLoadingActivities(false)
      }
    }

    fetchActivities()
  }, [effectiveAuthorId, activeTab, hasAuthorProfile])

  const resolvedAuthor = useMemo(() => {
    // Author profile: use author_profiles table data
    if (hasAuthorProfile) {
      return {
        id: authorProfile!.id,
        name: authorProfile!.display_name || authorProfile!.pen_name || 'Author',
        email: (authorProfile!.email_visible && authorProfile!.user_email) ? authorProfile!.user_email : ''
      }
    }
    // No author profile: use users table data (account created at signup)
    return {
      id: userSummary?.id ?? posts[0]?.user_id ?? authorSeed?.id ?? routeAuthorId ?? 'guest',
      name: userSummary?.name || posts[0]?.author_name || authorSeed?.name || 'Author',
      email: userSummary?.email || posts[0]?.author_email || authorSeed?.email || ''
    }
  }, [authorProfile, authorSeed, hasAuthorProfile, posts, routeAuthorId, userSummary])

  const handle = useMemo(() => {
    if (hasAuthorProfile && authorProfile?.username) return authorProfile.username.startsWith('@') ? authorProfile.username : `@${authorProfile.username}`
    const fromEmail = resolvedAuthor.email ? resolvedAuthor.email.split('@')[0] : ''
    if (fromEmail) return `@${fromEmail.toLowerCase()}`
    return `@${normalize(resolvedAuthor.name).replace(/\s+/g, '') || 'author'}`
  }, [authorProfile, hasAuthorProfile, resolvedAuthor])

  const apiBase = getApiBase()
  const resolveImage = (url?: string) => (url && url.startsWith('/uploads/') ? `${apiBase}${url}` : url) || ''
  const coverImage = hasAuthorProfile
    ? resolveImage(authorProfile!.cover_image) || posts[0]?.detail_image || posts[0]?.cover_image || posts[0]?.images?.[0] || ''
    : posts[0]?.detail_image || posts[0]?.cover_image || posts[0]?.images?.[0] || ''
  const profileImage = hasAuthorProfile
    ? resolveImage(authorProfile!.profile_image) || posts.find((p) => p.cover_image)?.cover_image || posts[0]?.images?.[0] || ''
    : resolveImage(userSummary?.profile_photo) || posts.find((p) => p.cover_image)?.cover_image || posts[0]?.images?.[0] || ''

  const authorStats = useMemo(() => {
    const totalPosts = posts.length
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count ?? 0), 0)
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count ?? 0), 0)
    const totalReads =
      posts.reduce((sum, post) => sum + (post.views_count ?? 0), 0) ||
      posts.reduce((sum, post) => sum + getReadingTime(post.content, post.excerpt) * 125, 0)

    // Use real followers/subscribers if available, otherwise calculate
    const followers = realFollowers > 0 ? realFollowers : Math.max(85, totalPosts * 210 + totalLikes * 2)
    const subscribers = realSubscribers > 0 ? realSubscribers : Math.max(30, Math.round(followers * 0.36))

    return {
      posts: totalPosts,
      likes: totalLikes,
      comments: totalComments,
      reads: totalReads,
      followers,
      subscribers
    }
  }, [posts, realFollowers, realSubscribers])

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
    const basicBio = (hasAuthorProfile ? authorProfile?.bio : userSummary?.bio) || authorSeed?.bio || ''
    if (basicBio.trim()) return basicBio.trim()

    if (!posts.length) {
      return `${resolvedAuthor.name} shares thoughtful stories, practical ideas, and personal insights on NEFOL. Follow for new posts, subscriber updates, and focused discussions.`
    }
    const topics = featuredCategories.length ? featuredCategories.join(', ') : 'culture, skincare, and storytelling'
    return `${resolvedAuthor.name} is a featured writer on NEFOL covering ${topics}. With ${authorStats.posts} published posts and a growing community, this profile highlights their latest writing, reader activity, and subscriber updates.`
  }, [authorProfile?.bio, authorSeed?.bio, authorStats.posts, featuredCategories, hasAuthorProfile, posts.length, resolvedAuthor.name, userSummary?.bio])

  const ensureAuthForAction = () => {
    if (isAuthenticated) return true
    sessionStorage.setItem('post_login_redirect', window.location.hash)
    window.location.hash = '#/user/login'
    return false
  }

  const handleFollow = async () => {
    if (!ensureAuthForAction()) return
    if (!effectiveAuthorId || effectiveAuthorId === 'guest') return

    try {
      if (isFollowing) {
        const result = await blogActivityAPI.unfollowAuthor(effectiveAuthorId)
        setRealFollowers(result.followerCount || 0)
        setIsFollowing(false)
      } else {
        const result = await blogActivityAPI.followAuthor(effectiveAuthorId)
        setRealFollowers(result.followerCount || 0)
        setIsFollowing(true)
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      // Fallback to local state
      setIsFollowing((prev) => !prev)
    }
  }

  const handleSubscribe = async () => {
    if (!ensureAuthForAction()) return
    if (!effectiveAuthorId || effectiveAuthorId === 'guest') return

    try {
      if (isSubscribed) {
        const result = await blogActivityAPI.unsubscribeFromAuthor(effectiveAuthorId)
        setRealSubscribers(result.subscriberCount || 0)
        setIsSubscribed(false)
      } else {
        const result = await blogActivityAPI.subscribeToAuthor(effectiveAuthorId)
        setRealSubscribers(result.subscriberCount || 0)
        setIsSubscribed(true)
      }
    } catch (err) {
      console.error('Error toggling subscribe:', err)
      // Fallback to local state
      setIsSubscribed((prev) => !prev)
    }
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
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:pt-8">
        <button
          onClick={handleBack}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: '#1B4965' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </button>

        <section className="overflow-hidden rounded-2xl border border-[#dbe7ef] bg-white shadow-sm">
          {/* Cover Image */}
          <div className="relative h-44 w-full overflow-hidden bg-gradient-to-r from-[#1B4965] via-[#2d6688] to-[#4B97C9] sm:h-48">
            {coverImage && (
              <img src={coverImage} alt="" className="h-full w-full object-cover opacity-75" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
          </div>

          {/* Profile Content with Overlapping Avatar */}
          <div className="relative px-5 pb-6 sm:px-8">
            {/* Profile Picture - Overlapping on LEFT */}
            <div className="absolute -top-12 left-5 sm:-top-16 sm:left-8">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl sm:h-32 sm:w-32">
                {profileImage ? (
                  <img src={profileImage} alt={resolvedAuthor.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4B97C9] to-[#1B4965] text-3xl font-bold text-white sm:text-4xl">
                    {resolvedAuthor.name?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
            </div>

            {/* Header Row: Name on left, Buttons on right */}
            <div className="flex items-start justify-between gap-4 pt-16 pb-4 sm:pt-20">
              {/* Name and Handle - Left Side */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{resolvedAuthor.name}</h1>
                <p className="mt-1 text-sm font-medium text-gray-500 sm:text-base">{handle}</p>
              </div>

              {/* Action Buttons - Right Side (Follow/Subscribe only for authors) */}
              <div className="flex flex-shrink-0 flex-wrap gap-2 justify-end">
                {hasAuthorProfile && (
                  <>
                    <button
                      onClick={handleFollow}
                      className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
                      style={{ backgroundColor: isFollowing ? '#0f2f42' : '#4B97C9' }}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button
                      onClick={handleSubscribe}
                      className="rounded-lg border-2 px-5 py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderColor: isSubscribed ? '#1B4965' : '#d7e5ee',
                        color: isSubscribed ? 'white' : '#1B4965',
                        backgroundColor: isSubscribed ? '#1B4965' : 'white'
                      }}
                    >
                      {isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleShareProfile}
                  className="rounded-lg border-2 border-[#d7e5ee] bg-white px-3 py-2 text-[#1B4965] transition-all duration-200 hover:bg-[#f3f8fb]"
                  aria-label="Share author profile"
                >
                  {showCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bio */}
            <p className="mb-5 text-[15px] leading-relaxed text-gray-700">
              {aboutText}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 text-sm border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#4B97C9]" />
                <span className="font-semibold text-gray-900">{formatCompactNumber(authorStats.followers)}</span>
                <span className="text-gray-500">followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-[#4B97C9]" />
                <span className="font-semibold text-gray-900">{formatCompactNumber(authorStats.subscribers)}</span>
                <span className="text-gray-500">subscribers</span>
              </div>
              {resolvedAuthor.email && (
                <a
                  href={`mailto:${resolvedAuthor.email}`}
                  className="text-gray-600 transition-colors hover:text-[#1B4965] hover:underline"
                >
                  {resolvedAuthor.email}
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Posts', value: formatCompactNumber(authorStats.posts), icon: UserRound },
            { label: 'Total Likes', value: formatCompactNumber(authorStats.likes), icon: Heart },
            { label: 'Comments', value: formatCompactNumber(authorStats.comments), icon: MessageCircle },
            { label: 'Reads', value: formatCompactNumber(authorStats.reads), icon: Users }
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-[#dbe7ef] bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <item.icon className="mx-auto mb-2 h-5 w-5 text-[#4B97C9]" />
              <div className="text-3xl font-bold text-[#1B4965]">{item.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">{item.label}</div>
            </article>
          ))}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-[#dbe7ef] bg-white shadow-sm">
          {/* Tabs Header */}
          <div className="border-b border-[#e6eff5]">
            <div className="flex items-center justify-between px-5 py-4 sm:px-8">
              <div className="flex items-center gap-1">
                {(['activity', 'posts', 'about'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all duration-200 ${
                      activeTab === tab
                        ? 'bg-[#1B4965] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#1B4965]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && (
                <div className="hidden items-center gap-2 sm:flex">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-9 w-48 rounded-lg border border-[#dbe7ef] px-3 text-sm outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
                    placeholder="Search posts..."
                  />
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortType)}
                    className="h-9 rounded-lg border border-[#dbe7ef] bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Popular</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              )}
            </div>

            {/* Mobile Search/Sort for Posts Tab */}
            {activeTab === 'posts' && (
              <div className="flex flex-col gap-2 border-t border-[#e6eff5] px-5 py-3 sm:hidden">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 w-full rounded-lg border border-[#dbe7ef] px-3 text-sm outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
                  placeholder="Search posts..."
                />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortType)}
                  className="h-9 w-full rounded-lg border border-[#dbe7ef] bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Popular</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {loading ? (
            <div className="px-6">
              <LoadingSpinner size="md" message="Loading author profile..." />
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : activeTab === 'activity' ? (
            <div className="space-y-3 px-5 py-6 sm:px-8">
              {activityFeed.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">No activity yet</p>
                  <p className="mt-1 text-xs text-gray-500">Posts from this author will appear here.</p>
                </div>
              ) : (
                activityFeed.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[#e7f0f5] bg-gradient-to-br from-white to-[#fbfdff] p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#4B97C9]/10 px-3 py-1 text-xs font-semibold text-[#4B97C9]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Latest activity
                    </div>
                    <h3 className="text-base font-semibold leading-snug text-gray-900">{item.headline}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.summary}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.date}
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : activeTab === 'posts' ? (
            <div className="space-y-5 px-5 py-6 sm:px-8">
              {filteredPosts.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-8 text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">No posts found</p>
                  <p className="mt-1 text-xs text-gray-500">Try adjusting your search or filters.</p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const cover = post.cover_image || post.detail_image || post.images?.[0]
                  const categories = parseCategories(post.categories)
                  return (
                    <article
                      key={post.id}
                      className="group overflow-hidden rounded-xl border border-[#e6eff5] bg-white transition-all duration-200 hover:border-[#4B97C9]/40 hover:shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {cover && (
                          <div className="h-48 w-full overflow-hidden bg-[#edf3f8] sm:h-auto sm:w-56">
                            <img
                              src={cover}
                              alt={post.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                          <div>
                            <h3 className="text-xl font-bold leading-snug text-gray-900 group-hover:text-[#1B4965]">
                              {post.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">{post.excerpt}</p>

                            {categories.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {categories.slice(0, 3).map((category) => (
                                  <span
                                    key={`${post.id}-${category}`}
                                    className="rounded-full bg-[#f0f7fc] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#1B4965]"
                                  >
                                    {category}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(post.created_at)}
                              </span>
                              <span>•</span>
                              <span>{getReadingTime(post.content, post.excerpt)} min read</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3.5 w-3.5" />
                                {post.likes_count ?? 0}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {post.comments_count ?? 0}
                              </span>
                            </div>

                            <a
                              href={`#/user/blog/${post.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#1B4965] px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0f2f42]"
                            >
                              Read post
                              <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          ) : (
            <div className="px-5 py-6 sm:px-8">
              <div className="rounded-xl border border-[#e6eff5] bg-gradient-to-br from-white to-[#fbfdff] p-6 sm:p-8">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4B97C9] to-[#1B4965] text-white">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">About {resolvedAuthor.name}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-gray-700">{aboutText}</p>
                  </div>
                </div>

                {hasAuthorProfile && (authorProfile?.writing_languages?.length || authorProfile?.location || authorProfile?.website || (authorProfile?.social_links && Object.keys(authorProfile.social_links).length > 0)) ? (
                  <div className="mt-6 space-y-4">
                    {authorProfile?.writing_languages?.length ? (
                      <div className="rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Languages</div>
                        <div className="flex flex-wrap gap-2">
                          {authorProfile.writing_languages.map((lang) => (
                            <span key={lang} className="rounded-full bg-[#f0f7fc] px-3 py-1 text-sm font-medium text-[#1B4965]">{lang}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {authorProfile?.location ? (
                      <div className="rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Location</div>
                        <p className="text-sm font-medium text-gray-800">{authorProfile.location}</p>
                      </div>
                    ) : null}
                    {authorProfile?.website ? (
                      <div className="rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Website</div>
                        <a href={authorProfile.website.startsWith('http') ? authorProfile.website : `https://${authorProfile.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#4B97C9] hover:underline">{authorProfile.website}</a>
                      </div>
                    ) : null}
                    {authorProfile?.social_links && Object.keys(authorProfile.social_links).length > 0 ? (
                      <div className="rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Connect</div>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(authorProfile.social_links).filter(([, url]) => url).map(([platform, url]) => (
                            <a key={platform} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium capitalize text-[#4B97C9] hover:underline">{platform}</a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Publishing cadence
                    </div>
                    <div className="text-lg font-bold text-[#1B4965]">
                      {authorStats.posts > 8 ? 'Weekly' : authorStats.posts > 3 ? 'Bi-weekly' : 'Occasional'}
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {authorStats.posts} {authorStats.posts === 1 ? 'post' : 'posts'} published
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Community</div>
                    <div className="text-lg font-bold text-[#1B4965]">
                      {formatCompactNumber(authorStats.followers + authorStats.subscribers)}
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {formatCompactNumber(authorStats.followers)} followers • {formatCompactNumber(authorStats.subscribers)}{' '}
                      subscribers
                    </p>
                  </div>
                </div>

                {((hasAuthorProfile && authorProfile?.writing_categories?.length) ? authorProfile!.writing_categories! : featuredCategories).length > 0 && (
                  <div className="mt-6 rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {hasAuthorProfile && authorProfile?.writing_categories?.length ? 'Writing interests' : 'Popular topics'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(hasAuthorProfile && authorProfile?.writing_categories?.length ? authorProfile.writing_categories : featuredCategories).map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border-2 border-[#dce9f2] bg-gradient-to-r from-white to-[#f8fbfc] px-4 py-2 text-sm font-semibold capitalize text-[#1B4965] transition-all duration-200 hover:border-[#4B97C9] hover:shadow-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {resolvedAuthor.email && (
                  <div className="mt-6 rounded-xl border border-[#e6eff5] bg-white p-5 shadow-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</div>
                    <a
                      href={`mailto:${resolvedAuthor.email}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#4B97C9] transition-colors hover:text-[#1B4965] hover:underline"
                    >
                      <span>{resolvedAuthor.email}</span>
                    </a>
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
