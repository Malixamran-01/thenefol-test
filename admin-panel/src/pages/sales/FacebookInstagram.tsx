import React, { useState, useEffect } from 'react'

interface SocialPost {
  id: number
  platform: 'facebook' | 'instagram'
  content: string
  image: string
  scheduledFor: string
  status: 'scheduled' | 'published' | 'draft'
}

interface SocialStats {
  totalPosts: number
  scheduled: number
  engagement: string
  reach: string
}

export default function FacebookInstagram() {
  const [isConnected, setIsConnected] = useState(false)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [stats, setStats] = useState<SocialStats>({
    totalPosts: 0,
    scheduled: 0,
    engagement: '0',
    reach: '0'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`

  useEffect(() => {
    loadSocialData()
  }, [])

  const loadSocialData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const [connectionRes, postsRes, statsRes] = await Promise.all([
        fetch(`${apiBase}/api/social/connection-status`),
        fetch(`${apiBase}/api/social/posts`),
        fetch(`${apiBase}/api/social/stats`)
      ])

      if (connectionRes.ok) {
        const connectionData = await connectionRes.json()
        setIsConnected(connectionData.connected || false)
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json()
        setPosts(postsData.posts || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load social data:', error)
      setError('Failed to load social media data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Facebook & Instagram
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage your social media presence
          </p>
        </div>
        <button 
          onClick={() => setIsConnected(!isConnected)}
          className={isConnected ? "btn-secondary" : "btn-primary"}
        >
          {isConnected ? 'Disconnect' : 'Connect Account'}
        </button>
      </div>

      {!isConnected ? (
        <div className="metric-card text-center py-12">
          <div className="text-6xl mb-4">📘</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Social Media</h2>
          <p className="text-gray-600 mb-6">Connect your Facebook and Instagram accounts to manage posts, stories, and ads from one place.</p>
          <button 
            onClick={() => setIsConnected(true)}
            className="btn-primary"
          >
            Connect Facebook & Instagram
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">f</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Facebook Page</h3>
                  <p className="text-sm text-gray-600">Nefol Skincare</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Connected</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Total Posts', value: '24', icon: '📝' },
              { title: 'Scheduled', value: '3', icon: '⏰' },
              { title: 'Engagement', value: '2.4K', icon: '❤️' },
              { title: 'Reach', value: '8.7K', icon: '👁️' }
            ].map((stat, index) => (
              <div key={index} className="metric-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="text-2xl">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Posts */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
              <button className="btn-primary">Create Post</button>
            </div>

            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <img 
                      src={post.image} 
                      alt="Post" 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          post.platform === 'facebook' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {post.platform === 'facebook' ? '📘 Facebook' : '📷 Instagram'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-gray-900 mb-2">{post.content}</p>
                      <p className="text-sm text-gray-500">
                        {post.status === 'scheduled' ? 'Scheduled for' : 'Published on'} {new Date(post.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn-secondary text-xs px-2 py-1">Edit</button>
                      <button className="btn-secondary text-xs px-2 py-1">View</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








