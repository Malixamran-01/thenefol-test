import { useState } from 'react'
import { BadgeCheck, MessageSquare, Trash2 } from 'lucide-react'
import type { Comment } from '../../types/community'
import { AuthorVerifiedBadge } from '../AuthorVerifiedBadge'
import { formatCommunityTime, DEPTH_BORDER_COLORS, DEPTH_MARGIN } from '../../utils/communityTime'
import { encodeMediaUrl, getApiBase } from '../../utils/apiBase'
import InlineReplyBox from './InlineReplyBox'
import VoteColumn from './VoteColumn'

const MAX_VISUAL_DEPTH = 5
// When a comment has more than this many direct children, collapse by default
const COLLAPSE_THRESHOLD = 3

interface CurrentUser {
  id: number
  name?: string
}

interface ThreadedCommentProps {
  comment: Comment
  depth: number
  questionAuthorId?: number
  currentUser: CurrentUser | null
  openReplyId: number | null
  replyText: string
  onOpenReply: (comment: Comment) => void
  onCloseReply: () => void
  onReplyTextChange: (v: string) => void
  onSubmitReply: (parentId: number) => void
  onVote: (commentId: number, direction: 'up' | 'down') => void
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

function timeAgo(iso: string): string {
  const t = formatCommunityTime(iso)
  return t === 'just now' ? t : `${t} ago`
}

const AVATAR_COLORS = [
  'from-[#4B97C9] to-[#1B4965]',
  'from-[#d97706] to-[#b45309]',
  'from-[#7c3aed] to-[#5b21b6]',
  'from-[#059669] to-[#047857]',
]

function avatarGradient(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function countAllReplies(comment: Comment): number {
  return comment.children.reduce((n, c) => n + 1 + countAllReplies(c), 0)
}

/** Pill button shared by Reply and Hide/Show toggle */
function Pill({
  onClick,
  active,
  children,
  danger,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-all duration-150 active:scale-[0.97] ${
        danger
          ? 'border-red-100 bg-white text-[#94a3b8] hover:border-red-200 hover:bg-red-50 hover:text-red-500'
          : active
            ? 'border-[#E1306C]/25 bg-rose-50 text-[#E1306C]'
            : 'border-[#e8eef4] bg-white text-[#64748b] hover:border-[#d0e8f5] hover:text-[#1B4965]'
      }`}
    >
      {children}
    </button>
  )
}

export default function ThreadedComment({
  comment,
  depth,
  questionAuthorId = 0,
  currentUser,
  openReplyId,
  replyText,
  onOpenReply,
  onCloseReply,
  onReplyTextChange,
  onSubmitReply,
  onVote,
  onDelete,
  submitting,
  isMobile = false,
}: ThreadedCommentProps) {
  const hasChildren = comment.children.length > 0
  const manyChildren = comment.children.length > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!manyChildren)

  const isTopLevel = depth === 0
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)
  const stopIndent = depth >= MAX_VISUAL_DEPTH
  const isOp = comment.user_id === questionAuthorId
  const isOwn = currentUser?.id === comment.user_id
  const avatarSize = isTopLevel ? 28 : 24
  const totalReplies = countAllReplies(comment)

  // Per-level indent increment for children wrapper
  const childDepth = Math.min(visualDepth + 1, MAX_VISUAL_DEPTH)
  const scale = isMobile ? 0.7 : 1
  const childMarginLeft = Math.round(
    (DEPTH_MARGIN[childDepth] - DEPTH_MARGIN[visualDepth]) * scale
  )
  const childBorderColor = DEPTH_BORDER_COLORS[childDepth]

  return (
    <div>
      {/* Comment row */}
      <div className={`flex gap-2 ${isTopLevel ? 'px-4 py-3 sm:px-5' : 'py-2 pr-2'}`}>
        {/* Vote column — always visible (even on replies, compact mode) */}
        {!comment.is_deleted && (
          <VoteColumn
            score={comment.score}
            myVote={comment.my_vote}
            onUpvote={() => onVote(comment.id, 'up')}
            onDownvote={() => onVote(comment.id, 'down')}
            compact={!isTopLevel}
          />
        )}

        {/* Main content */}
        <div
          className={`min-w-0 flex-1 ${
            !isTopLevel ? 'rounded-lg px-3 py-2.5' : ''
          }`}
          style={!isTopLevel ? { backgroundColor: 'rgba(75,151,201,0.03)' } : undefined}
        >
          {/* Author row */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {/* Avatar */}
            {comment.author_avatar ? (
              <img
                src={avatarUrl(comment.author_avatar)}
                alt=""
                className="shrink-0 rounded-full object-cover ring-1 ring-[#e8eef4]"
                style={{ width: avatarSize, height: avatarSize }}
              />
            ) : (
              <div
                className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-1 ring-[#e8eef4] ${avatarGradient(comment.author_name)}`}
                style={{ width: avatarSize, height: avatarSize, fontSize: isTopLevel ? 11 : 10 }}
              >
                {initials(comment.author_name)}
              </div>
            )}

