import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Loader2,
  PackageX,
  PlayCircle,
  ShoppingBag,
} from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { CREATOR_PROGRAM_BADGES_REFRESH } from '../contexts/CreatorProgramBadgeContext'

function notifyCreatorProgramBadgesRefresh() {
  try {
    window.dispatchEvent(new CustomEvent(CREATOR_PROGRAM_BADGES_REFRESH))
  } catch {
    /* ignore */
  }
}

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
  /** When the task lists multiple platforms, one URL per platform key */
  completion_post_urls?: Record<string, string> | null
  completion_platform_handle?: string | null
  completion_notes?: string | null
  completion_extra?: Record<string, unknown> | null
  paid_at?: string | null
  paid_amount?: number | null
  purchase_token?: string | null
  linked_order_id?: number | null
  collab_order_returned_at?: string | null
  external_retailer?: string | null
  external_order_ref?: string | null
  product_received_at?: string | null
  product_not_received_at?: string | null
  product_not_received_note?: string | null
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

function platformKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((p) => String(p)).filter(Boolean)
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

/** When task has no platform array (legacy), we store the single URL under this key in local state */
const LEGACY_POST_URL_KEY = '_legacy_post_url'

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
        <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] leading-snug text-amber-900">
          No tracked link for this SKU — buy on the shop, then add your Nefol order # below.
        </p>
      )
    }
    return (
      <div className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#4B97C9]" />
        Preparing link…
      </div>
    )
  }

  return (
    <a
      href={`#/user/product/${encodeURIComponent(slug)}?collabPurchase=${encodeURIComponent(String(task.purchase_token))}`}
      className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border-2 border-[#1B4965] bg-white px-4 text-xs font-semibold text-[#1B4965] shadow-sm transition hover:bg-[#f4f9fc]"
    >
      <ShoppingBag className="h-4 w-4 shrink-0" />
      Buy now (tracked)
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
  const [postUrls, setPostUrls] = useState<Record<string, string>>({})
  const [handle, setHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [caption, setCaption] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [purchaseSaving, setPurchaseSaving] = useState(false)
  const [notReceivedModalId, setNotReceivedModalId] = useState<number | null>(null)
  const [notReceivedNote, setNotReceivedNote] = useState('')
  const [notReceivedSaving, setNotReceivedSaving] = useState(false)
  const [purchaseRetailer, setPurchaseRetailer] = useState('')
  const [purchaseExtRef, setPurchaseExtRef] = useState('')
  const [purchaseNefolOrder, setPurchaseNefolOrder] = useState('')
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

  const openTask = useMemo(() => tasks.find((x) => x.id === openId) ?? null, [tasks, openId])

  useEffect(() => {
    if (!openTask) {
      setPostUrls({})
      return
    }
    const keys = platformKeys(openTask.platforms)
    const fromServer = openTask.completion_post_urls
    const parsed =
      fromServer && typeof fromServer === 'object' && !Array.isArray(fromServer)
        ? (fromServer as Record<string, unknown>)
        : {}
    const next: Record<string, string> = {}
    if (keys.length === 0) {
      next[LEGACY_POST_URL_KEY] = openTask.completion_post_url ? String(openTask.completion_post_url).trim() : ''
      setPostUrls(next)
      return
    }
    for (const k of keys) {
      const v = parsed[k]
      next[k] = typeof v === 'string' ? v : ''
    }
    if (keys.length === 1 && !next[keys[0]]?.trim() && openTask.completion_post_url) {
      next[keys[0]] = String(openTask.completion_post_url).trim()
    }
    setPostUrls(next)
  }, [
    openTask?.id,
    openTask?.completion_post_url,
    openTask?.completion_post_urls,
    openTask?.platforms,
  ])

  useEffect(() => {
    if (!openTask) return
    setPurchaseRetailer(openTask.external_retailer || '')
    setPurchaseExtRef(openTask.external_order_ref || '')
    setPurchaseNefolOrder(
      openTask.linked_order_id ? '' : openTask.completion_order_id ? String(openTask.completion_order_id) : ''
    )
  }, [
    openTask?.id,
    openTask?.external_retailer,
    openTask?.external_order_ref,
    openTask?.completion_order_id,
    openTask?.linked_order_id,
  ])

  const skipPurchaseGate = (t: TaskRow) => (t.task_options as { skip_product_purchase_gate?: boolean } | null)?.skip_product_purchase_gate === true

  const savePurchaseInfo = async (t: TaskRow) => {
    setMsg(null)
    setPurchaseSaving(true)
    try {
      const body: Record<string, unknown> = { save_purchase_info: true }
      const extRef = purchaseExtRef.trim()
      const retailer = purchaseRetailer.trim().toLowerCase()
      if (extRef) {
        if (!['amazon', 'flipkart', 'other'].includes(retailer)) {
          setMsg({ type: 'err', text: 'Choose Amazon, Flipkart, or Other for marketplace orders.' })
          return
        }
        body.external_retailer = retailer
        body.external_order_ref = extRef
      }
      const nefol = purchaseNefolOrder.trim()
      if (nefol && !t.linked_order_id) body.nefol_order_number = nefol
      if (!extRef && !nefol) {
        setMsg({ type: 'err', text: 'Enter a marketplace order ID or your Nefol order number, then save.' })
        return
      }
      const res = await fetch(`${getApiBase()}/api/collab/tasks/${t.id}/submit`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: data?.message || 'Could not save purchase details' })
        return
      }
      setMsg({ type: 'ok', text: 'Purchase details saved.' })
      await load()
      notifyCreatorProgramBadgesRefresh()
    } finally {
      setPurchaseSaving(false)
    }
  }

  const reportProductNotReceived = async (taskId: number) => {
    setMsg(null)
    setNotReceivedSaving(true)
    try {
      const res = await fetch(`${getApiBase()}/api/collab/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mark_product_not_received: true,
          product_not_received_note: notReceivedNote.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: data?.message || 'Could not send report' })
        return
      }
      setMsg({
        type: 'ok',
        text: 'Thanks — we’ve notified marketing. You won’t be able to start this task until the issue is resolved.',
      })
      setNotReceivedModalId(null)
      setNotReceivedNote('')
      await load()
      notifyCreatorProgramBadgesRefresh()
    } catch {
      setMsg({ type: 'err', text: 'Network error' })
    } finally {
      setNotReceivedSaving(false)
    }
  }

  const startTask = async (t: TaskRow) => {
    setMsg(null)
    try {
      const res = await fetch(`${getApiBase()}/api/collab/tasks/${t.id}/submit`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_in_progress: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: data?.message || 'Could not start task' })
        return
      }
      await load()
      notifyCreatorProgramBadgesRefresh()
    } catch {
      setMsg({ type: 'err', text: 'Network error' })
    }
  }

  const submitTask = async (t: TaskRow) => {
    setMsg(null)
    const opts = t.task_options || {}
    const requireOrder = opts.require_order_id !== false
    const pks = platformKeys(t.platforms)
    if (pks.length > 1) {
      for (const pk of pks) {
        if (!String(postUrls[pk] || '').trim()) {
          setMsg({
            type: 'err',
            text: `Post URL is required for ${PLATFORM_LABEL[pk] || pk}.`,
          })
          return
        }
      }
    } else if (pks.length === 1) {
      if (!String(postUrls[pks[0]] || '').trim()) {
        setMsg({ type: 'err', text: 'Content / post URL is required.' })
        return
      }
    } else {
      if (!String(postUrls[LEGACY_POST_URL_KEY] || '').trim()) {
        setMsg({ type: 'err', text: 'Content / post URL is required.' })
        return
      }
    }
    if (requireOrder && !orderId.trim()) {
      const hasNefolOnFile =
        !!(t.completion_order_id && String(t.completion_order_id).trim()) || t.linked_order_id != null
      const hasMarketplace = !!(
        t.external_retailer &&
        String(t.external_retailer).trim() &&
        t.external_order_ref &&
        String(t.external_order_ref).trim()
      )
      if (!hasNefolOnFile && !hasMarketplace) {
        setMsg({ type: 'err', text: 'Order ID is required for this task (or save a marketplace order above).' })
        return
      }
    }
    setSubmitting(true)
    try {
      const extra: Record<string, unknown> = {}
      if (caption.trim()) extra.caption = caption.trim()
      if (proofUrl.trim()) extra.proof_urls = [proofUrl.trim()]

      const payload: Record<string, unknown> = {
        completion_order_id: orderId.trim() || undefined,
        completion_platform_handle: handle.trim() || undefined,
        completion_notes: notes.trim() || undefined,
        completion_extra: Object.keys(extra).length ? extra : undefined,
      }
      if (pks.length > 1) {
        const m: Record<string, string> = {}
        for (const pk of pks) {
          m[pk] = String(postUrls[pk] || '').trim()
        }
        payload.completion_post_urls = m
      } else if (pks.length === 1) {
        const u = String(postUrls[pks[0]] || '').trim()
        payload.completion_post_url = u
        payload.completion_post_urls = { [pks[0]]: u }
      } else {
        payload.completion_post_url = String(postUrls[LEGACY_POST_URL_KEY] || '').trim()
      }

      const res = await fetch(`${getApiBase()}/api/collab/tasks/${t.id}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
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
      setPostUrls({})
      setHandle('')
      setNotes('')
      setCaption('')
      setProofUrl('')
      setOpenId(null)
      setSection('submitted')
      await load()
      notifyCreatorProgramBadgesRefresh()
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
    <>
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
          const canActForm =
            canAct && !(t.status === 'assigned' && t.product_not_received_at)
          const slug = t.product_snapshot?.slug
          const productHref = slug ? `#/user/product/${encodeURIComponent(slug)}` : null

          return (
            <div key={t.id} className="rounded-2xl border border-gray-100 bg-[#fafdfd] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (!expanded) {
                    setOrderId(t.completion_order_id ? String(t.completion_order_id) : '')
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

                  {t.product_not_received_at && t.status === 'assigned' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950">
                      <p className="font-semibold">Shipment issue reported · {new Date(t.product_not_received_at).toLocaleString()}</p>
                      {t.product_not_received_note ? (
                        <p className="mt-1 text-amber-900">{t.product_not_received_note}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-amber-900/90">Team notified — start stays locked until this is resolved.</p>
                      <a href="#/user/contact" className="mt-1.5 inline-block text-[11px] font-semibold text-[#1B4965] underline">
                        Contact support
                      </a>
                    </div>
                  )}

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

                  {canActForm && (
                    <div className="space-y-2 pt-2">
                      {t.product_id && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Get the product
                            </h4>
                          </div>
                          <div className="space-y-4 p-4">
                            {t.purchase_token ? (
                              <div>
                                <p className="mb-1.5 text-[11px] font-medium text-slate-600">Nefol checkout</p>
                                <BuyCollabProductCta task={t} panelOpen={expanded} />
                              </div>
                            ) : null}

                            {t.purchase_token ? (
                              <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  or
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                            ) : null}

                            <div>
                              <p className="mb-2 text-[11px] font-medium text-slate-600">
                                {t.purchase_token ? 'Bought elsewhere' : 'Purchase proof'}
                              </p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:items-stretch">
                                <select
                                  value={openId === t.id ? purchaseRetailer : ''}
                                  onChange={(e) => setPurchaseRetailer(e.target.value)}
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-sm focus:border-[#4B97C9] focus:outline-none focus:ring-1 focus:ring-[#4B97C9]"
                                >
                                  <option value="">Store</option>
                                  <option value="amazon">Amazon</option>
                                  <option value="flipkart">Flipkart</option>
                                  <option value="other">Other</option>
                                </select>
                                <input
                                  value={openId === t.id ? purchaseExtRef : ''}
                                  onChange={(e) => setPurchaseExtRef(e.target.value)}
                                  className="h-10 min-w-0 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-[#4B97C9] focus:outline-none focus:ring-1 focus:ring-[#4B97C9]"
                                  placeholder="Marketplace order ID"
                                />
                              </div>
                              {!t.linked_order_id && (
                                <div className="mt-3">
                                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Nefol order #
                                  </label>
                                  <input
                                    value={openId === t.id ? purchaseNefolOrder : ''}
                                    onChange={(e) => setPurchaseNefolOrder(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-[#4B97C9] focus:outline-none focus:ring-1 focus:ring-[#4B97C9]"
                                    placeholder="Order # if you didn’t use Buy now above"
                                  />
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={purchaseSaving || openId !== t.id}
                                onClick={() => void savePurchaseInfo(t)}
                                className="mt-3 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:opacity-50 sm:w-auto sm:px-5"
                              >
                                {purchaseSaving ? 'Saving…' : 'Save purchase details'}
                              </button>
                            </div>

                            {(t.external_retailer && t.external_order_ref) || (!t.linked_order_id && t.completion_order_id) ? (
                              <ul className="space-y-1 text-[11px] text-emerald-800">
                                {t.external_retailer && t.external_order_ref ? (
                                  <li>
                                    <span className="text-emerald-700/80">Saved · </span>
                                    <span className="font-mono">{t.external_retailer}</span> ·{' '}
                                    <span className="font-mono">{t.external_order_ref}</span>
                                  </li>
                                ) : null}
                                {!t.linked_order_id && t.completion_order_id ? (
                                  <li>
                                    <span className="text-emerald-700/80">Nefol · </span>
                                    <span className="font-mono font-medium">{t.completion_order_id}</span>
                                  </li>
                                ) : null}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      )}
                      {t.linked_order_id != null && t.completion_order_id && (
                        <p className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[11px] text-emerald-900">
                          <span className="font-semibold">Checkout linked</span> · Order{' '}
                          <span className="font-mono">{t.completion_order_id}</span>
                        </p>
                      )}
                      {t.product_received_at && ['in_progress', 'needs_revision'].includes(t.status) && (
                        <p className="text-[11px] text-slate-600">
                          Product in hand · {new Date(t.product_received_at).toLocaleString()}
                        </p>
                      )}
                      {t.status === 'assigned' && !t.product_not_received_at && (
                        <div className="space-y-2 pt-1">
                          <div
                            className={`grid gap-2 ${t.product_id && !skipPurchaseGate(t) ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
                          >
                            <button
                              type="button"
                              title="Confirms you can start — you’ll need order proof saved above when required."
                              onClick={() => void startTask(t)}
                              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1B4965] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#163a52]"
                            >
                              <PlayCircle className="h-4 w-4 shrink-0" />
                              {t.product_id && !skipPurchaseGate(t) ? 'Received product · Start' : 'Start task'}
                            </button>
                            {t.product_id && !skipPurchaseGate(t) ? (
                              <button
                                type="button"
                                title="Not delivered or wrong item — we’ll notify marketing."
                                onClick={() => {
                                  setNotReceivedModalId(t.id)
                                  setNotReceivedNote('')
                                }}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-amber-300/80 bg-amber-50 px-3 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100/90"
                              >
                                <PackageX className="h-4 w-4 shrink-0" />
                                Didn’t receive
                              </button>
                            ) : null}
                          </div>
                          {t.product_id && !skipPurchaseGate(t) ? (
                            <p className="text-center text-[10px] text-slate-500 sm:text-left">
                              Start needs a saved order or tracked Buy now · Not received? Use the right button.
                            </p>
                          ) : null}
                        </div>
                      )}
                      {platformKeys(t.platforms).length > 1 ? (
                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase text-gray-500">
                            Post URLs <span className="text-red-500">*</span>{' '}
                            <span className="font-normal normal-case text-gray-600">
                              (one per platform — {platformsLabel(t.platforms)})
                            </span>
                          </p>
                          {platformKeys(t.platforms).map((pk) => (
                            <div key={pk}>
                              <label className="block text-[11px] font-semibold text-gray-600">
                                {PLATFORM_LABEL[pk] || pk}{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                value={openId === t.id ? postUrls[pk] ?? '' : ''}
                                onChange={(e) =>
                                  setPostUrls((prev) => ({
                                    ...prev,
                                    [pk]: e.target.value,
                                  }))
                                }
                                className="mt-0.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                                placeholder="https://…"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                            Content / post URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={
                              openId === t.id
                                ? platformKeys(t.platforms).length === 1
                                  ? postUrls[platformKeys(t.platforms)[0]] ?? ''
                                  : postUrls[LEGACY_POST_URL_KEY] ?? ''
                                : ''
                            }
                            onChange={(e) => {
                              const pks = platformKeys(t.platforms)
                              if (pks.length === 1) {
                                setPostUrls((prev) => ({ ...prev, [pks[0]]: e.target.value }))
                              } else {
                                setPostUrls((prev) => ({ ...prev, [LEGACY_POST_URL_KEY]: e.target.value }))
                              }
                            }}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            placeholder="https://…"
                          />
                        </>
                      )}
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
                            Use <span className="font-semibold">Buy now</span> for tracked Nefol checkout, or save Amazon /
                            Flipkart details above.
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
                  {['submitted', 'verified_ready'].includes(t.status) &&
                    (() => {
                      const multi =
                        t.completion_post_urls &&
                        typeof t.completion_post_urls === 'object' &&
                        !Array.isArray(t.completion_post_urls) &&
                        Object.keys(t.completion_post_urls).length > 0
                      if (multi) {
                        return (
                          <div className="flex flex-col gap-1.5">
                            {Object.entries(t.completion_post_urls as Record<string, string>).map(([pk, url]) =>
                              url?.trim() ? (
                                <a
                                  key={pk}
                                  href={url.trim()}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-[#4B97C9] font-medium"
                                >
                                  <ExternalLink className="h-3 w-3" /> {PLATFORM_LABEL[pk] || pk}
                                </a>
                              ) : null
                            )}
                          </div>
                        )
                      }
                      if (t.completion_post_url?.trim()) {
                        return (
                          <a
                            href={t.completion_post_url.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#4B97C9] font-medium"
                          >
                            <ExternalLink className="h-3 w-3" /> View submitted link
                          </a>
                        )
                      }
                      return null
                    })()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>

    {notReceivedModalId != null && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="not-received-title"
      >
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
          <h3 id="not-received-title" className="text-base font-semibold text-gray-900">
            Report: didn’t receive the product
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            We’ll notify marketing. You won’t be able to start this task until the issue is resolved.
          </p>
          <label className="mt-4 block text-xs font-semibold uppercase text-gray-500">Details (optional)</label>
          <textarea
            value={notReceivedNote}
            onChange={(e) => setNotReceivedNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="e.g. parcel not delivered, wrong item, damaged…"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={notReceivedSaving}
              onClick={() => {
                setNotReceivedModalId(null)
                setNotReceivedNote('')
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={notReceivedSaving}
              onClick={() => void reportProductNotReceived(notReceivedModalId)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {notReceivedSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageX className="h-4 w-4" />}
              Send report
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
