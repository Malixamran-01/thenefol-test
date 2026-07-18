import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { getApiBaseUrl } from '../../utils/apiUrl'

type OrderItem = {
  product_id?: number
  title?: string
  name?: string
  sku?: string
  qty?: number
  quantity?: number
  price?: number
  unit_price?: number
  image?: string
}

type Order = {
  id: number
  order_number: string
  customer_name: string
  customer_email: string
  shipping_address: any
  billing_address?: any
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: string
  created_at: string
  updated_at?: string
  payment_method?: string
  payment_type?: string
  payment_status?: string
  cod?: boolean
  discount_code?: string
  discount_amount?: number
  coins_used?: number
  segment_discount?: number
  customer_segment_label?: string
  tags?: string[]
  history?: Array<{ id: number; old_status: string | null; new_status: string; note?: string | null; created_at: string }>
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',   dot: 'bg-cyan-500' },
  paid:      { label: 'Paid',      bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-500' },
  shipped:   { label: 'Shipped',   bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',    dot: 'bg-red-500' },
}

const PAYMENT_CFG: Record<string, { label: string; cls: string }> = {
  paid:     { label: 'Paid',     cls: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700' },
  failed:   { label: 'Failed',   cls: 'bg-red-100 text-red-600' },
  refunded: { label: 'Refunded', cls: 'bg-purple-100 text-purple-700' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const c = PAYMENT_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>{c.label}</span>
}

function parseAddr(a: any) {
  if (!a) return null
  if (typeof a === 'string') { try { return JSON.parse(a) } catch { return null } }
  return a
}

function fmtAddr(a: any, fallbackName?: string) {
  if (!a) return null
  const name = a.firstName ? `${a.firstName} ${a.lastName || ''}`.trim() : (a.name || fallbackName || '')
  const line1 = a.address || a.street || ''
  const line2 = a.apartment || a.area || ''
  const city = [a.city, a.state, a.zip || a.pincode].filter(Boolean).join(', ')
  const country = a.country || 'India'
  return { name, line1, line2, city, country, phone: a.phone || '', email: a.email || '' }
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-[var(--brand-surface)] ${className}`} style={{ borderColor: 'var(--brand-border)' }}>
      {children}
    </div>
  )
}
function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}
function Row({ label, value, mono = false, highlight = false }: { label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} ${highlight ? 'font-bold text-base' : 'font-medium'}`} style={{ color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrderDetails() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Status update
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Tags
  const [tagsInput, setTagsInput] = useState('')
  const [editingTags, setEditingTags] = useState(false)

  // Split
  const [splitIndexes, setSplitIndexes] = useState('')
  const [showSplitPanel, setShowSplitPanel] = useState(false)

  // Shipment
  const [hasShipment, setHasShipment] = useState(false)
  const [shipmentInfo, setShipmentInfo] = useState<any>(null)
  const [courierOptions, setCourierOptions] = useState<any[]>([])
  const [selectedCourierId, setSelectedCourierId] = useState('')
  const [loadingCouriers, setLoadingCouriers] = useState(false)
  const [showCourierPanel, setShowCourierPanel] = useState(false)
  const [confirmingShipment, setConfirmingShipment] = useState(false)

  const apiBase = getApiBaseUrl()
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update,shipping:read',
      'x-user-role': 'admin',
    } as Record<string, string>
  }, [])

  const load = async () => {
    if (!orderNumber) return
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${apiBase}/orders/${encodeURIComponent(orderNumber)}`, { headers: authHeaders })
      if (!res.ok) throw new Error('Failed to fetch order')
      const data = await res.json()
      setOrder(data)
      setNewStatus(data.status)
      setTagsInput((data.tags || []).join(', '))

      if (data.id) {
        try {
          const sr = await fetch(`${apiBase}/shiprocket_shipments?order_id=${data.id}`, { headers: authHeaders })
          if (sr.ok) {
            const sd = await sr.json()
            const list = Array.isArray(sd) ? sd : (sd.data || [])
            const latest = list.find((s: any) => s.order_id === data.id) || list[0]
            const valid = latest?.shipment_id
            setHasShipment(!!valid)
            setShipmentInfo(valid ? latest : null)
          } else { setHasShipment(false); setShipmentInfo(null) }
        } catch { setHasShipment(false); setShipmentInfo(null) }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orderNumber])

  const updateStatus = async () => {
    if (!order) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`${apiBase}/orders/${order.id}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ status: newStatus, note }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await load()
      setNote('')
      notify('success', 'Status updated')
    } catch (e: any) {
      notify('error', e?.message || 'Failed to update')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const updateTags = async () => {
    if (!order) return
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean)
    const res = await fetch(`${apiBase}/orders/${order.id}/tags`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ tags }),
    })
    if (!res.ok) { notify('error', 'Failed to update tags'); return }
    await load()
    setEditingTags(false)
    notify('success', 'Tags updated')
  }

  const splitOrder = async () => {
    if (!order) return
    const indexes = splitIndexes.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    if (indexes.length === 0) { notify('error', 'Enter item indexes e.g. 0,2'); return }
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/orders/${order.id}/split`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ itemIndexes: indexes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to split')
      notify('success', `Split created: ${data.split?.order_number || data.split?.id}`)
      await load()
      setSplitIndexes(''); setShowSplitPanel(false)
    } catch (e: any) {
      notify('error', e?.message || 'Failed to split')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourierOptions = async () => {
    if (!order) return
    setLoadingCouriers(true)
    setCourierOptions([])
    setSelectedCourierId('')
    try {
      const res = await fetch(`${apiBase}/shiprocket/orders/${order.id}/courier-serviceability`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to fetch couriers')
      setCourierOptions(data?.couriers || [])
      setShowCourierPanel(true)
    } catch (e: any) {
      notify('error', e?.message || 'Failed to fetch couriers')
    } finally {
      setLoadingCouriers(false)
    }
  }

  const confirmAndShip = async () => {
    if (!order || !selectedCourierId) return
    setConfirmingShipment(true)
    try {
      const res = await fetch(`${apiBase}/shiprocket/orders/${order.id}/confirm-and-ship`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ courier_id: selectedCourierId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to confirm')
      notify('success', `Shipment confirmed! AWB: ${data?.awb_code || 'pending'}`)
      setShowCourierPanel(false); setCourierOptions([]); setSelectedCourierId('')
      await load()
    } catch (e: any) {
      notify('error', e?.message || 'Failed to confirm shipment')
    } finally {
      setConfirmingShipment(false)
    }
  }

  const createAwb = async () => {
    if (!order || !shipmentInfo?.shipment_id) return
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/shiprocket/orders/${order.id}/awb`, { method: 'POST', headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to create AWB')
      const awb = data?.awb_code || data?.data?.awb_code
      notify('success', awb ? `AWB: ${awb}` : 'AWB submitted')
      await load()
    } catch (e: any) {
      notify('error', e?.message || 'Failed to create AWB')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading && !order) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4" style={{ color: 'var(--text-muted)' }}>
      <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      <p className="text-sm">Loading order…</p>
    </div>
  )
  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <span className="text-4xl">⚠️</span>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button onClick={load} className="text-sm underline" style={{ color: 'var(--brand-accent)' }}>Try again</button>
    </div>
  )
  if (!order) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4" style={{ color: 'var(--text-muted)' }}>
      <span className="text-4xl">📭</span>
      <p className="text-sm">Order not found</p>
      <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: 'var(--brand-accent)' }}>Go back</button>
    </div>
  )

  const shippingAddr = fmtAddr(parseAddr(order.shipping_address), order.customer_name)
  const billingAddr  = fmtAddr(parseAddr(order.billing_address))
  const payStatus    = order.payment_status || (order.cod ? 'pending' : 'paid')
  const itemCount    = (order.items || []).reduce((s, i) => s + (i.qty || i.quantity || 1), 0)
  const fmtMoney     = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtDate      = (d: string) => { try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d } }

  return (
    <div className="min-h-screen" style={{ background: 'var(--brand-background)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 p-2 rounded-lg border transition-colors hover:bg-[var(--brand-highlight)]"
              style={{ borderColor: 'var(--brand-border)', color: 'var(--text-muted)' }}
              aria-label="Back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>#{order.order_number}</h1>
                <StatusBadge status={order.status} />
                {order.cod && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">COD</span>}
                {loading && <svg className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Placed {fmtDate(order.created_at)} · {itemCount} item{itemCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button onClick={() => { setNewStatus('shipped'); setTimeout(updateStatus, 0) }} className="px-3 py-2 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Mark Shipped
              </button>
            )}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button onClick={() => { setNewStatus('delivered'); setTimeout(updateStatus, 0) }} className="px-3 py-2 text-xs font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                Mark Delivered
              </button>
            )}
            {order.status !== 'cancelled' && (
              <button onClick={() => { if (window.confirm('Cancel this order? This will also cancel the Shiprocket shipment.')) { setNewStatus('cancelled'); setTimeout(updateStatus, 0) } }} className="px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* ── Main two-column grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* LEFT: main content (2/3 width) */}
          <div className="xl:col-span-2 space-y-5">

            {/* Order Items */}
            <Card>
              <CardHeader title="Order Items" subtitle={`${itemCount} item${itemCount !== 1 ? 's' : ''}`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-muted)', background: 'var(--brand-highlight)' }}>
                      <th className="py-3 pl-5 pr-3 text-left font-medium">Product</th>
                      <th className="py-3 px-3 text-left font-medium hidden sm:table-cell">SKU</th>
                      <th className="py-3 px-3 text-center font-medium">Qty</th>
                      <th className="py-3 px-3 text-right font-medium">Unit Price</th>
                      <th className="py-3 pl-3 pr-5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--brand-border)' } as any}>
                    {(order.items || []).map((item, idx) => {
                      const name = item.title || item.name || `Product ${idx + 1}`
                      const qty  = item.qty || item.quantity || 1
                      const price = item.price || item.unit_price || 0
                      return (
                        <tr key={idx} className="hover:bg-[var(--brand-highlight)] transition-colors">
                          <td className="py-3.5 pl-5 pr-3">
                            <div className="flex items-center gap-3">
                              {/* Product thumbnail placeholder */}
                              <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg" style={{ background: 'var(--brand-highlight)', border: '1px solid var(--brand-border)' }}>
                                {item.image ? <img src={item.image} alt={name} className="w-full h-full object-cover rounded-lg" /> : '📦'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{name}</p>
                                {item.product_id && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {item.product_id}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 hidden sm:table-cell">
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--brand-highlight)', color: 'var(--text-muted)' }}>{item.sku || '—'}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold" style={{ background: 'var(--brand-highlight)', color: 'var(--text-primary)' }}>{qty}</span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtMoney(price)}</td>
                          <td className="py-3.5 pl-3 pr-5 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtMoney(qty * price)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Order totals */}
              <div className="border-t px-5 py-4" style={{ borderColor: 'var(--brand-border)' }}>
                <div className="ml-auto max-w-xs space-y-0.5">
                  <Row label="Subtotal" value={fmtMoney(order.subtotal)} />
                  <Row label="Shipping" value={Number(order.shipping) === 0 ? <span className="text-green-600 font-medium">Free</span> : fmtMoney(order.shipping)} />
                  <Row label="GST" value={fmtMoney(order.tax)} />
                  {Number(order.discount_amount) > 0 && (
                    <Row label={`Discount${order.discount_code ? ` (${order.discount_code})` : ''}`} value={<span className="text-green-600">−{fmtMoney(order.discount_amount!)}</span>} />
                  )}
                  {Number(order.coins_used) > 0 && (
                    <Row label="Coins Used" value={<span className="text-green-600">−{fmtMoney(Number(order.coins_used) / 10)}</span>} />
                  )}
                  {Number(order.segment_discount) > 0 && (
                    <Row label={order.customer_segment_label ? `${order.customer_segment_label} Discount` : 'Member Discount'} value={<span className="text-green-600">−{fmtMoney(order.segment_discount!)}</span>} />
                  )}
                  <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--brand-border)' }}>
                    <Row label="Order Total" value={fmtMoney(order.total)} highlight />
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment info */}
            <Card>
              <CardHeader title="Payment" />
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoBlock label="Method" value={
                    order.payment_method === 'cod' ? 'Cash on Delivery' :
                    order.payment_method === 'razorpay' ? 'Razorpay (Online)' :
                    order.payment_method === 'coins+razorpay' ? 'Coins + Razorpay' :
                    order.payment_method === 'coins' ? 'Nefol Coins' :
                    order.payment_method || '—'
                  } />
                  <InfoBlock label="Payment Status" value={<PaymentBadge status={payStatus} />} />
                  {order.payment_type && <InfoBlock label="Type" value={<span className="capitalize">{order.payment_type}</span>} />}
                  {order.discount_code && (
                    <InfoBlock label="Coupon" value={
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">{order.discount_code}</span>
                    } />
                  )}
                  {Number(order.coins_used) > 0 && (
                    <InfoBlock label="Coins Used" value={`${order.coins_used} coins (−${fmtMoney(Number(order.coins_used) / 10)})`} />
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Card>
                <CardHeader title="Shipping Address" />
                <CardBody>
                  {shippingAddr ? (
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{shippingAddr.name || order.customer_name}</p>
                      {shippingAddr.line1 && <p>{shippingAddr.line1}</p>}
                      {shippingAddr.line2 && <p>{shippingAddr.line2}</p>}
                      {shippingAddr.city && <p>{shippingAddr.city}</p>}
                      <p>{shippingAddr.country}</p>
                      {shippingAddr.phone && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          <span>{shippingAddr.phone}</span>
                        </div>
                      )}
                      {shippingAddr.email && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          <span className="truncate">{shippingAddr.email}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No shipping address</p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Billing Address" />
                <CardBody>
                  {billingAddr ? (
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{billingAddr.name || order.customer_name}</p>
                      {billingAddr.line1 && <p>{billingAddr.line1}</p>}
                      {billingAddr.line2 && <p>{billingAddr.line2}</p>}
                      {billingAddr.city && <p>{billingAddr.city}</p>}
                      <p>{billingAddr.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Same as shipping</p>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Order Timeline */}
            <Card>
              <CardHeader title="Order Timeline" subtitle="Status history" />
              <CardBody>
                {!(order.history?.length) ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No history recorded yet.</p>
                ) : (
                  <ol className="relative border-l-2 ml-3 space-y-5" style={{ borderColor: 'var(--brand-border)' }}>
                    {(order.history || []).map((h, i) => {
                      const cfg = STATUS_CFG[h.new_status]
                      return (
                        <li key={h.id} className="relative pl-5">
                          {/* dot */}
                          <span className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-[var(--brand-surface)] flex-shrink-0 ${cfg?.dot ?? 'bg-gray-300'}`} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{h.new_status}</span>
                              {h.old_status && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>from {h.old_status}</span>}
                              {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] font-medium">Latest</span>}
                            </div>
                            {h.note && <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-secondary)' }}>{h.note}</p>}
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtDate(h.created_at)}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>

          {/* RIGHT: sidebar (1/3 width) */}
          <div className="space-y-5">

            {/* Customer */}
            <Card>
              <CardHeader title="Customer" />
              <CardBody>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0" style={{ background: 'var(--brand-accent)' }}>
                    {order.customer_name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{order.customer_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{order.customer_email}</p>
                  </div>
                </div>
                {shippingAddr?.phone && (
                  <div className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {shippingAddr.phone}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Update Status */}
            <Card>
              <CardHeader title="Update Status" />
              <CardBody className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>New Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                    style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Note (optional)</label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note about this status change…"
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                    style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}
                  />
                </div>
                <button
                  onClick={updateStatus}
                  disabled={updatingStatus || newStatus === order.status}
                  className="w-full py-2 text-sm font-medium rounded-lg text-white transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--brand-accent)' }}
                >
                  {updatingStatus ? 'Updating…' : newStatus === order.status ? 'No change' : 'Update Status'}
                </button>
              </CardBody>
            </Card>

            {/* Fulfillment / Shiprocket */}
            <Card>
              <CardHeader
                title="Fulfillment"
                subtitle={hasShipment ? 'Shipment created on Shiprocket' : 'Awaiting confirmation'}
              />
              <CardBody className="space-y-3">
                {/* Confirmed shipment */}
                {hasShipment && shipmentInfo && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 text-xs font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Shipment Confirmed
                    </div>
                    {shipmentInfo.shipment_id && <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>ID: {shipmentInfo.shipment_id}</p>}
                    {shipmentInfo.awb_code && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>AWB: {shipmentInfo.awb_code}</p>
                        <button
                          onClick={() => navigator.clipboard?.writeText(shipmentInfo.awb_code).then(() => notify('success', 'AWB copied'))}
                          className="text-xs underline"
                          style={{ color: 'var(--brand-accent)' }}
                        >Copy</button>
                      </div>
                    )}
                    {shipmentInfo.status && <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>Status: {shipmentInfo.status}</p>}
                  </div>
                )}

                {/* No shipment — show pending notice */}
                {!hasShipment && !showCourierPanel && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-xs space-y-1">
                    <p className="font-semibold text-amber-700 dark:text-amber-300">Awaiting confirmation</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Click below to fetch available couriers and confirm shipment on Shiprocket.</p>
                  </div>
                )}

                {/* Courier selection panel */}
                {showCourierPanel && (
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--brand-border)' }}>
                    <div className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold" style={{ background: 'var(--brand-highlight)', color: 'var(--text-primary)', borderBottom: '1px solid var(--brand-border)' }}>
                      <span>Select Courier Partner</span>
                      <button onClick={() => setShowCourierPanel(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
                    </div>
                    {courierOptions.length === 0 ? (
                      <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>No couriers available for this pincode.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y" style={{ borderColor: 'var(--brand-border)' } as any}>
                        {courierOptions.map(c => (
                          <label
                            key={c.courier_id}
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${selectedCourierId === String(c.courier_id) ? 'bg-[var(--brand-accent-soft)]' : 'hover:bg-[var(--brand-highlight)]'}`}
                          >
                            <input
                              type="radio" name="courier" value={String(c.courier_id)}
                              checked={selectedCourierId === String(c.courier_id)}
                              onChange={() => setSelectedCourierId(String(c.courier_id))}
                              className="flex-shrink-0 accent-[var(--brand-accent)]"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.courier_name}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ETD: {c.etd || '—'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(c.rate || 0).toFixed(0)}</p>
                              {Number(c.cod_charges) > 0 && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+₹{Number(c.cod_charges).toFixed(0)} COD</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {courierOptions.length > 0 && (
                      <div className="p-2.5 border-t" style={{ borderColor: 'var(--brand-border)' }}>
                        <button
                          onClick={confirmAndShip}
                          disabled={!selectedCourierId || confirmingShipment}
                          className="w-full py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-50 transition-opacity"
                          style={{ background: 'var(--brand-accent)' }}
                        >
                          {confirmingShipment ? 'Confirming…' : 'Confirm & Create Shipment'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {!hasShipment && (
                    <button
                      onClick={fetchCourierOptions}
                      disabled={loadingCouriers || showCourierPanel}
                      className="w-full py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                      style={{ background: 'var(--brand-accent)' }}
                    >
                      {loadingCouriers ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Fetching couriers…</>
                      ) : showCourierPanel ? 'Courier panel open ↑' : '🚚 Confirm & Select Courier'}
                    </button>
                  )}
                  {hasShipment && (
                    <>
                      {!shipmentInfo?.awb_code && (
                        <button onClick={createAwb} disabled={loading} className="w-full py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-[var(--brand-highlight)] disabled:opacity-50" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-primary)' }}>
                          Generate AWB & Label
                        </button>
                      )}
                    </>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader
                title="Tags"
                action={
                  <button onClick={() => setEditingTags(v => !v)} className="text-xs underline" style={{ color: 'var(--brand-accent)' }}>
                    {editingTags ? 'Cancel' : 'Edit'}
                  </button>
                }
              />
              <CardBody>
                {editingTags ? (
                  <div className="space-y-2">
                    <input
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      placeholder="priority, vip, urgent…"
                      className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                      style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={updateTags} className="w-full py-1.5 text-xs font-medium rounded-lg text-white" style={{ background: 'var(--brand-accent)' }}>Save Tags</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {(order.tags || []).length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tags</p>
                    ) : (
                      (order.tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border" style={{ background: 'var(--brand-highlight)', borderColor: 'var(--brand-border)', color: 'var(--text-secondary)' }}>{tag}</span>
                      ))
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Split order */}
            <Card>
              <CardHeader
                title="Split Order"
                subtitle="Separate items into a new order"
                action={
                  <button onClick={() => setShowSplitPanel(v => !v)} className="text-xs underline" style={{ color: 'var(--brand-accent)' }}>
                    {showSplitPanel ? 'Cancel' : 'Split'}
                  </button>
                }
              />
              {showSplitPanel && (
                <CardBody className="space-y-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enter comma-separated row indexes (0-based) to move into a new order.</p>
                  <input
                    value={splitIndexes}
                    onChange={e => setSplitIndexes(e.target.value)}
                    placeholder="e.g. 0,2"
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                    style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-background)', color: 'var(--text-primary)' }}
                  />
                  <button onClick={splitOrder} disabled={loading || !splitIndexes.trim()} className="w-full py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--brand-highlight)] disabled:opacity-50" style={{ borderColor: 'var(--brand-border)', color: 'var(--text-primary)' }}>
                    Split Order
                  </button>
                </CardBody>
              )}
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper sub-component ──────────────────────────────────────────────────────
function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
