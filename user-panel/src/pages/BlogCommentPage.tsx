import React, { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, BookOpen, MessageCircle, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { absoluteBlogMediaUrl } from '../utils/blogShareUrls'
import { useAuth } from '../contexts/AuthContext'
import { RepostButton } from '../components/RepostButton'

const stripHtml = (html: string | null | undefined) => {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

interface BlogPost {
  id: string
  title: string
  user_id?: string | number
}

interface BlogComment {
  id: string
  post_id: string
  parent_id: string | null
  user_id?: string | number | null
  author_name?: string
  content: string
  created_at: string
  like_count?: number
  liked?: boolean
  children?: BlogComment[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function findCommentById(comments: BlogComment[], id: string): BlogComment | null {
  for (const c of comments) {
    if (c.id === id) return c
    if (c.children) {
      const found = findCommentById(c.children, id)
      if (found) return found
    }
  }
  return null
}

// Find the root ancestor of a comment
function findRootComment(flat: BlogComment[], commentId: string): BlogComment | null {
  const map: Record<string, BlogComment> = {}
  flat.forEach(c => { map[c.id] = c })

  let current = map[commentId]
  if (!current) return null
  while (current.parent_id && map[current.parent_id]) {
    current = map[current.parent_id]
  }
  return current
}

function buildTree(flat: BlogComment[]): BlogComment[] {
  const map: Record<string, BlogComment> = {}
  flat.forEach(c => { map[c.id] = { ...c, children: [] } })
  const roots: BlogComment[] = []
  flat.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children!.push(map[c.id])
    } else {
      roots.push(map[c.id])
    }
  })
  return roots
}

interface CommentNodeProps {
  comment: BlogComment
  depth: number
  targetId: string
  postId: string
  postTitle: string
  postAuthorId?: string | number
  onLike: (id: string, liked: boolean) => void
  isAuthenticated: boolean
  userId?: string | number
}

function CommentNode({ comment, depth, targetId, postId, postTitle, postAuthorId, onLike, isAuthenticated, userId }: CommentNodeProps) {
  const [showReplies, setShowReplies] = useState(true)
  const isTarget = comment.id === targetId
  const replies = comment.children || []

  return (
    <div
      id={`cp-comment-${comment.id}`}
      className={`${depth > 0 ? 'ml-5 border-l-2 pl-4' : ''} ${isTarget ? 'rounded-xl p-3 -mx-2 px-2' : ''}`}
      style={isTarget ? { backgroundColor: 'rgba(75, 151, 201, 0.08)', borderColor: depth > 0 ? '#d1d5db' : undefined } : { borderColor: depth > 0 ? '#e5e7eb' : undefined }}
    >
      <div className="py-3">
        {/* Author row */}
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: '#E8F4F8', color: '#1B4965' }}
          >
            {(comment.author_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{comment.author_name || 'User'}</span>
              {postAuthorId && String(comment.user_id || '') === String(postAuthorId) && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#E8F4F8', color: '#1B4965' }}>
                  Author
                </span>
              )}
              {isTarget && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
                  Highlighted
                </span>
              )}
              <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
            </div>
            <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-3 text-gray-500">
              <button
                onClick={() => onLike(comment.id, !!comment.liked)}
                className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-gray-100 transition-colors"
              >
                <Heart
                  className="w-[15px] h-[15px]"
                  style={{ color: comment.liked ? '#ef4444' : undefined, fill: comment.liked ? '#ef4444' : 'none' }}
                />
                {(comment.like_count ?? 0) > 0 && (
                  <span className="text-[11px] font-medium" style={{ color: comment.liked ? '#ef4444' : undefined }}>
                    {comment.like_count}
                  </span>
                )}
              </button>

              {replies.length > 0 && (
                <button
                  onClick={() => setShowReplies(v => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-gray-100 transition-colors text-xs"
                >
                  <MessageCircle className="w-[15px] h-[15px]" />
                  <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                  {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              <RepostButton
                postId={Number(postId)}
                postTitle={postTitle}
                commentId={Number(comment.id)}
                commentContent={comment.content}
                commentAuthorName={comment.author_name}
                variant="light"
                showCount={false}
              />
            </div>
          </div>
        </div>
      </div>

      {showReplies && replies.length > 0 && (
        <div className="mt-1">
          {replies.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              depth={depth + 1}
              targetId={targetId}
              postId={postId}
              postTitle={postTitle}
              postAuthorId={postAuthorId}
              onLike={onLike}
              isAuthenticated={isAuthenticated}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BlogCommentPage() {
  const { isAuthenticated, user } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [flatComments, setFlatComments] = useState<BlogComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Parse post_id and comment_id from hash: #/user/blog/{post_id}/comment/{comment_id}
  const hash = window.location.hash || ''
  const routeMatch = hash.match(/^#\/user\/blog\/([^/?#]+)\/comment\/([^/?#]+)/)
  const postId = routeMatch?.[1] ?? ''
  const commentId = routeMatch?.[2] ?? ''

  useEffect(() => {
    if (!postId || !commentId) {
      setError('Invalid comment link')
      setLoading(false)
      return
    }

    const load = async () => {
      const apiBase = getApiBase()
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      try {
        const [postRes, commentsRes] = await Promise.all([
          fetch(`${apiBase}/api/blog/posts/${postId}`, { headers }),
          fetch(`${apiBase}/api/blog/posts/${postId}/comments?sort=old`, { headers }),
        ])

        if (!postRes.ok) { setError('Blog post not found'); setLoading(false); return }

        const postData = await postRes.json()
        setPost({ id: postData.id, title: postData.title, user_id: postData.user_id })

        if (commentsRes.ok) {
          const commentsData: BlogComment[] = await commentsRes.json()
          setFlatComments(commentsData)
        }
      } catch {
        setError('Failed to load comment')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId, commentId])

  const toggleLike = useCallback(async (cId: string, currentlyLiked: boolean) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
      return
    }
    const apiBase = getApiBase()
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${apiBase}/api/blog/comments/${cId}/${currentlyLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      if (res.ok) {
        const data = await res.json()
        setFlatComments(prev => prev.map(c =>
          c.id === cId ? { ...c, liked: !currentlyLiked, like_count: data.count ?? (currentlyLiked ? (c.like_count || 1) - 1 : (c.like_count || 0) + 1) } : c
        ))
      }
    } catch { /* ignore */ }
  }, [isAuthenticated])

  const goBack = () => {
    if (window.history.length > 1) window.history.back()
    else window.location.hash = '#/user/blog'
  }

  const goToBlog = () => {
    window.location.hash = `#/user/blog/${postId}`
  }

  const goToAllComments = () => {
    window.location.hash = `#/user/blog/${postId}?comment=${commentId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !postId || !commentId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">{error || 'Comment not found'}</p>
        <button onClick={goBack} className="mt-4 text-sm text-blue-600 hover:underline">Go back</button>
      </div>
    )
  }

  // Build tree and find the root of the target thread
  const tree = buildTree(flatComments)
  const rootComment = findRootComment(flatComments, commentId)
  const threadRootInTree = rootComment ? tree.find(c => c.id === rootComment.id) ?? null : null

  // If comment not found in list (e.g. deleted), fall back to the flat comment
  const targetFlat = flatComments.find(c => c.id === commentId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-5 sticky top-0 bg-white z-10 py-3 -mx-4 px-4 border-b border-gray-100">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={goToBlog}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: '#1B4965', color: '#fff' }}
        >
          <BookOpen className="w-4 h-4" />
          View Blog
        </button>
      </div>

      {/* Heading */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">Comment</h2>
        {post?.title && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">on "{stripHtml(post.title)}"</p>
        )}
      </div>

      {/* Thread */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
        {threadRootInTree ? (
          <CommentNode
            comment={threadRootInTree}
            depth={0}
            targetId={commentId}
            postId={postId}
            postTitle={post?.title ?? ''}
            postAuthorId={post?.user_id}
            onLike={toggleLike}
            isAuthenticated={isAuthenticated}
            userId={user?.id}
          />
        ) : targetFlat ? (
          // Isolated comment (no tree context found)
          <CommentNode
            comment={{ ...targetFlat, children: [] }}
            depth={0}
            targetId={commentId}
            postId={postId}
            postTitle={post?.title ?? ''}
            postAuthorId={post?.user_id}
            onLike={toggleLike}
            isAuthenticated={isAuthenticated}
            userId={user?.id}
          />
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">Comment not found or was deleted.</p>
        )}
      </div>

      {/* View all comments */}
      <div className="mt-6 text-center">
        <button
          onClick={goToAllComments}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium border transition-colors"
          style={{ borderColor: '#1B4965', color: '#1B4965' }}
        >
          <MessageCircle className="w-4 h-4" />
          View all comments
        </button>
      </div>
    </div>
  )
}
