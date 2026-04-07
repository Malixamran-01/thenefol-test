import React, { useCallback, useEffect, useState } from 'react'
import { X, Loader2, ClipboardList } from 'lucide-react'

const PLATFORMS: { key: string; label: string }[] = [
  { key: 'instagram_reel', label: 'Instagram Reel' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'other', label: 'Other' },
]

const TASK_TEMPLATES: { key: string; label: string }[] = [
  { key: 'product_review', label: 'Product review' },
  { key: 'unboxing', label: 'Unboxing' },
  { key: 'brand_awareness', label: 'Brand awareness / mention' },
  { key: 'custom_story', label: 'Custom creative brief' },
  { key: 'other', label: 'Other' },
]

type AuthHeaders = Record<string, string>

export function AssignCollabTaskModal({
  open,
  onClose,
  collabApplicationId,
  apiBase,
  authHeaders,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  collabApplicationId: number
  apiBase: string
  authHeaders: AuthHeaders
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [template, setTemplate] = useState('product_review')
  const [productId, setProductId] = useState('')
  const [reimbursement, setReimbursement] = useState('')
  const [creatorFee, setCreatorFee] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [dueAt, setDueAt] = useState('')
  const [subredditHint, setSubredditHint] = useState('')
  const [disclosureRequired, setDisclosureRequired] = useState(true)
  const [products, setProducts] = useState<{ id: number; title?: string }[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

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

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const submit = async () => {
    setErr('')
    if (!title.trim()) {
      setErr('Title is required')
      return
    }
    if (!selectedPlatforms.length) {
      setErr('Select at least one platform')
      return
    }
    setSaving(true)
    try {
      const task_options: Record<string, unknown> = {}
      if (subredditHint.trim()) task_options.subreddit_hint = subredditHint.trim()
      task_options.disclosure_required = disclosureRequired

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
      setTemplate('product_review')
      setProductId('')
      setReimbursement('')
      setCreatorFee('')
      setDueAt('')
      setSubredditHint('')
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
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
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Platforms</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
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
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Task type</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TASK_TEMPLATES.map((t) => (
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
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Creator fee</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={creatorFee}
                onChange={(e) => setCreatorFee(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Due (optional)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subreddit / placement hint</label>
            <input
              value={subredditHint}
              onChange={(e) => setSubredditHint(e.target.value)}
              placeholder="e.g. r/SkincareAddiction"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={disclosureRequired} onChange={(e) => setDisclosureRequired(e.target.checked)} />
            Require disclosure (#ad / partnership)
          </label>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="What you need: tone, talking points, link to PDP, order timeline…"
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
            disabled={saving}
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
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
