import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { useToast } from '../../components/ToastProvider'
import { getApiBaseUrl } from '../../utils/apiUrl'

type Summary = {
  range: { from: string; to: string }
  byPlatform: Array<{
    platform: string
    line_count: number
    units: string
    revenue: string
    tax_total: string
    shipping_total: string
  }>
  orderCounts: Array<{ platform: string; orders: number }>
  daily: Array<{ day: string; platform: string; revenue: string }>
  topProducts: Array<{ product_name: string; units: string; revenue: string }>
  /** Latest row per platform from sales_sync_logs (why Amazon/Flipkart may be ₹0). */
  syncStatus?: Array<{
    platform: string
    status: string | null
    message: string | null
    rows_synced: number
    at: string | null
  }>
  totals: {
    revenue: string
    tax: string
    shipping: string
    orders_estimate: number
    profit_ex_tax_and_shipping: number
  }
}

type CombinedRow = {
  id: number
  platform: string
  line_order_id: string
  product_name: string
  quantity: number
  price: number
  tax: number
  shipping: number
  total: number
  city: string | null
  order_date: string
  currency: string
  order_status?: string | null
  business_type?: string | null
  shipping_state?: string | null
  quantity_shipped?: number | null
  line_note?: string | null
  buyer_gstin?: string | null
  seller_sku?: string | null
  asin?: string | null
  igst?: string | number | null
  cgst?: string | number | null
  sgst?: string | number | null
  utgst?: string | number | null
  cess?: string | number | null
  tax_rate_pct?: string | number | null
  taxable_value?: string | number | null
}

type SyncLog = {
  id: number
  platform: string
  status: string
  message: string | null
  rows_synced: number
  started_at: string
  finished_at: string | null
}

const PLATFORM_COLORS: Record<string, string> = {
  website: '#2563eb',
  amazon: '#f97316',
  flipkart: '#eab308',
}

