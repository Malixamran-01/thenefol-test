import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, HelpCircle, Loader2, MessageCircle } from 'lucide-react'
import { getApiBaseUrl } from '../../utils/apiUrl'

interface CommunityQuestion {
  id: number
  title: string
  body: string
  topic_type: string
  product_title?: string | null
  answer_count: number
  author_name: string
  created_at: string
}

interface CommunityAnswer {
  id: number
  body: string
  is_verified: boolean
  author_name: string
  created_at: string
  replies?: CommunityAnswer[]
}

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

export default function AskCommunityAdmin() {
  const [questions, setQuestions] = useState<CommunityQuestion[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<CommunityAnswer[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const base = getApiBaseUrl()

  const loadQuestions = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch(`${base}/api/blog/community/questions?limit=100&sort=active`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load questions')
      setQuestions(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoadingList(false)
    }
  }, [base])

  const loadThread = useCallback(
    async (id: number) => {
      setLoadingThread(true)
      setError(null)
      try {
        const res = await fetch(`${base}/api/blog/community/questions/${id}`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load thread')
        setAnswers(data.answers || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load thread')
      } finally {
        setLoadingThread(false)
      }
    },
    [base]
  )

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    if (selectedId != null) loadThread(selectedId)
  }, [selectedId, loadThread])

  const toggleVerify = async (answerId: number, currentlyVerified: boolean) => {
    setTogglingId(answerId)
    try {
      const res = await fetch(`${base}/api/blog/community/answers/${answerId}/verify`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ verified: !currentlyVerified }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update')
      if (selectedId != null) await loadThread(selectedId)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  const renderAnswer = (a: CommunityAnswer, depth = 0) => (
    <div key={a.id} className={depth > 0 ? 'ml-6 mt-2 border-l-2 border-gray-200 pl-4' : 'mt-3'}>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">{a.author_name}</span>
          <button
            type="button"
            disabled={togglingId === a.id}
            onClick={() => toggleVerify(a.id, a.is_verified)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              a.is_verified
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {togglingId === a.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <BadgeCheck className="h-3 w-3" />
            )}
            {a.is_verified ? 'Remove verified' : 'Mark verified'}
          </button>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.body}</p>
        <p className="mt-1 text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</p>
      </div>
      {(a.replies || []).map((r) => renderAnswer(r, depth + 1))}
    </div>
  )

  const selected = questions.find((q) => q.id === selectedId)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <HelpCircle className="h-8 w-8 text-[#4B97C9]" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ask Community</h1>
          <p className="text-sm text-gray-500">
            Q&amp;A threads from Nefol Social — mark helpful answers as verified (no approval queue for posts).
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3 font-medium text-gray-800">Questions</div>
          {loadingList ? (
            <p className="flex items-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : questions.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No questions yet.</p>
          ) : (
            <ul className="max-h-[32rem] overflow-y-auto divide-y">
              {questions.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(q.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                      selectedId === q.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900 line-clamp-1">{q.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {q.topic_type}
                      {q.product_title ? ` · ${q.product_title}` : ''} · {q.answer_count} answers
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm min-h-[16rem]">
          <div className="border-b px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Answers
          </div>
          {!selectedId && (
            <p className="p-6 text-sm text-gray-500">Select a question to review answers.</p>
          )}
          {selectedId && selected && (
            <div className="p-4 border-b bg-gray-50">
              <p className="font-semibold text-gray-900">{selected.title}</p>
              <p className="text-xs text-gray-500 mt-1">by {selected.author_name}</p>
            </div>
          )}
          {selectedId && loadingThread && (
            <p className="flex items-center gap-2 p-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading answers…
            </p>
          )}
          {selectedId && !loadingThread && answers.length === 0 && (
            <p className="p-6 text-sm text-gray-500">No answers on this thread yet.</p>
          )}
          {selectedId && !loadingThread && answers.length > 0 && (
            <div className="p-4 max-h-[28rem] overflow-y-auto">{answers.map((a) => renderAnswer(a))}</div>
          )}
        </div>
      </div>
    </div>
  )
}
