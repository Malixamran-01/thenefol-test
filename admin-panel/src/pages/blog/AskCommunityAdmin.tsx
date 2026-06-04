import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Edit3,
  HelpCircle,
  Loader2,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Square,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommunityQuestion {
  id: number
  title: string
  body: string
  topic_type: string
  product_title?: string | null
  product_id?: number | null
  answer_count: number
  author_name: string
  author_avatar?: string | null
  created_at: string
  updated_at?: string
  last_activity_at?: string
}

interface CommunityAnswer {
  id: number
  content?: string
  body?: string
  is_verified: boolean
  is_deleted: boolean
  author_name: string
  author_avatar?: string | null
  depth: number
  score: number
  likes_count: number
  created_at: string
  updated_at?: string
  children?: CommunityAnswer[]
  replies?: CommunityAnswer[]
}

interface Stats {
  total_questions: number
  total_answers: number
  verified_answers: number
  questions_this_week: number
  answers_this_week: number
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  danger?: boolean
}

interface EditQuestionState {
  open: boolean
  id: number
  title: string
  body: string
}

interface EditAnswerState {
  open: boolean
  id: number
  content: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('role') || 'admin'
  const permissions = localStorage.getItem('permissions') || 'all'
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  h['x-user-role'] = role
  h['x-user-permissions'] = permissions
  return h
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtFull(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN')
}

function getAnswerContent(a: CommunityAnswer): string {
  return a.content ?? a.body ?? ''
}

function flattenAnswers(nodes: CommunityAnswer[]): CommunityAnswer[] {
  const result: CommunityAnswer[] = []
  const walk = (list: CommunityAnswer[]) => {
    for (const n of list) {
      result.push(n)
      const children = n.children ?? n.replies ?? []
      if (children.length) walk(children)
    }
  }
  walk(nodes)
  return result
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <span className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${state.danger ? 'bg-red-100' : 'bg-blue-100'}`}>
          <AlertTriangle className={`h-5 w-5 ${state.danger ? 'text-red-600' : 'text-blue-600'}`} />
        </div>
        <h3 className="mb-1 text-base font-semibold text-gray-900">{state.title}</h3>
        <p className="mb-5 text-sm text-gray-600">{state.message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose() }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white ${state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1B4965] hover:bg-[#163d55]'}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function EditQuestionModal({
  state,
  base,
  onClose,
  onSaved,
}: {
  state: EditQuestionState
  base: string
  onClose: () => void
  onSaved: (q: CommunityQuestion) => void
}) {
  const [title, setTitle] = useState(state.title)
  const [body, setBody] = useState(state.body)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setTitle(state.title); setBody(state.body); setErr('') }, [state.title, state.body])

  if (!state.open) return null

  const save = async () => {
    if (title.trim().length < 3) { setErr('Title must be at least 3 characters.'); return }
    if (body.trim().length < 5) { setErr('Body must be at least 5 characters.'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${base}/api/blog/community/questions/${state.id}/admin`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      onSaved(data.data ?? data)
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Edit Question</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9] focus:ring-1 focus:ring-[#4B97C9]"
        />
        <label className="mb-1 block text-xs font-medium text-gray-700">Body</label>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} rows={5}
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9] focus:ring-1 focus:ring-[#4B97C9] resize-none"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1B4965] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163d55] disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

function EditAnswerModal({
  state,
  base,
  onClose,
  onSaved,
}: {
  state: EditAnswerState
  base: string
  onClose: () => void
  onSaved: (updated: CommunityAnswer) => void
}) {
  const [content, setContent] = useState(state.content)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setContent(state.content); setErr('') }, [state.content])

  if (!state.open) return null

  const save = async () => {
    if (content.trim().length < 2) { setErr('Content is required.'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${base}/api/blog/community/answers/${state.id}/admin`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      onSaved(data.data ?? data)
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Edit Answer</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <label className="mb-1 block text-xs font-medium text-gray-700">Content</label>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} rows={6}
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9] focus:ring-1 focus:ring-[#4B97C9] resize-none"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1B4965] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163d55] disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AskCommunityAdmin() {
  const base = getApiBaseUrl()

  // Questions list state
  const [questions, setQuestions] = useState<CommunityQuestion[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState<'' | 'product' | 'brand'>('')
  const [sortQ, setSortQ] = useState<'active' | 'new'>('active')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Thread state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<CommunityAnswer[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set())

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)

  // Modals
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} })
  const [editQuestion, setEditQuestion] = useState<EditQuestionState>({ open: false, id: 0, title: '', body: '' })
  const [editAnswer, setEditAnswer] = useState<EditAnswerState>({ open: false, id: 0, content: '' })

  const searchRef = useRef<HTMLInputElement>(null)

  // ── Load stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${base}/api/blog/community/admin/stats`, { headers: authHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setStats(data.data ?? data)
    } catch { /* non-fatal */ }
  }, [base])

  // ── Load questions ──────────────────────────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setLoadingList(true); setListError(null)
    try {
      const params = new URLSearchParams({ limit: '200', sort: sortQ })
      if (topicFilter) params.set('topic_type', topicFilter)
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`${base}/api/blog/community/questions?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load')
      setQuestions(Array.isArray(data) ? data : (data.data ?? []))
    } catch (e) { setListError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoadingList(false) }
  }, [base, sortQ, topicFilter, search])

  // ── Load thread ─────────────────────────────────────────────────────────────
  const loadThread = useCallback(async (id: number) => {
    setLoadingThread(true); setThreadError(null)
    try {
      const res = await fetch(`${base}/api/blog/community/questions/${id}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load thread')
      setAnswers(data.answers ?? data.data?.answers ?? [])
    } catch (e) { setThreadError(e instanceof Error ? e.message : 'Failed to load thread') }
    finally { setLoadingThread(false) }
  }, [base])

  useEffect(() => { loadQuestions(); loadStats() }, [loadQuestions, loadStats])
  useEffect(() => { if (selectedId != null) { setExpandedAnswers(new Set()); loadThread(selectedId) } }, [selectedId, loadThread])

  // ── Search debounce ─────────────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadQuestions(), 400)
  }

  // ── Selection helpers ───────────────────────────────────────────────────────
  const toggleSelect = (id: number) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const allSelected = questions.length > 0 && selected.size === questions.length
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.id)))

  // ── Verify toggle ───────────────────────────────────────────────────────────
  const toggleVerify = async (answerId: number, currentlyVerified: boolean) => {
    setTogglingId(answerId)
    try {
      const res = await fetch(`${base}/api/blog/community/answers/${answerId}/verify`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ verified: !currentlyVerified }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update')
      if (selectedId != null) await loadThread(selectedId)
      loadStats()
    } catch (e) { alert(e instanceof Error ? e.message : 'Update failed') }
    finally { setTogglingId(null) }
  }

  // ── Admin delete question ───────────────────────────────────────────────────
  const deleteQuestion = (q: CommunityQuestion) => {
    setConfirm({
      open: true, danger: true,
      title: 'Delete Question',
      message: `Delete "${q.title}" and all its answers? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${base}/api/blog/community/questions/${q.id}/admin`, { method: 'DELETE', headers: authHeaders() })
          if (!res.ok) { const d = await res.json(); throw new Error(d?.error || 'Delete failed') }
          setQuestions((prev) => prev.filter((x) => x.id !== q.id))
          setSelected((prev) => { const next = new Set(prev); next.delete(q.id); return next })
          if (selectedId === q.id) { setSelectedId(null); setAnswers([]) }
          loadStats()
        } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed') }
      },
    })
  }

  // ── Bulk delete ─────────────────────────────────────────────────────────────
  const bulkDelete = () => {
    if (!selected.size) return
    setConfirm({
      open: true, danger: true,
      title: `Delete ${selected.size} Question${selected.size > 1 ? 's' : ''}`,
      message: `Delete ${selected.size} selected question${selected.size > 1 ? 's' : ''} and all their answers? This cannot be undone.`,
      onConfirm: async () => {
        setBulkDeleting(true)
        try {
          const res = await fetch(`${base}/api/blog/community/questions/bulk-delete`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify({ ids: [...selected] }),
          })
          if (!res.ok) { const d = await res.json(); throw new Error(d?.error || 'Bulk delete failed') }
          const ids = new Set(selected)
          setQuestions((prev) => prev.filter((q) => !ids.has(q.id)))
          if (selectedId != null && ids.has(selectedId)) { setSelectedId(null); setAnswers([]) }
          setSelected(new Set())
          loadStats()
        } catch (e) { alert(e instanceof Error ? e.message : 'Bulk delete failed') }
        finally { setBulkDeleting(false) }
      },
    })
  }

  // ── Admin delete answer ─────────────────────────────────────────────────────
  const deleteAnswer = (a: CommunityAnswer) => {
    setConfirm({
      open: true, danger: true,
      title: 'Delete Answer',
      message: `Remove this answer by ${a.author_name}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${base}/api/blog/community/answers/${a.id}/admin`, { method: 'DELETE', headers: authHeaders() })
          if (!res.ok) { const d = await res.json(); throw new Error(d?.error || 'Delete failed') }
          if (selectedId != null) await loadThread(selectedId)
          setQuestions((prev) => prev.map((q) => q.id === selectedId ? { ...q, answer_count: Math.max(0, q.answer_count - 1) } : q))
          loadStats()
        } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed') }
      },
    })
  }

  // ── Render answer node ──────────────────────────────────────────────────────
  const renderAnswer = (a: CommunityAnswer, depth = 0): React.ReactNode => {
    const content = getAnswerContent(a)
    const children = a.children ?? a.replies ?? []
    const isExpanded = expandedAnswers.has(a.id)

    return (
      <div key={a.id} className={depth > 0 ? 'ml-5 border-l-2 border-gray-100 pl-4 mt-2' : 'mt-3'}>
        <div className={`rounded-xl border p-3 ${a.is_deleted ? 'border-gray-100 bg-gray-50 opacity-60' : a.is_verified ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
          {/* Header */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B4965]/10 text-xs font-bold text-[#1B4965]">
                {(a.author_name || 'M')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{a.author_name}</p>
                <p className="text-[10px] text-gray-400">{fmtFull(a.created_at)}</p>
              </div>
              {a.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
              {a.is_deleted && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Deleted</span>
              )}
              {depth > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Reply</span>
              )}
            </div>
            {!a.is_deleted && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-400">Score: {a.score}</span>
                <button
                  type="button" disabled={togglingId === a.id}
                  onClick={() => toggleVerify(a.id, a.is_verified)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${a.is_verified ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                >
                  {togglingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                  {a.is_verified ? 'Unverify' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditAnswer({ open: true, id: a.id, content })}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteAnswer(a)}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            )}
          </div>
          {/* Content */}
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content || '—'}</p>
          {/* Collapse/expand replies */}
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => setExpandedAnswers((prev) => { const next = new Set(prev); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); return next })}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {children.length} {children.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
        {isExpanded && children.map((c) => renderAnswer(c, depth + 1))}
      </div>
    )
  }

  const selectedQuestion = questions.find((q) => q.id === selectedId)
  const allAnswersFlat = flattenAnswers(answers)
  const verifiedCount = allAnswersFlat.filter((a) => a.is_verified && !a.is_deleted).length
  const deletedCount = allAnswersFlat.filter((a) => a.is_deleted).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B4965]">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ask Community</h1>
            <p className="text-xs text-gray-500">Moderate questions & answers from Nefol Social</p>
          </div>
        </div>
        <button
          onClick={() => { loadQuestions(); loadStats(); if (selectedId) loadThread(selectedId) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Questions" value={stats.total_questions} icon={HelpCircle} color="bg-blue-50 text-blue-600" />
          <StatCard label="Total Answers" value={stats.total_answers} icon={MessageCircle} color="bg-purple-50 text-purple-600" />
          <StatCard label="Verified Answers" value={stats.verified_answers} icon={BadgeCheck} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Questions This Week" value={stats.questions_this_week} icon={TrendingUp} color="bg-orange-50 text-orange-600" />
          <StatCard label="Answers This Week" value={stats.answers_this_week} icon={MessageSquare} color="bg-pink-50 text-pink-600" />
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            ref={searchRef} value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-[#4B97C9] focus:ring-1 focus:ring-[#4B97C9]"
          />
          {search && (
            <button onClick={() => { setSearch(''); loadQuestions() }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={topicFilter} onChange={(e) => { setTopicFilter(e.target.value as '' | 'product' | 'brand'); setTimeout(loadQuestions, 0) }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
        >
          <option value="">All types</option>
          <option value="product">Product</option>
          <option value="brand">Brand</option>
        </select>
        <select
          value={sortQ} onChange={(e) => { setSortQ(e.target.value as 'active' | 'new'); setTimeout(loadQuestions, 0) }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
        >
          <option value="active">Most Active</option>
          <option value="new">Newest</option>
        </select>
        {selected.size > 0 && (
          <button
            onClick={bulkDelete} disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete {selected.size}
          </button>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">

        {/* ── Questions Panel ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Select all checkbox */}
              <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-700">
                {allSelected ? <CheckSquare className="h-4 w-4 text-[#1B4965]" /> : <Square className="h-4 w-4" />}
              </button>
              <span className="text-sm font-semibold text-gray-800">Questions</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{questions.length}</span>
            </div>
            {selected.size > 0 && <span className="text-xs text-gray-500">{selected.size} selected</span>}
          </div>

          {listError && (
            <p className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{listError}</p>
          )}

          {loadingList ? (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
            </div>
          ) : questions.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              <HelpCircle className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              No questions found.
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-[calc(100vh-320px)]">
              {questions.map((q) => (
                <li key={q.id} className={`group flex items-start gap-2 px-3 py-3 hover:bg-gray-50 transition-colors ${selectedId === q.id ? 'bg-blue-50 border-l-2 border-l-[#4B97C9]' : ''}`}>
                  <button
                    onClick={() => toggleSelect(q.id)}
                    className="mt-1 flex-shrink-0 text-gray-300 hover:text-gray-600"
                  >
                    {selected.has(q.id) ? <CheckSquare className="h-4 w-4 text-[#1B4965]" /> : <Square className="h-4 w-4" />}
                  </button>
                  <button
                    type="button" onClick={() => setSelectedId(q.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{q.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${q.topic_type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {q.topic_type}
                      </span>
                      {q.product_title && <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{q.product_title}</span>}
                      <span className="text-[10px] text-gray-400">{q.answer_count} ans</span>
                      <span className="text-[10px] text-gray-400">{fmt(q.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">by {q.author_name}</p>
                  </button>
                  <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditQuestion({ open: true, id: q.id, title: q.title, body: q.body }) }}
                      title="Edit question"
                      className="rounded-lg p-1 text-gray-400 hover:bg-blue-100 hover:text-blue-600"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button" onClick={(e) => { e.stopPropagation(); deleteQuestion(q) }}
                      title="Delete question"
                      className="rounded-lg p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Thread Panel ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
              <MessageCircle className="mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">Select a question to view its thread</p>
              <p className="mt-1 text-xs text-gray-400">You can verify, edit, or delete answers from here</p>
            </div>
          ) : (
            <>
              {/* Question header */}
              {selectedQuestion && (
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedQuestion.topic_type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {selectedQuestion.topic_type}
                        </span>
                        {selectedQuestion.product_title && <span className="text-xs text-gray-500">{selectedQuestion.product_title}</span>}
                      </div>
                      <h2 className="text-base font-bold text-gray-900 leading-snug">{selectedQuestion.title}</h2>
                      {selectedQuestion.body && (
                        <p className="mt-1.5 text-sm text-gray-600 line-clamp-3 leading-relaxed">{selectedQuestion.body}</p>
                      )}
                      <p className="mt-1.5 text-xs text-gray-400">by {selectedQuestion.author_name} · {fmt(selectedQuestion.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setEditQuestion({ open: true, id: selectedQuestion.id, title: selectedQuestion.title, body: selectedQuestion.body })}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteQuestion(selectedQuestion)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                  {/* Thread stats */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {allAnswersFlat.length} total posts</span>
                    <span className="flex items-center gap-1 text-emerald-600"><BadgeCheck className="h-3 w-3" /> {verifiedCount} verified</span>
                    {deletedCount > 0 && <span className="flex items-center gap-1 text-red-500"><Trash2 className="h-3 w-3" /> {deletedCount} removed</span>}
                    <button
                      onClick={() => setExpandedAnswers(allAnswersFlat.length > 0 ? new Set(allAnswersFlat.map((a) => a.id)) : new Set())}
                      className="ml-auto flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-gray-600 hover:bg-gray-200"
                    >
                      <ChevronDown className="h-3 w-3" /> Expand all
                    </button>
                  </div>
                </div>
              )}

              {/* Answers list */}
              <div className="flex-1 overflow-y-auto px-5 pb-6 max-h-[calc(100vh-340px)]">
                {threadError && (
                  <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{threadError}</p>
                )}
                {loadingThread ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading answers…
                  </div>
                ) : answers.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                    No answers yet on this question.
                  </div>
                ) : (
                  <div>
                    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-2 mb-1 flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-[#1B4965]" />
                      <span className="text-xs font-semibold text-[#1B4965]">Moderating {answers.length} top-level answer{answers.length !== 1 ? 's' : ''}</span>
                    </div>
                    {answers.map((a) => renderAnswer(a))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal state={confirm} onClose={() => setConfirm((s) => ({ ...s, open: false }))} />
      <EditQuestionModal
        state={editQuestion}
        base={base}
        onClose={() => setEditQuestion((s) => ({ ...s, open: false }))}
        onSaved={(updated) => setQuestions((prev) => prev.map((q) => q.id === updated.id ? { ...q, title: updated.title, body: updated.body } : q))}
      />
      <EditAnswerModal
        state={editAnswer}
        base={base}
        onClose={() => setEditAnswer((s) => ({ ...s, open: false }))}
        onSaved={() => { if (selectedId != null) loadThread(selectedId) }}
      />
    </div>
  )
}
