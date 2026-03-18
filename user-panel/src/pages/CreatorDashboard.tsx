import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Edit3,
  Eye,
  FileText,
  Flame,
  Heart,
  MessageCircle,
  PenLine,
  Repeat2,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
  LayoutDashboard,
  Handshake,
  Construction,
  Check,
  Copy,
  ArrowRight,
} from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: number; display_name: string | null; pen_name: string | null; username: string | null
  profile_image: string | null; cover_image: string | null; bio: string | null
  writing_categories: string[] | null; location: string | null
}
interface Stats {
  followers: number; subscribers: number; following: number; posts: number
  views: number; likes: number; comments: number; reads: number; profileViews: number
}
interface Post {
  id: number; title: string; excerpt: string | null; cover_image: string | null
  status: string; featured: boolean; categories: any; views_count: number
  likes_count: number; comments_count: number; reposts_count: number
  created_at: string; updated_at: string
}
interface Draft { id: number; title: string; status: string; updated_at: string }
interface MonthlyPoint {
  month: string; month_date: string; post_count?: number; likes?: number
  views?: number; new_followers?: number
}
interface Activity {
  id: number; actor_name: string | null; actor_avatar: string | null; type: string
  post_id: string | null; post_title: string | null; comment_excerpt: string | null
  is_read: boolean; created_at: string
}
interface DashboardData {
  author: AuthorProfile | null; stats: Stats; posts: Post[]; drafts: Draft[]
  monthlyPosts: MonthlyPoint[]; monthlyLikes: MonthlyPoint[]
  monthlyFollowers: MonthlyPoint[]; recentActivity: Activity[]
}
type SortKey = 'created_at' | 'views_count' | 'likes_count' | 'comments_count' | 'reposts_count'
type ChartMetric = 'likes' | 'posts' | 'followers'
type DashTab = 'posts' | 'affiliate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveImg(src?: string | null) {
  if (!src) return null
  return src.startsWith('/uploads/') ? `${getApiBase()}${src}` : src
}

// Fill in gaps so the chart always shows 6 months of data
function padMonths<T extends { month: string; month_date: string }>(
  data: T[], getValue: (d: T) => number, months = 6
): { month: string; value: number }[] {
  const result: { month: string; value: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '")
    const key = d.toISOString().slice(0, 7)
    const found = data.find(r => r.month_date.slice(0, 7) === key)
    result.push({ month: label, value: found ? getValue(found as any) : 0 })
  }
  return result
}

// ─── SVG Area Chart ───────────────────────────────────────────────────────────

function AreaChart({ points, color, h = 150 }: { points: { month: string; value: number }[]; color: string; h?: number }) {
  const W = 640; const H = h
  const pad = { t: 12, r: 16, b: 26, l: 38 }
  const iw = W - pad.l - pad.r; const ih = H - pad.t - pad.b
  const vals = points.map(p => p.value)
  const max = Math.max(...vals, 1)
  const px = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw)
  const py = (v: number) => pad.t + ih - (v / max) * ih
  const pts = points.map((p, i) => ({ x: px(i), y: py(p.value) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = pts.length < 2 ? '' : `${line} L ${pts[pts.length - 1].x} ${pad.t + ih} L ${pts[0].x} ${pad.t + ih} Z`
  const gid = `cg${color.replace(/[^a-z0-9]/gi, '')}`
  const ticks = [0, Math.ceil(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map(t => {
        const y = py(t)
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
          </g>
        )
      })}
      {area && <path d={area} fill={`url(#${gid})`} />}
      {pts.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />)}
      {points.map((p, i) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="9.5" fill="#94a3b8">{p.month}</text>
      ))}
    </svg>
  )
}

// ─── Activity meta ────────────────────────────────────────────────────────────

const ACT: Record<string, { icon: React.ReactNode; dot: string; label: (a: Activity) => string }> = {
  followed:        { icon: <UserPlus className="h-3 w-3" />,       dot: 'bg-[#1B4965]',  label: () => 'started following you' },
  subscribed:      { icon: <Star className="h-3 w-3" />,           dot: 'bg-amber-500',  label: () => 'subscribed to you' },
  post_liked:      { icon: <Heart className="h-3 w-3" />,          dot: 'bg-rose-500',   label: (a) => `liked "${a.post_title ?? 'your post'}"` },
  post_commented:  { icon: <MessageCircle className="h-3 w-3" />,  dot: 'bg-[#4B97C9]', label: (a) => `commented on "${a.post_title ?? 'your post'}"` },
  post_reposted:   { icon: <Repeat2 className="h-3 w-3" />,        dot: 'bg-emerald-500',label: (a) => `reposted "${a.post_title ?? 'your post'}"` },
  comment_liked:   { icon: <Heart className="h-3 w-3" />,          dot: 'bg-rose-400',   label: () => 'liked your comment' },
  comment_replied: { icon: <MessageCircle className="h-3 w-3" />,  dot: 'bg-[#4B97C9]', label: () => 'replied to your comment' },
}

