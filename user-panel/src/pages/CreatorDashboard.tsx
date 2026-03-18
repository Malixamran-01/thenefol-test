import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Eye,
  FileText,
  Flame,
  Heart,
  Link2,
  MessageCircle,
  PenLine,
  Repeat2,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: number
  display_name: string | null
  pen_name: string | null
  username: string | null
  profile_image: string | null
  cover_image: string | null
  bio: string | null
  writing_categories: string[] | null
  location: string | null
}

interface Stats {
  followers: number
  subscribers: number
  following: number
  posts: number
  views: number
  likes: number
  comments: number
}

interface Post {
  id: number
  title: string
  excerpt: string | null
  cover_image: string | null
  status: string
  featured: boolean
  categories: any
  views_count: number
  likes_count: number
  comments_count: number
  reposts_count: number
  created_at: string
  updated_at: string
}

interface Draft {
  id: number
  title: string
  status: string
  updated_at: string
}

interface MonthlyPoint {
  month: string
  month_date: string
  post_count?: number
  likes?: number
  views?: number
  new_followers?: number
}

interface Activity {
  id: number
  actor_name: string | null
  actor_avatar: string | null
  type: string
  post_id: string | null
  post_title: string | null
  comment_excerpt: string | null
  is_read: boolean
  created_at: string
}

interface DashboardData {
  author: AuthorProfile | null
  stats: Stats
  posts: Post[]
  drafts: Draft[]
  monthlyPosts: MonthlyPoint[]
  monthlyLikes: MonthlyPoint[]
  monthlyFollowers: MonthlyPoint[]
  recentActivity: Activity[]
}

type SortKey = 'created_at' | 'views_count' | 'likes_count' | 'comments_count' | 'reposts_count'
type ChartMetric = 'likes' | 'posts' | 'followers'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cn = (...cls: (string | false | undefined | null)[]) => cls.filter(Boolean).join(' ')

const fmt = (n: number): string =>
  Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveImg(src: string | null | undefined): string | null {
  if (!src) return null
  const apiBase = getApiBase()
  return src.startsWith('/uploads/') ? `${apiBase}${src}` : src
}

// ─── SVG Micro Area Chart ────────────────────────────────────────────────────

