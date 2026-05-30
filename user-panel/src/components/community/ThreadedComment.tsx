import { useMemo, useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronUp, Heart, Reply, Trash2 } from 'lucide-react'
import type { Comment } from '../../types/community'
import { AuthorVerifiedBadge } from '../AuthorVerifiedBadge'
import { formatCommunityTime, depthStyles } from '../../utils/communityTime'
import { encodeMediaUrl, getApiBase } from '../../utils/apiBase'
import InlineReplyBox from './InlineReplyBox'

const MAX_VISUAL_DEPTH = 5

function countReplies(comment: Comment): number {
  return comment.children.reduce((n, c) => n + 1 + countReplies(c), 0)
}

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
  isLast?: boolean
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

function ActionBtn({
  onClick,
  children,
  active,
  danger,
}: {
  onClick: () => void
  children: React.ReactNode
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150 active:scale-[0.97] ${
        active
          ? 'bg-rose-50 text-[#E1306C]'
          : danger
            ? 'text-[#64748b] hover:bg-red-50 hover:text-red-600'
            : 'text-[#64748b] hover:bg-[#edf4f9] hover:text-[#1B4965]'
      }`}
    >
      {children}
    </button>
  )
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
  isLast = false,
}: ThreadedCommentProps) {
  const [repliesExpanded, setRepliesExpanded] = useState(true)
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)
  const stopIndent = depth > MAX_VISUAL_DEPTH
  const isTopLevel = depth === 0
  const replyCount = useMemo(() => countReplies(comment), [comment])
  const hasReplies = comment.children.length > 0

  const isOwn = currentUser?.id === comment.user_id
  const avatarSize = isTopLevel ? 36 : 28

  return (
    <div
      style={stopIndent ? undefined : depthStyles(visualDepth, isMobile)}
      className={isTopLevel ? '' : 'mt-2'}
    >
      <article
        className={`group transition-colors duration-150 ${
          isTopLevel
            ? `px-4 py-4 sm:px-5 sm:py-5 ${!isLast ? 'border-b border-[#e8eef4]' : ''}`
            : 'rounded-xl bg-[rgba(75,151,201,0.04)] px-3 py-3'
        }`}
      >
        <div className="flex gap-3">
          {comment.author_avatar ? (
            <img
              src={avatarUrl(comment.author_avatar)}
              alt=""
              className="shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
              style={{ width: avatarSize, height: avatarSize }}
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4B97C9] to-[#1B4965] font-semibold text-white shadow-sm ring-2 ring-white"
              style={{ width: avatarSize, height: avatarSize, fontSize: isTopLevel ? 13 : 11 }}
            >
              {initials(comment.author_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[14px] font-semibold text-[#1B4965]">
                {comment.author_name}
                {comment.author_verified && (
                  <AuthorVerifiedBadge className="ml-1 inline h-3.5 w-3.5 align-text-bottom" />
                )}
              </span>
              {comment.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
              <span className="text-[12px] text-[#94a3b8]">{formatCommunityTime(comment.created_at)}</span>
            </div>

            <p
              className={`whitespace-pre-wrap leading-relaxed ${
                comment.is_deleted ? 'italic text-[#94a3b8]' : 'text-[#374151]'
              } ${isTopLevel ? 'text-[15px]' : 'text-[14px]'}`}
            >
              {comment.content}
            </p>

            {!comment.is_deleted && (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <ActionBtn onClick={() => onLike(comment.id)} active={comment.is_liked_by_me}>
                  <Heart
                    className="h-4 w-4"
                    fill={comment.is_liked_by_me ? 'currentColor' : 'none'}
                    strokeWidth={2}
                  />
                  <span>{comment.likes_count}</span>
                </ActionBtn>
                {currentUser && (
                  <ActionBtn onClick={() => onOpenReply(comment)}>
                    <Reply className="h-4 w-4" strokeWidth={2} />
                    <span>Reply</span>
                  </ActionBtn>
                )}
                {isOwn && (
                  <ActionBtn onClick={() => onDelete(comment.id)} danger>
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                    <span className="hidden sm:inline">Delete</span>
                  </ActionBtn>
                )}
                {hasReplies && (
                  <button
                    type="button"
                    onClick={() => setRepliesExpanded((v) => !v)}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-[#4B97C9] transition-colors hover:bg-[#edf4f9]"
                  >
                    {repliesExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                        Hide {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                        Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                      </>
                    )}
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

      {stopIndent && hasReplies && repliesExpanded && (
        <button
          type="button"
          className="ml-4 mt-2 text-[13px] font-semibold text-[#4B97C9] hover:underline"
          onClick={() => {
            document.getElementById(`comment-${comment.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          Continue thread →
        </button>
      )}

      {!stopIndent && repliesExpanded &&
        comment.children.map((child) => (
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
