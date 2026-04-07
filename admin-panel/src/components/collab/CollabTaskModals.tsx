import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Loader2, ClipboardList } from 'lucide-react'
import { buildTaskPlatformOptionsFromApplicant, type ApplicantPlatform } from '../../utils/collabApplicantPlatforms'

const TASK_TYPES: { key: string; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'reel', label: 'Reel' },
  { key: 'post', label: 'Post' },
  { key: 'blog', label: 'Blog' },
]

const POST_FORMATS: { key: string; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'video', label: 'Video' },
  { key: 'text', label: 'Text' },
  { key: 'image', label: 'Image' },
]

type AuthHeaders = Record<string, string>

export function AssignCollabTaskModal({
  open,
  onClose,
  collabApplicationId,
  applicantPlatforms,
  apiBase,
  authHeaders,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  collabApplicationId: number
  /** From collab application form — only these platforms are selectable */
  applicantPlatforms?: ApplicantPlatform[] | null
  apiBase: string
  authHeaders: AuthHeaders
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [template, setTemplate] = useState('review')
  const [productId, setProductId] = useState('')
  const [reimbursement, setReimbursement] = useState('')
  const [creatorFee, setCreatorFee] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [dueAt, setDueAt] = useState('')
  const [subredditHint, setSubredditHint] = useState('')
  const [hashtagHint, setHashtagHint] = useState('')
  const [xThreadHint, setXThreadHint] = useState('')
  const [disclosureRequired, setDisclosureRequired] = useState(true)
  const [requiredKeyword, setRequiredKeyword] = useState('#nefol')
  const [minWordCount, setMinWordCount] = useState('')
  const [postFormat, setPostFormat] = useState('any')
  const [minFollowers, setMinFollowers] = useState('')
  const [requireOrderId, setRequireOrderId] = useState(true)
  const [products, setProducts] = useState<{ id: number; title?: string }[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const platformOptions = useMemo(
    () => buildTaskPlatformOptionsFromApplicant(applicantPlatforms ?? null),
    [applicantPlatforms]
  )

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch(`${apiBase}/products`, { headers: authHeaders })
      const data = await res.json().catch(() => [])
      const list = Array.isArray(data) ? data : []
      setProducts(list.map((p: { id: number; title?: string }) => ({ id: p.id, title: p.title })))
    } catch {
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [apiBase, authHeaders])

  useEffect(() => {
    if (!open) return
    setErr('')
    loadProducts()
  }, [open, loadProducts])

  useEffect(() => {
    if (!open || platformOptions.length === 0) return
    setSelectedPlatforms((prev) => {
      if (prev.length > 0 && prev.every((k) => platformOptions.some((o) => o.key === k))) return prev
      if (platformOptions.length === 1) return [platformOptions[0].key]
      return []
    })
  }, [open, platformOptions])

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const setRewardPreset = (n: number) => {
    setCreatorFee(String(n))
  }

  const showRedditFields = selectedPlatforms.includes('reddit')
  const showInstaFields = selectedPlatforms.includes('instagram_reel')
  const showXFields = selectedPlatforms.includes('x')

  const submit = async () => {
    setErr('')
    if (!title.trim()) {
      setErr('Title is required')
      return
    }
    if (!platformOptions.length) {
      setErr('This creator has no platforms on their collab application.')
      return
    }
    if (!selectedPlatforms.length) {
      setErr('Select at least one platform')
      return
    }
    setSaving(true)
    try {
      const task_options: Record<string, unknown> = {
        disclosure_required: disclosureRequired,
        required_keyword: requiredKeyword.trim() || '#nefol',
        post_format: postFormat,
        require_order_id: requireOrderId,
      }
      if (subredditHint.trim() && showRedditFields) task_options.subreddit_hint = subredditHint.trim()
      if (hashtagHint.trim() && showInstaFields) task_options.hashtag_hint = hashtagHint.trim()
      if (xThreadHint.trim() && showXFields) task_options.x_placement_hint = xThreadHint.trim()
      const mwc = minWordCount.trim() ? Number(minWordCount) : NaN
      if (!Number.isNaN(mwc) && mwc > 0) task_options.min_word_count = mwc
      const mf = minFollowers.trim() ? Number(minFollowers) : NaN
      if (!Number.isNaN(mf) && mf > 0) task_options.min_followers = mf

      const body: Record<string, unknown> = {
        collab_application_id: collabApplicationId,
        title: title.trim(),
        instructions: instructions.trim(),
        platforms: selectedPlatforms,
        task_template_key: template,
        task_options,
        currency: currency.trim() || 'INR',
      }
      if (productId) body.product_id = Number(productId)
      if (reimbursement !== '') body.reimbursement_budget = Number(reimbursement)
      if (creatorFee !== '') body.creator_fee_amount = Number(creatorFee)
      if (dueAt) body.due_at = new Date(dueAt).toISOString()

      const res = await fetch(`${apiBase}/admin/collab-tasks`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.message || 'Failed to assign task')
        return
      }
      onCreated()
      onClose()
      setTitle('')
      setInstructions('')
      setSelectedPlatforms([])
      setTemplate('review')
      setProductId('')
      setReimbursement('')
      setCreatorFee('')
      setDueAt('')
      setSubredditHint('')
      setHashtagHint('')
      setXThreadHint('')
      setRequiredKeyword('#nefol')
      setMinWordCount('')
      setPostFormat('any')
      setMinFollowers('')
      setRequireOrderId(true)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#4B97C9]" />
            <h3 className="text-lg font-semibold text-gray-900">Assign creator task</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reddit review — Night cream"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Platforms (from creator application)
            </label>
            {!platformOptions.length ? (
              <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                No platforms found on this application. The creator must list platforms on their collab form first.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {platformOptions.map((p) => (
                  <button
                    key={`${p.key}-${p.label}`}
                    type="button"
                    onClick={() => togglePlatform(p.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedPlatforms.includes(p.key)
                        ? 'bg-[#1B4965] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Task type</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TASK_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product (optional)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              disabled={loadingProducts}
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} {p.title || 'Untitled'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reward (creator fee)</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {[500, 1000, 2500, 5000, 10000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRewardPreset(n)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-[#1B4965] hover:bg-[#f0f8fd]"
                >
                  ₹{n.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={creatorFee}
              onChange={(e) => setCreatorFee(e.target.value)}
              placeholder="Custom amount"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product budget cap</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={reimbursement}
                onChange={(e) => setReimbursement(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deadline (optional)</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-gray-100 bg-slate-50/80 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Requirements</p>
            <div>
              <label className="text-xs font-semibold text-gray-500">Must include keyword / hashtag</label>
              <input
                value={requiredKeyword}
                onChange={(e) => setRequiredKeyword(e.target.value)}
                placeholder="#nefol"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Min word count (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={minWordCount}
                  onChange={(e) => setMinWordCount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Post format</label>
                <select
                  value={postFormat}
                  onChange={(e) => setPostFormat(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {POST_FORMATS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Min followers on account (optional)</label>
              <input
                type="number"
                min={0}
                value={minFollowers}
                onChange={(e) => setMinFollowers(e.target.value)}
                placeholder="e.g. 5000"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={requireOrderId} onChange={(e) => setRequireOrderId(e.target.checked)} />
              Require Nefol order ID on submission
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={disclosureRequired} onChange={(e) => setDisclosureRequired(e.target.checked)} />
              Require disclosure (#ad / partnership)
            </label>
          </div>

          {showRedditFields && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subreddit / placement (Reddit)</label>
              <input
                value={subredditHint}
                onChange={(e) => setSubredditHint(e.target.value)}
                placeholder="e.g. r/SkincareAddiction"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}
          {showInstaFields && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hashtag / mention hint (Instagram)</label>
              <input
                value={hashtagHint}
                onChange={(e) => setHashtagHint(e.target.value)}
                placeholder="e.g. @nefol #nefol"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}
          {showXFields && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thread / placement hint (X)</label>
              <input
                value={xThreadHint}
                onChange={(e) => setXThreadHint(e.target.value)}
                placeholder="e.g. Quote-tweet launch post"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brief / instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Tone, talking points, PDP link, timeline…"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !platformOptions.length}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B4965] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Assign task
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReviewCollabTaskModal({
  open,
  taskId,
  onClose,
  apiBase,
  authHeaders,
  onUpdated,
}: {
  open: boolean
  taskId: number | null
  onClose: () => void
  apiBase: string
  authHeaders: AuthHeaders
  onUpdated: () => void
}) {
  const [task, setTask] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifiedOrder, setVerifiedOrder] = useState(false)
  const [verifiedPost, setVerifiedPost] = useState(false)
  const [internalNotes, setInternalNotes] = useState('')
  const [revisionMsg, setRevisionMsg] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('coins_adjustment')
  const [payNotes, setPayNotes] = useState('')
  const [creditCoins, setCreditCoins] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`${apiBase}/admin/collab-tasks/${taskId}`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.message || 'Failed to load')
        setTask(null)
        return
      }
      const t = data.task as Record<string, unknown>
      setTask(t)
      setVerifiedOrder(!!t.admin_verified_order)
      setVerifiedPost(!!t.admin_verified_post)
      setInternalNotes(typeof t.admin_internal_notes === 'string' ? t.admin_internal_notes : '')
      const fee = t.creator_fee_amount
      setPayAmount(fee != null && fee !== '' ? String(fee) : '')
    } finally {
      setLoading(false)
    }
  }, [apiBase, authHeaders, taskId])

  useEffect(() => {
    if (open && taskId) void load()
  }, [open, taskId, load])

  useEffect(() => {
    if (open) setRejectReason('')
  }, [open, taskId])

  const saveVerify = async () => {
    if (!taskId) return
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`${apiBase}/admin/collab-tasks/${taskId}/verify`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          verified_order: verifiedOrder,
          verified_post: verifiedPost,
          admin_internal_notes: internalNotes.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.message || 'Update failed')
        return
      }
      setTask(data.task as Record<string, unknown>)
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const sendRevision = async () => {
    if (!taskId || !revisionMsg.trim()) return
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`${apiBase}/admin/collab-tasks/${taskId}/revision`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ message: revisionMsg.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.message || 'Failed')
        return
      }
      onUpdated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const rejectSubmission = async () => {
    if (!taskId || !rejectReason.trim()) {
      setErr('Enter a rejection reason for the creator')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`${apiBase}/admin/collab-tasks/${taskId}/reject`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.message || 'Reject failed')
        return
      }
      onUpdated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    if (!taskId) return
    const amt = Number(payAmount)
    if (Number.isNaN(amt) || amt < 0) {
      setErr('Enter a valid payout amount')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`${apiBase}/admin/collab-tasks/${taskId}/pay`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          amount: amt,
          method: payMethod,
          notes: payNotes.trim() || null,
          credit_coins: creditCoins,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.message || 'Payout failed')
        return
      }
      onUpdated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!open || taskId == null) return null

  const st = String(task?.status || '')

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Review task</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#4B97C9]" />
            </div>
          )}
          {err && <p className="text-red-600">{err}</p>}
          {!loading && task && (
            <>
              <p className="font-semibold text-gray-900">{String(task.title)}</p>
              <p className="text-xs text-gray-500">
                Status: <span className="font-medium text-gray-800">{st}</span> · Creator: {String(task.creator_name || task.creator_email || '—')}
              </p>
              {task.instructions ? <p className="text-gray-600 whitespace-pre-wrap">{String(task.instructions)}</p> : null}
              {task.task_options && typeof task.task_options === 'object' && task.task_options !== null && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 text-xs text-gray-700 space-y-1">
                  <p className="font-bold text-gray-500 uppercase tracking-wide">Brief requirements</p>
                  {String((task.task_options as Record<string, unknown>).required_keyword || '') && (
                    <p>
                      Keyword:{' '}
                      <span className="font-medium">{String((task.task_options as Record<string, unknown>).required_keyword)}</span>
                    </p>
                  )}
                  {(task.task_options as Record<string, unknown>).min_word_count != null && (
                    <p>Min words: {String((task.task_options as Record<string, unknown>).min_word_count)}</p>
                  )}
                  {String((task.task_options as Record<string, unknown>).post_format ?? '') !== '' && (
                    <p>Format: {String((task.task_options as Record<string, unknown>).post_format)}</p>
                  )}
                  {(task.task_options as Record<string, unknown>).min_followers != null && (
                    <p>Min followers: {String((task.task_options as Record<string, unknown>).min_followers)}</p>
                  )}
                  {String((task.task_options as Record<string, unknown>).subreddit_hint ?? '') !== '' && (
                    <p>Subreddit: {String((task.task_options as Record<string, unknown>).subreddit_hint)}</p>
                  )}
                </div>
              )}
              {(() => {
                const ex = task.completion_extra
                if (!ex || typeof ex !== 'object' || ex === null) return null
                const av = (ex as Record<string, unknown>).auto_validation
                if (!av || typeof av !== 'object') return null
                const a = av as Record<string, unknown>
                const warns = Array.isArray(a.warnings) ? a.warnings : []
                return (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-3 text-xs space-y-1">
                    <p className="font-bold text-blue-900 uppercase tracking-wide">Auto-checks (submission)</p>
                    <p>Keyword: {a.keyword_ok ? '✓' : '✗'}</p>
                    <p>
                      Handle in URL:{' '}
                      {a.handle_in_url_ok === null ? '—' : a.handle_in_url_ok ? '✓' : '✗'}
                    </p>
                    {warns.length > 0 && (
                      <ul className="list-disc pl-4 text-amber-900">
                        {warns.map((w, i) => (
                          <li key={i}>{String(w)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })()}
              <div className="rounded-lg bg-gray-50 p-3 text-xs space-y-1">
                <p>
                  <span className="text-gray-500">Order ID:</span> {String(task.completion_order_id || '—')}
                </p>
                <p>
                  <span className="text-gray-500">Post URL:</span>{' '}
                  {task.completion_post_url ? (
                    <a href={String(task.completion_post_url)} target="_blank" rel="noreferrer" className="text-[#4B97C9] break-all">
                      {String(task.completion_post_url)}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
                <p>
                  <span className="text-gray-500">Handle:</span> {String(task.completion_platform_handle || '—')}
                </p>
                {task.completion_notes ? (
                  <p>
                    <span className="text-gray-500">Notes:</span> {String(task.completion_notes)}
                  </p>
                ) : null}
              </div>

              {['submitted', 'verified_ready'].includes(st) && st !== 'paid' && (
                <>
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold uppercase text-gray-500">Verification</p>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={verifiedOrder} onChange={(e) => setVerifiedOrder(e.target.checked)} />
                      Order ID checks out
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={verifiedPost} onChange={(e) => setVerifiedPost(e.target.checked)} />
                      Post matches creator / brief
                    </label>
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={2}
                      placeholder="Internal notes (optional)"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveVerify()}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save verification
                    </button>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold uppercase text-gray-500">Request changes</p>
                    <textarea
                      value={revisionMsg}
                      onChange={(e) => setRevisionMsg(e.target.value)}
                      rows={2}
                      placeholder="Message to creator"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void sendRevision()}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"
                    >
                      Send revision request
                    </button>
                  </div>

                  <div className="space-y-2 border-t border-red-100 pt-3">
                    <p className="text-xs font-bold uppercase text-red-700">Reject submission</p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Reason shown to creator (required)"
                      className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void rejectSubmission()}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Reject &amp; notify
                    </button>
                  </div>

                  {verifiedOrder && verifiedPost && st !== 'paid' && (
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-xs font-bold uppercase text-gray-500">Payout</p>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="coins_adjustment">Nefol coins (loyalty_points)</option>
                        <option value="external_transfer">Recorded — paid externally</option>
                        <option value="recorded_only">Recorded only (no money movement)</option>
                      </select>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={creditCoins} onChange={(e) => setCreditCoins(e.target.checked)} />
                        Credit Nefol coins when amount &gt; 0 (uses rounded amount)
                      </label>
                      <textarea
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        rows={2}
                        placeholder="Payout notes"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void pay()}
                        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Record payout &amp; notify creator
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
