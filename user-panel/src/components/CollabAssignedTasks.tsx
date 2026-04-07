import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ClipboardList, ExternalLink, Loader2, PlayCircle, ShoppingBag } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

type TaskSection = 'active' | 'submitted' | 'completed' | 'rejected'

interface TaskRow {
  id: number
  title: string
  status: string
  instructions?: string | null
  platforms?: unknown
  task_template_key?: string | null
  task_options?: Record<string, unknown> | null
  product_id?: number | null
  product_snapshot?: { title?: string; id?: number; slug?: string | null } | null
  reimbursement_budget?: number | null
  creator_fee_amount?: number | null
  currency?: string | null
  due_at?: string | null
  revision_message?: string | null
  completion_order_id?: string | null
  completion_post_url?: string | null
  completion_platform_handle?: string | null
  completion_notes?: string | null
  completion_extra?: Record<string, unknown> | null
  paid_at?: string | null
  paid_amount?: number | null
  purchase_token?: string | null
  linked_order_id?: number | null
  collab_order_returned_at?: string | null
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram_reel: 'Instagram',
  reddit: 'Reddit',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  other: 'Other',
}

const TEMPLATE_LABEL: Record<string, string> = {
  review: 'Review',
  reel: 'Reel',
  post: 'Post',
  blog: 'Blog',
  product_review: 'Review',
  unboxing: 'Unboxing',
  brand_awareness: 'Brand mention',
  custom_story: 'Creative brief',
  other: 'Task',
}

function platformsLabel(raw: unknown): string {
  if (!Array.isArray(raw)) return ''
  return raw.map((p) => PLATFORM_LABEL[String(p)] || String(p)).filter(Boolean).join(', ')
}

function sectionForStatus(status: string): TaskSection {
  const s = String(status)
  if (['assigned', 'in_progress', 'needs_revision'].includes(s)) return 'active'
  if (['submitted', 'verified_ready'].includes(s)) return 'submitted'
  if (s === 'paid') return 'completed'
  return 'rejected'
}

const TABS: { key: TaskSection; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
]

function snapshotSlug(task: TaskRow): string | null {
  const s = task.product_snapshot
  if (!s || typeof s !== 'object') return null
  const raw = (s as { slug?: string | null }).slug
  const t = raw != null ? String(raw).trim() : ''
  return t || null
}

