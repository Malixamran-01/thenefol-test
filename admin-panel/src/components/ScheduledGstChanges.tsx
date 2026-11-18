import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, X } from 'lucide-react'
import { useToast } from './ToastProvider'
import { formatIst } from '../../../common/src/istTime'

type Schedule = {
  id: number
  product_id: number
  product_title: string
  gst_rate: number
  previous_rate: number | null
  current_rate: string | null
  effective_at: string
  status: 'pending' | 'applied' | 'cancelled'
  created_by_name: string | null
  created_at: string
  applied_at: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
}

const pct = (v: number | string | null | undefined) => (v == null || v === '' ? '–' : `${Number(v)}%`)

/**
 * Pending GST changes scheduled from Bulk edit, with cancel. "History" also shows applied and
 * cancelled changes. A change whose time has come is already live and can no longer be cancelled.
 */
export default function ScheduledGstChanges({ apiBase, onClose, onChanged }: { apiBase: string; onClose: () => void; onChanged?: () => void }) {
  const { notify } = useToast()
  const [rows, setRows] = useState<Schedule[] | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setRows(null)
    try {
      const res = await fetch(`${apiBase}/admin/gst-schedules${showHistory ? '?status=all' : ''}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
      setRows(data.schedules || [])
      setSelected(new Set())
    } catch (err) {
      notify('error', (err as Error).message)
      setRows([])
    }
  }, [apiBase, showHistory, notify])

  useEffect(() => { void load() }, [load])

  const cancellable = useMemo(
    () => (rows || []).filter((r) => r.status === 'pending' && new Date(r.effective_at).getTime() > Date.now()),
    [rows]
  )

  const cancel = async (ids: number[]) => {
    if (!ids.length) return
    if (!window.confirm(`Cancel ${ids.length} scheduled GST change${ids.length === 1 ? '' : 's'}? The products keep their current rate.`)) return
    setBusy(true)
    try {
      const res = await fetch(`${apiBase}/admin/gst-schedules/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
      notify('success', `Cancelled ${data.cancelled} change${data.cancelled === 1 ? '' : 's'}${data.skipped ? ` (${data.skipped} already in effect)` : ''}`)
      onChanged?.()
      await load()
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allSelected = cancellable.length > 0 && cancellable.every((r) => selected.has(r.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white text-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Scheduled GST changes</h3>
            <p className="text-xs text-gray-500">Schedule new ones from Bulk edit → GST rate → “Schedule a change”. Times are IST.</p>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
          <label className="inline-flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />
            Show applied and cancelled
          </label>
          <button
            onClick={() => cancel([...selected])}
            disabled={busy || selected.size === 0}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Cancel selected ({selected.size})
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-5">
          {rows == null ? (
            <div className="flex items-center gap-2 py-10 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No {showHistory ? '' : 'pending '}GST changes.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-xs text-gray-500">
                <tr>
                  <th className="w-8 px-2 py-2 text-left">
                    <input
                      type="checkbox" aria-label="Select all" checked={allSelected} disabled={!cancellable.length}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(cancellable.map((r) => r.id)))}
                    />
                  </th>
                  <th className="px-2 py-2 text-left">Product</th>
                  <th className="px-2 py-2 text-left">GST</th>
                  <th className="px-2 py-2 text-left">Effective from</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">By</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const canCancel = cancellable.some((c) => c.id === r.id)
                  const from = r.status === 'pending' ? r.current_rate : r.previous_rate
                  return (
                    <tr key={r.id} className="border-t border-gray-100 align-top">
                      <td className="px-2 py-2">
                        <input type="checkbox" aria-label={`Select ${r.product_title}`} disabled={!canCancel} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                      </td>
                      <td className="max-w-[16rem] truncate px-2 py-2" title={r.product_title}>{r.product_title}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">{pct(from)}</span>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">{pct(r.gst_rate)}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">{formatIst(r.effective_at)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs">
                        {r.status === 'pending' && !canCancel ? (
                          <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">In effect</span>
                        ) : r.status === 'pending' ? (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">Pending</span>
                        ) : r.status === 'applied' ? (
                          <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">Applied</span>
                        ) : (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600" title={r.cancelled_at ? `Cancelled ${formatIst(r.cancelled_at)}` : undefined}>Cancelled</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500">{r.status === 'cancelled' ? r.cancelled_by_name || r.created_by_name || '–' : r.created_by_name || '–'}</td>
                      <td className="px-2 py-2 text-right">
                        {canCancel && (
                          <button onClick={() => cancel([r.id])} disabled={busy} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Cancel</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
