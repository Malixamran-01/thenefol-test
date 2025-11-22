import React, { useEffect, useState } from 'react'
import { socketService } from '../../services/socket'
import { useToast } from '../../components/ToastProvider'

type Shipment = {
  id: number
  order_id: string
  shipment_id?: string
  awb_code?: string
  courier_name?: string
  tracking_url?: string
  status: string
  customer_name: string
  customer_email: string
  total: number
  order_status: string
  created_at: string
}

export default function Shipments() {
  const { notify } = useToast()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const getApiBase = () => {
    if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
    const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
    const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
    return `http://${host}:${port}`
  }
  const apiBase = getApiBase()
  const [pickupPin, setPickupPin] = useState('')
  const [deliveryPin, setDeliveryPin] = useState('')
  const [weight, setWeight] = useState('0.5')
  const [isCOD, setIsCOD] = useState(false)
  const [serviceability, setServiceability] = useState<any | null>(null)
  const [pickupDate, setPickupDate] = useState('')
  const [ndr, setNdr] = useState<any | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${apiBase}/api/shiprocket/shipments`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      // Ensure data is an array
      setShipments(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load shipments:', e)
      setError('Failed to load shipments')
      setShipments([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load()
    
    // Subscribe to real-time shipment updates
    const unsubscribeShipmentCreated = socketService.subscribe('shipment_created', (newShipment: any) => {
      console.log('New shipment created:', newShipment)
      setShipments(prev => [newShipment, ...prev])
    })
    
    const unsubscribeShipmentUpdated = socketService.subscribe('shipment_updated', (updatedShipment: any) => {
      console.log('Shipment updated:', updatedShipment)
      setShipments(prev => prev.map(shipment => 
        shipment.id === updatedShipment.id ? updatedShipment : shipment
      ))
    })
    
    return () => {
      unsubscribeShipmentCreated()
      unsubscribeShipmentUpdated()
    }
  }, [])

  const createShiprocketShipment = async (orderId: string) => {
    try {
      const res = await fetch(`${apiBase}/api/shiprocket/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('Shiprocket shipment created:', data)
        load()
        notify('success', 'Shipment created successfully in Shiprocket!')
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMsg = errorData?.error || errorData?.message || 'Failed to create Shiprocket shipment'
        setError(errorMsg)
        notify('error', errorMsg)
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to create Shiprocket shipment'
      setError(errorMsg)
      notify('error', errorMsg)
    }
  }

  const updateShipmentStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`${apiBase}/api/shiprocket/shipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          awb_code: `AWB${Date.now()}`,
          courier_name: 'Shiprocket',
          tracking_url: `https://shiprocket.co/tracking/${id}`
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('Shipment status updated:', data)
        load()
        notify('success','Shipment updated')
      } else {
        setError('Failed to update shipment status')
        notify('error','Failed to update shipment status')
      }
    } catch (e) {
      setError('Failed to update shipment status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'created': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
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
            Shipments
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage Shiprocket deliveries
          </p>
        </div>
        <button 
          onClick={load}
          className="btn-primary"
        >
          Refresh
        </button>
      </div>

      {/* Pincode Serviceability Checker */}
      <div className="metric-card">
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Pincode Serviceability</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Pickup Postcode</label>
            <input 
              value={pickupPin} 
              onChange={e => setPickupPin(e.target.value)} 
              placeholder="110001" 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)] w-40"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Delivery Postcode</label>
            <input 
              value={deliveryPin} 
              onChange={e => setDeliveryPin(e.target.value)} 
              placeholder="560001" 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)] w-40"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Weight (kg)</label>
            <input 
              type="number" 
              step="0.1" 
              value={weight} 
              onChange={e => setWeight(e.target.value)} 
              className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)] w-28"
              style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={isCOD} onChange={e => setIsCOD(e.target.checked)} /> COD
          </label>
          <button
            onClick={async () => {
              try {
                setServiceability(null)
                const params = new URLSearchParams({
                  pickup_postcode: pickupPin,
                  delivery_postcode: deliveryPin,
                  weight,
                  cod: isCOD ? '1' : '0',
                })
                const res = await fetch(`${apiBase}/api/shiprocket/serviceability?${params.toString()}`, {
                  headers: { 'x-user-role': 'admin', 'x-user-permissions': 'shipping:read' }
                })
                const data = await res.json()
                setServiceability(data)
              } catch (_) {
                setServiceability({ success: false, message: 'Failed to check serviceability' })
              }
            }}
            className="btn-primary"
          >
            Check Serviceability
          </button>
        </div>
        {serviceability && (
          <div className="mt-4">
            {serviceability.data?.available_courier_companies && serviceability.data.available_courier_companies.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">
                  Available Couriers ({serviceability.data.available_courier_companies.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {serviceability.data.available_courier_companies.map((courier: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{courier.courier_name}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {courier.is_surface ? 'Surface' : 'Air'} • {courier.city}, {courier.state}
                          </p>
                        </div>
                        {courier.recommended && (
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded">Recommended</span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400">Rate:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">₹{courier.rate || courier.freight_charge}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400">Delivery:</span>
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {courier.etd || `${courier.estimated_delivery_days} days`}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400">COD:</span>
                          <span className={`text-xs font-medium ${courier.cod ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {courier.cod ? 'Available' : 'Not Available'}
                          </span>
                        </div>
                        
                        {courier.cod_charges > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 dark:text-slate-400">COD Charges:</span>
                            <span className="text-xs text-slate-900 dark:text-slate-100">₹{courier.cod_charges}</span>
                          </div>
                        )}
                        
                        {courier.rating && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Rating:</span>
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                              ⭐ {courier.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 dark:text-slate-400">Tracking:</span>
                          <span className="text-slate-900 dark:text-slate-100">{courier.realtime_tracking || 'N/A'}</span>
                        </div>
                        
                        {courier.cutoff_time && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Cutoff:</span>
                            <span className="text-slate-900 dark:text-slate-100">{courier.cutoff_time}</span>
                          </div>
                        )}
                      </div>
                      
                      {courier.courier_company_id === serviceability.data.recommended_courier_company_id && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            🏆 Shiprocket Recommended
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No courier companies available for this route.
                </p>
              </div>
            )}
            
            {/* Raw JSON Toggle for debugging */}
            <details className="mt-4">
              <summary className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                Show Raw Response (for debugging)
              </summary>
              <pre className="mt-2 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(serviceability, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Manifest & Pickup */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Manifest & Pickup</h2>
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={async () => {
              try {
                const orderIds = shipments.map(s => Number(s.order_id)).filter(Boolean)
                const res = await fetch(`${apiBase}/api/shiprocket/manifest`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin', 'x-user-permissions': 'shipping:update' },
                  body: JSON.stringify({ orderIds })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || 'Failed')
                alert(`Manifest Ready: ${data.manifest_url}`)
              } catch (e: any) {
                alert(e?.message || 'Failed to generate manifest')
              }
            }}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
          >
            Generate Manifest (All)
          </button>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Pickup Date</label>
            <input type="date" value={pickupDate} onChange={e=>setPickupDate(e.target.value)} className="border px-3 py-2 rounded w-44 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          </div>
          <button
            onClick={async () => {
              if (!pickupDate) return alert('Choose pickup date')
              try {
                const orderIds = shipments.map(s => Number(s.order_id)).filter(Boolean)
                const res = await fetch(`${apiBase}/api/shiprocket/pickup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin', 'x-user-permissions': 'shipping:update' },
                  body: JSON.stringify({ pickup_date: pickupDate, orderIds })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || 'Failed')
                alert('Pickup scheduled')
              } catch (e: any) {
                alert(e?.message || 'Failed to schedule pickup')
              }
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Schedule Pickup
          </button>
        </div>
      </div>

      {/* NDR */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Non-Delivery Reports (NDR)</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                const res = await fetch(`${apiBase}/api/shiprocket/ndr`, { headers: { 'x-user-role': 'admin', 'x-user-permissions': 'shipping:read' } })
                const data = await res.json()
                setNdr(data)
              } catch (_) {
                setNdr({ items: [] })
              }
            }}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
          >
            Load NDRs
          </button>
        </div>
        {ndr && (
          <pre className="mt-3 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded overflow-auto max-h-64">{JSON.stringify(ndr, null, 2)}</pre>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="text-slate-600 dark:text-slate-400">Loading shipments...</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    AWB Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                      {shipment.order_number || shipment.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{shipment.customer_name || 'N/A'}</div>
                        <div className="text-slate-500 dark:text-slate-400">{shipment.customer_email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      ₹{shipment.total ? Number(shipment.total).toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {shipment.awb_code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {shipment.courier_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {shipment.status === 'pending' && (
                        <button
                          onClick={() => createShiprocketShipment(shipment.order_id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Create Shipment
                        </button>
                      )}
                      {shipment.status === 'created' && (
                        <button
                          onClick={() => updateShipmentStatus(shipment.id, 'shipped')}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Mark Shipped
                        </button>
                      )}
                      {shipment.status === 'shipped' && (
                        <button
                          onClick={() => updateShipmentStatus(shipment.id, 'delivered')}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {shipment.tracking_url && (
                        <a
                          href={shipment.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Track
                        </a>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${apiBase}/api/shiprocket/rto/${shipment.id}`, {
                              method: 'POST',
                              headers: { 'x-user-role': 'admin', 'x-user-permissions': 'shipping:update' }
                            })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data?.error || 'Failed')
                            alert('Marked RTO')
                            load()
                          } catch (e: any) {
                            alert(e?.message || 'Failed to mark RTO')
                          }
                        }}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        Mark RTO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


