import React, { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Edit, Trash2, RefreshCw, Sparkles } from 'lucide-react'
import apiService from '../services/api'

type TierStats = {
  discountPercent?: number
  /** When true, `discountPercent` is applied at checkout for customers in this segment */
  segmentDiscountEnabled?: boolean
  minLifetimeSpend?: number
  minOrders?: number
  tierPriority?: number
  totalRevenue?: number
  totalOrders?: number
  averageOrderValue?: number
}

type TierRow = {
  id: string
  name: string
  description: string
  customerCount: number
  isActive: boolean
  stats: TierStats
}

type CustomerRow = {
  id: string
  name: string
  email: string
  segment: string
  discount_percent: number
  totalOrders: number
  totalSpent: number
  lastOrderDate: string | null
}

const emptyForm = () => ({
  name: '',
  description: '',
  min_lifetime_spend: 0,
  min_orders: 0,
  discount_percent: 0,
  segment_discount_enabled: false,
  tier_priority: 0,
  is_active: true,
})

export default function CustomerSegmentation() {
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const loadTiers = useCallback(async () => {
    setError('')
    const data = await apiService.getCustomerSegmentAggregates().catch(() => [])
    const list = Array.isArray(data) ? data : []
    setTiers(list as TierRow[])
  }, [])

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true)
    try {
      const data = await apiService.getCustomerSegmentCustomers().catch(() => [])
      setCustomers(Array.isArray(data) ? (data as CustomerRow[]) : [])
    } catch {
      setCustomers([])
    } finally {
      setCustomersLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadTiers()
        if (!cancelled) await loadCustomers()
      } catch (e) {
        if (!cancelled) setError('Failed to load segmentation data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadTiers, loadCustomers])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEdit = (t: TierRow) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      description: t.description || '',
      min_lifetime_spend: t.stats?.minLifetimeSpend ?? 0,
      min_orders: t.stats?.minOrders ?? 0,
      discount_percent: t.stats?.discountPercent ?? 0,
      segment_discount_enabled: t.stats?.segmentDiscountEnabled ?? false,
      tier_priority: t.stats?.tierPriority ?? 0,
      is_active: t.isActive,
    })
    setShowForm(true)
  }

  const saveTier = async () => {
    if (!form.name.trim()) {
      alert('Name is required')
      return
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      criteria: {},
      min_lifetime_spend: Number(form.min_lifetime_spend) || 0,
      min_orders: Math.max(0, Math.floor(Number(form.min_orders) || 0)),
      discount_percent: Math.min(100, Math.max(0, Number(form.discount_percent) || 0)),
      segment_discount_enabled: Boolean(form.segment_discount_enabled),
      tier_priority: Math.floor(Number(form.tier_priority) || 0),
      is_active: form.is_active,
    }
    try {
      if (editingId) {
        await apiService.updateCustomerSegment(editingId, payload)
      } else {
        await apiService.createCustomerSegment(payload)
      }
      setShowForm(false)
      await loadTiers()
      await loadCustomers()
    } catch {
      alert('Failed to save tier')
    }
  }

  const deleteTier = async (id: string) => {
    if (!confirm('Delete this tier?')) return
    try {
      await apiService.deleteCustomerSegment(id)
      await loadTiers()
      await loadCustomers()
    } catch {
      alert('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-slate-600 dark:text-slate-400">
          <div className="h-10 w-10 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <p>Loading tiers…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Customer segments
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            Customers are placed into segments using <strong className="font-medium">lifetime spend</strong> and{' '}
            <strong className="font-medium">completed orders</strong> (highest matching priority wins). Checkout
            discounts are <strong className="font-medium">not</strong> applied automatically: turn on{' '}
            <strong className="font-medium">Offer checkout discount</strong> for a segment and set the percentage
            when you want that segment to receive it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              void loadTiers()
              void loadCustomers()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add segment
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      <section aria-labelledby="tiers-heading" className="space-y-4">
        <h2 id="tiers-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Segments & checkout offers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiers.length === 0 && (
            <p className="text-slate-600 dark:text-slate-400 text-sm col-span-full">
              No tiers yet. Add one or run DB seed for default VIP / Loyal / Returning / Welcome tiers.
            </p>
          )}
          {tiers.map((t) => (
            <article
              key={t.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4 sm:p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    {t.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.description}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    t.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.isActive ? 'Active' : 'Off'}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Min spend (₹)</dt>
                  <dd className="font-medium tabular-nums">{t.stats?.minLifetimeSpend ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Min orders</dt>
                  <dd className="font-medium tabular-nums">{t.stats?.minOrders ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Checkout discount</dt>
                  <dd className="font-medium tabular-nums">
                    {t.stats?.segmentDiscountEnabled ? `${t.stats?.discountPercent ?? 0}%` : 'Off'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Priority</dt>
                  <dd className="font-medium tabular-nums">{t.stats?.tierPriority ?? 0}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500 dark:text-slate-400">Customers in tier</dt>
                  <dd className="font-medium tabular-nums">{t.customerCount}</dd>
                </div>
              </dl>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteTier(t.id)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-red-200 text-red-700 dark:border-red-800 dark:text-red-300 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="customers-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="customers-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-500" />
            Customers (sample)
          </h2>
          {customersLoading && <span className="text-xs text-slate-500">Updating…</span>}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Up to 500 accounts by spend. Segment column shows the best matching rule. Discount column reflects checkout
          only if that segment has an enabled offer.
        </p>

        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Tier</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Orders</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Spent</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Offer %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{c.segment}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.totalOrders}</td>
                  <td className="px-4 py-3 text-right tabular-nums">₹{Number(c.totalSpent).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.discount_percent > 0 ? `${c.discount_percent}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden space-y-3">
          {customers.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900/50"
            >
              <div className="font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
              <div className="text-xs text-slate-500 break-all">{c.email}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Segment</span>
                  <div className="font-medium">{c.segment}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Offer %</span>
                  <div className="font-medium">{c.discount_percent > 0 ? `${c.discount_percent}%` : '—'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Orders</span>
                  <div className="font-medium tabular-nums">{c.totalOrders}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Spent</span>
                  <div className="font-medium tabular-nums">₹{Number(c.totalSpent).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div
            className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-xl rounded-t-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tier-form-title"
          >
            <div className="p-4 sm:p-6 space-y-4">
              <h3 id="tier-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingId ? 'Edit segment' : 'New segment'}
              </h3>
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-400">Name</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-400">Description</span>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Min lifetime spend (₹)</span>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                    value={form.min_lifetime_spend}
                    onChange={(e) => setForm((f) => ({ ...f, min_lifetime_spend: Number(e.target.value) }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Min orders</span>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                    value={form.min_orders}
                    onChange={(e) => setForm((f) => ({ ...f, min_orders: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-600 p-3 space-y-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Checkout offer (optional)</p>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.segment_discount_enabled}
                    onChange={(e) => setForm((f) => ({ ...f, segment_discount_enabled: e.target.checked }))}
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Apply the discount percentage below at checkout for customers in this segment
                  </span>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Discount % (subtotal)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                    value={form.discount_percent}
                    onChange={(e) => setForm((f) => ({ ...f, discount_percent: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-400">Match priority</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  value={form.tier_priority}
                  onChange={(e) => setForm((f) => ({ ...f, tier_priority: Number(e.target.value) }))}
                />
                <span className="text-xs text-slate-500">Higher number wins when a customer matches more than one segment</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span className="text-slate-700 dark:text-slate-300">Segment active (used for assignment)</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => void saveTier()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
