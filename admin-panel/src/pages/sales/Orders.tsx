import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useToast } from '../../components/ToastProvider'
import Can from '../../components/Can'
import { socketService } from '../../services/socket'
import { getApiBaseUrl } from '../../utils/apiUrl'

type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

type Order = {
  id: number
  order_number?: string
  customer: string
  customer_email?: string
  total: number
  subtotal?: number
  shipping?: number
  status: OrderStatus
  payment_status?: PaymentStatus
  payment_method?: string
  cod?: boolean
  items?: any[]
  createdAt: string
  discount_code?: string
  discount_amount?: number
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500' },
  paid:      { label: 'Paid',      bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  shipped:   { label: 'Shipped',   bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-500' },
}

const PAYMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  paid:     { label: 'Paid',     cls: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700' },
  failed:   { label: 'Failed',   cls: 'bg-red-100 text-red-600' },
  refunded: { label: 'Refunded', cls: 'bg-purple-100 text-purple-700' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
}

function formatMethod(method?: string, cod?: boolean) {
  if (cod || method === 'cod') return 'COD'
  if (method === 'razorpay') return 'Razorpay'
  if (method === 'coins+razorpay') return 'Coins + Pay'
  if (method === 'coins') return 'Coins'
  return method || '—'
}

export default function Orders() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<string>('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [cod, setCod] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [newOrderIds, setNewOrderIds] = useState<number[]>([])
  const [exporting, setExporting] = useState(false)
  const newOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const apiBase = getApiBaseUrl()

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update,shipping:update,invoices:read',
      'x-user-role': 'admin',
    } as Record<string, string>
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (q) params.set('q', q)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (paymentStatus) params.set('payment_status', paymentStatus)
      if (cod) params.set('cod', cod)
      const res = await fetch(`${apiBase}/orders?${params.toString()}`, { headers: authHeaders })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied.' : `Failed to load orders (${res.status})`)
        setItems([])
        return
      }
      const data = await res.json()
      const raw = Array.isArray(data) ? data : (data?.data ?? [])
      setItems(raw.map((o: any) => ({
        ...o,
        customer: o.customer_name || o.customer || '',
        createdAt: o.created_at || o.createdAt || new Date().toISOString(),
      })))
      setSelected([])
    } catch {
      setError('Failed to load orders')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const unsubCreate = socketService.subscribe('order_created', (o: any) => {
      const t = { ...o, customer: o.customer_name || o.customer || '', createdAt: o.created_at || o.createdAt || new Date().toISOString() }
      setItems(prev => [t, ...prev])
      setNewOrderIds(prev => [...prev, o.id])
      if (newOrderTimer.current) clearTimeout(newOrderTimer.current)
      newOrderTimer.current = setTimeout(() => setNewOrderIds([]), 6000)
    })
    const unsubUpdate = socketService.subscribe('order_updated', (o: any) => {
      const t = { ...o, customer: o.customer_name || o.customer || '', createdAt: o.created_at || o.createdAt || new Date().toISOString() }
      setItems(prev => prev.map(x => x.id === t.id ? t : x))
    })
    return () => { unsubCreate(); unsubUpdate(); if (newOrderTimer.current) clearTimeout(newOrderTimer.current) }
  }, [])

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${apiBase}/orders/${id}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Update failed')
      }
      await load()
      notify('success', `Order updated to ${newStatus}`)
    } catch (e: any) {
      notify('error', e.message || 'Update failed')
    }
  }

  const toggleSelect = (id: number, checked: boolean) =>
    setSelected(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))

  const allSelected = items.length > 0 && selected.length === items.length

  const bulkStatus = async (newStatus: string) => {
    if (selected.length === 0) { notify('error', 'Select orders first'); return }
    const res = await fetch(`${apiBase}/bulk/orders/status`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ orderIds: selected, status: newStatus }),
    })
    if (!res.ok) { notify('error', 'Bulk update failed'); return }
    await load()
    notify('success', `${selected.length} orders marked ${newStatus}`)
  }

  const exportCsv = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (q) params.set('q', q)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`${apiBase}/orders/export?${params.toString()}`, { headers: authHeaders })
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const csv = await res.text()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      notify('success', 'Orders exported')
    } catch (e: any) {
      notify('error', e?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Summary counts
  const counts = useMemo(() => {
    const all = items.length
    const pending = items.filter(o => o.status === 'pending').length
    const needsConfirm = items.filter(o => o.status === 'pending' || o.status === 'confirmed').length
    const shipped = items.filter(o => o.status === 'shipped' || o.status === 'delivered').length
    const revenue = items.reduce((sum, o) => sum + Number(o.total || 0), 0)
    return { all, pending, needsConfirm, shipped, revenue }
  }, [items])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') load()
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-background)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Orders</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {items.length > 0 ? `${items.length} order${items.length !== 1 ? 's' : ''} found` : 'Manage and track all customer orders'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-[var(--brand-highlight)]" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-secondary)' }}>
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
            <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-[var(--brand-highlight)]" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* ── Summary stat tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: counts.all, icon: '📦', accent: false },
            { label: 'Needs Action', value: counts.pending, icon: '⏳', accent: counts.pending > 0 },
            { label: 'Shipped / Delivered', value: counts.shipped, icon: '🚚', accent: false },
            { label: 'Revenue', value: `₹${counts.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '💰', accent: false },
          ].map(({ label, value, icon, accent }) => (
            <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${accent ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800' : ''}`} style={!accent ? { borderColor: 'var(--brand-border)', background: 'var(--brand-surface)' } : {}}>
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className={`text-lg font-bold ${accent ? 'text-amber-700 dark:text-amber-300' : ''}`} style={!accent ? { color: 'var(--text-primary)' } : {}}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-surface)' }}>
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by order # or customer…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Status */}
            <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment */}
            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}>
              <option value="">Any Payment</option>
              <option value="paid">Paid</option>
              <option value="pending">Unpaid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* COD */}
            <select value={cod} onChange={e => setCod(e.target.value)} className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}>
              <option value="">All Types</option>
              <option value="true">COD</option>
              <option value="false">Prepaid</option>
            </select>

            {/* Date range */}
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }} />

            <button onClick={load} className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand-accent)' }}>
              Apply
            </button>
            {(q || status || paymentStatus || cod || from || to) && (
              <button onClick={() => { setQ(''); setStatus(''); setPaymentStatus(''); setCod(''); setFrom(''); setTo(''); setTimeout(load, 0) }} className="px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-[var(--brand-highlight)]" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-muted)' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Bulk action bar (appears when rows selected) ── */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border text-sm animate-[fadeIn_.15s_ease]" style={{ borderColor: 'var(--brand-accent)', background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>
            <span className="font-semibold">{selected.length} selected</span>
            <div className="h-4 w-px bg-current opacity-30" />
            <Can permission="orders:update">
              <button onClick={() => bulkStatus('paid')} className="px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-white/50" style={{ borderColor: 'currentColor' }}>Mark Paid</button>
            </Can>
            <Can permission="orders:update">
              <button onClick={() => bulkStatus('shipped')} className="px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-white/50" style={{ borderColor: 'currentColor' }}>Mark Shipped</button>
            </Can>
            <Can permission="orders:update">
              <button onClick={() => bulkStatus('cancelled')} className="px-3 py-1.5 rounded-lg border font-medium text-red-600 border-red-300 transition-colors hover:bg-red-50">Cancel Orders</button>
            </Can>
            <button onClick={() => setSelected([])} className="ml-auto opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* ── Orders table ── */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-surface)' }}>
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
              <button onClick={load} className="text-sm underline" style={{ color: 'var(--brand-accent)' }}>Try again</button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
              <span className="text-4xl">📭</span>
              <p className="text-sm font-medium">No orders found</p>
              {(q || status || paymentStatus || cod || from || to) && (
                <button onClick={() => { setQ(''); setStatus(''); setPaymentStatus(''); setCod(''); setFrom(''); setTo(''); setTimeout(load, 0) }} className="text-sm underline" style={{ color: 'var(--brand-accent)' }}>Clear filters</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-muted)', background: 'var(--brand-highlight)' }}>
                    <th className="py-3 pl-4 pr-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={e => e.target.checked ? setSelected(items.map(i => i.id)) : setSelected([])}
                        className="rounded"
                      />
                    </th>
                    <th className="py-3 px-3 text-left font-medium">Order</th>
                    <th className="py-3 px-3 text-left font-medium">Customer</th>
                    <th className="py-3 px-3 text-left font-medium hidden md:table-cell">Items</th>
                    <th className="py-3 px-3 text-left font-medium">Total</th>
                    <th className="py-3 px-3 text-left font-medium">Payment</th>
                    <th className="py-3 px-3 text-left font-medium">Status</th>
                    <th className="py-3 px-3 text-left font-medium hidden lg:table-cell">Date</th>
                    <th className="py-3 pl-3 pr-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--brand-border)' } as any}>
                  {items.map(o => {
                    const isNew = newOrderIds.includes(o.id)
                    const itemCount = Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.qty || i.quantity || 1), 0) : '—'
                    const payStatus = o.payment_status || (o.cod ? 'pending' : 'paid')
                    return (
                      <tr
                        key={o.id}
                        className={`group transition-colors cursor-pointer ${isNew ? 'ring-2 ring-inset ring-green-400 bg-green-50 dark:bg-green-900/10' : 'hover:bg-[var(--brand-highlight)]'}`}
                        style={{ borderColor: 'var(--brand-border)' }}
                        onClick={() => navigate(`/loginasadmin/orders/${o.order_number || o.id}`)}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 pl-4 pr-2" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.includes(o.id)} onChange={e => toggleSelect(o.id, e.target.checked)} className="rounded" />
                        </td>

                        {/* Order # */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isNew && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" title="New order" />}
                            <span className="font-semibold text-[var(--brand-accent)] font-mono text-xs">#{o.order_number || o.id}</span>
                          </div>
                          {o.cod && <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">COD</span>}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{o.customer}</p>
                          {o.customer_email && <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>{o.customer_email}</p>}
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                          <span className="text-xs">{itemCount} {typeof itemCount === 'number' ? `item${itemCount !== 1 ? 's' : ''}` : ''}</span>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-3">
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(o.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <PaymentBadge status={payStatus} />
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatMethod(o.payment_method, o.cod)}</p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <StatusBadge status={o.status} />
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-3 hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                          <p className="text-xs whitespace-nowrap">{(() => {
                            try {
                              const d = new Date(o.createdAt)
                              return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            } catch { return '—' }
                          })()}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{(() => {
                            try {
                              const d = new Date(o.createdAt)
                              return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            } catch { return '' }
                          })()}</p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pl-3 pr-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/loginasadmin/orders/${o.order_number || o.id}`)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--brand-accent)] hover:text-white hover:border-transparent"
                              style={{ borderColor: 'var(--brand-border)', color: 'var(--text-secondary)' }}
                            >
                              View
                            </button>
                            <ActionsMenu order={o} onUpdateStatus={updateStatus} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer count ── */}
        {items.length > 0 && !loading && (
          <p className="text-xs text-center pb-2" style={{ color: 'var(--text-muted)' }}>
            Showing {items.length} order{items.length !== 1 ? 's' : ''}
            {selected.length > 0 && ` · ${selected.length} selected`}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Per-row actions dropdown ──────────────────────────────────────────────────
function ActionsMenu({ order, onUpdateStatus }: { order: Order; onUpdateStatus: (id: number, status: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--brand-highlight)]"
        style={{ borderColor: 'var(--brand-border)', color: 'var(--text-muted)' }}
        aria-label="More actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border shadow-lg overflow-hidden text-sm" style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-surface)' }}>
          <Can permission="orders:update">
            {order.status !== 'paid' && order.status !== 'cancelled' && (
              <button onClick={() => { onUpdateStatus(order.id, 'paid'); setOpen(false) }} className="w-full text-left px-4 py-2.5 hover:bg-[var(--brand-highlight)] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full bg-green-500" />Mark Paid
              </button>
            )}
          </Can>
          <Can permission="orders:update">
            {order.status !== 'shipped' && order.status !== 'cancelled' && (
              <button onClick={() => { onUpdateStatus(order.id, 'shipped'); setOpen(false) }} className="w-full text-left px-4 py-2.5 hover:bg-[var(--brand-highlight)] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full bg-blue-500" />Mark Shipped
              </button>
            )}
          </Can>
          <Can permission="orders:update">
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button onClick={() => { onUpdateStatus(order.id, 'delivered'); setOpen(false) }} className="w-full text-left px-4 py-2.5 hover:bg-[var(--brand-highlight)] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />Mark Delivered
              </button>
            )}
          </Can>
          {order.status !== 'cancelled' && (
            <>
              <div className="border-t my-1" style={{ borderColor: 'var(--brand-border)' }} />
              <Can permission="orders:update">
                <button onClick={() => { setShowCancel(true); setOpen(false) }} className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancel Order
                </button>
              </Can>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={() => { onUpdateStatus(order.id, 'cancelled'); setShowCancel(false) }}
        title="Cancel this order?"
        description="This will also cancel the shipment on Shiprocket if one exists. This action cannot be undone."
        confirmText="Cancel Order"
      />
    </div>
  )
}
