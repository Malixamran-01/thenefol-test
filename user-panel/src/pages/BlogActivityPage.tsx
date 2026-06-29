import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  CircleDollarSign,
  Heart,
  MessageCircle,
  Repeat2,
  Star,
  UserPlus,
} from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

const stripHtml = (html: string | null | undefined) => {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

function goToAuthor(n: Notification) {
  if (!n.actor_user_id) return
  sessionStorage.setItem('blog_author_profile', JSON.stringify({ id: n.actor_user_id, name: n.actor_name }))
  window.location.hash = `#/user/author/${n.actor_user_id}`
}

function goToPost(n: Notification) {
  if (!n.post_id) return
  window.location.hash = `#/user/blog/${n.post_id}`
}

function goToComment(n: Notification) {
  if (!n.post_id) return
  if (n.comment_id) {
    window.location.hash = `#/user/blog/${n.post_id}/comment/${n.comment_id}`
  } else {
    window.location.hash = `#/user/blog/${n.post_id}`
  }
}

function markRead(n: Notification, setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>) {
  if (n.is_read) return
  blogActivityAPI.markNotificationRead(n.id).catch(() => {})
  setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: number
  actor_user_id: number | null
  actor_name: string | null
  actor_avatar: string | null
  type: string
  post_id: string | null
  post_title: string | null
  comment_id: number | null
  comment_excerpt: string | null
  is_read: boolean
  created_at: string
}

type MuteDuration = '1h' | '3h' | '8h' | '1d' | '1w' | 'forever'

// ─── Constants ────────────────────────────────────────────────────────────────

// Each entry: icon, badge colour, and a render function that returns
// an array of inline segments. Each segment has text and an optional onClick.
type Segment = { text: string; onClick?: () => void; bold?: boolean }

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; color: string; segments: (n: Notification, sn: React.Dispatch<React.SetStateAction<Notification[]>>) => Segment[] }
> = {
  post_liked: {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-rose-500',
    segments: (n, sn) => [
      { text: 'liked your post', onClick: () => { markRead(n, sn); goToPost(n) } },
      ...(n.post_title ? [{ text: ` "${stripHtml(n.post_title)}"`, onClick: () => { markRead(n, sn); goToPost(n) }, bold: false }] : []),
    ],
  },
  post_commented: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'text-[#4B97C9]',
    segments: (n, sn) => [
      { text: 'commented on' },
      ...(n.post_title ? [{ text: ` "${stripHtml(n.post_title)}"`, onClick: () => { markRead(n, sn); goToComment(n) } }] : [{ text: ' your post', onClick: () => { markRead(n, sn); goToComment(n) } }]),
    ],
  },
  comment_replied: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'text-[#4B97C9]',
    segments: (n, sn) => [
      { text: 'replied to your comment', onClick: () => { markRead(n, sn); goToComment(n) } },
    ],
  },
  comment_liked: {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-rose-500',
    segments: (n, sn) => [
      { text: 'liked your comment', onClick: () => { markRead(n, sn); goToComment(n) } },
    ],
  },
  post_reposted: {
    icon: <Repeat2 className="h-4 w-4" />,
    color: 'text-green-500',
    segments: (n, sn) => [
      { text: 'reposted your post', onClick: () => { markRead(n, sn); goToPost(n) } },
      ...(n.post_title ? [{ text: ` "${stripHtml(n.post_title)}"`, onClick: () => { markRead(n, sn); goToPost(n) } }] : []),
    ],
  },
  followed: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-[#1B4965]',
    segments: (_n, _sn) => [{ text: 'started following you' }],
  },
  subscribed: {
    icon: <Star className="h-4 w-4" />,
    color: 'text-amber-500',
    segments: (_n, _sn) => [{ text: 'subscribed to your profile' }],
  },
  collab_task_assigned: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-[#4B97C9]',
    segments: (n, _sn) => [{ text: `assigned you a brand task${n.post_title ? `: ${stripHtml(n.post_title)}` : ''}` }],
  },
  collab_task_revision: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-orange-500',
    segments: (_n, _sn) => [{ text: 'asked for updates on your brand task' }],
  },
  collab_task_rejected: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-red-500',
    segments: (_n, _sn) => [{ text: 'did not approve a brand task submission' }],
  },
  collab_task_paid: {
    icon: <CircleDollarSign className="h-4 w-4" />,
    color: 'text-emerald-600',
    segments: (_n, _sn) => [{ text: 'recorded payout for a brand task' }],
  },
  collab_task_submitted: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-slate-500',
    segments: (_n, _sn) => [{ text: 'received your brand task submission' }],
  },
  author_warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600',
    segments: (n, _sn) => [{ text: `sent a moderation notice${n.post_title ? ` — ${stripHtml(n.post_title)}` : ''}` }],
  },
  post_revision_approved: {
    icon: <FileText className="h-4 w-4" />,
    color: 'text-emerald-600',
    segments: (n, sn) => [
      { text: 'approved your blog edit', onClick: () => { markRead(n, sn); goToPost(n) } },
      ...(n.post_title ? [{ text: ` — ${stripHtml(n.post_title)}`, onClick: () => { markRead(n, sn); goToPost(n) } }] : []),
    ],
  },
  post_revision_rejected: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-rose-600',
    segments: (n, sn) => [
      { text: 'did not approve your blog edit', onClick: () => { markRead(n, sn); goToPost(n) } },
      ...(n.post_title ? [{ text: ` — ${stripHtml(n.post_title)}`, onClick: () => { markRead(n, sn); goToPost(n) } }] : []),
    ],
  },
}

