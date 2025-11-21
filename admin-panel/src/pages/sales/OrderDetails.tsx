import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'

type OrderItem = {
  product_id?: number
  title?: string
  sku?: string
  qty?: number
  price?: number
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
  history?: Array<{ id: number; old_status: string | null; new_status: string; note?: string | null; created_at: string }>
}

export default function OrderDetails() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [splitIndexes, setSplitIndexes] = useState<string>('')
  const [hasShipment, setHasShipment] = useState(false)
  const [shipmentInfo, setShipmentInfo] = useState<any>(null)
  const getApiBase = () => {
    if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
    const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
    const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
    return `http://${host}:${port}`
  }
  const apiBase = getApiBase()

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update,shipping:read',
      'x-user-role': 'admin'
    } as Record<string, string>
  }, [])

  const load = async () => {
    if (!orderNumber) return
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${apiBase}/api/orders/${encodeURIComponent(orderNumber)}`, { headers: authHeaders })
      if (!res.ok) throw new Error('Failed to fetch order')
      const data = await res.json()
      setOrder(data)
      setNewStatus(data.status)
      
      // Check if shipment exists for this order
      if (data.id) {
        try {
          // Check shipments table directly using the generic CRUD endpoint
          const shipmentsRes = await fetch(`${apiBase}/api/shiprocket_shipments?order_id=${data.id}`, { 
            headers: authHeaders 
          })
          if (shipmentsRes.ok) {
            const shipments = await shipmentsRes.json()
            // Handle both array and object responses
            const shipmentList = Array.isArray(shipments) ? shipments : (shipments.data || [])
            if (shipmentList.length > 0) {
              // Find the most recent shipment for this order
              const latestShipment = shipmentList.find((s: any) => s.order_id === data.id) || shipmentList[0]
              // A shipment is valid only if it has a shipment_id (created in Shiprocket)
              const hasValidShipment = latestShipment && latestShipment.shipment_id
              setHasShipment(hasValidShipment)
              setShipmentInfo(hasValidShipment ? latestShipment : null)
            } else {
              setHasShipment(false)
              setShipmentInfo(null)
            }
          } else {
            setHasShipment(false)
            setShipmentInfo(null)
          }
        } catch (err) {
          // If check fails, assume no shipment exists
          setHasShipment(false)
          setShipmentInfo(null)
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [orderNumber])

  const updateStatus = async () => {
    if (!order) return
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/orders/${order.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus, note })
      })
      if (!res.ok) throw new Error('Failed to update status')
      await load()
      setNote('')
      notify('success','Order status updated')
    } catch (e: any) {
      notify('error', e?.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  const updateTags = async () => {
    if (!order) return
    const tags = tagsInput.split(',').map(s=>s.trim()).filter(Boolean)
    const res = await fetch(`${apiBase}/api/orders/${order.id}/tags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tags })
    })
    if (!res.ok) { notify('error','Failed to update tags'); return }
    await load()
    notify('success','Tags updated')
  }

  const createShipment = async () => {
    if (!order) return
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/shiprocket/orders/${order.id}/shipment`, {
        method: 'POST',
        headers: authHeaders,
      })
      
      // Handle non-JSON responses
      let data: any = {}
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      }
      
      // Check if request was successful (200-299 status codes)
      if (!res.ok) {
        const errorMsg = data?.error || data?.message || data?.details || `Failed to create shipment (${res.status})`
        throw new Error(errorMsg)
      }
      
      // Success - 201 Created or 200 OK
      notify('success','Shipment created in Shiprocket!')
      // Update state with the new shipment info
      // Check if the response has a valid shipment_id
      if (data.shipment_id || data.shiprocket_response?.shipment_id) {
        setHasShipment(true)
        setShipmentInfo(data)
      }
      await load() // Reload order to see updated shipment info
    } catch (e: any) {
      notify('error', e?.message || 'Failed to create shipment')
      console.error('Create shipment error:', e)
    } finally {
      setLoading(false)
    }
  }

  const createAwb = async () => {
    if (!order) return
    try {
      setLoading(true)
      
      // Check if shipment exists and has shipment_id before attempting to create AWB
      if (!hasShipment || !shipmentInfo?.shipment_id) {
        notify('error', 'Please create a shipment first. A shipment must be created in Shiprocket before generating an AWB.')
        return
      }
      
      const res = await fetch(`${apiBase}/api/shiprocket/orders/${order.id}/awb`, {
        method: 'POST',
        headers: authHeaders,
      })
      
      // Handle non-JSON responses
      let data: any = {}
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      }
      
      // Check if request was successful (200-299 status codes)
      if (!res.ok) {
        const errorMsg = data?.error || data?.message || data?.details || `Failed to create AWB (${res.status})`
        throw new Error(errorMsg)
      }
      
      // Success
      notify('success','AWB created successfully')
      setHasShipment(true)
      setShipmentInfo(data)
      await load() // Reload order to see updated AWB info
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to create AWB'
      notify('error', errorMessage)
      console.error('Create AWB error:', e)
    } finally {
      setLoading(false)
    }
  }

  const viewTracking = async () => {
    if (!order) return
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/shiprocket/orders/${order.id}/track`, { headers: authHeaders })
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Tracking information not available. Please create a shipment first.')
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.message || `Failed to fetch tracking (${res.status})`)
      }
      const data = await res.json()
      notify('info','Tracking fetched (see console)')
      console.log('Tracking:', data)
    } catch (e: any) {
      notify('error', e?.message || 'Failed to fetch tracking')
      console.error('View tracking error:', e)
    } finally {
      setLoading(false)
    }
  }

  const splitOrder = async () => {
    if (!order) return
    const indexes = splitIndexes.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n))
    if (indexes.length===0) {
      notify('error', 'Provide item indexes like 0,2')
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/api/orders/${order.id}/split`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ itemIndexes: indexes })
      })
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data?.error || data?.message || data?.details || `Failed to split order (${res.status})`
        throw new Error(errorMsg)
      }
      notify('success', `Split created: ${data.split?.order_number || data.split?.id}`)
      await load()
      setSplitIndexes('') // Clear input after successful split
    } catch (e: any) {
      notify('error', e?.message || 'Failed to split order')
      console.error('Split order error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !order) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!order) return <div className="p-6">Not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <p className="text-gray-600">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary">Back</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card md:col-span-2">
          <h2 className="font-semibold mb-3">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 pr-4">{it.title || it.product_id}</td>
                    <td className="py-2 pr-4">{it.sku || '-'}</td>
                    <td className="py-2 pr-4">{it.qty || 1}</td>
                    <td className="py-2 pr-4">₹{Number(it.price || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4 font-medium">₹{Number((it.qty || 1) * (it.price || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="metric-card">
          <h2 className="font-semibold mb-3">Summary</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(order.subtotal||0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>₹{Number(order.shipping||0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>₹{Number(order.tax||0).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>₹{Number(order.total||0).toFixed(2)}</span></div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium">Status</label>
            <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} className="input w-full">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input className="input w-full" placeholder="Add note (optional)" value={note} onChange={e=>setNote(e.target.value)} />
            <button onClick={updateStatus} className="btn-primary w-full">Update Status</button>
            <div className="pt-4 border-t mt-4">
              <label className="block text-sm font-medium">Tags (comma-separated)</label>
              <input className="input w-full" placeholder="e.g. priority,vip" value={tagsInput} onChange={e=>setTagsInput(e.target.value)} />
              <button onClick={updateTags} className="btn-secondary w-full mt-2">Update Tags</button>
            </div>
            <div className="pt-4 border-t mt-4">
              <label className="block text-sm font-medium">Split Items (indexes)</label>
              <input className="input w-full" placeholder="e.g. 0,2" value={splitIndexes} onChange={e=>setSplitIndexes(e.target.value)} />
              <button onClick={splitOrder} className="btn-secondary w-full mt-2">Split Order</button>
            </div>
            <div className="pt-4 border-t mt-4">
              <label className="block text-sm font-medium mb-2">Shipping (Shiprocket)</label>
              {hasShipment && shipmentInfo && (
                <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs">
                  <p className="text-green-700 dark:text-green-300 font-medium">✓ Shipment Created</p>
                  {shipmentInfo.shipment_id && (
                    <p className="text-green-600 dark:text-green-400">ID: {shipmentInfo.shipment_id}</p>
                  )}
                  {shipmentInfo.awb_code && (
                    <p className="text-green-600 dark:text-green-400">AWB: {shipmentInfo.awb_code}</p>
                  )}
                </div>
              )}
              {!hasShipment && (
                <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                  <p className="text-yellow-700 dark:text-yellow-300">⚠️ Create a shipment first to generate AWB</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={createShipment} 
                  className="btn-primary w-full"
                  disabled={loading || hasShipment}
                >
                  {hasShipment ? 'Shipment Already Created' : 'Create Shipment'}
                </button>
                <button 
                  onClick={createAwb} 
                  className="btn-secondary w-full"
                  disabled={loading || !hasShipment}
                  title={!hasShipment ? 'Please create a shipment first' : ''}
                >
                  Generate AWB & Label
                </button>
                <button 
                  onClick={viewTracking} 
                  className="btn-secondary w-full"
                  disabled={loading || !hasShipment || !shipmentInfo?.awb_code}
                  title={!hasShipment ? 'Please create a shipment first' : !shipmentInfo?.awb_code ? 'AWB not generated yet' : ''}
                >
                  View Tracking
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="metric-card">
          <h2 className="font-semibold mb-3">Shipping Address</h2>
          <div className="text-sm space-y-1">
            {order.shipping_address ? (
              typeof order.shipping_address === 'string' ? (
                <p>{order.shipping_address}</p>
              ) : (
                <>
                  {order.shipping_address.firstName || order.shipping_address.first_name ? (
                    <>
                      <p className="font-semibold">
                        {order.shipping_address.firstName || order.shipping_address.first_name} {order.shipping_address.lastName || order.shipping_address.last_name}
                      </p>
                      {order.shipping_address.company && (
                        <p className="text-xs text-gray-600">{order.shipping_address.company}</p>
                      )}
                    </>
                  ) : (
                    <p className="font-semibold">{order.customer_name}</p>
                  )}
                  <p>{order.shipping_address.address || order.shipping_address.street || ''}</p>
                  {order.shipping_address.apartment && (
                    <p>{order.shipping_address.apartment}</p>
                  )}
                  <p>
                    {order.shipping_address.city || ''}, {order.shipping_address.state || ''} {order.shipping_address.zip || ''}
                  </p>
                  <p>{order.shipping_address.country || 'India'}</p>
                  {order.shipping_address.phone && (
                    <p>Phone: {order.shipping_address.phone}</p>
                  )}
                  {order.shipping_address.email && (
                    <p>Email: {order.shipping_address.email}</p>
                  )}
                </>
              )
            ) : (
              <p className="text-gray-600">No shipping address available</p>
            )}
          </div>
        </div>

        {/* Billing Address */}
        {order.billing_address && (
          <div className="metric-card">
            <h2 className="font-semibold mb-3">Billing Address</h2>
            <div className="text-sm space-y-1">
              {typeof order.billing_address === 'string' ? (
                <p>{order.billing_address}</p>
              ) : (
                <>
                  {order.billing_address.firstName || order.billing_address.first_name ? (
                    <>
                      <p className="font-semibold">
                        {order.billing_address.firstName || order.billing_address.first_name} {order.billing_address.lastName || order.billing_address.last_name}
                      </p>
                      {order.billing_address.company && (
                        <p className="text-xs text-gray-600">{order.billing_address.company}</p>
                      )}
                    </>
                  ) : (
                    <p className="font-semibold">{order.customer_name}</p>
                  )}
                  <p>{order.billing_address.address || order.billing_address.street || ''}</p>
                  {order.billing_address.apartment && (
                    <p>{order.billing_address.apartment}</p>
                  )}
                  <p>
                    {order.billing_address.city || ''}, {order.billing_address.state || ''} {order.billing_address.zip || ''}
                  </p>
                  <p>{order.billing_address.country || 'India'}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="metric-card">
        <h2 className="font-semibold mb-3">Timeline</h2>
        <div className="space-y-3">
          {(order.history || []).length === 0 ? (
            <p className="text-sm text-gray-600">No history.</p>
          ) : (
            (order.history || []).map(h => (
              <div key={h.id} className="text-sm">
                <span className="font-medium">{h.new_status}</span>
                {h.old_status ? <span className="text-gray-500"> (from {h.old_status})</span> : null}
                {h.note ? <span className="text-gray-600"> — {h.note}</span> : null}
                <div className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


