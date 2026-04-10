import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  CircleDollarSign,
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  Star,
  X,
  Check,
} from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

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

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: (n: Notification) => string }> = {
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

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ name, avatar }: { name: string | null; avatar: string | null }) {
  const apiBase = getApiBase()
  const src = avatar
    ? avatar.startsWith('/uploads/') ? `${apiBase}${avatar}` : avatar
    : null
  const initials = (name || 'U').slice(0, 2).toUpperCase()
  return src ? (
    <img src={src} alt={name || ''} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#c8dff0] text-[11px] font-bold text-[#1B4965]">
      {initials}
    </div>
  )
}

export default function BlogNotificationBell() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await blogActivityAPI.getUnreadNotificationCount()
      setUnread(data?.count ?? 0)
    } catch { /* silent */ }
  }, [isAuthenticated])

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const data = await blogActivityAPI.getNotifications(30, 0)
      setNotifications(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [isAuthenticated])

  // Poll unread count every 30s
  useEffect(() => {
    if (!isAuthenticated) return
    fetchCount()
    pollRef.current = setInterval(fetchCount, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isAuthenticated, fetchCount])

  useEffect(() => {
    const onRefresh = () => {
      void fetchCount()
      void fetchNotifications()
    }
    window.addEventListener('blog-notifications-refresh', onRefresh)
    return () => window.removeEventListener('blog-notifications-refresh', onRefresh)
  }, [fetchCount, fetchNotifications])

  // Load list when panel opens + mark all read
  useEffect(() => {
    if (!open) return
    fetchNotifications()
    if (unread > 0) {
      blogActivityAPI.markAllNotificationsRead().then(() => setUnread(0)).catch(() => {})
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (!isAuthenticated) return null

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) {
      blogActivityAPI.markNotificationRead(n.id).catch(() => {})
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
    }
    setOpen(false)
    if (n.type === 'author_warning') return
    if (String(n.type).startsWith('collab_task_') || n.post_id === 'collab') {
      window.location.hash = '#/user/collab?tab=collab&work=tasks'
      return
    }
    if (n.post_id) {
      window.location.hash = `#/user/blog/${n.post_id}`
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {open && (
        <div
          className="absolute right-0 top-12 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-1">
              {notifications.some((n) => !n.is_read) && (
                <button
                  onClick={() => {
                    blogActivityAPI.markAllNotificationsRead().catch(() => {})
                    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
                    setUnread(0)
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#4B97C9] transition-colors hover:bg-[#edf4f9]"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Bell className="mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">No notifications yet</p>
                <p className="mt-1 text-xs text-gray-300">We'll let you know when something happens.</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const meta = TYPE_META[n.type]
                  if (!meta) return null
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleNotifClick(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f4f9fc] ${
                          !n.is_read ? 'bg-[#f0f7fd]' : ''
                        }`}
                      >
                        {/* Actor avatar with type icon badge */}
                        <div className="relative flex-shrink-0">
                          <Avatar name={n.actor_name} avatar={n.actor_avatar} />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow ${meta.color}`}
                          >
                            {meta.icon}
                          </span>
                        </div>

                        {/* Text */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-gray-800">
                            <span className="font-semibold">{n.actor_name || 'Someone'}</span>{' '}
                            <span className="text-gray-600">{meta.label(n)}</span>
                          </p>
                          {n.comment_excerpt && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] italic text-gray-400">
                              "{n.comment_excerpt}"
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
                        </div>

                        {/* Unread dot */}
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#4B97C9]" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
