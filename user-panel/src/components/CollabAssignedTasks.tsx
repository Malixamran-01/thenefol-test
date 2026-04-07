import React, { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ClipboardList, ExternalLink, Loader2 } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

interface TaskRow {
  id: number
  title: string
  status: string
  instructions?: string | null
  platforms?: unknown
  task_template_key?: string | null
  product_snapshot?: { title?: string; id?: number } | null
  reimbursement_budget?: number | null
  creator_fee_amount?: number | null
  currency?: string | null
  due_at?: string | null
  revision_message?: string | null
  completion_order_id?: string | null
  completion_post_url?: string | null
  completion_platform_handle?: string | null
  completion_notes?: string | null
  paid_at?: string | null
  paid_amount?: number | null
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram_reel: 'Instagram Reel',
  reddit: 'Reddit',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  other: 'Other',
}

function platformsLabel(raw: unknown): string {
  if (!Array.isArray(raw)) return ''
  return raw.map((p) => PLATFORM_LABEL[String(p)] || String(p)).filter(Boolean).join(', ')
}

export default function CollabAssignedTasks({
  enabled,
  authHeaders,
}: {
  enabled: boolean
  authHeaders: () => Record<string, string>
}) {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [handle, setHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`${getApiBase()}/api/collab/tasks`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTasks([])
        return
      }
      setTasks(Array.isArray(data.tasks) ? data.tasks : [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [authHeaders, enabled])

  useEffect(() => {
    void load()
  }, [load])

  const submitTask = async (id: number) => {
    setMsg(null)
    if (!orderId.trim() || !postUrl.trim()) {
      setMsg({ type: 'err', text: 'Order ID and post link are required.' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${getApiBase()}/api/collab/tasks/${id}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          completion_order_id: orderId.trim(),
          completion_post_url: postUrl.trim(),
          completion_platform_handle: handle.trim() || undefined,
          completion_notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: data?.message || 'Submit failed' })
        return
      }
      setMsg({ type: 'ok', text: 'Submitted — we will review and notify you.' })
      setOrderId('')
      setPostUrl('')
      setHandle('')
      setNotes('')
      setOpenId(null)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const markProgress = async (id: number) => {
    await fetch(`${getApiBase()}/api/collab/tasks/${id}/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mark_in_progress: true }),
    })
    await load()
  }

  if (!enabled) return null

  if (loading && tasks.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#4B97C9]" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e8f4fb] shadow-sm overflow-hidden">
      <div className="px-6 sm:px-8 py-5 border-b border-[#f0f7fb] flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[#e8f4fb]"
          style={{ background: '#f0f8fd' }}
        >
          <ClipboardList className="h-5 w-5 text-[#1B4965]" />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-gray-400 mb-1">Brand tasks</p>
          <h2 className="text-xl font-light tracking-[0.06em] text-[#1B4965]" style={{ fontFamily: 'var(--font-heading-family, inherit)' }}>
            Assigned by Nefol
          </h2>
          <p className="text-xs text-gray-500 font-light mt-1 max-w-xl">
            Complete the brief, then submit your order ID and live post link. After we verify, your payout is recorded and you get a notification.
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-3">
        {msg && (
          <p className={`text-sm rounded-xl px-3 py-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </p>
        )}
        {tasks.map((t) => {
          const expanded = openId === t.id
          const canAct = ['assigned', 'in_progress', 'needs_revision'].includes(t.status)
          return (
            <div key={t.id} className="rounded-2xl border border-gray-100 bg-[#fafdfd] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (!expanded) {
                    setOrderId('')
                    setPostUrl('')
                    setHandle('')
                    setNotes('')
                  }
                  setOpenId(expanded ? null : t.id)
                }}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-white/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {platformsLabel(t.platforms)}
                    {t.product_snapshot?.title ? ` · ${t.product_snapshot.title}` : ''}
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      t.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'submitted' || t.status === 'verified_ready'
                          ? 'bg-amber-100 text-amber-800'
                          : t.status === 'needs_revision'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {expanded ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
              </button>
              {expanded && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-100/80">
                  {t.instructions ? (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{t.instructions}</p>
                  ) : null}
                  {t.revision_message ? (
                    <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-900">
                      <span className="font-semibold">Revision requested: </span>
                      {t.revision_message}
                    </div>
                  ) : null}
                  {t.creator_fee_amount != null && (
                    <p className="text-xs text-gray-600">
                      Creator fee (reference):{' '}
                      <span className="font-semibold text-gray-900">
                        {t.creator_fee_amount} {t.currency || 'INR'}
                      </span>
                    </p>
                  )}
                  {t.paid_at && (
                    <p className="text-xs text-emerald-700 font-medium">
                      Paid {new Date(t.paid_at).toLocaleString()}
                      {t.paid_amount != null ? ` · ${t.paid_amount} ${t.currency || ''}` : ''}
                    </p>
                  )}
                  {canAct && (
                    <div className="space-y-2 pt-2">
                      {t.status === 'assigned' && (
                        <button
                          type="button"
                          onClick={() => void markProgress(t.id)}
                          className="text-xs font-semibold text-[#4B97C9] hover:underline"
                        >
                          Mark as in progress
                        </button>
                      )}
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Order ID</label>
                      <input
                        value={openId === t.id ? orderId : ''}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        placeholder="Your Nefol order ID"
                      />
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Post / reel URL</label>
                      <input
                        value={openId === t.id ? postUrl : ''}
                        onChange={(e) => setPostUrl(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        placeholder="https://…"
                      />
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Your handle on that platform</label>
                      <input
                        value={openId === t.id ? handle : ''}
                        onChange={(e) => setHandle(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        placeholder="@username"
                      />
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Notes (optional)</label>
                      <textarea
                        value={openId === t.id ? notes : ''}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none"
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void submitTask(t.id)}
                        className="w-full rounded-xl bg-[#1B4965] py-2.5 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Submit completion
                      </button>
                    </div>
                  )}
                  {['submitted', 'verified_ready'].includes(t.status) && t.completion_post_url && (
                    <a
                      href={t.completion_post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#4B97C9] font-medium"
                    >
                      <ExternalLink className="h-3 w-3" /> View submitted link
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
