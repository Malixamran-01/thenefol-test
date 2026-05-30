import { useCallback, useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
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
  answerCount: number
  questionAuthorId?: number
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

function applyOptimisticVote(comment: Comment, direction: 'up' | 'down'): Comment {
  const voteDir = direction === 'up' ? 1 : -1
  const prev = comment.my_vote

  if (prev === voteDir) {
    return {
      ...comment,
      my_vote: 0,
      score: comment.score - voteDir,
      likes_count: direction === 'up' ? Math.max(0, comment.likes_count - 1) : comment.likes_count,
      is_liked_by_me: false,
    }
  }

  if (prev === -voteDir) {
    return {
      ...comment,
      my_vote: voteDir,
      score: comment.score + voteDir * 2,
      likes_count:
        direction === 'up'
          ? comment.likes_count + 1
          : Math.max(0, comment.likes_count - 1),
      is_liked_by_me: direction === 'up',
    }
  }

  return {
    ...comment,
    my_vote: voteDir,
    score: comment.score + voteDir,
    likes_count: direction === 'up' ? comment.likes_count + 1 : comment.likes_count,
    is_liked_by_me: direction === 'up',
  }
}

function SkeletonRow() {
  return (
    <div className="flex gap-2 border-b border-[#f0f4f8] px-4 py-3 sm:px-5">
      <div className="flex w-10 flex-shrink-0 flex-col items-center gap-1 rounded-full border border-[#e8eef4] bg-[#fafcfd] py-2">
        <div className="h-4 w-4 animate-pulse rounded bg-[#e8eef4]" />
        <div className="h-3 w-4 animate-pulse rounded bg-[#e8eef4]" />
        <div className="h-4 w-4 animate-pulse rounded bg-[#e8eef4]" />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 animate-pulse rounded-full bg-[#e8eef4]" />
          <div className="h-3 w-24 animate-pulse rounded bg-[#e8eef4]" />
        </div>
        <div className="h-3 w-full animate-pulse rounded bg-[#e8eef4]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[#e8eef4]" />
      </div>
    </div>
  )
}

export default function CommentTree({
  questionId,
  answerCount,
  questionAuthorId = 0,
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
      score: 0,
      likes_count: 0,
      my_vote: 0,
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
      setComments((prev) => patchCommentTree(prev, tempId, () => normalized))
    } catch (e) {
      setComments((prev) => patchCommentTree(prev, tempId, () => ({ ...optimistic, content: '[failed to post]' })))
      onError?.(e instanceof Error ? e.message : 'Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (commentId: number, direction: 'up' | 'down') => {
    if (!onRequireAuth()) return

    let snapshot: Comment | null = null
    setComments((prev) =>
      patchCommentTree(prev, commentId, (c) => {
        snapshot = { ...c }
        return applyOptimisticVote(c, direction)
      })
    )

    try {
      const result = await communityAPI.voteAnswer(commentId, direction)
      setComments((prev) =>
        patchCommentTree(prev, commentId, (c) => ({
          ...c,
          score: result.score,
          likes_count: result.likes_count,
          my_vote: result.my_vote,
          is_liked_by_me: result.my_vote === 1,
        }))
      )
    } catch {
      if (snapshot) {
        setComments((prev) => patchCommentTree(prev, commentId, () => snapshot!))
      }
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
  const displayCount = answerCount || comments.length

  return (
    <section className="overflow-hidden rounded-xl border border-[#e8eef4] bg-white shadow-[0_1px_4px_rgba(27,73,101,0.06)]">
      <div className="flex flex-col gap-2 border-b border-[#f0f4f8] bg-[#fafcfd] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#1B4965]">
          <MessageSquare className="h-3.5 w-3.5 text-[#4B97C9]" aria-hidden />
          {displayCount} {displayCount === 1 ? 'Answer' : 'Answers'}
        </h2>
        <SortControls value={sort} onChange={setSort} />
      </div>

      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : comments.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f4f8]">
            <MessageSquare className="h-4 w-4 text-[#4B97C9]" />
          </div>
          <p className="text-[14px] font-semibold text-[#1B4965]">No answers yet</p>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Be the first to share what you know.</p>
        </div>
      ) : (
        <div>
          {visible.map((c, i) => (
            <div
              key={c.id}
              id={`comment-${c.id}`}
              className={i < visible.length - 1 || hasMore ? 'border-b border-[#f0f4f8]' : ''}
            >
              <ThreadedComment
                comment={c}
                depth={0}
                questionAuthorId={questionAuthorId}
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
                onVote={handleVote}
                onDelete={handleDelete}
                submitting={submitting}
                isMobile={isMobile}
                isLast={i === visible.length - 1 && !hasMore}
              />
            </div>
          ))}

          {hasMore && (
            <div className="border-t border-[#f0f4f8]">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="w-full min-h-[44px] py-3 text-[13px] font-semibold text-[#1B4965] transition-colors hover:bg-[#f8fbfd]"
              >
                Load more ({comments.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export { insertReply, patchCommentTree }
