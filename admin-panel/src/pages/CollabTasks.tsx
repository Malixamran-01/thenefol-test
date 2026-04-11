import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, RefreshCw, Search } from 'lucide-react'
import { getApiBaseUrl } from '../utils/apiUrl'
import { ReviewCollabTaskModal } from '../components/collab/CollabTaskModals'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'verified_ready', label: 'Verified / ready' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
] as const

function statusStyle(status: string): string {
  switch (status) {
    case 'paid':
    case 'verified_ready':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'submitted':
    case 'in_progress':
      return 'bg-sky-50 text-sky-800 border-sky-200'
    case 'assigned':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'needs_revision':
      return 'bg-amber-50 text-amber-900 border-amber-200'
    case 'cancelled':
    case 'rejected':
      return 'bg-red-50 text-red-800 border-red-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function fmtDate(v: unknown): string {
  if (v == null || v === '') return '—'
  try {
    const d = new Date(String(v))
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}

export default function CollabTasks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const collabFromUrl = searchParams.get('collab')

  const apiBase = getApiBaseUrl()
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update',
      'x-user-role': 'admin',
    } as Record<string, string>
  }, [])

  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') || 'all')
  const [q, setQ] = useState('')
  const [reviewTaskOpen, setReviewTaskOpen] = useState(false)
  const [reviewTaskId, setReviewTaskId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('status', statusFilter)
      params.set('limit', '500')
      if (collabFromUrl && /^\d+$/.test(collabFromUrl)) {
        params.set('collab_application_id', collabFromUrl)
      }
      const res = await fetch(`${apiBase}/admin/collab-tasks?${params.toString()}`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      setTasks(Array.isArray(data?.tasks) ? data.tasks : [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [apiBase, authHeaders, statusFilter, collabFromUrl])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const s = searchParams.get('status')
    if (s && STATUS_OPTIONS.some((o) => o.value === s)) setStatusFilter(s)
  }, [searchParams])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return tasks
    return tasks.filter((t) => {
      const title = String(t.title || '').toLowerCase()
      const cn = String(t.creator_name || '').toLowerCase()
      const ce = String(t.creator_email || '').toLowerCase()
      const id = String(t.id || '')
      return title.includes(needle) || cn.includes(needle) || ce.includes(needle) || id.includes(needle)
    })
  }, [tasks, q])

  const setCreatorFilter = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('collab', id)
    else next.delete('collab')
    setSearchParams(next)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-[#1B4965]" />
            Creator collab tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All assigned tasks across creators — assigned, in progress, completed, and paid. Open a row to review or verify.
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            <Link to="/admin/collab-requests" className="text-[#4B97C9] hover:underline inline-flex items-center gap-1">
              ← Collab requests
            </Link>
            {collabFromUrl ? (
              <button
                type="button"
                onClick={() => setCreatorFilter(null)}
                className="text-amber-700 hover:underline"
              >
                Clear creator filter
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {collabFromUrl && (
        <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-950">
          Showing tasks for application ID <span className="font-mono font-semibold">{collabFromUrl}</span> only.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value
              setStatusFilter(v)
              const next = new URLSearchParams(searchParams)
              if (v === 'all') next.delete('status')
              else next.set('status', v)
              setSearchParams(next)
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, creator name, email, task ID…"
            className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-400">
          {loading ? 'Loading…' : `${filtered.length} task${filtered.length !== 1 ? 's' : ''} shown`}
          {q.trim() && tasks.length !== filtered.length ? ` (filtered from ${tasks.length})` : null}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No tasks match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const id = Number(t.id)
                  const st = String(t.status || '')
                  return (
                    <tr key={String(t.id)} className="border-b border-gray-50 hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(t.id)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[240px]">
                        <span className="line-clamp-2">{String(t.title || '—')}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">{String(t.creator_name || '—')}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{String(t.creator_email || '')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${statusStyle(st)}`}>
                          {st.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(t.assigned_at)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(t.due_at)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(t.submitted_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewTaskId(Number.isFinite(id) ? id : null)
                            setReviewTaskOpen(true)
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B4965] text-white hover:bg-[#163a54]"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReviewCollabTaskModal
        open={reviewTaskOpen}
        taskId={reviewTaskId}
        onClose={() => {
          setReviewTaskOpen(false)
          setReviewTaskId(null)
        }}
        apiBase={apiBase}
        authHeaders={authHeaders}
        onUpdated={() => void load()}
      />
    </div>
  )
}