// ─── Status badge (whitespace-nowrap prevents wrapping) ───────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:  'bg-amber-50 text-amber-600 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  }
  const labels: Record<string, string> = { approved: 'Published', pending: 'Pending', rejected: 'Rejected' }
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${map[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Affiliate placeholder tab ────────────────────────────────────────────────

function AffiliateTab() {
  return (
    <div className="pt-4 pb-20">
      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4965] via-[#2d6688] to-[#4B97C9] p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Handshake className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white">Affiliate Program</h2>
        <p className="mt-2 text-blue-200">Earn rewards by referring readers and authors to Nefol.</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
          <Construction className="h-4 w-4" /> Coming Soon
        </div>
      </div>

      {/* Upcoming features */}
      <p className="mb-4 text-[13px] font-bold uppercase tracking-wider text-gray-400">What's coming</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { icon: <CircleDollarSign className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-50', title: 'Earn Commissions', desc: 'Get a share of every subscription made through your referral link.' },
          { icon: <Users className="h-5 w-5 text-[#4B97C9]" />,            bg: 'bg-[#edf4f9]',  title: 'Track Referrals',  desc: 'See exactly how many readers signed up through your link.' },
          { icon: <BarChart3 className="h-5 w-5 text-purple-600" />,       bg: 'bg-purple-50',   title: 'Performance Stats', desc: 'Clicks, conversions, and earnings — all in one place.' },
          { icon: <TrendingUp className="h-5 w-5 text-amber-600" />,       bg: 'bg-amber-50',    title: 'Tiered Rewards',   desc: 'Unlock higher commission rates as your referrals grow.' },
        ].map(({ icon, bg, title, desc }) => (
          <div key={title} className="flex items-start gap-4 rounded-2xl border border-[#e8eef4] bg-white p-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
            <div>
              <p className="font-semibold text-gray-800">{title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-[#d0e4f0] bg-[#f8fbfd] p-6 text-center">
        <p className="text-sm font-semibold text-[#1B4965]">Want early access?</p>
        <p className="mt-1 text-[13px] text-gray-500">Keep writing and growing your audience — we'll notify you when the affiliate program launches.</p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreatorDashboard() {
  const { isAuthenticated } = useAuth()
  const [data, setData]             = useState<DashboardData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<DashTab>('posts')
  const [sortKey, setSortKey]       = useState<SortKey>('likes_count')
  const [sortDir, setSortDir]       = useState<'desc' | 'asc'>('desc')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('likes')
  const [postFilter, setPostFilter]   = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [showAll, setShowAll]       = useState(false)
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    blogActivityAPI.getDashboard()
      .then(setData)
      .catch((e) => console.error('[Dashboard]', e))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const sortedPosts = useMemo(() => {
    if (!data) return []
    let list = [...data.posts]
    if (postFilter !== 'all') list = list.filter(p => p.status === postFilter)
    list.sort((a, b) => {
      if (sortKey === 'created_at')
        return sortDir === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDir === 'desc' ? (b[sortKey] as number) - (a[sortKey] as number) : (a[sortKey] as number) - (b[sortKey] as number)
    })
    return list
  }, [data, sortKey, sortDir, postFilter])

  const topPosts = useMemo(() =>
    data ? [...data.posts]
      .filter(p => p.status === 'approved')
      .sort((a, b) => (b.likes_count + b.comments_count + b.views_count) - (a.likes_count + a.comments_count + a.views_count))
      .slice(0, 5) : []
  , [data])

  // Always 6 months of padded chart data so it never looks like a flat line
  const chartPoints = useMemo(() => {
    if (!data) return []
    if (chartMetric === 'likes')
      return padMonths(data.monthlyLikes, d => (d as any).likes ?? 0, 6)
    if (chartMetric === 'posts')
      return padMonths(data.monthlyPosts, d => (d as any).post_count ?? 0, 6)
    return padMonths(data.monthlyFollowers, d => (d as any).new_followers ?? 0, 6)
  }, [data, chartMetric])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const copyLink = () => {
    if (!data?.author) return
    const id = data.author.username ?? data.author.id
    navigator.clipboard.writeText(`${window.location.origin}/#/user/author/${id}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#4B97C9] border-t-transparent" />
    </div>
  )

  if (!isAuthenticated) return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4f9]">
        <BarChart3 className="h-8 w-8 text-[#1B4965]" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800">Sign in to view your dashboard</p>
        <p className="mt-1 text-sm text-gray-500">Track posts, followers, and engagement in one place.</p>
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
      <a href="#/user/author/onboarding" className="rounded-full bg-[#1B4965] px-6 py-2.5 text-sm font-semibold text-white shadow-md">Get Started</a>
    </div>
  )

  const { stats, drafts, recentActivity } = data
  const approvedCount = data.posts.filter(p => p.status === 'approved').length
  const pendingCount  = data.posts.filter(p => p.status === 'pending').length
  const postsToShow   = showAll ? sortedPosts : sortedPosts.slice(0, 8)
  const chartColor    = chartMetric === 'likes' ? '#f43f5e' : chartMetric === 'posts' ? '#1B4965' : '#7c3aed'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6">

      {/* ── Page title + tabs ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-gray-400">Monitor your content performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink}
            className="flex items-center gap-1.5 rounded-full border border-[#d0e4f0] bg-white px-3 py-2 text-[12px] font-semibold text-gray-600 shadow-sm transition hover:border-[#4B97C9] hover:text-[#1B4965]">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Share Profile'}
          </button>
          <a href="#/user/blog/request"
            className="flex items-center gap-1.5 rounded-full bg-[#1B4965] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#163d57]">
            <PenLine className="h-3.5 w-3.5" /> New Post
          </a>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-8 flex gap-1 border-b border-gray-200">
        {([
          { key: 'posts',     icon: <LayoutDashboard className="h-4 w-4" />, label: 'Posts' },
          { key: 'affiliate', icon: <Handshake className="h-4 w-4" />,      label: 'Affiliate' },
        ] as { key: DashTab; icon: React.ReactNode; label: string }[]).map(({ key, icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === key
                ? 'border-[#1B4965] text-[#1B4965]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {icon}{label}
            {key === 'affiliate' && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">Soon</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ AFFILIATE TAB ══ */}
      {activeTab === 'affiliate' && <AffiliateTab />}

      {/* ══ POSTS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'posts' && (
        <div className="space-y-10">

          {/* ── Stats grid ─────────────────────────────────────────────────── */}
          <section>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Overview</p>
            {/* Row 1: big accent + Followers + Profile Views */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Likes — accent card spanning 2 cols */}
              <div className="col-span-2 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#1B4965] to-[#2a6f9e] p-5 shadow-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">Total Likes</p>
                  <p className="mt-1 text-5xl font-black text-white">{fmt(stats.likes)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] text-blue-300">
                    <Heart className="h-3.5 w-3.5" /> across all published posts
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <Heart className="h-7 w-7 text-rose-300" strokeWidth={1.5} />
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
                  <UserPlus className="h-4 w-4 text-purple-600" strokeWidth={1.75} />
                </div>
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Followers</p>
                  <p className="text-3xl font-black text-gray-900">{fmt(stats.followers)}</p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                  <Eye className="h-4 w-4 text-sky-500" strokeWidth={1.75} />
                </div>
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Profile Views</p>
                  <p className="text-3xl font-black text-gray-900">{fmt(stats.profileViews)}</p>
                </div>
              </div>
            </div>

            {/* Row 2: secondary stats */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Blog Reads',  value: stats.reads,    icon: <BookOpen className="h-4 w-4 text-emerald-600" />,     bg: 'bg-emerald-50'},
                { label: 'Total Views', value: stats.views,    icon: <Eye className="h-4 w-4 text-amber-500" />,            bg: 'bg-amber-50' },
                { label: 'Comments',    value: stats.comments, icon: <MessageCircle className="h-4 w-4 text-[#4B97C9]" />,  bg: 'bg-[#edf4f9]' },
                { label: 'Published',   value: approvedCount,  icon: <CheckCircle2 className="h-4 w-4 text-orange-500" />, bg: 'bg-orange-50',
                  sub: pendingCount > 0 ? `${pendingCount} pending` : undefined },
              ].map(({ label, value, icon, bg, sub }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-sm">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="text-xl font-black text-gray-900">{fmt(value)}</p>
                    {sub && <p className="text-[10px] text-amber-500">{sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Growth Chart ─────────────────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Growth</p>
                <h2 className="mt-0.5 text-lg font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#1B4965]" /> Overview
                  <span className="text-[12px] font-normal text-gray-400">— last 6 months</span>
                </h2>
              </div>
              <div className="flex gap-1 rounded-2xl border border-[#e8eef4] bg-white p-1 shadow-sm">
                {([
                  ['likes',     'Likes',     '#f43f5e'],
                  ['posts',     'Posts',     '#1B4965'],
                  ['followers', 'Followers', '#7c3aed'],
                ] as const).map(([key, label, color]) => (
                  <button key={key} onClick={() => setChartMetric(key)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      chartMetric === key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                    }`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-sm">
              <AreaChart points={chartPoints} color={chartColor} h={150} />
            </div>
          </section>

          {/* ── Top posts + Activity side-by-side ──────────────────────────── */}
          <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">

            {/* Top 5 posts */}
            <div className="lg:col-span-3">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Best Performing</p>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900">
                <Flame className="h-5 w-5 text-orange-500" /> Top Posts
              </h2>
              {topPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <FileText className="mb-2 h-10 w-10 text-gray-200" />
                  <p className="text-sm text-gray-400">No published posts yet</p>
                  <a href="#/user/blog/request" className="mt-3 text-[12px] font-semibold text-[#4B97C9] hover:underline">Write your first post →</a>
                </div>
              ) : (
                <div className="space-y-2">
                  {topPosts.map((post, i) => {
                    const img = resolveImg(post.cover_image)
                    const ranks = ['bg-amber-400 text-white','bg-slate-300 text-slate-700','bg-orange-300 text-white','bg-gray-100 text-gray-500','bg-gray-100 text-gray-500']
                    return (
                      <a key={post.id} href={`#/user/blog/${post.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-[#f0f4f7] bg-white px-4 py-3 shadow-sm transition hover:border-[#cce0f0] hover:shadow">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ranks[i]}`}>{i + 1}</span>
                        {img ? (
                          <img src={img} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-[#edf4f9]">
                            <BookOpen className="h-4 w-4 text-[#4B97C9]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">{post.title}</p>
                          <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{fmt(post.likes_count)}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-[#4B97C9]" />{fmt(post.comments_count)}</span>
                          <span className="hidden items-center gap-1 sm:flex"><Eye className="h-3 w-3 text-gray-300" />{fmt(post.views_count)}</span>
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div className="lg:col-span-2">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Latest</p>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <Bell className="h-5 w-5 text-[#4B97C9]" /> Activity
                </h2>
                <a href="#/user/blog/activity" className="flex items-center gap-0.5 text-[11px] font-semibold text-[#4B97C9] hover:text-[#1B4965]">
                  All <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Bell className="mb-2 h-10 w-10 text-gray-200" />
                  <p className="text-sm text-gray-400">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map(a => {
                    const meta = ACT[a.type]; if (!meta) return null
                    const src = resolveImg(a.actor_avatar)
                    return (
                      <div key={a.id} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${a.is_read ? 'bg-white border border-[#f0f4f7]' : 'bg-[#f0f7fd] border border-[#cce0f0]'}`}>
                        <div className="relative shrink-0">
                          {src ? (
                            <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce8f0] text-[10px] font-bold text-[#1B4965]">
                              {(a.actor_name || 'U').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white ${meta.dot}`}>
                            {meta.icon}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
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
            </div>
          </section>

          {/* ── Drafts ──────────────────────────────────────────────────────── */}
          {drafts.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Drafts</p>
                  <h2 className="mt-0.5 flex items-center gap-2 text-lg font-black text-gray-900">
                    <FileText className="h-5 w-5 text-gray-400" /> Saved Drafts
                  </h2>
                </div>
                <a href="#/user/blog/my-blogs" className="flex items-center gap-0.5 text-[11px] font-semibold text-[#4B97C9] hover:text-[#1B4965]">
                  View all <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {drafts.map(d => (
                  <a key={d.id} href="#/user/blog/request"
                    className="group flex items-center gap-3 rounded-xl border border-[#f0f4f7] bg-white px-4 py-3.5 shadow-sm transition hover:border-[#cce0f0] hover:shadow">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e8eef4] bg-gray-50 transition group-hover:border-[#4B97C9]/30 group-hover:bg-[#edf4f9]">
                      <Edit3 className="h-4 w-4 text-gray-400 transition group-hover:text-[#4B97C9]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-gray-700 group-hover:text-[#1B4965]">{d.title || 'Untitled'}</p>
                      <p className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" /> {timeAgo(d.updated_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">Draft</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── All Posts Table ──────────────────────────────────────────────── */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Performance</p>
                <h2 className="mt-0.5 flex items-center gap-2 text-lg font-black text-gray-900">
                  <BarChart3 className="h-5 w-5 text-[#1B4965]" /> All Posts
                  <span className="rounded-full bg-[#edf4f9] px-2.5 py-0.5 text-[11px] font-bold text-[#1B4965]">{sortedPosts.length}</span>
                </h2>
              </div>
              <div className="flex gap-1 rounded-2xl border border-[#e8eef4] bg-white p-1 shadow-sm">
                {(['all','approved','pending','rejected'] as const).map(f => (
                  <button key={f} onClick={() => setPostFilter(f)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold capitalize transition-all ${
                      postFilter === f ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                    }`}>{f}
                  </button>
                ))}
              </div>
            </div>

            {/* Column headers */}
            {sortedPosts.length > 0 && (
              <div className="mb-1 hidden grid-cols-[1fr_56px_56px_56px_56px_88px] items-center gap-2 px-4 sm:grid">
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

            {sortedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d0e4f0] py-16 text-center">
                <BookOpen className="mb-3 h-12 w-12 text-gray-200" />
                <p className="font-semibold text-gray-400">No posts found</p>
                <a href="#/user/blog/request" className="mt-3 rounded-full bg-[#1B4965] px-4 py-2 text-[12px] font-semibold text-white">Write your first post</a>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {postsToShow.map(post => {
                    const img = resolveImg(post.cover_image)
                    return (
                      <a key={post.id} href={`#/user/blog/${post.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-[#f0f4f7] bg-white px-4 py-3 shadow-sm transition hover:border-[#cce0f0] hover:shadow">
                        {img ? (
                          <img src={img} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#edf4f9] to-[#d0e4f0]">
                            <BookOpen className="h-4 w-4 text-[#4B97C9]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">{post.title}</p>
                            {post.featured && <Star className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" />}
                          </div>
                          <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
                        </div>
                        {/* Desktop stats */}
                        <div className="hidden shrink-0 items-center gap-4 text-[12px] text-gray-500 sm:flex">
                          <span className="flex w-12 items-center justify-end gap-1"><Eye className="h-3.5 w-3.5 text-gray-300" />{fmt(post.views_count)}</span>
                          <span className="flex w-12 items-center justify-end gap-1"><Heart className="h-3.5 w-3.5 text-rose-300" />{fmt(post.likes_count)}</span>
                          <span className="flex w-12 items-center justify-end gap-1"><MessageCircle className="h-3.5 w-3.5 text-[#9bc5e0]" />{fmt(post.comments_count)}</span>
                          <span className="flex w-12 items-center justify-end gap-1"><Repeat2 className="h-3.5 w-3.5 text-emerald-300" />{fmt(post.reposts_count)}</span>
                          <StatusBadge status={post.status} />
                        </div>
                        {/* Mobile compact */}
                        <div className="flex shrink-0 items-center gap-2 sm:hidden">
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Heart className="h-3 w-3 text-rose-300" />{fmt(post.likes_count)}</span>
                          <StatusBadge status={post.status} />
                        </div>
                      </a>
                    )
                  })}
                </div>
                {sortedPosts.length > 8 && (
                  <button onClick={() => setShowAll(s => !s)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-gray-400 transition hover:text-[#1B4965]">
                    {showAll ? <><ChevronUp className="h-4 w-4" /> Collapse</> : <><ChevronDown className="h-4 w-4" /> Show all {sortedPosts.length} posts</>}
                  </button>
                )}
              </>
            )}
          </section>

          {/* ── Quick actions ─────────────────────────────────────────────── */}
          <section>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                { href: '#/user/blog/request', icon: <PenLine className="h-5 w-5" />,  label: 'Write Post',    sub: 'Start a new draft',     dark: true },
                { href: '#/user/blog/explore', icon: <Compass className="h-5 w-5" />, label: 'Explore',       sub: 'Find new readers',      dark: false },
                { href: '#/user/blog/activity',icon: <Bell className="h-5 w-5" />,     label: 'Activity',      sub: 'Notifications',         dark: false },
                { href: '#/user/author/me',    icon: <Eye className="h-5 w-5" />,      label: 'View Profile',  sub: 'See your public page',  dark: false },
              ]).map(({ href, icon, label, sub, dark }) => (
                <a key={label} href={href}
                  className={`group flex flex-col gap-2 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    dark ? 'border-[#1B4965] bg-[#1B4965]' : 'border-[#e8eef4] bg-white hover:border-[#cce0f0]'
                  }`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? 'bg-white/20' : 'bg-[#edf4f9]'}`}>
                    <span className={dark ? 'text-white' : 'text-[#1B4965]'}>{icon}</span>
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[11px] ${dark ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