function SparkArea({
  data,
  color = '#1B4965',
  height = 48,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const w = 200
  const h = height
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w,
    y: h - (v / max) * (h - 4) - 2,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`
  const id = `sg-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 1 && (
        <>
          <path d={area} fill={`url(#${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

function AreaChart({
  data,
  labels,
  color = '#1B4965',
  height = 140,
}: {
  data: number[]
  labels: string[]
  color?: string
  height?: number
}) {
  const W = 640; const H = height
  const pad = { t: 16, r: 12, b: 28, l: 36 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw),
    y: pad.t + ih - (v / max) * ih,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = pts.length < 2 ? '' : `${line} L ${pts[pts.length-1].x} ${pad.t+ih} L ${pts[0].x} ${pad.t+ih} Z`
  const id = `ac-${color.replace(/[^a-z0-9]/gi, '')}`
  const yTicks = [0, Math.ceil(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {yTicks.map((t) => {
        const y = pad.t + ih - (t / max) * ih
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={pad.l+iw} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <text x={pad.l-6} y={y+4} textAnchor="end" fontSize="10" fill="#9ca3af">{t}</text>
          </g>
        )
      })}
      {area && <path d={area} fill={`url(#${id})`} />}
      {pts.length > 1 && (
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
      ))}
      {labels.map((l, i) => {
        const x = pad.l + (data.length <= 1 ? iw/2 : (i / (data.length - 1)) * iw)
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{l}</text>
        )
      })}
    </svg>
  )
}

// ─── Activity meta ────────────────────────────────────────────────────────────

const ACT: Record<string, { icon: React.ReactNode; bg: string; text: string; label: (a: Activity) => string }> = {
  followed:       { icon: <UserPlus className="h-3.5 w-3.5" />,     bg: 'bg-[#1B4965]',  text: 'text-white', label: () => 'started following you' },
  subscribed:     { icon: <Star className="h-3.5 w-3.5" />,         bg: 'bg-amber-500',  text: 'text-white', label: () => 'subscribed to you' },
  post_liked:     { icon: <Heart className="h-3.5 w-3.5" />,        bg: 'bg-rose-500',   text: 'text-white', label: (a) => `liked "${a.post_title ?? 'your post'}"` },
  post_commented: { icon: <MessageCircle className="h-3.5 w-3.5" />,bg: 'bg-[#4B97C9]', text: 'text-white', label: (a) => `commented on "${a.post_title ?? 'your post'}"` },
  post_reposted:  { icon: <Repeat2 className="h-3.5 w-3.5" />,      bg: 'bg-emerald-500',text: 'text-white', label: (a) => `reposted "${a.post_title ?? 'your post'}"` },
  comment_liked:  { icon: <Heart className="h-3.5 w-3.5" />,        bg: 'bg-rose-400',   text: 'text-white', label: () => 'liked your comment' },
  comment_replied:{ icon: <MessageCircle className="h-3.5 w-3.5" />,bg: 'bg-[#4B97C9]', text: 'text-white', label: () => 'replied to your comment' },
}

// ─── Reusable card wrapper ────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-[#e0eaf0] bg-white shadow-[0_2px_12px_rgba(27,73,101,0.06)]', className)}>
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreatorDashboard() {
  const { isAuthenticated } = useAuth()
  const [data, setData]         = useState<DashboardData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [sortKey, setSortKey]   = useState<SortKey>('likes_count')
  const [sortDir, setSortDir]   = useState<'desc' | 'asc'>('desc')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('likes')
  const [postFilter, setPostFilter]   = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [showAll, setShowAll]   = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    blogActivityAPI.getDashboard()
      .then(setData)
      .catch((e) => console.error('[Dashboard]', e))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  // derived ──────────────────────────────────────────────────────────────────
  const sortedPosts = useMemo(() => {
    if (!data) return []
    let list = [...data.posts]
    if (postFilter !== 'all') list = list.filter((p) => p.status === postFilter)
    list.sort((a, b) => {
      if (sortKey === 'created_at')
        return sortDir === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      const av = a[sortKey] as number; const bv = b[sortKey] as number
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return list
  }, [data, sortKey, sortDir, postFilter])

  const topPosts = useMemo(() =>
    data ? [...data.posts]
      .filter((p) => p.status === 'approved')
      .sort((a, b) => (b.likes_count + b.comments_count + b.views_count) - (a.likes_count + a.comments_count + a.views_count))
      .slice(0, 5) : [],
    [data])

  const { chartLabels, chartValues } = useMemo(() => {
    if (!data) return { chartLabels: [], chartValues: [] }
    if (chartMetric === 'likes')     return { chartLabels: data.monthlyLikes.map(m => m.month),     chartValues: data.monthlyLikes.map(m => m.likes ?? 0) }
    if (chartMetric === 'posts')     return { chartLabels: data.monthlyPosts.map(m => m.month),     chartValues: data.monthlyPosts.map(m => m.post_count ?? 0) }
    return { chartLabels: data.monthlyFollowers.map(m => m.month), chartValues: data.monthlyFollowers.map(m => m.new_followers ?? 0) }
  }, [data, chartMetric])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const copyProfileLink = () => {
    if (!data?.author) return
    const id = data.author.username ?? data.author.id
    navigator.clipboard.writeText(`${window.location.origin}/#/user/author/${id}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#4B97C9] border-t-transparent" />
    </div>
  )

  if (!isAuthenticated) return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4f9]">
        <BarChart3 className="h-8 w-8 text-[#1B4965]" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800">Sign in to view your dashboard</p>
        <p className="mt-1 text-sm text-gray-500">Track your posts, followers, and engagement in one place.</p>
      </div>
      <a href="#/user/login" className="rounded-full bg-[#1B4965] px-6 py-2.5 text-sm font-semibold text-white shadow-md">Sign In</a>
    </div>
  )

  if (!data?.author) return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4f9]">
        <Zap className="h-8 w-8 text-[#4B97C9]" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800">Become an Author</p>
        <p className="mt-1 text-sm text-gray-500">Set up your author profile to unlock your creator dashboard.</p>
      </div>
      <a href="#/user/author/onboarding" className="rounded-full bg-[#1B4965] px-6 py-2.5 text-sm font-semibold text-white shadow-md">
        Get Started
      </a>
    </div>
  )

  const { author, stats, drafts, recentActivity } = data
  const displayName = author.display_name || author.pen_name || author.username || 'Creator'
  const coverSrc    = resolveImg(author.cover_image)
  const avatarSrc   = resolveImg(author.profile_image)
  const approvedCount = data.posts.filter(p => p.status === 'approved').length
  const pendingCount  = data.posts.filter(p => p.status === 'pending').length
  const postsToShow = showAll ? sortedPosts : sortedPosts.slice(0, 6)

  return (
    <main className="min-h-screen bg-[#F4F9F9] pb-20">
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4">

        {/* ══ COVER + PROFILE HEADER ══════════════════════════════════════════ */}
        <section className="mb-6 pt-4 sm:pt-6">
          {/* Cover banner — matches AuthorProfile exactly */}
          <div className={cn(
            'relative h-36 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#1B4965] via-[#2d6688] to-[#4B97C9] sm:h-52 sm:rounded-2xl',
          )}>
            {coverSrc ? (
              <img src={coverSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 opacity-[0.12]">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute rounded-full border border-white/60"
                    style={{ width: `${110+i*55}px`, height: `${110+i*55}px`, top: `${-18+i*8}px`, left: `${-25+i*75}px` }} />
                ))}
              </div>
            )}
            {/* subtle bottom fade */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
            {/* Top-right quick actions overlay */}
            <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-4">
              <button
                onClick={copyProfileLink}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/35"
                title="Copy profile link"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              </button>
              <a href={`#/user/author/me`}
                className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/35">
                <Eye className="h-3 w-3" /> View Profile
              </a>
              <a href="#/user/blog/request"
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1B4965] shadow transition hover:bg-blue-50">
                <PenLine className="h-3 w-3" /> New Post
              </a>
            </div>
          </div>

          {/* Profile body — avatar overlaps cover */}
          <div className="relative px-3 pb-0 sm:px-6">
            {/* Avatar */}
            <div className="absolute -top-10 left-3 sm:-top-14 sm:left-6">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg sm:h-28 sm:w-28 sm:border-[5px] sm:shadow-xl">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4B97C9] to-[#1B4965] text-3xl font-bold text-white sm:text-4xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Name + meta — right side has space for avatar */}
            <div className="pb-5 pt-12 sm:pt-16">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{displayName}</h1>
                  {author.username && <p className="text-[12px] font-medium text-gray-400 sm:text-sm">@{author.username}</p>}
                  {author.bio && <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-gray-500 line-clamp-2">{author.bio}</p>}
                </div>
                {/* writing categories */}
                {author.writing_categories && author.writing_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {author.writing_categories.slice(0, 4).map(c => (
                      <span key={c} className="rounded-full border border-[#d0e4f0] bg-[#edf4f9] px-2.5 py-0.5 text-[11px] font-medium text-[#1B4965]">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline stats strip — like AuthorProfile */}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-4 text-sm">
                {[
                  { label: 'posts',       val: stats.posts },
                  { label: 'followers',   val: stats.followers },
                  { label: 'subscribers', val: stats.subscribers },
                  { label: 'following',   val: stats.following },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-baseline gap-1">
                    <span className="font-bold text-gray-900">{fmt(val)}</span>
                    <span className="text-gray-500 text-[12px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ BENTO STAT GRID ═════════════════════════════════════════════════ */}
        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Likes — wide accent card */}
          <Card className="col-span-2 p-5 sm:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Likes</p>
                <p className="mt-1.5 text-4xl font-black text-gray-900">{fmt(stats.likes)}</p>
                <p className="mt-1 text-[12px] text-gray-400">across all published posts</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <Heart className="h-5 w-5 text-rose-500" strokeWidth={2} />
              </div>
            </div>
            {/* Sparkline */}
            {chartMetric === 'likes' && chartValues.length > 0 && (
              <div className="mt-3 opacity-60">
                <SparkArea data={chartValues} color="#f43f5e" height={36} />
              </div>
            )}
          </Card>

          {/* Subscribers */}
          <Card className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf4f9]">
              <Users className="h-4.5 w-4.5 text-[#1B4965]" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Subscribers</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{fmt(stats.subscribers)}</p>
          </Card>

          {/* Followers */}
          <Card className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
              <UserPlus className="h-4.5 w-4.5 text-purple-600" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Followers</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{fmt(stats.followers)}</p>
          </Card>

          {/* Views */}
          <Card className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Eye className="h-4.5 w-4.5 text-amber-500" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Views</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{fmt(stats.views)}</p>
          </Card>

          {/* Comments */}
          <Card className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf4f9]">
              <MessageCircle className="h-4.5 w-4.5 text-[#4B97C9]" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Comments</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{fmt(stats.comments)}</p>
          </Card>

          {/* Published */}
          <Card className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <BookOpen className="h-4.5 w-4.5 text-emerald-600" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Published</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{approvedCount}</p>
            {pendingCount > 0 && (
              <p className="mt-0.5 text-[11px] text-amber-500">{pendingCount} pending review</p>
            )}
          </Card>

          {/* Engagement rate — calculated */}
          <Card className="p-5 bg-gradient-to-br from-[#1B4965] to-[#2a6f9e]">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">Engagement</p>
            <p className="mt-1 text-3xl font-black text-white">{fmt(stats.likes + stats.comments)}</p>
            <p className="mt-0.5 text-[11px] text-blue-200">likes + comments</p>
          </Card>
        </section>

        {/* ══ GROWTH CHART ════════════════════════════════════════════════════ */}
        <Card className="mb-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0eaf0] px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4f9]">
                <TrendingUp className="h-4 w-4 text-[#1B4965]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">Growth Overview</p>
                <p className="text-[11px] text-gray-400">Last 12 months</p>
              </div>
            </div>
            <div className="flex gap-1 rounded-xl border border-[#e0eaf0] bg-[#f4f9f9] p-1">
              {([['likes','Likes','#f43f5e'],['posts','Posts','#1B4965'],['followers','Followers','#7c3aed']] as const).map(([key, label, color]) => (
                <button key={key} onClick={() => setChartMetric(key as ChartMetric)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all',
                    chartMetric === key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-2 py-4">
            {chartValues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="mb-2 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">No data yet — keep writing!</p>
              </div>
            ) : (
              <AreaChart
                data={chartValues}
                labels={chartLabels}
                color={chartMetric === 'likes' ? '#f43f5e' : chartMetric === 'posts' ? '#1B4965' : '#7c3aed'}
                height={140}
              />
            )}
          </div>
        </Card>

        {/* ══ TOP POSTS + ACTIVITY ═════════════════════════════════════════════ */}
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* Top 5 posts */}
          <Card className="lg:col-span-3 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#e0eaf0] px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">Top Performing Posts</p>
                <p className="text-[11px] text-gray-400">Ranked by total engagement</p>
              </div>
            </div>
            {topPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="mb-2 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">No published posts yet</p>
                <a href="#/user/blog/request" className="mt-3 text-[12px] font-semibold text-[#4B97C9] hover:underline">Write your first post →</a>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f4f7]">
                {topPosts.map((post, i) => {
                  const img = resolveImg(post.cover_image)
                  const rankColors = ['bg-amber-400 text-white','bg-gray-300 text-gray-700','bg-orange-300 text-white','bg-gray-100 text-gray-500','bg-gray-100 text-gray-500']
                  return (
                    <a key={post.id} href={`#/user/blog/${post.id}`}
                      className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f8fafc]">
                      <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold', rankColors[i])}>
                        {i + 1}
                      </span>
                      {img ? (
                        <img src={img} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-[#edf4f9]">
                          <BookOpen className="h-4 w-4 text-[#4B97C9]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">{post.title}</p>
                        <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{fmt(post.likes_count)}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-[#4B97C9]" />{fmt(post.comments_count)}</span>
                        <span className="hidden sm:flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(post.views_count)}</span>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e0eaf0] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4f9]">
                  <Bell className="h-4 w-4 text-[#1B4965]" />
                </div>
                <p className="text-[13px] font-bold text-gray-800">Recent Activity</p>
              </div>
              <a href="#/user/blog/activity" className="flex items-center gap-0.5 text-[11px] font-semibold text-[#4B97C9] hover:text-[#1B4965]">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-2 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f4f7]">
                {recentActivity.slice(0, 8).map((a) => {
                  const meta = ACT[a.type]
                  if (!meta) return null
                  const src = resolveImg(a.actor_avatar)
                  return (
                    <div key={a.id} className={cn('flex items-start gap-3 px-5 py-3 transition-colors', !a.is_read && 'bg-[#f0f7fd]')}>
                      <div className="relative flex-shrink-0">
                        {src ? (
                          <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce8f0] text-[10px] font-bold text-[#1B4965]">
                            {(a.actor_name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={cn('absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full', meta.bg, meta.text)}>
                          {meta.icon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[12px] leading-snug text-gray-700">
                          <span className="font-semibold">{a.actor_name || 'Someone'}</span>{' '}
                          <span className="text-gray-500">{meta.label(a)}</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ══ RECENT DRAFTS ═══════════════════════════════════════════════════ */}
        {drafts.length > 0 && (
          <Card className="mb-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e0eaf0] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-[13px] font-bold text-gray-800">Recent Drafts</p>
              </div>
              <a href="#/user/blog/my-blogs" className="flex items-center gap-0.5 text-[11px] font-semibold text-[#4B97C9] hover:text-[#1B4965]">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            <div className="grid grid-cols-1 divide-y divide-[#f0f4f7] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {drafts.map((d) => (
                <a key={d.id} href="#/user/blog/request"
                  className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[#f8fafc]">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#e0eaf0] bg-white group-hover:border-[#4B97C9]/30 transition-colors">
                    <Edit3 className="h-4 w-4 text-gray-400 group-hover:text-[#4B97C9] transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-gray-700 group-hover:text-[#1B4965]">
                      {d.title || 'Untitled'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="h-3 w-3" /> {timeAgo(d.updated_at)}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    Draft
                  </span>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* ══ ALL POSTS TABLE ══════════════════════════════════════════════════ */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0eaf0] px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4f9]">
                <BarChart3 className="h-4 w-4 text-[#1B4965]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">Posts Performance</p>
                <p className="text-[11px] text-gray-400">{sortedPosts.length} posts total</p>
              </div>
            </div>
            {/* Status tabs */}
            <div className="flex gap-1 rounded-xl border border-[#e0eaf0] bg-[#f4f9f9] p-1">
              {(['all','approved','pending','rejected'] as const).map((f) => (
                <button key={f} onClick={() => setPostFilter(f)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition-all',
                    postFilter === f ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                  )}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Sort header row (desktop only) */}
          {sortedPosts.length > 0 && (
            <div className="hidden grid-cols-[1fr_60px_60px_60px_60px_72px] items-center gap-2 border-b border-[#f0f4f7] bg-[#f8fafc] px-5 py-2 sm:grid">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Post</span>
              {([
                ['views_count','Views'],['likes_count','Likes'],['comments_count','Cmts'],['reposts_count','Rpsts'],['created_at','Date'],
              ] as [SortKey,string][]).map(([key, label]) => (
                <button key={key} onClick={() => toggleSort(key)}
                  className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#1B4965]">
                  {label}
                  {sortKey === key ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
                </button>
              ))}
            </div>
          )}

          {/* Posts */}
          {sortedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="mb-3 h-12 w-12 text-gray-200" />
              <p className="font-semibold text-gray-400">No posts found</p>
              <a href="#/user/blog/request" className="mt-3 rounded-full bg-[#1B4965] px-4 py-2 text-[12px] font-semibold text-white">
                Write your first post
              </a>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f4f7]">
              {postsToShow.map((post) => {
                const img = resolveImg(post.cover_image)
                const statusMap: Record<string, string> = {
                  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  pending:  'bg-amber-50 text-amber-700 border-amber-200',
                  rejected: 'bg-red-50 text-red-600 border-red-200',
                }
                const statusLabel: Record<string, string> = { approved: 'Published', pending: 'Pending', rejected: 'Rejected' }
                return (
                  <a key={post.id} href={`#/user/blog/${post.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f8fafc]">
                    {img ? (
                      <img src={img} alt="" className="h-11 w-16 flex-shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-11 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#edf4f9] to-[#d0e4f0]">
                        <BookOpen className="h-5 w-5 text-[#4B97C9]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">{post.title}</p>
                        {post.featured && <Star className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" fill="currentColor" />}
                      </div>
                      <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
                    </div>
                    {/* Stats — desktop */}
                    <div className="hidden items-center gap-4 text-[12px] text-gray-500 sm:flex">
                      <span className="flex w-14 items-center justify-end gap-1"><Eye className="h-3.5 w-3.5 text-gray-300" />{fmt(post.views_count)}</span>
                      <span className="flex w-14 items-center justify-end gap-1"><Heart className="h-3.5 w-3.5 text-rose-300" />{fmt(post.likes_count)}</span>
                      <span className="flex w-14 items-center justify-end gap-1"><MessageCircle className="h-3.5 w-3.5 text-[#9bc5e0]" />{fmt(post.comments_count)}</span>
                      <span className="flex w-14 items-center justify-end gap-1"><Repeat2 className="h-3.5 w-3.5 text-emerald-300" />{fmt(post.reposts_count)}</span>
                      <span className={cn('w-16 rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold', statusMap[post.status] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
                        {statusLabel[post.status] ?? post.status}
                      </span>
                    </div>
                    {/* Compact mobile */}
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 sm:hidden">
                      <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-rose-300" />{fmt(post.likes_count)}</span>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusMap[post.status] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
                        {statusLabel[post.status] ?? post.status}
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}

          {sortedPosts.length > 6 && (
            <div className="border-t border-[#f0f4f7] px-5 py-3">
              <button onClick={() => setShowAll(s => !s)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-gray-400 transition hover:text-[#1B4965]">
                {showAll ? <><ChevronUp className="h-4 w-4" /> Collapse</> : <><ChevronDown className="h-4 w-4" /> Show all {sortedPosts.length} posts</>}
              </button>
            </div>
          )}
        </Card>

        {/* ══ QUICK ACTIONS ════════════════════════════════════════════════════ */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { href: '#/user/blog/request', icon: <PenLine className="h-5 w-5" />,    label: 'Write Post',  sub: 'Start a new draft',       bg: 'bg-[#1B4965]', fg: 'text-white', sbg: 'text-blue-200' },
            { href: '#/user/blog/explore', icon: <Sparkles className="h-5 w-5" />,   label: 'Explore',     sub: 'Discover new readers',     bg: 'bg-white border border-[#e0eaf0]',  fg: 'text-gray-800', sbg: 'text-gray-400' },
            { href: '#/user/blog/activity',icon: <Bell className="h-5 w-5" />,       label: 'Activity',    sub: 'Notifications & updates',  bg: 'bg-white border border-[#e0eaf0]',  fg: 'text-gray-800', sbg: 'text-gray-400' },
            { href: '#/user/author/me',    icon: <Send className="h-5 w-5" />,       label: 'Share Profile',sub: 'Let readers find you',    bg: 'bg-white border border-[#e0eaf0]',  fg: 'text-gray-800', sbg: 'text-gray-400' },
          ]).map(({ href, icon, label, sub, bg, fg, sbg }) => (
            <a key={label} href={href}
              className={cn('group flex flex-col gap-2 rounded-2xl p-4 shadow-[0_2px_8px_rgba(27,73,101,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(27,73,101,0.12)]', bg)}>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', fg === 'text-white' ? 'bg-white/20' : 'bg-[#edf4f9]')}>
                <span className={fg}>{icon}</span>
              </div>
              <div>
                <p className={cn('text-[13px] font-bold', fg)}>{label}</p>
                <p className={cn('text-[11px]', sbg)}>{sub}</p>
              </div>
            </a>
          ))}
        </div>

      </div>
    </main>
  )
}
