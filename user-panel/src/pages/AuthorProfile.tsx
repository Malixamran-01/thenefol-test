import React, { useEffect, useState } from 'react'
import { 
  ArrowLeft, 
  User, 
  Heart, 
  MessageCircle, 
  BookOpen, 
  Calendar,
  Mail,
  MapPin,
  Link as LinkIcon,
  Share2,
  MoreVertical,
  Bell,
  BellOff,
  Check
} from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

interface AuthorProfileData {
  id: string | number
  name: string
  email?: string
  bio?: string
  avatar?: string
  location?: string
  website?: string
  joined_date?: string
  social_links?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
}

interface BlogPost {
  id: number
  title: string
  excerpt: string
  cover_image: string
  created_at: string
  categories: string[]
  reading_time?: number
  likes_count?: number
  comments_count?: number
}

interface AuthorStats {
  total_posts: number
  total_likes: number
  total_comments: number
  total_subscribers: number
  total_views: number
}

export default function AuthorProfile() {
  const { isAuthenticated, user } = useAuth()
  const [author, setAuthor] = useState<AuthorProfileData | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [stats, setStats] = useState<AuthorStats>({
    total_posts: 0,
    total_likes: 0,
    total_comments: 0,
    total_subscribers: 0,
    total_views: 0
  })
  const [activeTab, setActiveTab] = useState<'activity' | 'posts' | 'about'>('posts')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    const fetchAuthorData = async () => {
      try {
        const raw = sessionStorage.getItem('blog_author_profile')
        if (!raw) {
          setLoading(false)
          return
        }

        const parsed = JSON.parse(raw) as AuthorProfileData
        setAuthor(parsed)

        // Fetch author's posts
        const apiBase = getApiBase()
        const response = await fetch(`${apiBase}/api/blog/posts`)
        if (response.ok) {
          const allPosts = await response.json()
          // Filter posts by this author
          const authorPosts = allPosts.filter((post: any) => 
            post.author_email === parsed.email || post.author_name === parsed.name
          )
          
          // Transform posts data
          const transformedPosts = authorPosts.map((post: any) => ({
            id: post.id,
            title: post.title,
            excerpt: post.excerpt,
            cover_image: post.cover_image,
            created_at: post.created_at,
            categories: post.categories || [],
            reading_time: calculateReadingTime(post.content),
            likes_count: 0,
            comments_count: 0
          }))

          setPosts(transformedPosts)

          // Calculate stats
          let totalLikes = 0
          let totalComments = 0

          // Fetch likes and comments for each post
          for (const post of transformedPosts) {
            try {
              const likesRes = await fetch(`${apiBase}/api/blog/posts/${post.id}/likes`)
              if (likesRes.ok) {
                const likesData = await likesRes.json()
                totalLikes += likesData.count || 0
                post.likes_count = likesData.count || 0
              }

              const commentsRes = await fetch(`${apiBase}/api/blog/posts/${post.id}/comments`)
              if (commentsRes.ok) {
                const commentsData = await commentsRes.json()
                totalComments += commentsData.length || 0
                post.comments_count = commentsData.length || 0
              }
            } catch (err) {
              console.error('Error fetching post stats:', err)
            }
          }

          setStats({
            total_posts: transformedPosts.length,
            total_likes: totalLikes,
            total_comments: totalComments,
            total_subscribers: Math.floor(Math.random() * 1000) + 100, // Mock data
            total_views: Math.floor(Math.random() * 10000) + 1000 // Mock data
          })
        }
      } catch (error) {
        console.error('Error fetching author data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAuthorData()
  }, [])

  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed)
    if (!isSubscribed) {
      setStats(prev => ({ ...prev, total_subscribers: prev.total_subscribers + 1 }))
    } else {
      setStats(prev => ({ ...prev, total_subscribers: Math.max(0, prev.total_subscribers - 1) }))
    }
  }

  const handleShare = () => {
    setShowShareMenu(!showShareMenu)
  }

  const shareProfile = (platform: string) => {
    const url = window.location.href
    const text = `Check out ${author?.name}'s profile`
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
        break
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        alert('Profile link copied to clipboard!')
        break
    }
    setShowShareMenu(false)
  }

  const handleBack = () => {
    window.location.hash = '#/user/blog'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        </div>
      </main>
    )
  }

  if (!author) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Author Not Found</h1>
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Blog
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 h-64">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative mx-auto max-w-6xl px-4 h-full flex items-center">
          <button
            onClick={handleBack}
            className="absolute top-6 left-4 inline-flex items-center gap-2 text-sm font-medium text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="mx-auto max-w-6xl px-4 -mt-20 pb-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* Avatar */}
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-1">
                  <div className="h-full w-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {author.avatar ? (
                      <img src={author.avatar} alt={author.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-gray-700 dark:text-gray-300">
                        {author.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-green-500 border-4 border-white dark:border-gray-800 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Author Info */}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {author.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {author.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{author.email}</span>
                    </div>
                  )}
                  {author.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{author.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(author.joined_date || new Date().toISOString())}</span>
                  </div>
                </div>
                {author.bio && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-2xl">
                    {author.bio}
                  </p>
                )}
                {author.website && (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {author.website}
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubscribe}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isSubscribed
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg'
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="h-5 w-5" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="h-5 w-5" />
                      Subscribe
                    </>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Share2 className="h-5 w-5" />
                    Share
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-10">
                      <button
                        onClick={() => shareProfile('twitter')}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Share on Twitter
                      </button>
                      <button
                        onClick={() => shareProfile('facebook')}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Share on Facebook
                      </button>
                      <button
                        onClick={() => shareProfile('linkedin')}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Share on LinkedIn
                      </button>
                      <button
                        onClick={() => shareProfile('copy')}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Copy Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.total_posts}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatNumber(stats.total_subscribers)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subscribers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatNumber(stats.total_likes)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatNumber(stats.total_comments)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Comments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatNumber(stats.total_views)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Views</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-8 px-6 sm:px-8">
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'posts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Posts ({stats.total_posts})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'about'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                About
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No recent activity
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.slice(0, 5).map((post) => (
                      <div
                        key={post.id}
                        className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => window.location.hash = `#/user/blog/${post.id}`}
                      >
                        <div className="flex-shrink-0">
                          <BookOpen className="h-10 w-10 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Published a new post
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{post.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.comments_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Posts</h2>
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No posts yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <article
                        key={post.id}
                        className="group bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700"
                        onClick={() => window.location.hash = `#/user/blog/${post.id}`}
                      >
                        {/* Post Image */}
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={`${getApiBase()}${post.cover_image}`}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute top-3 right-3 flex gap-2">
                            {post.categories.slice(0, 1).map((category, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 text-xs font-semibold bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-full backdrop-blur-sm"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>

                          {/* Post Meta */}
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Heart className="h-3.5 w-3.5" />
                                <span>{post.likes_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>{post.comments_count || 0}</span>
                              </div>
                            </div>
                            <span>{post.reading_time || 5} min read</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About {author.name}</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300">
                    {author.bio || 'This author hasn\'t added a bio yet.'}
                  </p>
                </div>

                {/* Contact Info */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {author.email && (
                      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <a href={`mailto:${author.email}`} className="hover:text-blue-600">
                          {author.email}
                        </a>
                      </div>
                    )}
                    {author.location && (
                      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <span>{author.location}</span>
                      </div>
                    )}
                    {author.website && (
                      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <LinkIcon className="h-5 w-5 text-gray-500" />
                        <a 
                          href={author.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {author.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Since */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span>
                      Member since {formatDate(author.joined_date || new Date().toISOString())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