/** Buy link: snapshot slug, then public product API; shows loading / fallback if slug missing. */
function BuyCollabProductCta({ task, panelOpen }: { task: TaskRow; panelOpen: boolean }) {
  const initial = snapshotSlug(task)
  const [slug, setSlug] = useState<string | null>(initial)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    setSlug(snapshotSlug(task))
    setFetchFailed(false)
  }, [task.id, task.product_snapshot])

  useEffect(() => {
    if (!panelOpen || !task.product_id || !task.purchase_token) return
    if (slug) return
    let cancelled = false
    const t = setTimeout(() => {
      if (!cancelled) setFetchFailed(true)
    }, 10000)
    ;(async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/products/${task.product_id}`)
        if (!res.ok) return
        const data = (await res.json()) as { slug?: string; details?: { slug?: string } }
        const fromRoot = typeof data?.slug === 'string' ? data.slug.trim() : ''
        const d = data?.details
        const fromDetails = d && typeof d === 'object' && d.slug ? String(d.slug).trim() : ''
        const s = fromRoot || fromDetails
        if (!cancelled && s) {
          setSlug(s)
          setFetchFailed(false)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [panelOpen, task.product_id, task.purchase_token, slug, task.id])

  if (!task.product_id || !task.purchase_token) return null

  if (!slug) {
    if (fetchFailed) {
      return (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          We could not open a tracked buy link for this product (missing store URL). Use the shop to buy the same item,
          then paste your Nefol order number below.
        </p>
      )
    }
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Preparing your tracked buy link…
      </div>
    )
  }

  return (
    <a
      href={`#/user/product/${encodeURIComponent(slug)}?collabPurchase=${encodeURIComponent(String(task.purchase_token))}`}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1B4965] bg-white px-4 py-2.5 text-sm font-semibold text-[#1B4965] hover:bg-[#f4f9fc]"
    >
      <ShoppingBag className="h-4 w-4" />
      Buy product for this task (tracks order)
    </a>
  )
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
  const [section, setSection] = useState<TaskSection>('active')
  const [openId, setOpenId] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [handle, setHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [caption, setCaption] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null)

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

  const counts = useMemo(() => {
    const c = { active: 0, submitted: 0, completed: 0, rejected: 0 }
    for (const t of tasks) {
      c[sectionForStatus(t.status)]++
    }
    return c
  }, [tasks])

  const filtered = useMemo(() => tasks.filter((t) => sectionForStatus(t.status) === section), [tasks, section])

  const startTask = async (id: number) => {
    await fetch(`${getApiBase()}/api/collab/tasks/${id}/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mark_in_progress: true }),
    })
    await load()
  }

  const submitTask = async (t: TaskRow) => {
    setMsg(null)
    const opts = t.task_options || {}
    const requireOrder = opts.require_order_id !== false
    if (!postUrl.trim()) {
      setMsg({ type: 'err', text: 'Content / post URL is required.' })
      return
    }
    if (requireOrder && !orderId.trim()) {
      setMsg({ type: 'err', text: 'Order ID is required for this task.' })
      return
    }
    setSubmitting(true)
    try {
      const extra: Record<string, unknown> = {}
      if (caption.trim()) extra.caption = caption.trim()
      if (proofUrl.trim()) extra.proof_urls = [proofUrl.trim()]

      const res = await fetch(`${getApiBase()}/api/collab/tasks/${t.id}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          completion_order_id: orderId.trim() || undefined,
          completion_post_url: postUrl.trim(),
          completion_platform_handle: handle.trim() || undefined,
          completion_notes: notes.trim() || undefined,
          completion_extra: Object.keys(extra).length ? extra : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: data?.message || 'Submit failed' })
        return
      }
      const val = data.validation as { warnings?: string[] } | undefined
      const warns = val?.warnings?.length
        ? `Submitted. Note: ${val.warnings!.join(' ')}`
        : 'Submitted — we will review and notify you.'
      setMsg({ type: val?.warnings?.length ? 'warn' : 'ok', text: warns })
      setOrderId('')
      setPostUrl('')
      setHandle('')
      setNotes('')
      setCaption('')
      setProofUrl('')
      setOpenId(null)
      setSection('submitted')
      await load()
    } finally {
      setSubmitting(false)
    }
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
    return (
      <div className="rounded-3xl border border-dashed border-[#e8f4fb] bg-white/80 px-6 py-10 text-center text-sm text-gray-500">
        No brand tasks yet. When Nefol assigns you a campaign, it will show up here — separate from your reel milestones.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e8f4fb] shadow-sm overflow-hidden">
      <div className="px-6 sm:px-8 py-5 border-b border-[#f0f7fb] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[#e8f4fb]"
            style={{ background: '#f0f8fd' }}
          >
            <ClipboardList className="h-5 w-5 text-[#1B4965]" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-gray-400 mb-1">Work system</p>
            <h2 className="text-xl font-light tracking-[0.06em] text-[#1B4965]" style={{ fontFamily: 'var(--font-heading-family, inherit)' }}>
              Brand tasks
            </h2>
            <p className="text-xs text-gray-500 font-light mt-1 max-w-xl">
              Assigned jobs from Nefol — not the same as syncing reels for milestones. Submit proof here when done.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-4 flex flex-wrap gap-1 border-b border-gray-100 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSection(tab.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              section === tab.key ? 'bg-[#1B4965] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className="ml-1 opacity-80">({counts[tab.key]})</span>
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 space-y-3">
        {msg && (
          <p
            className={`text-sm rounded-xl px-3 py-2 ${
              msg.type === 'ok'
                ? 'bg-emerald-50 text-emerald-800'
                : msg.type === 'warn'
                  ? 'bg-amber-50 text-amber-900'
                  : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </p>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Nothing in this section.</p>
        )}

        {filtered.map((t) => {
          const expanded = openId === t.id
          const opts = t.task_options || {}
          const requireOrder = opts.require_order_id !== false
          const canAct = ['assigned', 'in_progress', 'needs_revision'].includes(t.status)
          const slug = t.product_snapshot?.slug
          const productHref = slug ? `#/user/product/${encodeURIComponent(slug)}` : null

          return (
            <div key={t.id} className="rounded-2xl border border-gray-100 bg-[#fafdfd] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (!expanded) {
                    setOrderId(t.completion_order_id ? String(t.completion_order_id) : '')
                    setPostUrl('')
                    setHandle('')
                    setNotes('')
                    setCaption('')
                    setProofUrl('')
                  }
                  setOpenId(expanded ? null : t.id)
                }}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-white/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {platformsLabel(t.platforms)}
                    {t.task_template_key ? ` · ${TEMPLATE_LABEL[String(t.task_template_key)] || t.task_template_key}` : ''}
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
                            : t.status === 'rejected' || t.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
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
                  {t.due_at && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-800">Deadline:</span> {new Date(t.due_at).toLocaleString()}
                    </p>
                  )}
                  {t.collab_order_returned_at && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                      The product linked to this task was <span className="font-semibold">returned or cancelled</span>. The
                      brand may hold reimbursement and creator fee until this is resolved.
                    </div>
                  )}
                  {t.creator_fee_amount != null && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-800">Reward:</span>{' '}
                      {t.creator_fee_amount} {t.currency || 'INR'}
                      {t.reimbursement_budget != null && Number(t.reimbursement_budget) > 0 ? (
                        <span className="text-gray-500">
                          {' '}
                          · Product value (cap): {t.reimbursement_budget} {t.currency || 'INR'}
                        </span>
                      ) : null}
                    </p>
                  )}
                  {t.reimbursement_budget != null &&
                    t.creator_fee_amount == null &&
                    Number(t.reimbursement_budget) > 0 && (
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-800">Product value:</span>{' '}
                        {t.reimbursement_budget} {t.currency || 'INR'}
                      </p>
                    )}
                  {productHref && (
                    <a
                      href={productHref}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#4B97C9] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Open product page
                    </a>
                  )}
                  {opts.required_keyword != null && String(opts.required_keyword).trim() !== '' && (
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Must include:</span> {String(opts.required_keyword)}
                    </p>
                  )}
                  {opts.min_word_count != null && (
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Min words:</span> {String(opts.min_word_count)}
                    </p>
                  )}
                  {String(opts.post_format ?? '') !== '' && String(opts.post_format) !== 'any' && (
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Format:</span> {String(opts.post_format)}
                    </p>
                  )}
                  {opts.min_followers != null && (
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Min followers:</span> {String(opts.min_followers)}
                    </p>
                  )}
                  {t.instructions ? (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed border-l-2 border-[#d6eaf8] pl-3">
                      {t.instructions}
                    </p>
                  ) : null}
                  {t.revision_message && t.status === 'needs_revision' ? (
                    <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-900">
                      <span className="font-semibold">Revision: </span>
                      {t.revision_message}
                    </div>
                  ) : null}
                  {t.status === 'rejected' && t.revision_message ? (
                    <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-900">
                      <span className="font-semibold">Reason: </span>
                      {t.revision_message}
                    </div>
                  ) : null}

                  {typeof t.completion_extra?.auto_validation === 'object' &&
                    t.completion_extra?.auto_validation != null && (
                    <div className="rounded-lg bg-blue-50/90 border border-blue-100 px-3 py-2 text-[11px] text-blue-950">
                      <span className="font-semibold">Auto-checks: </span>
                      Keyword{' '}
                      {(t.completion_extra.auto_validation as { keyword_ok?: boolean }).keyword_ok ? '✓' : '✗'} · Handle in
                      URL{' '}
                      {(t.completion_extra.auto_validation as { handle_in_url_ok?: boolean | null }).handle_in_url_ok === null
                        ? '—'
                        : (t.completion_extra.auto_validation as { handle_in_url_ok?: boolean }).handle_in_url_ok
                          ? '✓'
                          : '✗'}
                    </div>
                  )}

                  {t.paid_at && (
                    <p className="text-xs text-emerald-700 font-medium">
                      Paid {new Date(t.paid_at).toLocaleString()}
                      {t.paid_amount != null ? ` · ${t.paid_amount} ${t.currency || ''}` : ''}
                    </p>
                  )}

                  {canAct && (
                    <div className="space-y-2 pt-2">
                      <BuyCollabProductCta task={t} panelOpen={expanded} />
                      {t.linked_order_id != null && t.completion_order_id && (
                        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                          Nefol order <span className="font-mono font-semibold">{t.completion_order_id}</span> is linked to
                          this task. Checkout used your creator buy link.
                        </p>
                      )}
                      {t.status === 'assigned' && (
                        <button
                          type="button"
                          onClick={() => void startTask(t.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#1B4965] px-4 py-2 text-xs font-semibold text-white"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Start task
                        </button>
                      )}
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                        Content / post URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={openId === t.id ? postUrl : ''}
                        onChange={(e) => setPostUrl(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        placeholder="https://…"
                      />
                      {requireOrder && t.completion_order_id ? (
                        <p className="text-xs text-gray-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                          <span className="font-semibold text-gray-800">Nefol order ID (linked):</span>{' '}
                          <span className="font-mono">{t.completion_order_id}</span>
                        </p>
                      ) : null}
                      {requireOrder && !t.completion_order_id && (
                        <>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase">Order ID</label>
                          <input
                            value={openId === t.id ? orderId : ''}
                            onChange={(e) => setOrderId(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            placeholder="Your Nefol order ID"
                          />
                          <p className="text-[11px] text-gray-500">
                            Prefer the <span className="font-semibold">Buy product for this task</span> button so your order
                            links automatically (checkout email must match your Nefol account).
                          </p>
                        </>
                      )}
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Your handle on that platform</label>
                      <input
                        value={openId === t.id ? handle : ''}
                        onChange={(e) => setHandle(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        placeholder="@username"
                      />
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Caption / copy (optional)</label>
                      <textarea
                        value={openId === t.id ? caption : ''}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none"
                      />
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase">Proof image URL (optional)</label>
                      <input
                        value={openId === t.id ? proofUrl : ''}
                        onChange={(e) => setProofUrl(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                        placeholder="https://…"
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
                        onClick={() => void submitTask(t)}
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
