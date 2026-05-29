import React, { useCallback, useEffect, useState } from 'react'
import {
  HelpCircle,
  MessageCircle,
  Package,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { communityAPI, type CommunityQuestion, type CommunityTopicType } from '../services/communityAPI'
import { encodeMediaUrl, getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { AuthorVerifiedBadge } from '../components/AuthorVerifiedBadge'

type FilterType = 'all' | CommunityTopicType

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

function productThumb(url?: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

export default function AskCommunityPage() {
  const { isAuthenticated } = useAuth()
  const [questions, setQuestions] = useState<CommunityQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<'active' | 'new'>('active')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await communityAPI.listQuestions({
        topic_type: filter === 'all' ? undefined : filter,
        sort,
        q: search || undefined,
        limit: 50,
      })
      setQuestions(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }, [filter, sort, search])

  useEffect(() => {
    load()
  }, [load])

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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#1B4965]">
            <HelpCircle className="h-7 w-7" strokeWidth={2.25} />
            <h1 className="text-2xl font-bold tracking-tight">Ask Community</h1>
          </div>
          <p className="text-sm text-gray-600">
            Ask about our products or brand. Threads are open — anyone signed in can reply. No approval queue.
          </p>
        </div>
        <button
          type="button"
          onClick={goAsk}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1B4965] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#153a52]"
        >
          <Plus className="h-4 w-4" />
          Ask question
        </button>
      </div>

      <form onSubmit={onSearchSubmit} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#4B97C9]"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-[#1B4965] hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'product', 'brand'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              filter === f
                ? 'bg-[#1B4965] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <span className="mx-1 text-gray-300">|</span>
        <button
          type="button"
          onClick={() => setSort('active')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            sort === 'active' ? 'bg-[#4B97C9]/15 text-[#1B4965]' : 'text-gray-600'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setSort('new')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            sort === 'new' ? 'bg-[#4B97C9]/15 text-[#1B4965]' : 'text-gray-600'
          }`}
        >
          Newest
        </button>
      </div>

      {loading && (
        <p className="py-12 text-center text-sm text-gray-500">Loading threads…</p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {!loading && !error && questions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">No questions yet</p>
          <p className="mt-1 text-sm text-gray-500">Be the first to start a thread.</p>
          <button
            type="button"
            onClick={goAsk}
            className="mt-4 text-sm font-semibold text-[#4B97C9] hover:underline"
          >
            Ask a question
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => openThread(q.id)}
              className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#4B97C9]/40 hover:shadow-md"
            >
              <div className="flex gap-3">
                {q.topic_type === 'product' && q.product_list_image && (
                  <img
                    src={productThumb(q.product_list_image)}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover bg-gray-100"
                  />
                )}
                {q.topic_type === 'brand' && (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#1B4965]/10 text-[#1B4965]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        q.topic_type === 'product'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-violet-50 text-violet-800'
                      }`}
                    >
                      {q.topic_type === 'product' ? (
                        <>
                          <Package className="h-3 w-3" /> Product
                        </>
                      ) : (
                        'Brand'
                      )}
                    </span>
                    {q.product_title && (
                      <span className="truncate text-xs text-gray-500">{q.product_title}</span>
                    )}
                  </div>
                  <h2 className="line-clamp-2 font-semibold text-gray-900">{q.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{q.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      {q.author_name}
                      {q.author_is_verified && <AuthorVerifiedBadge className="h-3.5 w-3.5" />}
                    </span>
                    <span>·</span>
                    <span>{formatRelativeTime(q.last_activity_at || q.created_at)}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#4B97C9]">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
