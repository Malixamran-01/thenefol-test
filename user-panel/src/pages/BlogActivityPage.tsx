import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ClipboardList,
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

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; color: string; label: (n: Notification) => string }
> = {
  post_liked: {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-rose-500',
    label: (n) => `liked your post${n.post_title ? ` "${n.post_title}"` : ''}`,
  },
  post_commented: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'text-[#4B97C9]',
    label: (n) => `commented on${n.post_title ? ` "${n.post_title}"` : ' your post'}`,
  },
  comment_replied: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'text-[#4B97C9]',
    label: () => 'replied to your comment',
  },
  comment_liked: {
    icon: <Heart className="h-4 w-4" />,
    color: 'text-rose-500',
    label: () => 'liked your comment',
  },
  post_reposted: {
    icon: <Repeat2 className="h-4 w-4" />,
    color: 'text-green-500',
    label: (n) => `reposted your post${n.post_title ? ` "${n.post_title}"` : ''}`,
  },
  followed: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-[#1B4965]',
    label: () => 'started following you',
  },
  subscribed: {
    icon: <Star className="h-4 w-4" />,
    color: 'text-amber-500',
    label: () => 'subscribed to your profile',
  },
  collab_task_assigned: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-[#4B97C9]',
    label: (n) => `assigned you a brand task${n.post_title ? `: ${n.post_title}` : ''}`,
  },
  collab_task_revision: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-orange-500',
    label: () => 'asked for updates on your brand task',
  },
  collab_task_rejected: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-red-500',
    label: () => 'did not approve a brand task submission',
  },
  collab_task_paid: {
    icon: <CircleDollarSign className="h-4 w-4" />,
    color: 'text-emerald-600',
    label: () => 'recorded payout for a brand task',
  },
  collab_task_submitted: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-slate-500',
    label: () => 'received your brand task submission',
  },
  author_warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600',
    label: (n) =>
      `sent a moderation notice${n.post_title ? ` — ${n.post_title}` : ''}`,
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

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) {
      blogActivityAPI.markNotificationRead(n.id).catch(() => {})
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      )
    }
    if (n.type === 'author_warning') {
      return
    }
    if (String(n.type).startsWith('collab_task_') || n.post_id === 'collab') {
      window.location.hash = '#/user/collab?tab=collab&work=tasks'
      return
    }
    if (n.post_id) {
      window.location.hash = `#/user/blog/${n.post_id}`
    }
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
          <h1 className="text-xl font-bold text-gray-900">Activity</h1>
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
            return (
              <button
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-[#f4f9fc] ${
                  !n.is_read ? 'bg-[#f0f7fd]' : 'bg-white'
                }`}
              >
                {/* Avatar + type badge */}
                <div className="relative flex-shrink-0">
                  <Avatar name={n.actor_name} avatar={n.actor_avatar} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-sm ${meta.color}`}
                  >
                    {meta.icon}
                  </span>
                </div>

                {/* Text block */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[14px] leading-snug text-gray-800">
                    <span className="font-semibold">{n.actor_name || 'Someone'}</span>{' '}
                    <span className="text-gray-600">{meta.label(n)}</span>
                  </p>
                  {n.comment_excerpt && (
                    <p className="mt-1 line-clamp-2 text-[12px] italic text-gray-400">
                      "{n.comment_excerpt}"
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#4B97C9]" />
                )}
              </button>
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
