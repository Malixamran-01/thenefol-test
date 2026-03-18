import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Flag,
  Heart,
  Link2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Repeat2,
  Share2,
  Sparkles,
  Upload,
  UserRound,
  Users,
  UserPlus,
  X
} from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import CustomSelect from '../components/CustomSelect'
import { useBlogBack } from '../hooks/useBlogBack'
import { useDispatch, useSelector } from 'react-redux'
import { blogActivityAPI, uploadAuthorProfileImage, uploadAuthorCoverImage } from '../services/api'
import { setFollowStatus } from '../store/followSlice'
import type { RootState } from '../store'

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
  unique_user_id?: string
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
  author_email?: string
  author_id?: number | null
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

function EditAuthorProfileModal({
  authorProfile,
  apiBase,
  onClose,
  onSaved
}: {
  authorProfile: AuthorProfileData
  apiBase: string
  onClose: () => void
  onSaved: (updated: AuthorProfileData) => void
}) {
  const [username, setUsername] = useState(authorProfile.username)
  const [displayName, setDisplayName] = useState(authorProfile.display_name || '')
  const [penName, setPenName] = useState(authorProfile.pen_name || '')
  const [bio, setBio] = useState(authorProfile.bio || '')
  const [profileImage, setProfileImage] = useState(authorProfile.profile_image || '')
  const [coverImage, setCoverImage] = useState(authorProfile.cover_image || '')
  const [website, setWebsite] = useState(authorProfile.website || '')
  const [location, setLocation] = useState(authorProfile.location || '')
  const [twitter, setTwitter] = useState(authorProfile.social_links?.twitter || '')
  const [instagram, setInstagram] = useState(authorProfile.social_links?.instagram || '')
  const [linkedin, setLinkedin] = useState(authorProfile.social_links?.linkedin || '')
  const [emailVisible, setEmailVisible] = useState(authorProfile.email_visible || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const uploadProfilePic = async (file: File) => {
    const url = await uploadAuthorProfileImage(file)
    setProfileImage(url)
  }
  const uploadCoverPic = async (file: File) => {
    const url = await uploadAuthorCoverImage(file)
    setCoverImage(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await blogActivityAPI.updateAuthorProfile({
        username,
        display_name: displayName,
        pen_name: penName || undefined,
        bio: bio || undefined,
        profile_image: profileImage || undefined,
        cover_image: coverImage || undefined,
        website: website || undefined,
        location: location || undefined,
        social_links: [twitter, instagram, linkedin].some(Boolean)
          ? { ...(twitter?.trim() && { twitter: twitter.trim() }), ...(instagram?.trim() && { instagram: instagram.trim() }), ...(linkedin?.trim() && { linkedin: linkedin.trim() }) }
          : undefined,
        email_visible: emailVisible
      })
      const updatedAuthor = (res as any)?.author || res
      onSaved({ ...authorProfile, ...updatedAuthor })
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const resolveImg = (url?: string) => (url && url.startsWith('/uploads/') ? `${apiBase}${url}` : url) || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                {profileImage ? <img src={resolveImg(profileImage)} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto h-8 w-8 text-gray-400" />}
              </div>
              <div>
                <input type="file" accept="image/*" className="hidden" id="edit-profile-pic" onChange={async (e) => { const f = e.target.files?.[0]; if (f) try { await uploadProfilePic(f) } catch (err: any) { setError(err?.message || 'Upload failed') } }} />
                <label htmlFor="edit-profile-pic" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50"><Upload className="h-4 w-4" /> Upload</label>
                {profileImage && <button type="button" onClick={() => setProfileImage('')} className="ml-2 text-sm text-red-600">Remove</button>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Picture</label>
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-4">
              {coverImage ? <div className="relative"><img src={resolveImg(coverImage)} alt="" className="h-24 w-full object-cover rounded" /><button type="button" onClick={() => setCoverImage('')} className="absolute top-1 right-1 rounded bg-red-500 p-1 text-white"><X className="h-3 w-3" /></button></div> : null}
              <input type="file" accept="image/*" className="hidden" id="edit-cover-pic" onChange={async (e) => { const f = e.target.files?.[0]; if (f) try { await uploadCoverPic(f) } catch (err: any) { setError(err?.message || 'Upload failed') } }} />
              <label htmlFor="edit-cover-pic" className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-800"><Upload className="h-4 w-4" /> {coverImage ? 'Change' : 'Upload'} cover</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pen Name</label>
            <input type="text" value={penName} onChange={(e) => setPenName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Tell readers about yourself..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="City, Country" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Social Links</label>
            <div className="space-y-2">
              <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Twitter / X URL" />
              <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Instagram URL" />
              <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="LinkedIn URL" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="email-visible" checked={emailVisible} onChange={(e) => setEmailVisible(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#4B97C9]" />
            <label htmlFor="email-visible" className="text-sm text-gray-700">Show email on profile</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#4B97C9] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AuthorProfile() {
  const { isAuthenticated, user } = useAuth()
  const [authorSeed, setAuthorSeed] = useState<AuthorSeedData | null>(null)
  const [userSummary, setUserSummary] = useState<UserSummaryData | null>(null)
  const [authorProfile, setAuthorProfile] = useState<AuthorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('activity')
  const [sortBy, setSortBy] = useState<SortType>('newest')
  const [query, setQuery] = useState('')
  const [showUnfollowMenu, setShowUnfollowMenu] = useState(false)
  const [showDotsMenu, setShowDotsMenu] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [realFollowers, setRealFollowers] = useState(0)
  const [realFollowing, setRealFollowing] = useState(0)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Followers / Following modal
  const [showSocialModal, setShowSocialModal] = useState(false)
  const [socialModalTab, setSocialModalTab] = useState<'followers' | 'following'>('followers')
  const [socialList, setSocialList] = useState<any[]>([])
  const [loadingSocial, setLoadingSocial] = useState(false)

  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '')

  useEffect(() => {
    const handler = () => setCurrentHash(window.location.hash || '')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const routeAuthorId = useMemo(() => {
    const match = (currentHash || '').match(/^#\/user\/author\/([^/?#]+)/)
    return match?.[1] || ''
  }, [currentHash])

  useEffect(() => {
    const raw = sessionStorage.getItem('blog_author_profile')
    if (raw && routeAuthorId) {
      try {
        const parsed = JSON.parse(raw) as AuthorSeedData
        if (normalize(String(parsed.id)) === normalize(routeAuthorId)) {
          setAuthorSeed(parsed)
        } else {
          setAuthorSeed(null)
        }
      } catch {
        setAuthorSeed(null)
      }
    } else {
      setAuthorSeed(null)
    }
  }, [routeAuthorId])

  const authorKey = useMemo(() => {
    const stableId = normalize(authorSeed?.id || routeAuthorId)
    if (stableId) return stableId
    return normalize(authorSeed?.name || 'author')
  }, [authorSeed, routeAuthorId])

  const dispatch = useDispatch()
  const hasAuthorProfile = authorProfile != null
  const effectiveAuthorId = hasAuthorProfile ? String(authorProfile!.id) : routeAuthorId
  const reduxFollowKey = hasAuthorProfile ? String(authorProfile!.user_id) : routeAuthorId
  const isFollowingFromRedux = reduxFollowKey
    ? useSelector((s: RootState) => s.follow.byAuthorId[reduxFollowKey])
    : null
  const isFollowing = isFollowingFromRedux ?? false
  const unfollowMenuRef = useRef<HTMLDivElement>(null)
  const dotsMenuRef = useRef<HTMLDivElement>(null)
  const currentUserId = user?.id != null ? String(user.id) : null
  const isOwnProfile = Boolean(
    isAuthenticated &&
    (routeAuthorId === 'me' ||
      (currentUserId &&
        (hasAuthorProfile ? String(authorProfile!.user_id) === currentUserId : (routeAuthorId && /^\d+$/.test(routeAuthorId) && routeAuthorId === currentUserId))))
  )

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
      } catch (err) {
        setAuthorProfile(null)
        // When viewing "me" and no author profile exists, redirect to onboarding
        if (routeAuthorId === 'me' && isAuthenticated) {
          sessionStorage.setItem('author_onboarding_return', '#/user/author/me')
          window.location.hash = '#/user/author/onboarding'
        }
      }
    }

    fetchAuthorProfile()
  }, [routeAuthorId, isAuthenticated])

  // Record profile view once per session per author, only for visitors (not own profile)
  useEffect(() => {
    if (!authorProfile?.id || isOwnProfile) return
    const key = `pv_${authorProfile.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    blogActivityAPI.recordProfileView(authorProfile.id)
  }, [authorProfile?.id, isOwnProfile])

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

  // Fetch author stats (followers, subscribers, follow status) when we have an author identifier
  // Use "me" for own profile so we always use user_id-based lookup (preserves following across author onboarding)
  const statsAuthorId = routeAuthorId === 'me' && isAuthenticated ? 'me' : effectiveAuthorId
  useEffect(() => {
    if (!statsAuthorId || statsAuthorId === 'guest') return
    
    const fetchAuthorStats = async () => {
      try {
        const stats = await blogActivityAPI.getAuthorStats(statsAuthorId)
        setRealFollowers(stats.followers || 0)
        setRealFollowing(stats.following ?? 0)
        if (reduxFollowKey) {
          dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: stats.isFollowing ?? false }))
        }
      } catch (err) {
        console.error('Error fetching author stats:', err)
      }
    }

    fetchAuthorStats()
  }, [statsAuthorId, reduxFollowKey, dispatch])

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
                ? normalize(post.user_id ?? post.author_id) === normalize(routeAuthorId)
                : false
            const matchesAuthorId = authorSeed?.id != null
              ? normalize(String(post.user_id ?? post.author_id)) === normalize(String(authorSeed.id))
              : false
            const matchesName = authorSeed?.name
              ? normalize(post.author_name) === normalize(authorSeed.name)
              : false

            return matchesId || matchesAuthorId || matchesName
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

  // Fetch real author activities
  useEffect(() => {
    if (!effectiveAuthorId || effectiveAuthorId === 'guest' || activeTab !== 'activity') return
    
    const fetchActivities = async () => {
      setLoadingActivities(true)
      try {
        const data = await blogActivityAPI.getAuthorActivity(effectiveAuthorId, 20, 0)
        setActivities(data)
      } catch (err) {
        console.error('Error fetching activities:', err)
        setActivities([])
      } finally {
        setLoadingActivities(false)
      }
    }

    fetchActivities()
  }, [effectiveAuthorId, activeTab])

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
      id: userSummary?.id ?? posts[0]?.user_id ?? posts[0]?.author_id ?? authorSeed?.id ?? routeAuthorId ?? 'guest',
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
  const coverImage = hasAuthorProfile ? resolveImage(authorProfile!.cover_image) || '' : ''
  const profileImage = hasAuthorProfile
    ? resolveImage(authorProfile!.profile_image) || ''
    : resolveImage(userSummary?.profile_photo) || ''

  const authorStats = useMemo(() => {
    const totalPosts = posts.length
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count ?? 0), 0)
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count ?? 0), 0)
    const totalReads =
      posts.reduce((sum, post) => sum + (post.views_count ?? 0), 0) ||
      posts.reduce((sum, post) => sum + getReadingTime(post.content, post.excerpt) * 125, 0)

    const followers = realFollowers > 0 ? realFollowers : Math.max(85, totalPosts * 210 + totalLikes * 2)
    const following = realFollowing

    return {
      posts: totalPosts,
      likes: totalLikes,
      comments: totalComments,
      reads: totalReads,
      followers,
      following
    }
  }, [posts, realFollowers, realFollowing])

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
    const basicBio = (hasAuthorProfile ? authorProfile?.bio : userSummary?.bio) || ''
    if (basicBio.trim()) return basicBio.trim()

    const defaultBio = `${resolvedAuthor.name} is a writer on NEFOL sharing stories and ideas with the community.`
    if (!posts.length) return defaultBio

    const topics = featuredCategories.length ? featuredCategories.join(', ') : 'culture, skincare, and storytelling'
    return `${resolvedAuthor.name} writes on NEFOL covering ${topics}. With ${authorStats.posts} published ${authorStats.posts === 1 ? 'post' : 'posts'}, this profile highlights their writing and reader engagement.`
  }, [authorProfile?.bio, authorStats.posts, featuredCategories, hasAuthorProfile, posts.length, resolvedAuthor.name, userSummary?.bio])

  // Open Graph meta tags for when profile is shared (client-side fallback for JS crawlers)
  useEffect(() => {
    if (!resolvedAuthor?.name || !effectiveAuthorId || effectiveAuthorId === 'guest') return
    const shareAuthorId = (hasAuthorProfile && authorProfile?.unique_user_id) ? authorProfile.unique_user_id : effectiveAuthorId
    const base = getApiBase().replace(/\/$/, '')
    const canonicalUrl = `${base}/author/${encodeURIComponent(String(shareAuthorId))}`
    const ogImage = profileImage || coverImage || ''
    const description = (aboutText || '').replace(/<[^>]*>/g, '').slice(0, 200)

    const setMeta = (key: string, value: string, attr: 'name' | 'property' = 'name') => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute(attr, key)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', value)
    }

    document.title = `${resolvedAuthor.name} | NEFOL Author`
    setMeta('description', description || `${resolvedAuthor.name}'s profile on NEFOL`)
    setMeta('og:title', `${resolvedAuthor.name}`, 'property')
    setMeta('og:description', description || `${resolvedAuthor.name}'s profile on NEFOL`, 'property')
    setMeta('og:url', canonicalUrl, 'property')
    setMeta('og:type', 'profile', 'property')
    setMeta('og:site_name', 'The Nefol', 'property')
    if (ogImage) {
      setMeta('og:image', ogImage, 'property')
      setMeta('og:image:width', '400', 'property')
      setMeta('og:image:height', '400', 'property')
    }
    setMeta('profile:username', handle, 'property')
    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary', 'name')
    setMeta('twitter:title', `${resolvedAuthor.name}`, 'name')
    setMeta('twitter:description', description || `${resolvedAuthor.name}'s profile on NEFOL`, 'name')
    if (ogImage) setMeta('twitter:image', ogImage, 'name')

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)
  }, [resolvedAuthor?.name, effectiveAuthorId, hasAuthorProfile, authorProfile?.unique_user_id, aboutText, profileImage, coverImage, handle])

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
      const result = await blogActivityAPI.followAuthor(effectiveAuthorId)
      setRealFollowers(result.followerCount ?? realFollowers + 1)
      if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: true }))
    } catch (err) {
      console.error('Error following:', err)
    }
  }

  const handleUnfollow = async () => {
    if (!ensureAuthForAction()) return
    if (!effectiveAuthorId || effectiveAuthorId === 'guest') return
    setShowUnfollowMenu(false)
    try {
      const result = await blogActivityAPI.unfollowAuthor(effectiveAuthorId)
      setRealFollowers(Math.max(0, (result.followerCount ?? realFollowers - 1)))
      if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: false }))
    } catch (err) {
      console.error('Error unfollowing:', err)
      if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: false }))
    }
  }

  const openSocialModal = async (tab: 'followers' | 'following') => {
    setSocialModalTab(tab)
    setShowSocialModal(true)
    setLoadingSocial(true)
    setSocialList([])
    try {
      // Use statsAuthorId ('me') for following to preserve user_id-based lookup across author onboarding
      const id = tab === 'following' ? statsAuthorId : effectiveAuthorId
      if (!id || id === 'guest') return
      const data = tab === 'followers'
        ? await blogActivityAPI.getAuthorFollowers(String(id))
        : await blogActivityAPI.getAuthorFollowing(String(id))
      setSocialList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching social list:', err)
      setSocialList([])
    } finally {
      setLoadingSocial(false)
    }
  }

  const switchSocialTab = async (tab: 'followers' | 'following') => {
    if (tab === socialModalTab) return
    setSocialModalTab(tab)
    setLoadingSocial(true)
    setSocialList([])
    try {
      const id = tab === 'following' ? statsAuthorId : effectiveAuthorId
      if (!id || id === 'guest') return
      const data = tab === 'followers'
        ? await blogActivityAPI.getAuthorFollowers(String(id))
        : await blogActivityAPI.getAuthorFollowing(String(id))
      setSocialList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching social list:', err)
      setSocialList([])
    } finally {
      setLoadingSocial(false)
    }
  }

  const handleShareProfile = async () => {
    const shareAuthorId = (hasAuthorProfile && authorProfile?.unique_user_id)
      ? authorProfile.unique_user_id
      : effectiveAuthorId
    const shareUrl = `${getApiBase()}/author/${encodeURIComponent(String(shareAuthorId))}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${resolvedAuthor.name} on NEFOL`,
          text: `${resolvedAuthor.name}'s profile on NEFOL. ${aboutText ? aboutText.slice(0, 100) + '...' : ''}`,
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

  const { goBack, backLabel } = useBlogBack()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (unfollowMenuRef.current && !unfollowMenuRef.current.contains(e.target as Node)) {
        setShowUnfollowMenu(false)
      }
    }
    if (showUnfollowMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUnfollowMenu])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) {
        setShowDotsMenu(false)
      }
    }
    if (showDotsMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDotsMenu])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null)
        setShowSocialModal(false)
      }
    }
    if (lightboxImage || showSocialModal) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxImage, showSocialModal])

  // Lock scroll on both html + body when social modal or lightbox is open
  useEffect(() => {
    if (showSocialModal || lightboxImage) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [showSocialModal, lightboxImage])

  return (
    <main className="min-h-screen bg-[#F4F9F9] pb-16">
      {/* Back button — sits above the page card */}
      <div className="mx-auto w-full max-w-5xl px-3 pt-4 sm:px-4 sm:pt-7">
        <button
          onClick={goBack}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 sm:mb-4 sm:gap-2 sm:text-sm"
          style={{ color: '#1B4965' }}
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {backLabel}
        </button>
      </div>

      {/* ── Single unified profile page ── */}
      <div className="mx-auto w-full max-w-5xl">
        <section>
          {/* ── Cover Banner ── */}
          <div
            className={`relative h-40 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#1B4965] via-[#2d6688] to-[#4B97C9] sm:h-64 sm:rounded-2xl ${coverImage ? 'cursor-zoom-in' : ''}`}
            onClick={() => coverImage && setLightboxImage(coverImage)}
            role={coverImage ? 'button' : undefined}
            aria-label={coverImage ? 'View cover image' : undefined}
          >
            {coverImage ? (
              <img src={coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              /* Decorative pattern when no cover */
              <div className="absolute inset-0 opacity-10">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-white/40"
                    style={{
                      width: `${120 + i * 60}px`,
                      height: `${120 + i * 60}px`,
                      top: `${-20 + i * 10}px`,
                      left: `${-30 + i * 80}px`,
                    }}
                  />
                ))}
              </div>
            )}
            {/* Bottom gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
          </div>

          {/* ── Profile Body ── */}
          <div className="relative px-4 pb-6 sm:px-8 sm:pb-7">
            {/* Avatar — overlaps the cover, smaller on mobile. Click to view full image */}
            <div className="absolute -top-12 left-4 sm:-top-18 sm:left-8">
              <div
                className={`h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg sm:h-36 sm:w-36 sm:border-[5px] sm:shadow-xl ${profileImage ? 'cursor-zoom-in' : ''}`}
                onClick={() => profileImage && setLightboxImage(profileImage)}
                role={profileImage ? 'button' : undefined}
                aria-label={profileImage ? 'View profile picture' : undefined}
              >
                {profileImage ? (
                  <img src={profileImage} alt={resolvedAuthor.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4B97C9] to-[#1B4965] text-4xl font-bold text-white sm:text-5xl">
                    {resolvedAuthor.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                )}
              </div>
            </div>

            {/* Action bar — top-right of the profile body */}
            <div className="flex items-center justify-end gap-2 pt-3 pb-5">
              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#1B4965] text-[#1B4965] transition-all duration-200 hover:bg-[#1B4965] hover:text-white sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-5 sm:py-2 sm:text-sm sm:font-semibold"
                  aria-label="Edit profile"
                >
                  <Pencil className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Edit profile</span>
                </button>
              ) : !isOwnProfile && routeAuthorId && routeAuthorId !== 'guest' ? (
                <>
                  {/* Follow / Followed button */}
                  <div className="relative" ref={unfollowMenuRef}>
                    {isFollowing ? (
                      <>
                        <button
                          onClick={() => setShowUnfollowMenu((s) => !s)}
                          className="inline-flex items-center gap-1 rounded-full border-2 border-[#1B4965] bg-[#1B4965] px-4 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#163d57] sm:gap-1.5 sm:px-6 sm:py-2"
                        >
                          Following
                          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        {showUnfollowMenu && (
                          <div className="absolute left-0 top-full mt-2 z-30 min-w-[150px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                            <button
                              onClick={handleUnfollow}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <UserPlus className="h-4 w-4 rotate-180" />
                              Unfollow
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={handleFollow}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-[#4B97C9] bg-[#4B97C9] px-4 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#3a82b0] sm:gap-1.5 sm:px-6 sm:py-2"
                      >
                        <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Follow
                      </button>
                    )}
                  </div>
                </>
              ) : null}

              {/* 3-dot menu */}
              <div className="relative shrink-0" ref={dotsMenuRef}>
                <button
                  onClick={() => setShowDotsMenu((s) => !s)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#dbe7ef] bg-white text-gray-600 transition-all duration-200 hover:border-[#4B97C9] hover:text-[#1B4965] sm:h-10 sm:w-10"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showDotsMenu && (
                  <div className="absolute right-0 top-full mt-2 z-30 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                        setShowCopied(true)
                        setShowDotsMenu(false)
                        setTimeout(() => setShowCopied(false), 2000)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {showCopied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4 text-gray-400" />}
                      {showCopied ? 'Copied!' : 'Copy link'}
                    </button>
                    <button
                      onClick={() => { handleShareProfile(); setShowDotsMenu(false) }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Share2 className="h-4 w-4 text-gray-400" />
                      Share
                    </button>
                    {!isOwnProfile && routeAuthorId && routeAuthorId !== 'guest' && (
                      <>
                        <div className="my-1 border-t border-gray-100" />
                        {isFollowing ? (
                          <button
                            onClick={() => { handleUnfollow(); setShowDotsMenu(false) }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <UserPlus className="h-4 w-4 rotate-180" />
                            Unfollow
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleFollow(); setShowDotsMenu(false) }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#1B4965] hover:bg-[#f0f7fc] transition-colors"
                          >
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={() => setShowDotsMenu(false)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Flag className="h-4 w-4" />
                          Report
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Name + handle */}
            <div className="mb-2 mt-8 sm:mb-3 sm:mt-14">
              <h1 className="text-xl font-bold leading-tight text-gray-900 sm:text-3xl">{resolvedAuthor.name}</h1>
              {handle && <p className="mt-0.5 text-xs font-medium text-gray-400 sm:text-sm">{handle}</p>}
            </div>

            {/* Bio */}
            {aboutText && (
              <p className="mb-3 max-w-2xl text-[13px] leading-relaxed text-gray-600 sm:mb-4 sm:text-[15px]">{aboutText}</p>
            )}

            {/* Stats — compact Instagram-style on mobile, inline on desktop */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-0">
                <div className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1">
                  <span className="text-base font-bold text-gray-900 sm:text-sm">{formatCompactNumber(authorStats.posts)}</span>
                  <span className="text-[11px] text-gray-500 sm:text-sm">posts</span>
                </div>
                <button
                  onClick={() => openSocialModal('followers')}
                  className="flex flex-col items-center transition-opacity hover:opacity-70 sm:flex-row sm:items-baseline sm:gap-1"
                >
                  <span className="text-base font-bold text-gray-900 sm:text-sm">{formatCompactNumber(authorStats.followers)}</span>
                  <span className="text-[11px] text-gray-500 sm:text-sm">followers</span>
                </button>
                <button
                  onClick={() => openSocialModal('following')}
                  className="flex flex-col items-center transition-opacity hover:opacity-70 sm:flex-row sm:items-baseline sm:gap-1"
                >
                  <span className="text-base font-bold text-gray-900 sm:text-sm">{formatCompactNumber(authorStats.following)}</span>
                  <span className="text-[11px] text-gray-500 sm:text-sm">following</span>
                </button>
                <div className="flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1">
                  <span className="text-base font-bold text-gray-900 sm:text-sm">{formatCompactNumber(authorStats.reads)}</span>
                  <span className="text-[11px] text-gray-500 sm:text-sm">reads</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Flat underline tab bar ── */}
        <div className="border-b border-[#b8cdd9] px-4 sm:px-8">
          <div className="flex items-center justify-between">
            <div className="flex">
              {(['activity', 'posts', 'about'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-3 py-3 text-xs font-semibold capitalize transition-colors duration-200 sm:px-4 sm:py-4 sm:text-sm ${
                    activeTab === tab
                      ? 'text-[#1B4965]'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {tab}
                  {tab === 'posts' && posts.length > 0 && (
                    <span className="ml-1 rounded-full bg-[#edf4f9] px-1 py-px text-[10px] font-bold text-[#4B97C9] sm:ml-1.5 sm:px-1.5 sm:py-0.5">
                      {posts.length}
                    </span>
                  )}
                  {activeTab === tab && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#1B4965]" />
                  )}
                </button>
              ))}
            </div>
            {activeTab === 'posts' && (
              <div className="hidden items-center gap-2 sm:flex">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-8 w-44 rounded-lg border border-[#dbe7ef] px-3 text-sm outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
                  placeholder="Search posts..."
                />
                <CustomSelect
                  value={sortBy}
                  onChange={(v) => setSortBy(v as SortType)}
                  options={[
                    { value: 'newest', label: 'Newest' },
                    { value: 'popular', label: 'Popular' },
                    { value: 'oldest', label: 'Oldest' },
                  ]}
                  align="right"
                />
              </div>
            )}
          </div>
          {activeTab === 'posts' && (
            <div className="flex flex-col gap-2 pb-3 sm:hidden">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 w-full rounded-lg border border-[#dbe7ef] px-3 text-sm outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
                placeholder="Search posts..."
              />
              <CustomSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as SortType)}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'popular', label: 'Popular' },
                  { value: 'oldest', label: 'Oldest' },
                ]}
                align="left"
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="px-6 py-10">
            <LoadingSpinner size="md" message="Loading author profile..." />
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        ) : activeTab === 'activity' ? (
          <div className="space-y-0 px-4 py-4 sm:px-8 sm:py-6">
              {loadingActivities ? (
                <div className="py-6">
                  <LoadingSpinner size="md" message="Loading activity..." />
                </div>
              ) : activities.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No activity yet</p>
                  <p className="mt-1 text-xs text-gray-400">Posts, likes, and reposts from this author will appear here.</p>
                </div>
              ) : (
                activities.map((item: any, idx: number) => {
                  const isPublished = item.activity_type === 'published_post'
                  const isLiked = item.activity_type === 'liked_post'
                  const isCommented = item.activity_type === 'commented_on_post'
                  const isReposted = item.activity_type === 'reposted_post'
                  const cover = item.cover_image
                    ? (item.cover_image.startsWith('/uploads/') ? `${getApiBase()}${item.cover_image}` : item.cover_image)
                    : null

                  const actionLabel = isPublished
                    ? { text: 'published', icon: <BookOpen className="h-3.5 w-3.5" /> }
                    : isLiked
                    ? { text: 'liked', icon: <Heart className="h-3.5 w-3.5" /> }
                    : isCommented
                    ? { text: 'commented', icon: <MessageCircle className="h-3.5 w-3.5" /> }
                    : isReposted
                    ? { text: 'reposted', icon: <Repeat2 className="h-3.5 w-3.5" /> }
                    : { text: 'activity', icon: <Sparkles className="h-3.5 w-3.5" /> }

                  return (
                    <div key={`${item.activity_type}-${item.post_id}-${idx}`} className="border-b border-gray-200 py-4 last:border-0">
                      {/* Minimal action label row */}
                      <div className="mb-2.5 flex items-center gap-1.5 text-[12px] text-gray-400">
                        <span className="text-gray-400">{actionLabel.icon}</span>
                        <span className="font-medium text-gray-500">{actionLabel.text}</span>
                      </div>

                      {/* Post card */}
                      <a
                        href={`#/user/blog/${item.post_id}`}
                        className="flex items-start gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-[#f4f9fc]"
                      >
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover sm:h-[72px] sm:w-[72px]"
                          />
                        ) : (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#edf4f9] sm:h-[72px] sm:w-[72px]">
                            <BookOpen className="h-5 w-5 text-[#4B97C9]/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug">
                            {item.post_title}
                          </h3>
                          {isCommented && item.comment_content ? (
                            <p className="mt-1 line-clamp-1 text-xs text-gray-500 italic">"{item.comment_content}"</p>
                          ) : item.post_excerpt ? (
                            <p className="mt-1 line-clamp-1 text-xs text-gray-400">{item.post_excerpt}</p>
                          ) : null}
                          <p className="mt-1.5 text-[11px] text-gray-400">
                            {new Date(item.activity_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </a>
                    </div>
                  )
                })
              )}
          </div>
        ) : activeTab === 'posts' ? (
          <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-8 sm:py-6">
              {filteredPosts.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-6 text-center sm:rounded-xl sm:p-8">
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
                      className="group overflow-hidden rounded-lg border border-[#e6eff5] bg-white transition-all duration-200 hover:border-[#4B97C9]/40 hover:shadow-lg sm:rounded-xl"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {cover && (
                          <div className="h-36 w-full shrink-0 overflow-hidden bg-[#edf3f8] sm:h-auto sm:w-56">
                            <img
                              src={cover}
                              alt={post.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
                          <div>
                            <h3 className="text-base font-bold leading-snug text-gray-900 group-hover:text-[#1B4965] sm:text-xl">
                              {post.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">{post.excerpt}</p>

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
          <div className="px-4 py-4 sm:px-8 sm:py-6">
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
              <div className="mt-6 space-y-0 divide-y divide-[#c8d8e4]">
                {authorProfile?.writing_languages?.length ? (
                  <div className="py-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Languages</div>
                    <div className="flex flex-wrap gap-2">
                      {authorProfile.writing_languages.map((lang) => (
                        <span key={lang} className="rounded-full bg-[#f0f7fc] px-3 py-1 text-sm font-medium text-[#1B4965]">{lang}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {authorProfile?.location ? (
                  <div className="py-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Location</div>
                    <p className="text-sm font-medium text-gray-700">{authorProfile.location}</p>
                  </div>
                ) : null}
                {authorProfile?.website ? (
                  <div className="py-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Website</div>
                    <a href={authorProfile.website.startsWith('http') ? authorProfile.website : `https://${authorProfile.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#4B97C9] hover:underline">{authorProfile.website}</a>
                  </div>
                ) : null}
                {authorProfile?.social_links && Object.keys(authorProfile.social_links).length > 0 ? (
                  <div className="py-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Connect</div>
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
              <div className="rounded-xl border border-[#e6eff5] bg-[#f8fbfd] p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Publishing cadence
                </div>
                <div className="text-lg font-bold text-[#1B4965]">
                  {authorStats.posts > 8 ? 'Weekly' : authorStats.posts > 3 ? 'Bi-weekly' : 'Occasional'}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {authorStats.posts} {authorStats.posts === 1 ? 'post' : 'posts'} published
                </p>
              </div>
              <div className="rounded-xl border border-[#e6eff5] bg-[#f8fbfd] p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Community</div>
                <div className="text-lg font-bold text-[#1B4965]">
                  {formatCompactNumber(authorStats.followers + authorStats.following)}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatCompactNumber(authorStats.followers)} followers • {formatCompactNumber(authorStats.following)}{' '}
                  following
                </p>
              </div>
            </div>

            {((hasAuthorProfile && authorProfile?.writing_categories?.length) ? authorProfile!.writing_categories! : featuredCategories).length > 0 && (
              <div className="mt-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {hasAuthorProfile && authorProfile?.writing_categories?.length ? 'Writing interests' : 'Popular topics'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(hasAuthorProfile && authorProfile?.writing_categories?.length ? authorProfile.writing_categories : featuredCategories).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-[#dce9f2] bg-[#f0f7fc] px-4 py-1.5 text-sm font-medium capitalize text-[#1B4965] transition-all duration-200 hover:border-[#4B97C9]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {resolvedAuthor.email && (
              <div className="mt-6 border-t border-[#f0f5f8] pt-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</div>
                <a
                  href={`mailto:${resolvedAuthor.email}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#4B97C9] transition-colors hover:text-[#1B4965] hover:underline"
                >
                  <span>{resolvedAuthor.email}</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
          role="button"
          tabIndex={0}
          aria-label="Close image view"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size view"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && authorProfile && (
        <EditAuthorProfileModal
          authorProfile={authorProfile}
          apiBase={apiBase}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setAuthorProfile(updated)
            setShowEditModal(false)
          }}
        />
      )}

      {/* Followers / Following Modal */}
      {showSocialModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowSocialModal(false)}
        >
          <div
            className="flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
            style={{ height: '520px', maxHeight: '85vh', overscrollBehavior: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">{resolvedAuthor.name}</h2>
              <button
                onClick={() => setShowSocialModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pinned tabs */}
            <div className="flex flex-shrink-0 border-b border-gray-100">
              {(['followers', 'following'] as const).map((tab) => {
                const count = tab === 'followers' ? authorStats.followers : authorStats.following
                return (
                  <button
                    key={tab}
                    onClick={() => switchSocialTab(tab)}
                    className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${
                      socialModalTab === tab
                        ? 'border-b-2 border-[#1B4965] text-[#1B4965]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} ({formatCompactNumber(count)})
                  </button>
                )
              })}
            </div>

            {/* Scrollable list — only this part scrolls */}
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
              {loadingSocial ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
                </div>
              ) : socialList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-sm font-medium text-gray-400">
                    No {socialModalTab} yet
                  </p>
                </div>
              ) : (
                <ul className="px-1 py-1">
                  {socialList.map((person: any, idx: number) => {
                    const profileId = person.author_profile_id
                    const displayName = person.display_name || person.pen_name || person.username || 'User'
                    const tagline = person.username ? `@${person.username}` : null
                    const avatar = person.profile_image
                      ? (person.profile_image.startsWith('/uploads/')
                          ? `${getApiBase()}${person.profile_image}`
                          : person.profile_image)
                      : null
                    const initials = displayName.slice(0, 2).toUpperCase()

                    return (
                      <li key={idx}>
                        <button
                          onClick={() => {
                            if (!profileId) return
                            setShowSocialModal(false)
                            window.location.hash = `#/user/author/${profileId}`
                          }}
                          disabled={!profileId}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#f4f9fc] disabled:cursor-default disabled:opacity-60"
                        >
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={displayName}
                              className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#c8dff0] text-[13px] font-bold text-[#1B4965]">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-gray-900">{displayName}</p>
                            {tagline && (
                              <p className="truncate text-[12px] text-gray-400">{tagline}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
