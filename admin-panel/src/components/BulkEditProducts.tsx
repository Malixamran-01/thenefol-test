import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Loader2, X } from 'lucide-react'
import { useToast } from './ToastProvider'
import ConcernPicker from './ConcernPicker'
import { PRODUCT_CARD_BADGES } from '../../../common/src/productBadges'

type MrpMode = '' | 'set' | 'increase' | 'decrease' | 'increase_percent' | 'decrease_percent'
type DiscountMode = '' | 'percent' | 'price' | 'remove'
type BadgeAction = '' | 'add' | 'remove'

type Snapshot = { mrp: number | null; websitePrice: number | null; discount: number; badges: string[]; category: string }
type Result = { id: number; title: string; ok: true; before: Snapshot; after: Snapshot } | { id: number; title: string; ok: false; reason: string }

const MRP_MODES: Array<{ value: MrpMode; label: string; unit?: '₹' | '%' }> = [
  { value: '', label: 'No change' },
  { value: 'set', label: 'Set MRP to', unit: '₹' },
  { value: 'increase', label: 'Increase MRP by', unit: '₹' },
  { value: 'decrease', label: 'Decrease MRP by', unit: '₹' },
  { value: 'increase_percent', label: 'Increase MRP by', unit: '%' },
  { value: 'decrease_percent', label: 'Decrease MRP by', unit: '%' },
]

const DISCOUNT_MODES: Array<{ value: DiscountMode; label: string; unit?: '₹' | '%' }> = [
  { value: '', label: 'No change' },
  { value: 'percent', label: 'Set discount to', unit: '%' },
  { value: 'price', label: 'Set selling price to', unit: '₹' },
  { value: 'remove', label: 'Remove discount (sell at MRP)' },
]

