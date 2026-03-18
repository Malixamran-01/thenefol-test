import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BarChart2,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Repeat2,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
  ArrowRight,
  Award,
  Share2,
} from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: number
  display_name: string | null
  pen_name: string | null
  username: string | null
  profile_image: string | null
  bio: string | null
  writing_categories: string[] | null
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending:  { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    rejected: { label: 'Rejected',  cls: 'bg-red-50 text-red-600 border-red-200' },
    draft:    { label: 'Draft',     cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const m = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  )
}

// ─── Mini SVG Area Chart ─────────────────────────────────────────────────────

function AreaChart({
  data,
  color = '#1B4965',
  height = 120,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const w = 600
  const h = height
  const pad = { top: 12, right: 8, bottom: 20, left: 32 }
  const iw = w - pad.left - pad.right
  const ih = h - pad.top - pad.bottom

  const max = Math.max(...data, 1)
  const min = 0

  const pts = data.map((v, i) => ({
    x: pad.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw),
    y: pad.top + ih - ((v - min) / (max - min)) * ih,
  }))

  const pathD = pts.length === 0 ? '' :
    pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '')

  const areaD = pts.length === 0 ? '' :
    `${pathD} L ${pts[pts.length - 1].x} ${pad.top + ih} L ${pts[0].x} ${pad.top + ih} Z`

  const yTicks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {yTicks.map((tick) => {
        const y = pad.top + ih - ((tick - min) / (max - min)) * ih
        return (
          <g key={tick}>
            <line x1={pad.left} y1={y} x2={pad.left + iw} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{tick}</text>
          </g>
        )
      })}
      {/* Area fill */}
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {pts.length > 0 && (
        <>
          <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
          ))}
        </>
      )}
    </svg>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  sub?: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{fmt(Number(value))}</p>
        {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Post Row ────────────────────────────────────────────────────────────────

function PostRow({ post, rank }: { post: Post; rank?: number }) {
  const apiBase = getApiBase()
  const img = post.cover_image
    ? post.cover_image.startsWith('/uploads/') ? `${apiBase}${post.cover_image}` : post.cover_image
    : null

  return (
    <a
      href={`#/user/blog/${post.id}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-[#4B97C9]/30 hover:shadow-sm"
    >
      {rank !== undefined && (
        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          rank === 0 ? 'bg-amber-400 text-white' :
          rank === 1 ? 'bg-gray-300 text-gray-700' :
          rank === 2 ? 'bg-orange-300 text-white' :
          'bg-gray-100 text-gray-500'
        }`}>{rank + 1}</span>
      )}
      {img ? (
        <img src={img} alt={post.title} className="h-11 w-16 flex-shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-11 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#c8dff0] to-[#9bc5e0]">
          <BookOpen className="h-5 w-5 text-[#1B4965]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">{post.title}</p>
        <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{fmt(post.views_count)}</span>
        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-400" />{fmt(post.likes_count)}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-[#4B97C9]" />{fmt(post.comments_count)}</span>
        <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5 text-green-500" />{fmt(post.reposts_count)}</span>
        <span className="hidden sm:block">{statusBadge(post.status)}</span>
      </div>
    </a>
  )
}

// ─── Activity Item ───────────────────────────────────────────────────────────

const ACTIVITY_META: Record<string, { icon: React.ReactNode; color: string; label: (a: Activity) => string }> = {
  followed:      { icon: <UserPlus className="h-3.5 w-3.5" />,    color: 'text-[#1B4965] bg-[#edf4f9]', label: () => 'started following you' },
  subscribed:    { icon: <Star className="h-3.5 w-3.5" />,        color: 'text-amber-600 bg-amber-50',  label: () => 'subscribed to your profile' },
  post_liked:    { icon: <Heart className="h-3.5 w-3.5" />,       color: 'text-rose-500 bg-rose-50',    label: (a) => `liked "${a.post_title ?? 'your post'}"` },
  post_commented:{ icon: <MessageCircle className="h-3.5 w-3.5" />,color: 'text-[#4B97C9] bg-[#edf4f9]',label: (a) => `commented on "${a.post_title ?? 'your post'}"` },
  comment_liked: { icon: <Heart className="h-3.5 w-3.5" />,       color: 'text-rose-500 bg-rose-50',    label: () => 'liked your comment' },
  post_reposted: { icon: <Repeat2 className="h-3.5 w-3.5" />,     color: 'text-green-600 bg-green-50',  label: (a) => `reposted "${a.post_title ?? 'your post'}"` },
  comment_replied:{ icon: <MessageCircle className="h-3.5 w-3.5" />,color: 'text-[#4B97C9] bg-[#edf4f9]',label: () => 'replied to your comment' },
}

function ActivityItem({ a }: { a: Activity }) {
  const meta = ACTIVITY_META[a.type]
  if (!meta) return null
  const apiBase = getApiBase()
  const src = a.actor_avatar
    ? a.actor_avatar.startsWith('/uploads/') ? `${apiBase}${a.actor_avatar}` : a.actor_avatar
    : null
  const initials = (a.actor_name || 'U').slice(0, 2).toUpperCase()

  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-2.5 transition-colors ${a.is_read ? '' : 'bg-[#f0f7fd]'}`}>
      <div className="relative flex-shrink-0">
        {src ? (
          <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c8dff0] text-[10px] font-bold text-[#1B4965]">{initials}</div>
        )}
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ${meta.color}`}>
          {meta.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[12px] text-gray-700">
          <span className="font-semibold">{a.actor_name || 'Someone'}</span>{' '}
          <span className="text-gray-500">{meta.label(a)}</span>
        </p>
        <p className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</p>
      </div>
    </div>
  )
}

