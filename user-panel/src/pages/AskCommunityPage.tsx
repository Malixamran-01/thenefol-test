import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  MessageCircle,
  Package,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Flame,
  X,
} from 'lucide-react'
import { communityAPI, type CommunityQuestion, type CommunityTopicType } from '../services/communityAPI'
import { productsAPI, type Product } from '../services/api'
import { encodeMediaUrl, getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { AuthorVerifiedBadge } from '../components/AuthorVerifiedBadge'

/* ─── helpers ────────────────────────────────────────────── */

type FilterType = 'all' | CommunityTopicType
type SortType = 'active' | 'new' | 'unanswered'

function thumb(url?: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
}

const AV_GRADS = [
  'from-[#4B97C9] to-[#1B4965]',
  'from-[#d97706] to-[#b45309]',
  'from-[#7c3aed] to-[#5b21b6]',
  'from-[#059669] to-[#047857]',
]
function avGrad(name: string) {
  let h = 0; for (const c of name) h = (h + c.charCodeAt(0)) % AV_GRADS.length; return AV_GRADS[h]
}

/* ─── skeleton ────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#e8eef4] bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-16 rounded-full bg-[#e8eef4]" />
        <div className="h-4 w-32 rounded bg-[#e8eef4]" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-[#e8eef4]" />
      <div className="mb-4 space-y-1.5">
        <div className="h-3.5 w-full rounded bg-[#e8eef4]" />
        <div className="h-3.5 w-5/6 rounded bg-[#e8eef4]" />
      </div>
      <div className="flex gap-3">
        <div className="h-4 w-20 rounded bg-[#e8eef4]" />
        <div className="h-4 w-16 rounded bg-[#e8eef4]" />
        <div className="h-4 w-24 rounded bg-[#e8eef4]" />
      </div>
    </div>
  )
}

/* ─── question card ───────────────────────────────────────── */

interface CardProps {
  q: CommunityQuestion
  onClick: () => void
}

function QuestionCard({ q, onClick }: CardProps) {
  const isHot = q.answer_count >= 5
  const isAnswered = q.answer_count > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-[#e8eef4] bg-white p-0 text-left shadow-[0_1px_4px_rgba(27,73,101,0.06)] transition-all duration-200 hover:border-[#4B97C9]/50 hover:shadow-[0_4px_16px_rgba(27,73,101,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B97C9]"
    >
      {/* Top accent line on hover */}
      <div className="h-[3px] w-0 rounded-t-2xl bg-gradient-to-r from-[#4B97C9] to-[#1B4965] transition-all duration-300 group-hover:w-full" />

      <div className="flex gap-4 p-5">
        {/* Left: answer-count column */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 pt-0.5">
          <div
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl text-center transition-colors ${
              isAnswered
                ? 'bg-[#1B4965] text-white'
                : 'border border-[#e8eef4] bg-[#f8fbfd] text-[#94a3b8]'
            }`}
          >
            <span className="text-[16px] font-bold leading-none">{q.answer_count}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-80">
              {q.answer_count === 1 ? 'ans' : 'ans'}
            </span>
          </div>
          {isAnswered && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
          )}
        </div>

        {/* Right: content */}
        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {q.topic_type === 'product' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                <Package className="h-2.5 w-2.5" />
                Product
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100">
                <Sparkles className="h-2.5 w-2.5" />
                Brand
              </span>
            )}
            {isHot && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-rose-100">
                <Flame className="h-2.5 w-2.5" />
                Hot
              </span>
            )}
            {q.product_title && (
              <span className="truncate text-[11px] font-medium text-[#4B97C9]">
                {q.product_title}
              </span>
            )}
          </div>

          {/* Title + thumbnail row */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1a1a1a] transition-colors group-hover:text-[#1B4965]">
                {q.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#64748b]">
                {q.body}
              </p>
            </div>

            {/* Product thumbnail */}
            {q.topic_type === 'product' && q.product_list_image && (
              <img
                src={thumb(q.product_list_image)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#e8eef4]"
              />
            )}
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#94a3b8]">
            {/* Author avatar + name */}
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white ${avGrad(q.author_name)}`}
              >
                {initials(q.author_name)}
              </span>
              <span className="font-medium text-[#1B4965]">{q.author_name}</span>
              {q.author_is_verified && (
                <AuthorVerifiedBadge className="h-3 w-3" />
              )}
            </span>

            <span className="text-[#e2e8f0]" aria-hidden>·</span>
            <time dateTime={q.last_activity_at || q.created_at}>
              {relTime(q.last_activity_at || q.created_at)}
            </time>

            <span className="text-[#e2e8f0]" aria-hidden>·</span>
            <span className="flex items-center gap-1 font-semibold text-[#4B97C9]">
              <MessageCircle className="h-3.5 w-3.5" />
              {q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: read thread CTA */}
      <div className="flex items-center justify-end border-t border-[#f0f6fa] px-5 py-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4B97C9]">
          Read thread <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

/* ─── sidebar ─────────────────────────────────────────────── */

interface SidebarProps {
  questions: CommunityQuestion[]
  products: Product[]
  selectedProduct: number | null
  onSelectProduct: (id: number | null) => void
  onAsk: () => void
}

function Sidebar({ questions, products, selectedProduct, onSelectProduct, onAsk }: SidebarProps) {
  const totalQ = questions.length
  const answeredQ = questions.filter(q => q.answer_count > 0).length
  const pct = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0

  // Top products by question count
  const topProducts = useMemo(() => {
    const map = new Map<number, { product: Product; count: number }>()
    for (const q of questions) {
      if (q.product_id && q.topic_type === 'product') {
        const pid = q.product_id
        if (!map.has(pid)) {
          const p = products.find(p => p.id === pid)
          if (p) map.set(pid, { product: p, count: 0 })
        }
        const entry = map.get(pid)
        if (entry) entry.count++
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  }, [questions, products])

  return (
    <aside className="flex flex-col gap-4">
      {/* Ask CTA */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4965] to-[#274F73] p-5 shadow-[0_4px_16px_rgba(27,73,101,0.2)]">
        <h3 className="mb-1 text-[15px] font-bold text-white">Got a question?</h3>
        <p className="mb-4 text-[12px] leading-relaxed text-[#a8cce0]">
          Ask the community — real answers from real users.
        </p>
        <button
          type="button"
          onClick={onAsk}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13px] font-bold text-[#1B4965] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Ask a question
        </button>
      </div>

      {/* Stats */}
      <div className="rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-[0_1px_4px_rgba(27,73,101,0.06)]">
        <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#1B4965]">
          <TrendingUp className="h-3.5 w-3.5 text-[#4B97C9]" />
          Community Stats
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#64748b]">Total questions</span>
            <span className="text-[14px] font-bold text-[#1B4965]">{totalQ}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#64748b]">Answered</span>
            <span className="text-[14px] font-bold text-emerald-600">{answeredQ}</span>
          </div>
          {/* Answered % bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-[#94a3b8]">
              <span>Answer rate</span>
              <span className="font-semibold text-[#1B4965]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8eef4]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4B97C9] to-[#1B4965] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#64748b]">Unanswered</span>
            <span className="text-[14px] font-bold text-[#94a3b8]">{totalQ - answeredQ}</span>
          </div>
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-[0_1px_4px_rgba(27,73,101,0.06)]">
          <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#1B4965]">
            <Package className="h-3.5 w-3.5 text-[#4B97C9]" />
            Popular Products
          </h3>
          <ul className="space-y-2">
            {topProducts.map(({ product, count }) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelectProduct(selectedProduct === product.id ? null : product.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    selectedProduct === product.id
                      ? 'bg-[#1B4965]/8 ring-1 ring-[#4B97C9]/30'
                      : 'hover:bg-[#f8fbfd]'
                  }`}
                >
                  {product.list_image ? (
                    <img
                      src={thumb(product.list_image)}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-[#e8eef4]"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f6fa]">
                      <Package className="h-4 w-4 text-[#94a3b8]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#1B4965]">{product.title}</p>
                    <p className="text-[11px] text-[#94a3b8]">{count} {count === 1 ? 'question' : 'questions'}</p>
                  </div>
                  {selectedProduct === product.id && (
                    <X className="h-3.5 w-3.5 shrink-0 text-[#4B97C9]" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guidelines */}
      <div className="rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-[0_1px_4px_rgba(27,73,101,0.06)]">
        <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#1B4965]">
          <Users className="h-3.5 w-3.5 text-[#4B97C9]" />
          Guidelines
        </h3>
        <ul className="space-y-2 text-[12px] leading-relaxed text-[#64748b]">
          {[
            'Be kind and respectful',
            'Share real experiences',
            'Stay on topic (skincare / hair care)',
            'No spam or promotions',
          ].map((g) => (
            <li key={g} className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4B97C9]" />
              {g}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

/* ─── main page ───────────────────────────────────────────── */

const SORT_OPTIONS: { id: SortType; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'new', label: 'Newest' },
  { id: 'unanswered', label: 'Unanswered' },
]

const PAGE_SIZE = 15

export default function AskCommunityPage() {
  const { isAuthenticated } = useAuth()
  const [allQuestions, setAllQuestions] = useState<CommunityQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('active')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Products for sidebar + filter chips
  const [products, setProducts] = useState<Product[]>([])

  // Load all products once
  useEffect(() => {
    productsAPI.getAll().then((list) => {
      if (Array.isArray(list)) setProducts(list)
    }).catch(() => {/* ignore */})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await communityAPI.listQuestions({
        topic_type: filter === 'all' ? undefined : filter,
        sort: sort === 'unanswered' ? 'active' : sort,
        q: search || undefined,
        limit: 200,
      })
      setAllQuestions(rows)
      setVisibleCount(PAGE_SIZE)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }, [filter, sort, search])

  useEffect(() => { load() }, [load])

  // Reset product filter when switching to brand
  useEffect(() => {
    if (filter !== 'product') setSelectedProduct(null)
  }, [filter])

  // Apply client-side filters
  const filtered = useMemo(() => {
    let list = allQuestions
    if (sort === 'unanswered') list = list.filter(q => q.answer_count === 0)
    if (selectedProduct != null) list = list.filter(q => q.product_id === selectedProduct)
    return list
  }, [allQuestions, sort, selectedProduct])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const goAsk = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', '#/user/blog/ask-community/new')
      window.location.hash = '#/user/login'
      return
    }
    window.location.hash = '#/user/blog/ask-community/new'
  }

  const openThread = (id: number) => {
    window.location.hash = `#/user/blog/ask-community/${id}`
  }

  // Products with questions (for filter chips row)
  const productChips = useMemo(() => {
    const ids = new Set(allQuestions.filter(q => q.topic_type === 'product').map(q => q.product_id).filter(Boolean))
    return products.filter(p => ids.has(p.id)).slice(0, 12)
  }, [allQuestions, products])

  return (
    <div className="min-h-full bg-[#F4F9F9]">
      {/* ── Hero header ─────────────────────────────────── */}
      <div className="border-b border-[#e8eef4] bg-white shadow-[0_1px_4px_rgba(27,73,101,0.05)]">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B4965]">
                  <HelpCircle className="h-5 w-5 text-white" strokeWidth={2.25} />
                </div>
                <h1 className="text-[24px] font-bold tracking-tight text-[#1a1a1a]">
                  Ask Community
                </h1>
              </div>
              <p className="ml-11 text-[13px] text-[#64748b]">
                Ask about our products or brand. Threads are open — anyone signed in can reply. No approval queue.
              </p>
            </div>
            <button
              type="button"
              onClick={goAsk}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1B4965] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#153a52] hover:shadow-md active:translate-y-0"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Ask question
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">

          {/* ── Main feed ──────────────────────────────────── */}
          <div className="min-w-0 flex-1">

            {/* Search */}
            <form onSubmit={onSearchSubmit} className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search questions…"
                  className="w-full rounded-xl border border-[#e8eef4] bg-white py-2.5 pl-10 pr-3 text-[14px] text-[#374151] shadow-sm outline-none transition-shadow focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/15"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); setSearch('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#374151]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="rounded-xl border border-[#e8eef4] bg-white px-4 text-[13px] font-semibold text-[#1B4965] shadow-sm hover:bg-[#f8fbfd]"
              >
                Search
              </button>
            </form>

            {/* Filter + sort bar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {/* Type filters */}
              {(['all', 'product', 'brand'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                    filter === f
                      ? 'bg-[#1B4965] text-white shadow-sm'
                      : 'bg-white border border-[#e8eef4] text-[#64748b] hover:border-[#4B97C9]/50 hover:text-[#1B4965]'
                  }`}
                >
                  {f === 'all' ? 'All topics' : f === 'product' ? '📦 Product' : '✨ Brand'}
                </button>
              ))}

              <div className="mx-1 h-4 w-px bg-[#e8eef4]" />

              {/* Sort */}
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSort(opt.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    sort === opt.id
                      ? 'bg-[#4B97C9]/15 text-[#1B4965]'
                      : 'text-[#64748b] hover:text-[#1B4965]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Product filter chips (only when filter=product and there are products) */}
            {filter === 'product' && productChips.length > 0 && (
              <div className="mb-4 overflow-x-auto pb-1">
                <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[12px] font-medium transition-colors ${
                      selectedProduct === null
                        ? 'bg-[#1B4965] text-white'
                        : 'border border-[#e8eef4] bg-white text-[#64748b] hover:border-[#4B97C9]/50 hover:text-[#1B4965]'
                    }`}
                  >
                    All products
                  </button>
                  {productChips.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(selectedProduct === p.id ? null : p.id)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${
                        selectedProduct === p.id
                          ? 'bg-[#1B4965] text-white'
                          : 'border border-[#e8eef4] bg-white text-[#64748b] hover:border-[#4B97C9]/50 hover:text-[#1B4965]'
                      }`}
                    >
                      {p.list_image && (
                        <img
                          src={thumb(p.list_image)}
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      )}
                      <span className="max-w-[140px] truncate">{p.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active search/product indicator */}
            {(search || selectedProduct) && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-[#64748b]">
                {search && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4B97C9]/10 px-3 py-1 font-medium text-[#1B4965]">
                    Results for "{search}"
                    <button type="button" onClick={() => { setSearch(''); setSearchInput('') }}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedProduct && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">
                    {products.find(p => p.id === selectedProduct)?.title || 'Product'}
                    <button type="button" onClick={() => setSelectedProduct(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <span className="text-[#94a3b8]">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Results count header */}
            {!loading && !error && filtered.length > 0 && !search && !selectedProduct && (
              <p className="mb-3 text-[12px] text-[#94a3b8]">
                {filtered.length} {filtered.length === 1 ? 'thread' : 'threads'}
              </p>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-[13px] text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={load}
                  className="mt-2 text-[12px] font-semibold text-red-700 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#d0e8f5] bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0f6fa]">
                  <MessageCircle className="h-7 w-7 text-[#4B97C9]" />
                </div>
                <p className="text-[15px] font-semibold text-[#1B4965]">
                  {sort === 'unanswered' ? 'All questions are answered!' : 'No questions yet'}
                </p>
                <p className="mt-1 text-[13px] text-[#94a3b8]">
                  {sort === 'unanswered'
                    ? 'Every thread has at least one reply.'
                    : 'Be the first to start a thread.'}
                </p>
                {sort !== 'unanswered' && (
                  <button
                    type="button"
                    onClick={goAsk}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#1B4965] px-5 py-2.5 text-[13px] font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Ask a question
                  </button>
                )}
              </div>
            )}

            {/* Question list */}
            {!loading && !error && visible.length > 0 && (
              <div className="space-y-3">
                {visible.map((q) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    onClick={() => openThread(q.id)}
                  />
                ))}

                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(n => n + PAGE_SIZE)}
                    className="w-full rounded-2xl border border-[#e8eef4] bg-white py-3.5 text-[13px] font-semibold text-[#1B4965] shadow-sm transition-colors hover:bg-[#f8fbfd]"
                  >
                    Load more ({filtered.length - visibleCount} remaining)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <div className="w-full shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-4">
              <Sidebar
                questions={allQuestions}
                products={products}
                selectedProduct={selectedProduct}
                onSelectProduct={(id) => {
                  setSelectedProduct(id)
                  if (id !== null) setFilter('product')
                }}
                onAsk={goAsk}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