            <span className="text-[13px] font-semibold text-[#1B4965]">
              {comment.author_name}
            </span>

            {comment.author_verified && (
              <AuthorVerifiedBadge className="inline h-3 w-3 align-text-bottom" />
            )}

            {isOp && (
              <span className="rounded bg-[#1B4965]/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#1B4965]">
                OP
              </span>
            )}

            {comment.is_verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-bold uppercase text-emerald-700">
                <BadgeCheck className="h-2.5 w-2.5" />
                Verified
              </span>
            )}

            <time dateTime={comment.created_at} className="text-[12px] text-[#94a3b8]">
              {timeAgo(comment.created_at)}
            </time>
          </div>

          {/* Content */}
          <p
            className={`mt-1.5 whitespace-pre-wrap leading-relaxed ${
              comment.is_deleted ? 'italic text-[#94a3b8]' : 'text-[#374151]'
            } ${isTopLevel ? 'text-[14px]' : 'text-[13px]'}`}
          >
            {comment.content}
          </p>

          {/* Action pills row */}
          {!comment.is_deleted && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {/* Reply */}
              {currentUser && (
                <Pill onClick={() => onOpenReply(comment)}>
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                  Reply
                </Pill>
              )}

              {/* Hide / show replies pill (inline with other actions) */}
              {hasChildren && (
                <Pill onClick={() => setExpanded((v) => !v)}>
                  {expanded ? (
                    <>▼ Hide {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}</>
                  ) : (
                    <>▶ {totalReplies} more {totalReplies === 1 ? 'reply' : 'replies'}</>
                  )}
                </Pill>
              )}

              {/* Delete (own comments only) */}
              {isOwn && (
                <Pill onClick={() => onDelete(comment.id)} danger>
                  <Trash2 className="h-3.5 w-3.5" />
                </Pill>
              )}
            </div>
          )}

          {/* Inline reply composer */}
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

      {/* Continue thread link when max depth reached */}
      {stopIndent && hasChildren && expanded && (
        <button
          type="button"
          className="mb-2 ml-14 text-[12px] font-semibold text-[#4B97C9] hover:underline"
          onClick={() =>
            document
              .getElementById(`comment-${comment.id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        >
          Continue thread →
        </button>
      )}

      {/* Recursive children with depth-specific indent + border */}
      {!stopIndent && expanded && hasChildren && (
        <div
          style={{
            marginLeft: `${childMarginLeft}px`,
            borderLeft: `3px solid ${childBorderColor}`,
            paddingLeft: '12px',
          }}
        >
          {comment.children.map((child) => (
            <div key={child.id} id={`comment-${child.id}`}>
              <ThreadedComment
                comment={child}
                depth={depth + 1}
                questionAuthorId={questionAuthorId}
                currentUser={currentUser}
                openReplyId={openReplyId}
                replyText={replyText}
                onOpenReply={onOpenReply}
                onCloseReply={onCloseReply}
                onReplyTextChange={onReplyTextChange}
                onSubmitReply={onSubmitReply}
                onVote={onVote}
                onDelete={onDelete}
                submitting={submitting}
                isMobile={isMobile}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