/** Safe display for sync log messages (legacy rows may contain HTML). */
function formatSyncMessage(m: string | null | undefined): string {
  if (!m) return ''
  return m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function UnifiedSalesDashboard() {
  const { notify } = useToast()
  const apiBase = getApiBaseUrl()
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<CombinedRow[]>([])
  const [total, setTotal] = useState(0)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [gstMonth, setGstMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [gstData, setGstData] = useState<any>(null)

  /** Fresh headers each call — avoids stale token and ensures RBAC headers are always sent. */
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update',
      'x-user-role': 'admin',
    }
  }

  const parseJson = async (res: Response) => {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`)
    return data
  }

  const loadSummary = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('from', new Date(from + 'T00:00:00').toISOString())
    params.set('to', new Date(to + 'T23:59:59').toISOString())
    const res = await fetch(`${apiBase}/sales/summary?${params}`, { headers: getAuthHeaders() })
    const data = await parseJson(res)
    setSummary(data as Summary)
  }, [apiBase, from, to])

  const loadCombined = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('from', new Date(from + 'T00:00:00').toISOString())
    params.set('to', new Date(to + 'T23:59:59').toISOString())
    params.set('limit', '200')
    if (platformFilter) params.set('platform', platformFilter)
    if (search.trim()) params.set('q', search.trim())
    const res = await fetch(`${apiBase}/sales/combined?${params}`, { headers: getAuthHeaders() })
    const data = await parseJson(res)
    setRows((data as any).rows || [])
    setTotal((data as any).total ?? 0)
  }, [apiBase, from, to, platformFilter, search])

  const loadLogs = useCallback(async () => {
    const res = await fetch(`${apiBase}/sales/sync/logs?limit=30`, { headers: getAuthHeaders() })
    const data = await parseJson(res)
    setLogs(Array.isArray(data) ? data : [])
  }, [apiBase])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadSummary(), loadCombined(), loadLogs()])
    } catch (e: any) {
      notify('error', e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [loadSummary, loadCombined, loadLogs, notify])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const chartData = useMemo(() => {
    if (!summary?.daily?.length) return []
    const map = new Map<string, { date: string; website: number; amazon: number; flipkart: number }>()
    for (const d of summary.daily) {
      const key = new Date(d.day).toISOString().slice(0, 10)
      if (!map.has(key)) {
        map.set(key, { date: key, website: 0, amazon: 0, flipkart: 0 })
      }
      const row = map.get(key)!
      const p = (d.platform || '') as keyof typeof row
      if (p === 'website' || p === 'amazon' || p === 'flipkart') {
        row[p] = Number(d.revenue)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [summary])

  const platformSplit = useMemo(() => {
    if (!summary?.byPlatform?.length) return []
    return summary.byPlatform.map((p) => ({
      name: p.platform,
      revenue: Number(p.revenue),
      fill: PLATFORM_COLORS[p.platform] || '#94a3b8',
    }))
  }, [summary])

  const manualSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${apiBase}/sales/sync/manual`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ platforms: ['website', 'amazon', 'flipkart'] }),
      })
      const data = await parseJson(res)
      const r = (data as any)?.result
      const amzErr = r?.amazon?.error
      const fkErr = r?.flipkart?.error
      if (amzErr || fkErr) {
        notify(
          'error',
          [amzErr && `Amazon: ${amzErr}`, fkErr && `Flipkart: ${fkErr}`].filter(Boolean).join(' · ') || 'Sync completed with warnings'
        )
      } else {
        notify('success', 'Sync completed')
      }
      await refreshAll()
    } catch (e: any) {
      notify('error', e?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams()
      params.set('from', new Date(from + 'T00:00:00').toISOString())
      params.set('to', new Date(to + 'T23:59:59').toISOString())
      if (platformFilter) params.set('platform', platformFilter)
      const res = await fetch(`${apiBase}/sales/export.csv?${params}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unified-sales-${from}-${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      notify('success', 'CSV downloaded')
    } catch (e: any) {
      notify('error', e?.message || 'Export failed')
    }
  }

  const loadGst = async () => {
    try {
      const res = await fetch(`${apiBase}/sales/reports/gst?month=${encodeURIComponent(gstMonth)}`, {
        headers: getAuthHeaders(),
      })
      const data = await parseJson(res)
      setGstData(data)
    } catch (e: any) {
      notify('error', e?.message || 'GST report failed')
    }
  }

  const fmt = (n: number | string | undefined) => {
    const x = Number(n ?? 0)
    return x.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  return (
    <div className="min-h-screen bg-slate-50/80 p-3 sm:p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Unified sales analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Nefol store, Amazon SP-API, and Flipkart — one view. Revenue is only shown after a successful import;
              check <strong className="font-medium text-slate-700">Last import</strong> below if a marketplace stays at ₹0.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={manualSync}
              disabled={syncing}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              type="button"
              onClick={() => refreshAll()}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
          <label className="text-xs font-medium text-slate-600">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => refreshAll()}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Apply range
          </button>
        </div>

        {summary?.syncStatus?.length ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Last import (sync)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Skipped = not configured · Error = API failed · Success with 0 rows = empty response. Amazon/Flipkart rows accumulate in the database on each sync; date filters below only change what you{' '}
              <em>view</em>.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {summary.syncStatus.map((s) => {
                const label = s.platform.charAt(0).toUpperCase() + s.platform.slice(1)
                const st = (s.status || '—').toLowerCase()
                const isBad = st === 'error' || st === 'skipped'
                const border = isBad ? 'border-amber-200 bg-amber-50/80' : st === 'success' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/80'
                return (
                  <div key={s.platform} className={`rounded-lg border px-3 py-2 text-sm ${border}`}>
                    <div className="font-medium text-slate-900">{label}</div>
                    <div className="mt-0.5 text-xs capitalize text-slate-600">
                      Status: <span className="font-medium">{s.status || 'never'}</span>
                      {typeof s.rows_synced === 'number' ? ` · ${s.rows_synced} line(s)` : null}
                    </div>
                    {s.message ? (
                      <p className="mt-1 break-words text-xs leading-snug text-slate-700">{formatSyncMessage(s.message)}</p>
                    ) : s.status === 'success' && s.rows_synced === 0 && (s.platform === 'amazon' || s.platform === 'flipkart') ? (
                      <p className="mt-1 text-xs text-slate-600">No lines imported (no orders in range or API returned empty).</p>
                    ) : null}
                    {s.at ? (
                      <p className="mt-1 text-[11px] text-slate-500">{new Date(s.at).toLocaleString()}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Revenue', value: fmt(summary.totals.revenue), sub: 'All platforms' },
              { label: 'Orders (est.)', value: String(summary.totals.orders_estimate ?? 0), sub: 'Distinct order IDs' },
              { label: 'Tax', value: fmt(summary.totals.tax), sub: 'Allocated' },
              { label: 'Shipping', value: fmt(summary.totals.shipping), sub: 'Allocated' },
              {
                label: 'Profit (approx.)',
                value: fmt(summary.totals.profit_ex_tax_and_shipping),
                sub: 'Revenue − tax − shipping',
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-sm"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</div>
                <div className="mt-1 text-[11px] text-slate-500">{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">Daily revenue by platform</h2>
            <div className="mt-4 h-[280px]">
              {chartData.length === 0 ? (
                <p className="text-sm text-slate-500">No data in range. Run sync or widen dates.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="website" name="Website" stroke={PLATFORM_COLORS.website} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="amazon" name="Amazon" stroke={PLATFORM_COLORS.amazon} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="flipkart" name="Flipkart" stroke={PLATFORM_COLORS.flipkart} dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Revenue by platform</h2>
            <div className="mt-4 h-[280px]">
              {platformSplit.length === 0 ? (
                <p className="text-sm text-slate-500">No rows yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformSplit}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {platformSplit.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {summary?.topProducts?.length ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-slate-900">Top products (by revenue)</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[min(100%,520px)] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5 sm:px-4">Product</th>
                    <th className="px-3 py-2.5 text-right sm:px-4">Units</th>
                    <th className="px-3 py-2.5 text-right sm:px-4">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topProducts.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 text-slate-800 odd:bg-white even:bg-slate-50/60 last:border-0"
                    >
                      <td className="max-w-[min(100vw-2rem,36rem)] px-3 py-2.5 align-top text-[13px] leading-snug sm:px-4 sm:text-sm">
                        {p.product_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700 sm:px-4">{p.units}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900 sm:px-4">
                        {fmt(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Unified sales lines</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">All platforms</option>
                <option value="website">Website</option>
                <option value="amazon">Amazon</option>
                <option value="flipkart">Flipkart</option>
              </select>
              <input
                type="search"
                placeholder="Order ID or product"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => loadCombined()}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Search
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Export CSV
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">{total.toLocaleString()} line(s) in range</p>

          {/* Mobile: card list */}
          <div className="mt-3 space-y-3 md:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-sm shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
                    style={{
                      backgroundColor: `${PLATFORM_COLORS[r.platform] || '#64748b'}22`,
                      color: PLATFORM_COLORS[r.platform] || '#64748b',
                    }}
                  >
                    {r.platform}
                  </span>
                  <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{fmt(r.total)}</span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-slate-600 break-all">{r.line_order_id}</p>
                <p className="mt-1 text-[13px] leading-snug text-slate-800">{r.product_name}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                  <span>Qty: {r.quantity}</span>
                  <span className="text-right">{r.city || '—'}</span>
                  {r.platform === 'amazon' &&
                  (r.order_status ||
                    r.business_type ||
                    r.shipping_state ||
                    r.line_note ||
                    r.buyer_gstin ||
                    r.seller_sku) ? (
                    <>
                      <span className="col-span-2 text-slate-600">
                        {[r.order_status && `Status: ${r.order_status}`, r.business_type, r.shipping_state]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {r.buyer_gstin ? (
                        <span className="col-span-2 font-mono text-[11px] text-slate-700">GSTIN: {r.buyer_gstin}</span>
                      ) : null}
                      {r.seller_sku ? (
                        <span className="col-span-2 font-mono text-[11px] text-slate-600">SKU: {r.seller_sku}</span>
                      ) : null}
                      {r.taxable_value != null ? (
                        <span className="col-span-2 text-xs text-slate-600">
                          Taxable {fmt(r.taxable_value)}
                          {r.igst != null || r.cgst != null
                            ? ` · IGST ${r.igst != null ? fmt(r.igst) : '—'} CGST ${r.cgst != null ? fmt(r.cgst) : '—'} SGST ${r.sgst != null ? fmt(r.sgst) : '—'}`
                            : ''}
                        </span>
                      ) : null}
                      {r.line_note ? (
                        <span className="col-span-2 text-amber-800/90">{r.line_note}</span>
                      ) : null}
                    </>
                  ) : null}
                  <span className="col-span-2 text-slate-500">
                    {r.order_date ? new Date(r.order_date).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            ))}
            {rows.length === 0 && !loading && (
              <p className="py-8 text-center text-sm text-slate-500">No rows. Sync your store data or extend the date range.</p>
            )}
          </div>

          {/* Desktop: table */}
          <div className="mt-3 hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
            <table className="w-full min-w-[1680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2.5">Platform</th>
                  <th className="px-3 py-2.5">Order</th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5">Ship to</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Status</th>
                  <th className="whitespace-nowrap px-3 py-2.5">B2B/B2C</th>
                  <th className="whitespace-nowrap px-3 py-2.5">State</th>
                  <th className="min-w-[7rem] px-3 py-2.5">Note</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Buyer GSTIN</th>
                  <th className="max-w-[6rem] px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">ASIN</th>
                  <th className="px-3 py-2.5 text-right">Taxable</th>
                  <th className="px-3 py-2.5 text-right">IGST</th>
                  <th className="px-3 py-2.5 text-right">CGST</th>
                  <th className="px-3 py-2.5 text-right">SGST</th>
                  <th className="px-3 py-2.5 text-right">UTGST</th>
                  <th className="px-3 py-2.5 text-right">CESS</th>
                  <th className="px-3 py-2.5 text-right">Tax %</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50">
                    <td className="px-3 py-2 align-top">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
                        style={{
                          backgroundColor: `${PLATFORM_COLORS[r.platform] || '#64748b'}22`,
                          color: PLATFORM_COLORS[r.platform] || '#64748b',
                        }}
                      >
                        {r.platform}
                      </span>
                    </td>
                    <td className="max-w-[10rem] px-3 py-2 align-top font-mono text-xs text-slate-700 break-all">{r.line_order_id}</td>
                    <td className="max-w-xs px-3 py-2 align-top text-slate-800 lg:max-w-md">
                      <span className="line-clamp-3 sm:line-clamp-none">{r.product_name}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(r.total)}</td>
                    <td className="max-w-[8rem] px-3 py-2 align-top text-slate-600">{r.city || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-slate-700">{r.order_status || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-slate-700">{r.business_type || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-slate-700">{r.shipping_state || '—'}</td>
                    <td className="max-w-[10rem] px-3 py-2 align-top text-xs text-slate-600">{r.line_note || '—'}</td>
                    <td className="max-w-[9rem] px-3 py-2 align-top font-mono text-[11px] text-slate-700">{r.buyer_gstin || '—'}</td>
                    <td className="max-w-[6rem] px-3 py-2 align-top font-mono text-[11px] text-slate-700 break-all">{r.seller_sku || '—'}</td>
                    <td className="px-3 py-2 align-top font-mono text-[11px] text-slate-700">{r.asin || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.taxable_value != null ? fmt(r.taxable_value) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.igst != null ? fmt(r.igst) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.cgst != null ? fmt(r.cgst) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.sgst != null ? fmt(r.sgst) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.utgst != null ? fmt(r.utgst) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.cess != null ? fmt(r.cess) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">
                      {r.tax_rate_pct != null ? `${Number(r.tax_rate_pct).toFixed(2)}%` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-slate-600">
                      {r.order_date ? new Date(r.order_date).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && !loading && (
              <p className="py-8 text-center text-sm text-slate-500">No rows. Sync your store data or extend the date range.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">GST snapshot (month)</h2>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input
                type="month"
                value={gstMonth}
                onChange={(e) => setGstMonth(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={loadGst}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
              >
                Load
              </button>
            </div>
            {gstData?.byPlatform && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-500">
                      <th className="py-2 text-left">Platform</th>
                      <th className="py-2 text-right">Turnover</th>
                      <th className="py-2 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstData.byPlatform.map((p: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2 capitalize">{p.platform}</td>
                        <td className="py-2 text-right tabular-nums">{fmt(p.taxable_turnover)}</td>
                        <td className="py-2 text-right tabular-nums">{fmt(p.tax_collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Sync logs</h2>
            <div className="mt-3 max-h-[280px] overflow-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-1">Platform</th>
                    <th className="py-1">Status</th>
                    <th className="py-1">Rows</th>
                    <th className="py-1">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50">
                      <td className="py-1.5 capitalize">{l.platform}</td>
                      <td className="py-1.5">{l.status}</td>
                      <td className="py-1.5 tabular-nums">{l.rows_synced}</td>
                      <td className="py-1.5 text-slate-500">
                        {l.started_at ? new Date(l.started_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <p className="py-4 text-slate-500">No sync runs yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
