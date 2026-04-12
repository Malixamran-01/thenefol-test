import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Pencil, Trash2, Eye, PenLine, BookOpen, Clock } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { blogActivityAPI } from '../services/api'
import { authorAPI } from '../services/authorAPI'
import { clearLocalDraft, getLocalDraft } from '../utils/blogDraft'
import AuthorPromptModal from '../components/AuthorPromptModal'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author_name: string
  cover_image?: string
  created_at: string
  updated_at: string
  status: 'pending' | 'approved' | 'rejected'
  likes_count?: number
  comments_count?: number
  revision_pending?: unknown
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

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-gray-300 border-t-[#4B97C9]" />
    <p className="mt-3 text-sm text-gray-500">Loading your posts...</p>
  </div>
)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function MyBlogsPage() {
  const { isAuthenticated, user } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [drafts, setDrafts] = useState<BlogDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [draftsLoading, setDraftsLoading] = useState(true)
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [showAuthorPrompt, setShowAuthorPrompt] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', '#/user/blog/my-blogs')
      window.location.hash = '#/user/login'
      return
    }
  }, [isAuthenticated])

  const fetchPosts = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError('')
    try {
      const data = await blogActivityAPI.getMyPosts()
      const apiBase = getApiBase()
      const withUrls = (data || []).map((post: BlogPost) => ({
        ...post,
        cover_image:
          post.cover_image?.startsWith('/uploads/') ? `${apiBase}${post.cover_image}` : post.cover_image,
      }))
      setPosts(withUrls)
    } catch (err) {
      setError('Failed to load your posts.')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDrafts = async () => {
    if (!isAuthenticated) return
    setDraftsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`${getApiBase()}/api/blog/drafts?include_auto=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDrafts(data || [])
      } else {
        setDrafts([])
      }
    } catch {
      setDrafts([])
    } finally {
      setDraftsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts()
      fetchDrafts()
    } else {
      setLoading(false)
      setDraftsLoading(false)
    }
  }, [isAuthenticated])

  const handleEditDraft = (draftId: number) => {
    window.location.hash = `#/user/blog/request?draft=${draftId}`
  }

  const handleWriteClick = useCallback(async () => {
    try {
      const eligibility = await authorAPI.checkEligibility()
      const canSubmit =
        Boolean(eligibility.hasAuthorRole) &&
        Boolean(eligibility.hasAuthorProfile) &&
        Boolean(eligibility.onboardingCompleted)
      if (canSubmit) {
        window.location.hash = '#/user/blog/request?new=1'
      } else {
        setShowAuthorPrompt(true)
      }
    } catch {
      setShowAuthorPrompt(true)
    }
  }, [])

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

  if (!isAuthenticated) return null

  return (
    <main className="min-h-screen py-8 sm:py-10" style={{ backgroundColor: '#F4F9F9' }}>
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#1B4965' }}>
          My Blogs
        </h1>
        <p className="text-sm sm:text-base mb-8" style={{ color: '#9DB4C0' }}>
          Manage your published posts and drafts
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {/* Published posts */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5" style={{ color: '#1B4965' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1B4965' }}>
              Published ({posts.length})
            </h2>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : posts.length === 0 ? (
            <div className="rounded-xl bg-white/80 border border-gray-200/80 p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">No published posts yet</p>
              <p className="text-sm text-gray-400 mb-4">Write your first post to see it here</p>
              <button
                type="button"
                onClick={handleWriteClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#1B4965' }}
              >
                <PenLine className="h-4 w-4" />
                Write
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-xl bg-white border border-gray-200/80 overflow-hidden hover:border-gray-300/80 transition-colors"
                >
                  <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 items-center">
                    <a
                      href={`#/user/blog/${post.id}`}
                      className="flex flex-1 gap-4 min-w-0 min-h-0"
                    >
                      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100">
                        {post.cover_image ? (
                          <img
                            src={post.cover_image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate pr-2">
                          {post.title || 'Untitled'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-gray-500">
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              post.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : post.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {post.status === 'approved' ? 'Published' : post.status === 'pending' ? 'Pending' : 'Rejected'}
                          </span>
                          {post.status === 'approved' && post.revision_pending != null && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                              Edit in review
                            </span>
                          )}
                          <span>{formatDate(post.updated_at)}</span>
                          {(post.likes_count ?? 0) > 0 && (
                            <span>{post.likes_count} likes</span>
                          )}
                          {(post.comments_count ?? 0) > 0 && (
                            <span>{post.comments_count} comments</span>
                          )}
                        </div>
                        {post.excerpt && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                        )}
                      </div>
                    </a>
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      {post.status === 'approved' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.hash = `#/user/blog/request?edit=${post.id}`
                          }}
                          className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-0"
                          aria-label="Edit post"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      )}
                      <a
                        href={`#/user/blog/${post.id}`}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-0"
                        aria-label="View post"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.75} />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Drafts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" style={{ color: '#1B4965' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1B4965' }}>
              Drafts ({drafts.length})
            </h2>
          </div>

          {draftsLoading ? (
            <LoadingSpinner />
          ) : drafts.length === 0 ? (
            <div className="rounded-xl bg-white/80 border border-gray-200/80 p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">No drafts yet</p>
              <p className="text-sm text-gray-400 mb-4">Start writing to save drafts automatically</p>
              <button
                type="button"
                onClick={handleWriteClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#1B4965' }}
              >
                <PenLine className="h-4 w-4" />
                Write
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {drafts.map((draft) => (
                <li
                  key={draft.id}
                  className="rounded-xl bg-white border border-gray-200/80 overflow-hidden hover:border-gray-300/80 transition-colors"
                >
                  <div className="flex gap-4 p-4 sm:p-5 items-start">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {draft.title || draft.name || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            draft.status === 'auto'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {draft.status === 'auto' ? 'Auto-save' : 'Manual'}
                        </span>
                        <span>{formatDate(draft.updated_at)}</span>
                      </div>
                      {draft.excerpt && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{draft.excerpt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditDraft(draft.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit draft"
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={deletingDraftId === draft.id}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AuthorPromptModal
        isOpen={showAuthorPrompt}
        onClose={() => setShowAuthorPrompt(false)}
      />
    </main>
  )
}
