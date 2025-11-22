import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useToast } from '../../components/ToastProvider'
import Can from '../../components/Can'
import { socketService } from '../../services/socket'

type Order = {
  id: number
  customer: string
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'cancelled'
  createdAt: string
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
      'x-user-permissions': 'orders:read,orders:update,shipping:update,invoices:read',
      'x-user-role': 'admin'
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
      const res = await fetch(`${apiBase}/api/orders?${params.toString()}`, { headers: authHeaders })
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Access denied. You do not have permission to view orders.')
        } else {
          setError(`Failed to load orders: ${res.status} ${res.statusText}`)
        }
        setItems([])
        return
      }
      
      const data = await res.json()
      // Ensure data is an array
      let orders = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : [])
      
      // Transform backend fields to frontend format
      const transformedOrders = orders.map((order: any) => ({
        ...order,
        customer: order.customer_name || order.customer || '',
        createdAt: order.created_at || order.createdAt || new Date().toISOString()
      }))
      
      setItems(transformedOrders)
      if (transformedOrders.length === 0 && orders.length === 0) {
        setError('Invalid response format from server')
      }
      setSelected([])
    } catch (e) {
      console.error('Error loading orders:', e)
      setError('Failed to load orders')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load()
    
    // Subscribe to real-time order updates
    const unsubscribeOrderCreated = socketService.subscribe('order_created', (newOrder: any) => {
      console.log('New order received:', newOrder)
      const transformed = {
        ...newOrder,
        customer: newOrder.customer_name || newOrder.customer || '',
        createdAt: newOrder.created_at || newOrder.createdAt || new Date().toISOString()
      }
      setItems(prev => [transformed, ...prev])
    })
    
    const unsubscribeOrderUpdated = socketService.subscribe('order_updated', (updatedOrder: any) => {
      console.log('Order updated:', updatedOrder)
      const transformed = {
        ...updatedOrder,
        customer: updatedOrder.customer_name || updatedOrder.customer || '',
        createdAt: updatedOrder.created_at || updatedOrder.createdAt || new Date().toISOString()
      }
      setItems(prev => prev.map(order => 
        order.id === transformed.id ? transformed : order
      ))
    })
    
    return () => {
      unsubscribeOrderCreated()
      unsubscribeOrderUpdated()
    }
  }, [])

  const updateStatus = async (id: number, status: Order['status']) => {
    try {
      const res = await fetch(`${apiBase}/api/orders/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Status update failed')
      }
      
      await load()
      notify('success', `Order ${id} updated to ${status}`)
    } catch (e: any) {
      console.error('Update failed:', e)
      notify('error', `Update failed: ${e.message}`)
    }
  }

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))
  }

  const bulkStatus = async (newStatus: Order['status']) => {
    if (selected.length === 0) return alert('Select orders first')
    const res = await fetch(`${apiBase}/api/bulk/orders/status`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderIds: selected, status: newStatus })
    })
    if (!res.ok) { notify('error','Bulk status failed'); return }
    await load()
    notify('success', `Bulk marked ${newStatus}`)
  }

  const bulkLabels = async () => {
    if (selected.length === 0) return alert('Select orders first')
    const res = await fetch(`${apiBase}/api/bulk/shipping/labels`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderIds: selected })
    })
    if (!res.ok) { notify('error','Bulk labels failed'); return }
    notify('success','Labels queued')
  }

  const bulkInvoices = async () => {
    if (selected.length === 0) return alert('Select orders first')
    const res = await fetch(`${apiBase}/api/bulk/invoices/download`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderIds: selected })
    })
    if (!res.ok) { notify('error','Bulk invoices failed'); return }
    const data = await res.json()
    console.log('Invoice links:', data?.links)
    notify('success','Invoice links generated (check console)')
  }

  const createAwb = async (orderId: number) => {
    try {
      const res = await fetch(`${apiBase}/api/shiprocket/orders/${orderId}/awb`, {
        method: 'POST',
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to create AWB')
      alert('AWB created successfully')
    } catch (e: any) {
      alert(e?.message || 'Failed to create AWB')
    }
  }

  return (
    <>
      <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <style>{`
          :root {
            --arctic-blue-primary: #7DD3D3;
            --arctic-blue-primary-hover: #5EC4C4;
            --arctic-blue-primary-dark: #4A9FAF;
            --arctic-blue-light: #E0F5F5;
            --arctic-blue-lighter: #F0F9F9;
            --arctic-blue-background: #F4F9F9;
          }
        `}</style>
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-3xl font-light mb-2 tracking-[0.15em]" 
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              Orders
            </h1>
            <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Manage and track all customer orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="btn-secondary">Refresh</button>
            <button
              onClick={() => {
                const params = new URLSearchParams()
                if (status) params.set('status', status)
                if (q) params.set('q', q)
                if (from) params.set('from', from)
                if (to) params.set('to', to)
                window.open(`${apiBase}/api/orders/export?${params.toString()}`,'_blank')
              }}
              className="btn-secondary"
            >
              Export CSV
            </button>
            <div className="hidden md:flex items-center gap-2">
              <Can permission="orders:update">
                <button onClick={()=>bulkStatus('paid')} className="btn-secondary">Bulk Mark Paid</button>
              </Can>
              <Can permission="orders:update">
                <button onClick={()=>bulkStatus('shipped')} className="btn-secondary">Bulk Mark Shipped</button>
              </Can>
              <Can permission="shipping:update">
                <button onClick={bulkLabels} className="btn-secondary">Bulk Labels</button>
              </Can>
              <Can permission="invoices:read">
                <button onClick={bulkInvoices} className="btn-secondary">Bulk Invoices</button>
              </Can>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
              placeholder="Search order #" 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            />
            <select 
              value={status} 
              onChange={e=>setStatus(e.target.value)} 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select 
              value={paymentStatus} 
              onChange={e=>setPaymentStatus(e.target.value)} 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            >
              <option value="">Any Payment</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <select 
              value={cod} 
              onChange={e=>setCod(e.target.value)} 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            >
              <option value="">COD/Prepaid</option>
              <option value="true">COD</option>
              <option value="false">Prepaid</option>
            </select>
            <div className="grid grid-cols-2 gap-3 md:col-span-5">
              <input 
                type="date" 
                value={from} 
                onChange={e=>setFrom(e.target.value)} 
                className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
                style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
              />
              <input 
                type="date" 
                value={to} 
                onChange={e=>setTo(e.target.value)} 
                className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
                style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
              />
              <button onClick={load} className="btn-primary md:col-span-2">Apply Filters</button>
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          {loading ? <p>Loading...</p> : error ? <p className="text-red-600">{error}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase" style={{ borderColor: 'var(--arctic-blue-light)', color: 'var(--text-muted)' }}>
                  <tr>
                    <th className="py-4 pr-4"><input type="checkbox" onChange={e=>{
                      if (e.target.checked && Array.isArray(items)) setSelected(items.map(i=>i.id)); else setSelected([])
                    }} checked={selected.length>0 && Array.isArray(items) && selected.length===items.length} /></th>
                    <th className="py-4 pr-4 font-medium">ID</th>
                    <th className="py-4 pr-4 font-medium">Customer</th>
                    <th className="py-4 pr-4 font-medium">Total</th>
                    <th className="py-4 pr-4 font-medium">Status</th>
                    <th className="py-4 pr-4 font-medium">Placed</th>
                    <th className="py-4 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(items) && items.length > 0 ? items.map(o => (
                    <tr key={o.id} className="border-b transition-colors hover:bg-[var(--arctic-blue-lighter)]" style={{ borderColor: 'var(--arctic-blue-light)' }}>
                      <td className="py-4 pr-4"><input type="checkbox" checked={selected.includes(o.id)} onChange={e=>toggleSelect(o.id, e.target.checked)} /></td>
                      <td className="py-4 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{o.id}</td>
                      <td className="py-4 pr-4" style={{ color: 'var(--text-secondary)' }}>{o.customer}</td>
                      <td className="py-4 pr-4 font-semibold" style={{ color: 'var(--arctic-blue-primary-dark)' }}>₹{Number(o.total).toFixed(2)}</td>
                      <td className="py-4 pr-4">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                          o.status === 'paid' ? 'bg-green-100 text-green-800' :
                          o.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4" style={{ color: 'var(--text-muted)' }}>
                        {o.createdAt ? (() => {
                          try {
                            const date = new Date(o.createdAt)
                            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString()
                          } catch {
                            return 'Invalid Date'
                          }
                        })() : 'Invalid Date'}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={()=>navigate(`/admin/orders/${o.id}`)} className="btn-secondary text-xs px-3 py-1.5">Details</button>
                          <Can permission="orders:update">
                            <button onClick={()=>updateStatus(o.id,'paid')} className="btn-secondary text-xs px-3 py-1.5">Mark Paid</button>
                          </Can>
                          <Can permission="orders:update">
                            <button onClick={()=>updateStatus(o.id,'shipped')} className="btn-secondary text-xs px-3 py-1.5">Mark Shipped</button>
                          </Can>
                          <Can permission="shipping:update">
                            <button onClick={()=>createAwb(o.id)} className="btn-secondary text-xs px-3 py-1.5">Create AWB</button>
                          </Can>
                          <Can permission="orders:update">
                            <CancelButton onConfirm={()=>updateStatus(o.id,'cancelled')} />
                          </Can>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                        {error ? error : 'No orders found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CancelButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={()=>setOpen(true)} className="bg-red-600 text-white px-2 py-1 text-xs rounded hover:bg-red-700">Cancel</button>
      <ConfirmDialog open={open} onClose={()=>setOpen(false)} onConfirm={onConfirm} title="Cancel this order?" description="This action cannot be undone." confirmText="Cancel Order" />
    </>
  )
}
