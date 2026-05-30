import { useCallback, useEffect, useState } from 'react'
import type { AnswerSort, Comment } from '../../types/community'
import { communityAPI } from '../../services/communityAPI'
import { normalizeComment } from '../../types/community'
import SortControls from './SortControls'
import ThreadedComment from './ThreadedComment'

interface CurrentUser {
  id: number
  name?: string
}

interface CommentTreeProps {
  questionId: number
  currentUser: CurrentUser | null
  onRequireAuth: () => boolean
  onError?: (msg: string) => void
  refreshKey?: number
}

const PAGE_SIZE = 10

function patchCommentTree(
  nodes: Comment[],
  targetId: number,
  patch: Partial<Comment> | ((c: Comment) => Comment)
): Comment[] {
  return nodes.map((n) => {
    if (n.id === targetId) {
      return typeof patch === 'function' ? patch(n) : { ...n, ...patch }
    }
    if (n.children.length) {
      return { ...n, children: patchCommentTree(n.children, targetId, patch) }
    }
    return n
  })
}

function insertReply(nodes: Comment[], parentId: number | null, reply: Comment): Comment[] {
  if (parentId == null) return [...nodes, reply]
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, reply] }
    }
    if (n.children.length) {
      return { ...n, children: insertReply(n.children, parentId, reply) }
    }
    return n
  })
}

export default function CommentTree({
  questionId,
  currentUser,
  onRequireAuth,
  onError,
  refreshKey = 0,
}: CommentTreeProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [sort, setSort] = useState<AnswerSort>('top')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [openReplyId, setOpenReplyId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await communityAPI.getAnswers(questionId, sort)
      setComments(data.answers.map((a) => normalizeComment(a as unknown as Record<string, unknown>)))
      setVisibleCount(PAGE_SIZE)
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to load answers')
    } finally {
      setLoading(false)
    }
  }, [questionId, sort, onError])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const handleOpenReply = (comment: Comment) => {
    if (!onRequireAuth()) return
    setOpenReplyId(comment.id)
    setReplyText('')
  }

  const handleSubmitReply = async (parentId: number) => {
    if (!onRequireAuth()) return
    const text = replyText.trim()
    if (text.length < 2) return

    const tempId = -Date.now()
    const optimistic: Comment = {
      id: tempId,
      question_id: questionId,
      parent_id: parentId,
      root_answer_id: null,
      user_id: currentUser!.id,
      author_name: currentUser?.name || 'You',
      author_avatar: null,
      author_verified: false,
      content: text,
      is_deleted: false,
      depth: 0,
      likes_count: 0,
      is_liked_by_me: false,
      created_at: new Date().toISOString(),
      children: [],
    }

    setComments((prev) => insertReply(prev, parentId, optimistic))
    setOpenReplyId(null)
    setReplyText('')
    setSubmitting(true)

    try {
      const created = await communityAPI.createAnswer({ question_id: questionId, content: text, parent_id: parentId })
      const normalized = normalizeComment(created as unknown as Record<string, unknown>)
      setComments((prev) =>
        patchCommentTree(prev, tempId, () => normalized)
      )
    } catch (e) {
      setComments((prev) => patchCommentTree(prev, tempId, () => ({ ...optimistic, content: '[failed to post]' })))
      onError?.(e instanceof Error ? e.message : 'Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (commentId: number) => {
    if (!onRequireAuth()) return

    let prevLiked = false
    let prevCount = 0
    setComments((prev) =>
      patchCommentTree(prev, commentId, (c) => {
        prevLiked = c.is_liked_by_me
        prevCount = c.likes_count
        return {
          ...c,
          is_liked_by_me: !c.is_liked_by_me,
          likes_count: c.is_liked_by_me ? Math.max(0, c.likes_count - 1) : c.likes_count + 1,
        }
      })
    )

    try {
      const result = await communityAPI.toggleLike(commentId)
      setComments((prev) =>
        patchCommentTree(prev, commentId, (c) => ({
          ...c,
          likes_count: result.likes_count,
          is_liked_by_me: result.is_liked_by_me,
        }))
      )
    } catch {
      setComments((prev) =>
        patchCommentTree(prev, commentId, (c) => ({
          ...c,
          likes_count: prevCount,
          is_liked_by_me: prevLiked,
        }))
      )
    }
  }

  const handleDelete = async (commentId: number) => {
    if (!onRequireAuth()) return
    if (!window.confirm('Delete this comment? Replies will stay visible.')) return

    setComments((prev) =>
      patchCommentTree(prev, commentId, (c) => ({
        ...c,
        is_deleted: true,
        content: '[deleted]',
      }))
    )

    try {
      await communityAPI.deleteAnswer(commentId)
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to delete')
      load()
    }
  }

  const visible = comments.slice(0, visibleCount)
  const hasMore = visibleCount < comments.length

  if (loading) {
    return <p className="py-8 text-center text-sm" style={{ color: '#94a3b8' }}>Loading answers…</p>
  }

  return (
    <div>
      <SortControls value={sort} onChange={setSort} />

      {comments.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: '#94a3b8' }}>
          No answers yet. Be the first to answer!
        </p>
      ) : (
        <>
          {visible.map((c) => (
            <div key={c.id} id={`comment-${c.id}`}>
              <ThreadedComment
                comment={c}
                depth={0}
                currentUser={currentUser}
                openReplyId={openReplyId}
                replyText={replyText}
                onOpenReply={handleOpenReply}
                onCloseReply={() => {
                  setOpenReplyId(null)
                  setReplyText('')
                }}
                onReplyTextChange={setReplyText}
                onSubmitReply={handleSubmitReply}
                onLike={handleLike}
                onDelete={handleDelete}
                submitting={submitting}
                isMobile={isMobile}
              />
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mt-2 w-full rounded-full py-2 text-sm font-semibold"
              style={{ border: '1px solid #e8eef4', color: '#4B97C9', background: '#fff' }}
            >
              Load more ({comments.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  )
}

export { insertReply, patchCommentTree }