const rupees = (n: number | null) => (n == null ? '–' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
const badgeLabel = (id: string) => PRODUCT_CARD_BADGES.find((b) => b.id === id)?.label || id

export default function BulkEditProducts({
  productIds,
  apiBase,
  categories,
  onClose,
  onApplied,
}: {
  productIds: number[]
  apiBase: string
  categories: string[]
  onClose: () => void
  onApplied: () => void
}) {
  const { notify } = useToast()
  const [mrpMode, setMrpMode] = useState<MrpMode>('')
  const [mrpValue, setMrpValue] = useState('')
  const [discountMode, setDiscountMode] = useState<DiscountMode>('')
  const [discountValue, setDiscountValue] = useState('')
  const [badges, setBadges] = useState<Record<string, BadgeAction>>({})
  const [category, setCategory] = useState('')
  const [concernsAdd, setConcernsAdd] = useState<string[]>([])
  const [concernsRemove, setConcernsRemove] = useState<string[]>([])
  const [preview, setPreview] = useState<Result[] | null>(null)
  const [busy, setBusy] = useState<'' | 'preview' | 'apply'>('')

  const ops = useMemo(() => {
    const o: Record<string, unknown> = {}
    if (mrpMode) o.mrp = { mode: mrpMode, value: Number(mrpValue) }
    if (discountMode) o.discount = discountMode === 'remove' ? { mode: 'remove' } : { mode: discountMode, value: Number(discountValue) }
    const add = Object.keys(badges).filter((k) => badges[k] === 'add')
    const remove = Object.keys(badges).filter((k) => badges[k] === 'remove')
    if (add.length || remove.length) o.badges = { add, remove }
    if (category) o.category = category
    if (concernsAdd.length || concernsRemove.length) o.concerns = { add: concernsAdd, remove: concernsRemove }
    return o
  }, [mrpMode, mrpValue, discountMode, discountValue, badges, category, concernsAdd, concernsRemove])

  const hasChanges = Object.keys(ops).length > 0
  const missingValue = (mrpMode && !(Number(mrpValue) > 0)) || (discountMode && discountMode !== 'remove' && !(Number(discountValue) > 0))

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? 'preview' : 'apply')
    try {
      const res = await fetch(`${apiBase}/admin/products/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds, ops, dryRun }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
      if (dryRun) {
        setPreview(data.results)
      } else {
        const skipped = (data.results as Result[]).filter((r) => !r.ok).length
        notify('success', `Updated ${data.updated} product${data.updated === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}`)
        onApplied()
      }
    } catch (err) {
      notify('error', (err as Error).message)
    } finally {
      setBusy('')
    }
  }

  // Any edit invalidates an old preview
  const edit = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPreview(null) }

  const okCount = preview?.filter((r) => r.ok).length ?? 0
  const unitFor = (modes: Array<{ value: string; unit?: string }>, mode: string) => modes.find((m) => m.value === mode)?.unit

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white text-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Bulk edit {productIds.length} product{productIds.length === 1 ? '' : 's'}</h3>
            <p className="text-xs text-gray-500">Only the sections you change are applied. Preview before saving.</p>
          </div>
          <button onClick={onClose} disabled={!!busy} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Prices */}
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium">MRP</legend>
              <select value={mrpMode} onChange={(e) => edit(setMrpMode)(e.target.value as MrpMode)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                {MRP_MODES.map((m) => <option key={m.label + m.unit} value={m.value}>{m.label}{m.unit ? ` (${m.unit})` : ''}</option>)}
              </select>
              {mrpMode && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">{unitFor(MRP_MODES, mrpMode)}</span>
                  <input type="number" min="0" step="any" value={mrpValue} onChange={(e) => edit(setMrpValue)(e.target.value)} placeholder="699" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">Products keep their current discount %, so the selling price moves with the MRP.</p>
            </fieldset>

            <fieldset className="rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium">Discount</legend>
              <select value={discountMode} onChange={(e) => edit(setDiscountMode)(e.target.value as DiscountMode)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                {DISCOUNT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}{m.unit ? ` (${m.unit})` : ''}</option>)}
              </select>
              {discountMode && discountMode !== 'remove' && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">{unitFor(DISCOUNT_MODES, discountMode)}</span>
                  <input type="number" min="0" step="any" value={discountValue} onChange={(e) => edit(setDiscountValue)(e.target.value)} placeholder={discountMode === 'percent' ? '20' : '499'} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">Selling prices are rounded to the nearest rupee.</p>
            </fieldset>
          </div>

          {/* Badges */}
          <fieldset className="rounded-lg border border-gray-200 p-4">
            <legend className="px-1 text-sm font-medium">Product card badges</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRODUCT_CARD_BADGES.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-sm">{b.label}</span>
                  <div className="flex overflow-hidden rounded-md border border-gray-300 text-xs">
                    {(['', 'add', 'remove'] as BadgeAction[]).map((a) => (
                      <button
                        key={a || 'none'}
                        type="button"
                        onClick={() => edit(setBadges)({ ...badges, [b.id]: a })}
                        className={`px-2.5 py-1 ${(badges[b.id] || '') === a ? (a === 'remove' ? 'bg-red-600 text-white' : a === 'add' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white') : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                      >
                        {a === '' ? 'Keep' : a === 'add' ? 'Add' : 'Remove'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Category & concerns */}
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium">Category</legend>
              <select value={category} onChange={(e) => edit(setCategory)(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="">No change</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </fieldset>
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium">Shop by Concern</legend>
              <div>
                <div className="mb-1 text-xs text-gray-500">Add to</div>
                <ConcernPicker value={concernsAdd} onChange={edit(setConcernsAdd)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-gray-500">Remove from</div>
                <ConcernPicker value={concernsRemove} onChange={edit(setConcernsRemove)} />
              </div>
            </fieldset>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium">
                Preview: {okCount} will change{preview.length - okCount ? `, ${preview.length - okCount} skipped` : ''}
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">MRP</th>
                      <th className="px-3 py-2 text-left">Selling price</th>
                      <th className="px-3 py-2 text-left">Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100 align-top">
                        <td className="max-w-[14rem] truncate px-3 py-2" title={r.title}>{r.title}</td>
                        {r.ok ? (
                          <>
                            <td className="whitespace-nowrap px-3 py-2"><Change from={rupees(r.before.mrp)} to={rupees(r.after.mrp)} /></td>
                            <td className="whitespace-nowrap px-3 py-2">
                              <Change from={rupees(r.before.websitePrice)} to={rupees(r.after.websitePrice)} />
                              {r.after.discount > 0 && <span className="ml-1 text-xs text-green-700">{r.after.discount}% off</span>}
                            </td>
                            <td className="px-3 py-2 text-xs">{r.after.badges.length ? r.after.badges.map(badgeLabel).join(', ') : '–'}</td>
                          </>
                        ) : (
                          <td colSpan={3} className="px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Skipped: {r.reason}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} disabled={!!busy} className="btn-secondary disabled:opacity-50">Cancel</button>
          {!preview ? (
            <button onClick={() => run(true)} disabled={!hasChanges || !!missingValue || !!busy} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy === 'preview' && <Loader2 className="h-4 w-4 animate-spin" />} Preview changes
            </button>
          ) : (
            <button onClick={() => run(false)} disabled={okCount === 0 || !!busy} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy === 'apply' && <Loader2 className="h-4 w-4 animate-spin" />} Apply to {okCount} product{okCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Change({ from, to }: { from: string; to: string }) {
  if (from === to) return <span>{to}</span>
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-400 line-through">{from}</span>
      <ArrowRight className="h-3 w-3 text-gray-400" />
      <span className="font-medium">{to}</span>
    </span>
  )
}