// ─── Author Avatar ───────────────────────────────────────────────────────────

function AuthorAvatar({ name, avatar }: { name: string | null; avatar: string | null }) {
  const apiBase = getApiBase()
  const src = avatar
    ? avatar.startsWith('/uploads/') ? `${apiBase}${avatar}` : avatar
    : null
  const initials = (name || 'U').slice(0, 2).toUpperCase()
  return src ? (
    <img src={src} alt="" className="h-14 w-14 rounded-full object-cover ring-4 ring-white shadow-md" />
  ) : (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#c8dff0] to-[#9bc5e0] text-lg font-bold text-[#1B4965] ring-4 ring-white shadow-md">
      {initials}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CreatorDashboard() {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('likes_count')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('likes')
  const [postFilter, setPostFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [showAllPosts, setShowAllPosts] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const d = await blogActivityAPI.getDashboard()
      setData(d)
    } catch (err) {
      console.error('[Dashboard] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) fetchDashboard()
  }, [isAuthenticated])

  // ── Sort & filter posts ─────────────────────────────────────────────────────
  const sortedPosts = React.useMemo(() => {
    if (!data) return []
    let list = [...data.posts]
    if (postFilter !== 'all') list = list.filter((p) => p.status === postFilter)
    list.sort((a, b) => {
      const av = a[sortKey] as number
      const bv = b[sortKey] as number
      if (sortKey === 'created_at') {
        return sortDir === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortDir === 'desc' ? (bv - av) : (av - bv)
    })
    return list
  }, [data, sortKey, sortDir, postFilter])

  // ── Top 5 posts by engagement ──────────────────────────────────────────────
  const topPosts = React.useMemo(() => {
    if (!data) return []
    return [...data.posts]
      .filter((p) => p.status === 'approved')
      .sort((a, b) => (b.likes_count + b.comments_count + b.views_count) - (a.likes_count + a.comments_count + a.views_count))
      .slice(0, 5)
  }, [data])

  // ── Chart data ────────────────────────────────────────────────────────────
  const { chartLabels, chartValues } = React.useMemo(() => {
    if (!data) return { chartLabels: [], chartValues: [] }
    if (chartMetric === 'likes') {
      return {
        chartLabels: data.monthlyLikes.map((m) => m.month),
        chartValues: data.monthlyLikes.map((m) => m.likes ?? 0),
      }
    }
    if (chartMetric === 'posts') {
      return {
        chartLabels: data.monthlyPosts.map((m) => m.month),
        chartValues: data.monthlyPosts.map((m) => m.post_count ?? 0),
      }
    }
    // followers
    return {
      chartLabels: data.monthlyFollowers.map((m) => m.month),
      chartValues: data.monthlyFollowers.map((m) => m.new_followers ?? 0),
    }
  }, [data, chartMetric])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4B97C9] border-t-transparent" />
      </div>
    )
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BarChart2 className="h-14 w-14 text-gray-200" />
        <p className="font-semibold text-gray-500">Sign in to view your creator dashboard</p>
        <a href="#/user/login" className="rounded-full bg-[#1B4965] px-5 py-2 text-sm font-medium text-white">Sign In</a>
      </div>
    )
  }

  // ── No author profile ─────────────────────────────────────────────────────
  if (!data?.author) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <Zap className="h-14 w-14 text-[#4B97C9]" />
        <div>
          <p className="text-lg font-bold text-gray-800">Become an Author</p>
          <p className="mt-1 text-sm text-gray-500">Set up your author profile to unlock the creator dashboard and analytics.</p>
        </div>
        <a href="#/user/author/onboarding" className="rounded-full bg-[#1B4965] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#163d52]">
          Get Started
        </a>
      </div>
    )
  }

  const { author, stats, drafts, recentActivity } = data
  const displayName = author.display_name || author.pen_name || author.username || 'Creator'
  const totalEngagement = stats.likes + stats.comments
  const approvedPosts = data.posts.filter((p) => p.status === 'approved')
  const bestPost = topPosts[0] ?? null

  const postsToShow = showAllPosts ? sortedPosts : sortedPosts.slice(0, 6)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-4 sm:px-6">

      {/* ── Profile Header ── */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-[#1B4965] to-[#2a6f9e] shadow-md">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AuthorAvatar name={displayName} avatar={author.profile_image ?? null} />
            <div>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              {author.username && <p className="text-[13px] text-blue-200">@{author.username}</p>}
              {author.writing_categories && author.writing_categories.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {author.writing_categories.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`#/user/author/me`}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/25"
            >
              <Eye className="h-3.5 w-3.5" /> View Profile
            </a>
            <a
              href="#/user/blog/request"
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1B4965] transition hover:bg-blue-50"
            >
              <Edit3 className="h-3.5 w-3.5" /> New Post
            </a>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Subscribers" value={stats.subscribers} icon={<Users className="h-4 w-4 text-[#1B4965]" />} color="bg-[#edf4f9]" sub="All-time" />
        <StatCard label="Followers"   value={stats.followers}   icon={<UserPlus className="h-4 w-4 text-purple-600" />} color="bg-purple-50" sub="All-time" />
        <StatCard label="Total Likes" value={stats.likes}       icon={<Heart className="h-4 w-4 text-rose-500" />} color="bg-rose-50" sub="Across all posts" />
        <StatCard label="Total Views" value={stats.views}       icon={<Eye className="h-4 w-4 text-amber-600" />} color="bg-amber-50" sub="Across all posts" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Published"  value={approvedPosts.length}  icon={<BookOpen className="h-4 w-4 text-emerald-600" />} color="bg-emerald-50" />
        <StatCard label="Comments"   value={stats.comments}        icon={<MessageCircle className="h-4 w-4 text-[#4B97C9]" />} color="bg-[#edf4f9]" />
        <StatCard label="Following"  value={stats.following}       icon={<ArrowRight className="h-4 w-4 text-gray-500" />} color="bg-gray-100" />
        <StatCard label="Engagement" value={totalEngagement}       icon={<Zap className="h-4 w-4 text-orange-500" />} color="bg-orange-50" sub="Likes + comments" />
      </div>

      {/* ── Growth Chart ── */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#1B4965]" />
            <h2 className="text-sm font-bold text-gray-800">Growth Overview</h2>
            <span className="text-[11px] text-gray-400">Last 12 months</span>
          </div>
          <div className="flex gap-1 rounded-xl border border-gray-200 p-0.5">
            {([
              { key: 'likes',     label: 'Likes' },
              { key: 'posts',     label: 'Posts' },
              { key: 'followers', label: 'Followers' },
            ] as { key: ChartMetric; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartMetric(key)}
                className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
                  chartMetric === key ? 'bg-[#1B4965] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {chartValues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart2 className="mb-2 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">No data yet for this period</p>
          </div>
        ) : (
          <>
            <AreaChart
              data={chartValues}
              color={chartMetric === 'likes' ? '#e11d48' : chartMetric === 'posts' ? '#1B4965' : '#7c3aed'}
              height={130}
            />
            {chartLabels.length > 0 && (
              <div className="mt-2 flex justify-between px-8">
                {chartLabels.map((l, i) => (
                  <span key={i} className="text-[9px] text-gray-400">{l}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Main 2-col grid: Best Post + Activity ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Best performing post */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-800">Top Performing Posts</h2>
          </div>
          {topPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Star className="mb-2 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">Publish posts to see your top performers</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topPosts.map((post, i) => (
                <PostRow key={post.id} post={post} rank={i} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#4B97C9]" />
              <h2 className="text-sm font-bold text-gray-800">Recent Activity</h2>
            </div>
            <a href="#/user/blog/activity" className="text-[11px] text-[#4B97C9] hover:underline">View all</a>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No activity yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {recentActivity.slice(0, 8).map((a) => (
                <ActivityItem key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Drafts ── */}
      {drafts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-800">Recent Drafts</h2>
            </div>
            <a href="#/user/blog/my-blogs" className="text-[11px] text-[#4B97C9] hover:underline">View all</a>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {drafts.map((d) => (
              <a
                key={d.id}
                href={`#/user/blog/request`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-[#4B97C9]/30 hover:bg-white"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                  <Edit3 className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-gray-700">{d.title || 'Untitled'}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> {timeAgo(d.updated_at)}
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Draft</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── All Posts Table ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-[#1B4965]" />
            <h2 className="text-sm font-bold text-gray-800">All Posts Performance</h2>
            <span className="rounded-full bg-[#edf4f9] px-2 py-0.5 text-[10px] font-medium text-[#1B4965]">{sortedPosts.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-0.5">
              {(['all', 'approved', 'pending', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPostFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                    postFilter === f ? 'bg-white shadow-sm text-[#1B4965]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sort header */}
        {sortedPosts.length > 0 && (
          <div className="mb-2 hidden grid-cols-[1fr_70px_70px_70px_70px_80px] items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:grid">
            <span>Post</span>
            {([
              { key: 'views_count',    label: 'Views' },
              { key: 'likes_count',    label: 'Likes' },
              { key: 'comments_count', label: 'Comments' },
              { key: 'reposts_count',  label: 'Reposts' },
              { key: 'created_at',     label: 'Date' },
            ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className="flex items-center gap-0.5 hover:text-[#1B4965]"
              >
                {label}
                {sortKey === key ? (
                  sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                ) : null}
              </button>
            ))}
          </div>
        )}

        {sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-gray-200" />
            <p className="font-medium text-gray-400">No posts found</p>
            <a href="#/user/blog/request" className="mt-3 rounded-full bg-[#1B4965] px-4 py-1.5 text-[12px] font-semibold text-white">Write your first post</a>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {postsToShow.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
            {sortedPosts.length > 6 && (
              <button
                onClick={() => setShowAllPosts((s) => !s)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 py-2 text-[12px] font-medium text-gray-500 transition hover:border-[#4B97C9] hover:text-[#4B97C9]"
              >
                {showAllPosts ? (
                  <><ChevronUp className="h-4 w-4" /> Show less</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> Show all {sortedPosts.length} posts</>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: '#/user/blog/request', icon: <Edit3 className="h-4 w-4" />, label: 'Write Post', color: 'bg-[#1B4965] text-white' },
          { href: '#/user/blog/explore', icon: <Share2 className="h-4 w-4" />, label: 'Explore',    color: 'bg-[#edf4f9] text-[#1B4965]' },
          { href: '#/user/blog/activity', icon: <Bell className="h-4 w-4" />, label: 'Activity',   color: 'bg-[#edf4f9] text-[#1B4965]' },
          { href: '#/user/author/me',    icon: <Eye className="h-4 w-4" />,   label: 'Profile',    color: 'bg-[#edf4f9] text-[#1B4965]' },
        ].map(({ href, icon, label, color }) => (
          <a
            key={label}
            href={href}
            className={`flex items-center justify-center gap-2 rounded-2xl p-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${color}`}
          >
            {icon}{label}
          </a>
        ))}
      </div>

    </div>
  )
}
