import React, { useState, useEffect } from 'react'
import { Users, MessageCircle, Heart, Share2, Star } from 'lucide-react'

export default function Community() {
  const [communityPosts, setCommunityPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [communityStats, setCommunityStats] = useState({
    members: 0,
    posts: 0,
    likes: 0
  })

  useEffect(() => {
    fetchCommunityData()
  }, [])

  const fetchCommunityData = async () => {
    try {
      // Fetch community posts
      const postsResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/community/posts`)
      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        setCommunityPosts(postsData)
      }

      // Fetch community stats
      const statsResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/api/community/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setCommunityStats(statsData)
      }
    } catch (error) {
      console.error('Failed to fetch community data:', error)
      // Fallback to empty data
      setCommunityPosts([])
      setCommunityStats({ members: 0, posts: 0, likes: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Nefol Community
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Connect with fellow Nefol users, share your experiences, and get inspired by real stories.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {loading ? '...' : `${communityStats.members}+`}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">Active Members</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {loading ? '...' : `${communityStats.posts}+`}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">Posts & Reviews</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {loading ? '...' : `${communityStats.likes}+`}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">Likes & Shares</p>
          </div>
        </div>

        {/* Community Posts */}
        <div className="space-y-6 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Recent Community Posts
          </h2>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400">Loading community posts...</p>
            </div>
          ) : communityPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400">No community posts available at the moment.</p>
            </div>
          ) : (
            communityPosts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{post.avatar || post.user?.charAt(0) || 'U'}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{post.user || 'Anonymous User'}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{post.time || 'Recently'}</p>
                  </div>
                </div>
                
                <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                  {post.content || 'No content available'}
                </p>
                
                {post.image && (
                  <div className="mb-4">
                    <img 
                      src={post.image} 
                      alt="Post" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span>{post.likes || 0}</span>
                  </button>
                  <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.comments || 0}</span>
                  </button>
                  <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-green-500 transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Join Community */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 text-center">
            Join Our Community
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
            Share your Nefol journey, get tips from experts, and connect with like-minded people.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Share Your Story
            </button>
            <button className="border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors">
              Ask Questions
            </button>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Community Guidelines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Be Respectful
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Treat all community members with kindness and respect. We're all here to share and learn.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Share Authentic Experiences
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Share your real experiences with Nefol products to help others make informed decisions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Stay On Topic
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Keep discussions focused on skincare, hair care, and wellness topics related to Nefol.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                No Spam or Promotions
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Avoid posting promotional content or spam. This is a space for genuine community interaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