const MUTE_OPTIONS: { duration: MuteDuration; label: string }[] = [
  { duration: '1h', label: 'Mute for 1 hour' },
  { duration: '3h', label: 'Mute for 3 hours' },
  { duration: '8h', label: 'Mute for 8 hours' },
  { duration: '1d', label: 'Mute for 1 day' },
  { duration: '1w', label: 'Mute for 1 week' },
  { duration: 'forever', label: 'Mute until I turn it on' },
]

const PAGE_SIZE = 30

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function muteLabel(muted_until: string | null): string {
  if (!muted_until) return ''
  const until = new Date(muted_until)
  if (until.getFullYear() >= 2099) return 'Muted indefinitely'
  return `Muted until ${until.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function Avatar({ name, avatar }: { name: string | null; avatar: string | null }) {
  const apiBase = getApiBase()
  const src = avatar
    ? avatar.startsWith('/uploads/') ? `${apiBase}${avatar}` : avatar
    : null
  const initials = (name || 'U').slice(0, 2).toUpperCase()
  return src ? (
    <img src={src} alt={name || ''} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#c8dff0] text-[12px] font-bold text-[#1B4965]">
      {initials}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlogActivityPage() {
  const { isAuthenticated } = useAuth()

  // Notification list state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Mute state
  const [isMuted, setIsMuted] = useState(false)
  const [mutedUntil, setMutedUntil] = useState<string | null>(null)
  const [muteMenuOpen, setMuteMenuOpen] = useState(false)
  const [mutingDuration, setMutingDuration] = useState<MuteDuration | null>(null)
  const muteMenuRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(
    async (reset = false) => {
      if (!isAuthenticated) return
      if (reset) {
        setLoading(true)
        setOffset(0)
      } else {
        setLoadingMore(true)
      }
      try {
        const currentOffset = reset ? 0 : offset
        const data: Notification[] = await blogActivityAPI.getNotifications(
          PAGE_SIZE,
          currentOffset
        )
        const list = Array.isArray(data) ? data : []
        setNotifications((prev) => (reset ? list : [...prev, ...list]))
        setHasMore(list.length === PAGE_SIZE)
        setOffset(currentOffset + list.length)
      } catch {
        /* silent */
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [isAuthenticated, offset]
  )

  const fetchMuteStatus = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await blogActivityAPI.getMuteStatus()
      setIsMuted(data?.is_muted ?? false)
      setMutedUntil(data?.muted_until ?? null)
    } catch { /* silent */ }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotifications(true)
    fetchMuteStatus()
    // Mark all as read when this page opens
    blogActivityAPI.markAllNotificationsRead().catch(() => {})
    // Dispatch event so BlogLayout badge resets
    window.dispatchEvent(new CustomEvent('blog-notifications-read-all'))
  }, [isAuthenticated])

  // ── Mute menu close on outside click ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (muteMenuRef.current && !muteMenuRef.current.contains(e.target as Node)) {
        setMuteMenuOpen(false)
      }
    }
    if (muteMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [muteMenuOpen])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleMarkAllRead = () => {
    blogActivityAPI.markAllNotificationsRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    window.dispatchEvent(new CustomEvent('blog-notifications-read-all'))
  }

  const handleMute = async (duration: MuteDuration) => {
    setMutingDuration(duration)
    setMuteMenuOpen(false)
    try {
      const data = await blogActivityAPI.muteNotifications(duration)
      setIsMuted(true)
      setMutedUntil(data?.muted_until ?? null)
    } catch { /* silent */ }
    finally { setMutingDuration(null) }
  }

  const handleUnmute = async () => {
    setMuteMenuOpen(false)
    try {
      await blogActivityAPI.unmuteNotifications()
      setIsMuted(false)
      setMutedUntil(null)
    } catch { /* silent */ }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // ── Not authenticated ──────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Bell className="h-14 w-14 text-gray-200" />
        <p className="text-base font-semibold text-gray-500">Sign in to see your notifications</p>
        <a
          href="#/user/login"
          className="rounded-xl bg-[#1B4965] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#163d54]"
        >
          Sign in
        </a>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-10">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4965]">Activity</h1>
          {isMuted && mutedUntil && (
            <p className="mt-0.5 text-[12px] text-amber-600">{muteLabel(mutedUntil)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#4B97C9] transition-colors hover:bg-[#edf4f9]"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}

          {/* Mute / unmute dropdown */}
          <div ref={muteMenuRef} className="relative">
            <button
              onClick={() => setMuteMenuOpen((o) => !o)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isMuted
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title={isMuted ? 'Notifications muted' : 'Mute notifications'}
            >
              {isMuted ? (
                <BellOff className="h-3.5 w-3.5" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Notify'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${muteMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {muteMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                {isMuted && (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                        Currently muted
                      </p>
                      {mutedUntil && (
                        <p className="text-[11px] text-gray-400">{muteLabel(mutedUntil)}</p>
                      )}
                    </div>
                    <button
                      onClick={handleUnmute}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-[#1B4965] transition-colors hover:bg-[#edf4f9]"
                    >
                      <Bell className="h-4 w-4" />
                      Turn notifications back on
                    </button>
                    <div className="my-1 h-px bg-gray-100" />
                    <p className="px-3 pt-1.5 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Extend mute
                    </p>
                  </>
                )}

                {!isMuted && (
                  <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Mute notifications
                  </p>
                )}

                {MUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.duration}
                    onClick={() => handleMute(opt.duration)}
                    disabled={mutingDuration !== null}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {opt.label}
                    {mutingDuration === opt.duration && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    )}
                  </button>
                ))}
                <div className="h-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bell className="mb-4 h-14 w-14 text-gray-200" />
          <p className="text-base font-semibold text-gray-400">No activity yet</p>
          <p className="mt-1 text-sm text-gray-300">
            We will show likes, comments, follows, and creator program task updates here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {notifications.map((n) => {
            if (n.type === 'collab_task_assigned') return null
            const meta = TYPE_META[n.type]
            if (!meta) return null
            const segments = meta.segments(n, setNotifications)
            const hasAuthorProfile = !!n.actor_user_id
            const hasPost = !!n.post_id
            const hasComment = hasPost && !!n.comment_id
            return (
              <div
                key={n.id}
                className={`flex w-full items-start gap-3.5 px-5 py-4 transition-colors ${
                  !n.is_read ? 'bg-[#f0f7fd]' : 'bg-white'
                }`}
              >
                {/* Avatar — clickable → author profile */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => { markRead(n, setNotifications); goToAuthor(n) }}
                    disabled={!hasAuthorProfile}
                    className={hasAuthorProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}
                    aria-label={`View ${n.actor_name || 'user'}'s profile`}
                  >
                    <Avatar name={n.actor_name} avatar={n.actor_avatar} />
                  </button>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-sm ${meta.color}`}
                  >
                    {meta.icon}
                  </span>
                </div>

                {/* Text block */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[14px] leading-snug text-gray-800 flex flex-wrap items-baseline gap-x-1">
                    {/* Author name — clickable → profile */}
                    <button
                      onClick={() => { markRead(n, setNotifications); goToAuthor(n) }}
                      disabled={!hasAuthorProfile}
                      className={`font-semibold text-gray-900 ${hasAuthorProfile ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                    >
                      {n.actor_name || 'Someone'}
                    </button>

                    {/* Action segments — each can have its own destination */}
                    {segments.map((seg, i) => (
                      seg.onClick ? (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); seg.onClick!() }}
                          className="text-gray-600 hover:text-[#1B4965] hover:underline cursor-pointer text-left"
                        >
                          {seg.text}
                        </button>
                      ) : (
                        <span key={i} className="text-gray-600">{seg.text}</span>
                      )
                    ))}
                  </p>

                  {/* Comment excerpt — clickable → comment */}
                  {n.comment_excerpt && (
                    <button
                      onClick={() => { markRead(n, setNotifications); goToComment(n) }}
                      disabled={!hasPost}
                      className={`mt-1 block w-full text-left line-clamp-2 text-[12px] italic text-gray-400 ${hasComment ? 'hover:text-[#4B97C9] hover:underline cursor-pointer' : 'cursor-default'}`}
                    >
                      "{n.comment_excerpt}"
                    </button>
                  )}

                  {/* Timestamp row with quick-action chips */}
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-gray-400">{timeAgo(n.created_at)}</span>
                    {hasPost && (
                      <button
                        onClick={() => { markRead(n, setNotifications); goToPost(n) }}
                        className="text-[11px] text-[#4B97C9] hover:underline"
                      >
                        View post
                      </button>
                    )}
                    {hasComment && (
                      <button
                        onClick={() => { markRead(n, setNotifications); goToComment(n) }}
                        className="text-[11px] text-[#4B97C9] hover:underline"
                      >
                        Go to comment ↓
                      </button>
                    )}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#4B97C9]" />
                )}
              </div>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={() => fetchNotifications(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-[#4B97C9] transition-colors hover:bg-[#edf4f9] disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
                ) : null}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
