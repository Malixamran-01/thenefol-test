import { useMemo, useState } from 'react'
import { BadgeCheck, Heart, Reply, Trash2 } from 'lucide-react'
import type { Comment } from '../../types/community'
import { AuthorVerifiedBadge } from '../AuthorVerifiedBadge'
import { formatCommunityTime, depthStyles } from '../../utils/communityTime'
import { encodeMediaUrl, getApiBase } from '../../utils/apiBase'
import InlineReplyBox from './InlineReplyBox'

const COLLAPSE_THRESHOLD = 3
const MAX_VISUAL_DEPTH = 5

interface CurrentUser {
  id: number
  name?: string
}

interface ThreadedCommentProps {
  comment: Comment
  depth: number
  currentUser: CurrentUser | null
  openReplyId: number | null
  replyText: string
  onOpenReply: (comment: Comment) => void
  onCloseReply: () => void
  onReplyTextChange: (v: string) => void
  onSubmitReply: (parentId: number) => void
  onLike: (commentId: number) => void
  onDelete: (commentId: number) => void
  submitting?: boolean
  isMobile?: boolean
}

function avatarUrl(url: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
}

export default function ThreadedComment({
  comment,
  depth,
  currentUser,
  openReplyId,
  replyText,
  onOpenReply,
  onCloseReply,
  onReplyTextChange,
  onSubmitReply,
  onLike,
  onDelete,
  submitting,
  isMobile = false,
}: ThreadedCommentProps) {
  const [expanded, setExpanded] = useState(false)
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)
  const stopIndent = depth > MAX_VISUAL_DEPTH

  const hiddenCount = useMemo(() => {
    if (expanded || comment.children.length <= COLLAPSE_THRESHOLD) return 0
    return comment.children.length - COLLAPSE_THRESHOLD
  }, [comment.children.length, expanded])

  const visibleChildren = useMemo(() => {
    if (expanded || comment.children.length <= COLLAPSE_THRESHOLD) return comment.children
    return comment.children.slice(0, COLLAPSE_THRESHOLD)
  }, [comment.children, expanded])

  const isOwn = currentUser?.id === comment.user_id
  const avatarSize = depth === 0 ? 28 : 24

  return (
    <div style={stopIndent ? {} : depthStyles(visualDepth, isMobile)} className="mb-2">
      <article
        style={{
          background: visualDepth > 0 ? 'rgba(75, 151, 201, 0.03)' : 'transparent',
          borderRadius: depth === 0 ? 12 : 8,
          padding: '12px 16px',
        }}
      >
        <div className="flex gap-2.5">
          {comment.author_avatar ? (
            <img
              src={avatarUrl(comment.author_avatar)}
              alt=""
              className="shrink-0 rounded-full object-cover"
              style={{ width: avatarSize, height: avatarSize }}
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center rounded-full text-white"
              style={{
                width: avatarSize,
                height: avatarSize,
                background: '#1B4965',
                fontSize: depth === 0 ? 11 : 10,
                fontWeight: 600,
              }}
            >
              {initials(comment.author_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold" style={{ fontSize: 13, color: '#1B4965' }}>
                {comment.author_name}
                {comment.author_verified && (
                  <AuthorVerifiedBadge className="ml-1 inline h-3 w-3" />
                )}
              </span>
              {comment.is_verified && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ background: '#ecfdf5', color: '#047857' }}
                >
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatCommunityTime(comment.created_at)}</span>
            </div>

            <p
              className="whitespace-pre-wrap"
              style={{
                fontSize: depth === 0 ? 14 : 13,
                lineHeight: 1.6,
                color: comment.is_deleted ? '#94a3b8' : '#374151',
                fontStyle: comment.is_deleted ? 'italic' : 'normal',
              }}
            >
              {comment.content}
            </p>

            {!comment.is_deleted && (
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onLike(comment.id)}
                  className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition-colors hover:text-[#1B4965]"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: comment.is_liked_by_me ? '#E1306C' : '#94a3b8',
                  }}
                >
                  <Heart
                    className="h-3.5 w-3.5"
                    fill={comment.is_liked_by_me ? '#E1306C' : 'none'}
                  />
                  {comment.likes_count}
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => onOpenReply(comment)}
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition-colors hover:text-[#1B4965]"
                    style={{ fontSize: 11, letterSpacing: '0.08em', color: '#94a3b8' }}
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </button>
                )}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition-colors hover:text-[#1B4965]"
                    style={{ fontSize: 11, letterSpacing: '0.08em', color: '#94a3b8' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            )}

            {openReplyId === comment.id && (
              <InlineReplyBox
                replyingToName={comment.author_name}
                value={replyText}
                onChange={onReplyTextChange}
                onCancel={onCloseReply}
                onSubmit={() => onSubmitReply(comment.id)}
                submitting={submitting}
              />
            )}
          </div>
        </div>
      </article>

      {stopIndent && comment.children.length > 0 && (
        <button
          type="button"
          className="ml-4 mt-1 text-xs font-semibold hover:underline"
          style={{ color: '#4B97C9' }}
          onClick={() => {
            const el = document.getElementById(`comment-${comment.id}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          Continue thread →
        </button>
      )}

      {!stopIndent && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-4 mt-1 text-xs font-semibold hover:underline"
          style={{ color: '#4B97C9' }}
        >
          ▶ {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {!stopIndent &&
        visibleChildren.map((child) => (
          <div key={child.id} id={`comment-${child.id}`}>
            <ThreadedComment
              comment={child}
              depth={depth + 1}
              currentUser={currentUser}
              openReplyId={openReplyId}
              replyText={replyText}
              onOpenReply={onOpenReply}
              onCloseReply={onCloseReply}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
              onLike={onLike}
              onDelete={onDelete}
              submitting={submitting}
              isMobile={isMobile}
            />
          </div>
        ))}
    </div>
  )
}
