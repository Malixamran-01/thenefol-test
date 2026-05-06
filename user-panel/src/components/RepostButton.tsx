import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, MessageCircle, PenLine, Repeat2, X } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RepostButtonProps {
  /** The blog post id */
  postId: number
  postTitle: string
  postCover?: string
  /** If set, this is a comment repost */
  commentId?: number
  commentContent?: string
  commentAuthorName?: string
  /** Initial state (from parent fetch) */
  initialReposted?: boolean
  initialCount?: number
  /** Called after a successful repost/unrepost with the new count */
  onCountChange?: (count: number, reposted: boolean) => void
  /** Visual style: 'card' = white-on-dark (blog card), 'light' = gray-on-white (comment row) */
  variant?: 'card' | 'light'
  /** Show the count number next to the icon */
  showCount?: boolean
}

// ─── Repost Modal ─────────────────────────────────────────────────────────────

function RepostModal({
  postId,
  postTitle,
  postCover,
  commentId,
  commentContent,
  commentAuthorName,
  onClose,
  onSuccess,
}: {
  postId: number
  postTitle: string
  postCover?: string
  commentId?: number
  commentContent?: string
  commentAuthorName?: string
  onClose: () => void
  onSuccess: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setSubmitting(true)
    try {
      const res = await fetch(`${getApiBase()}/api/blog/reposts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          post_id: postId,
          comment_id: commentId ?? null,
          note: note.trim() || null,
        }),
      })
      if (res.ok) {
        onSuccess(note.trim())
      }
    } finally {
      setSubmitting(false)
    }
  }, [postId, commentId, note, onSuccess])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl mx-0 sm:mx-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {commentId ? 'Repost comment' : 'Repost post'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Note textarea */}
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for your audience… (optional)"
          className="mb-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 placeholder-gray-400"
          rows={3}
          maxLength={500}
        />

        {/* Preview of what's being reposted */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
          {commentId ? (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                <MessageCircle className="h-3 w-3" />
                <span>Comment by {commentAuthorName || 'Anonymous'}</span>
              </div>
              <p
                className="text-sm text-gray-700 leading-relaxed"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 4,
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                "{commentContent}"
              </p>
              <div className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
                from: <span className="font-medium text-gray-600">{postTitle}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              {postCover ? (
                <img src={postCover} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#edf4f9]">
                  <BookOpen className="h-4 w-4 text-[#4B97C9]/50" />
                </div>
              )}
              <p className="flex-1 text-sm font-medium text-gray-800 leading-snug line-clamp-2">{postTitle}</p>
            </div>
          )}
        </div>

        {note.length > 0 && (
          <p className="mb-3 text-right text-[11px] text-gray-400">{note.length}/500</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1B4965] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#163d57] disabled:opacity-60"
          >
            <Repeat2 className="h-4 w-4" />
            {submitting ? 'Reposting…' : 'Repost'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Repost Popover ───────────────────────────────────────────────────────────

function RepostPopover({
  isReposted,
  onQuickRepost,
  onRepostWithNote,
  onUndoRepost,
  onClose,
  variant,
}: {
  isReposted: boolean
  onQuickRepost: () => void
  onRepostWithNote: () => void
  onUndoRepost: () => void
  onClose: () => void
  variant: 'card' | 'light'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const base =
    'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[170px] rounded-xl shadow-xl overflow-hidden'
  const bg = variant === 'card' ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'
  const textCls = variant === 'card' ? 'text-white/90' : 'text-gray-700'
  const hoverCls = variant === 'card' ? 'hover:bg-white/10' : 'hover:bg-gray-50'
  const divideCls = variant === 'card' ? 'border-white/10' : 'border-gray-100'

  return (
    <div ref={ref} className={`${base} ${bg}`}>
      {isReposted ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUndoRepost() }}
          className={`flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors ${textCls} ${hoverCls} text-red-400`}
        >
          <X className="h-4 w-4 flex-shrink-0" />
          Undo repost
        </button>
      ) : (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickRepost() }}
            className={`flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors ${textCls} ${hoverCls}`}
          >
            <Repeat2 className="h-4 w-4 flex-shrink-0" />
            Repost
          </button>
          <div className={`border-t ${divideCls}`} />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRepostWithNote() }}
            className={`flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors ${textCls} ${hoverCls}`}
          >
            <PenLine className="h-4 w-4 flex-shrink-0" />
            Repost with note…
          </button>
        </>
      )}
    </div>
  )
}

// ─── RepostButton (public export) ─────────────────────────────────────────────

export function RepostButton({
  postId,
  postTitle,
  postCover,
  commentId,
  commentContent,
  commentAuthorName,
  initialReposted = false,
  initialCount = 0,
  onCountChange,
  variant = 'light',
  showCount = true,
}: RepostButtonProps) {
  const [reposted, setReposted] = useState(initialReposted)
  const [count, setCount] = useState(initialCount)
  const [showPopover, setShowPopover] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pending, setPending] = useState(false)

  const token = localStorage.getItem('token')

  const redirectIfLoggedOut = () => {
    if (!token) {
      window.location.hash = '#/user/login'
      return true
    }
    return false
  }

  const handleQuickRepost = useCallback(async () => {
    if (redirectIfLoggedOut()) return
    setShowPopover(false)
    setPending(true)
    const wasReposted = reposted
    setReposted(true)
    setCount((n) => (wasReposted ? n : n + 1))
    try {
      const res = await fetch(`${getApiBase()}/api/blog/reposts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: postId, comment_id: commentId ?? null }),
      })
      if (res.ok) {
        const data = await res.json()
        setCount(data.count)
        onCountChange?.(data.count, true)
      } else {
        setReposted(wasReposted)
        setCount((n) => (wasReposted ? n : n - 1))
      }
    } catch {
      setReposted(wasReposted)
      setCount((n) => (wasReposted ? n : n - 1))
    } finally {
      setPending(false)
    }
  }, [postId, commentId, reposted, token, onCountChange])

  const handleUndoRepost = useCallback(async () => {
    if (redirectIfLoggedOut()) return
    setShowPopover(false)
    setPending(true)
    const wasCount = count
    setReposted(false)
    setCount((n) => Math.max(0, n - 1))
    try {
      const res = await fetch(`${getApiBase()}/api/blog/reposts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: postId, comment_id: commentId ?? null }),
      })
      if (res.ok) {
        const data = await res.json()
        setCount(data.count)
        onCountChange?.(data.count, false)
      } else {
        setReposted(true)
        setCount(wasCount)
      }
    } catch {
      setReposted(true)
      setCount(wasCount)
    } finally {
      setPending(false)
    }
  }, [postId, commentId, count, token, onCountChange])

  const handleModalSuccess = useCallback(
    (_note: string) => {
      setShowModal(false)
      setReposted(true)
      setCount((n) => n + 1)
      onCountChange?.(count + 1, true)
    },
    [count, onCountChange]
  )

  const activeColor = variant === 'card' ? '#4ade80' : '#16a34a'
  const defaultColor = variant === 'card' ? 'rgba(255,255,255,0.85)' : undefined

  return (
    <>
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (redirectIfLoggedOut()) return
            setShowPopover((s) => !s)
          }}
          disabled={pending}
          className={`flex items-center gap-1 transition-colors active:scale-95 ${
            variant === 'card'
              ? 'rounded-lg px-2.5 py-1.5 hover:bg-white/10'
              : 'rounded-lg px-1.5 py-1 hover:bg-gray-100'
          }`}
          title={reposted ? 'Repost options' : 'Repost'}
        >
          <Repeat2
            className="h-4 w-4 transition-colors"
            style={{ color: reposted ? activeColor : defaultColor }}
          />
          {showCount && count > 0 && (
            <span
              className="text-[12px] font-medium min-w-[14px] text-center"
              style={{ color: reposted ? activeColor : defaultColor }}
            >
              {count}
            </span>
          )}
        </button>

        {showPopover && (
          <RepostPopover
            isReposted={reposted}
            variant={variant}
            onQuickRepost={handleQuickRepost}
            onRepostWithNote={() => { setShowPopover(false); setShowModal(true) }}
            onUndoRepost={handleUndoRepost}
            onClose={() => setShowPopover(false)}
          />
        )}
      </div>

      {showModal && (
        <RepostModal
          postId={postId}
          postTitle={postTitle}
          postCover={postCover}
          commentId={commentId}
          commentContent={commentContent}
          commentAuthorName={commentAuthorName}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
}
