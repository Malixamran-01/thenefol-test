import React, { useState, useEffect } from 'react'
import { useToast } from '../components/ToastProvider'
import ConfirmDialog from '../components/ConfirmDialog'

interface InventorySummary {
  product_id: number
  available: number
  total: number
  low_variants: number
}

interface LowStockItem {
  variant_id: number
  product_id: number
  sku: string
  quantity: number
  low_stock_threshold: number
}

export default function InventoryManagement() {
  const { notify } = useToast()
  const [productId, setProductId] = useState<string>('')
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [adjustment, setAdjustment] = useState({ variantId: '', delta: '', reason: '' })

  const fetchSummary = async () => {
    const resp = await fetch(`/api/inventory/${productId}/summary`)
    const data = await resp.json()
    if (data.success) setSummary(data.data)
    else notify('error','Failed to fetch summary')
  }

  const fetchLowStock = async () => {
    const resp = await fetch('/api/inventory/low-stock')
    const data = await resp.json()
    if (data.success) setLowStock(data.data)
  }

  const [confirmAdjust, setConfirmAdjust] = useState(false)
  const adjustStock = async () => {
    const [productId, variantId] = adjustment.variantId.split(':')
    const resp = await fetch(`/api/inventory/${productId}/${variantId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: Number(adjustment.delta), reason: adjustment.reason || 'manual' })
    })
    const data = await resp.json()
    if (data.success) {
      notify('success','Stock adjusted')
      setAdjustment({ variantId: '', delta: '', reason: '' })
      fetchSummary()
    } else {
      notify('error','Failed to adjust stock')
    }
  }

  useEffect(() => {
    fetchLowStock()
  }, [])

  return (
    <>
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Product Inventory Summary</h2>
        <input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="Enter product ID"
          className="border p-2 rounded mr-2"
        />
        <button onClick={fetchSummary} className="px-4 py-2 bg-blue-500 text-white rounded">
          Fetch Summary
        </button>
        {summary && (
          <div className="mt-4 border p-4 rounded">
            <p>Available: {summary.available}</p>
            <p>Total: {summary.total}</p>
            <p>Low Stock Variants: {summary.low_variants}</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Adjust Stock</h2>
        <input
          type="text"
          value={adjustment.variantId}
          onChange={(e) => setAdjustment({ ...adjustment, variantId: e.target.value })}
          placeholder="productId:variantId"
          className="border p-2 rounded mr-2"
        />
        <input
          type="number"
          value={adjustment.delta}
          onChange={(e) => setAdjustment({ ...adjustment, delta: e.target.value })}
          placeholder="Change in quantity"
          className="border p-2 rounded mr-2"
        />
        <input
          type="text"
          value={adjustment.reason}
          onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
          placeholder="Reason"
          className="border p-2 rounded mr-2"
        />
        <button onClick={()=>setConfirmAdjust(true)} className="px-4 py-2 bg-green-500 text-white rounded">Adjust Stock</button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Low Stock Items</h2>
        {lowStock.length === 0 ? (
          <p className="text-gray-500">No low stock items</p>
        ) : (
          <div className="space-y-2">
            {lowStock.map(item => (
              <div key={item.variant_id} className="border p-3 rounded">
                <p><strong>SKU:</strong> {item.sku}</p>
                <p><strong>Available:</strong> {item.quantity}</p>
                <p><strong>Threshold:</strong> {item.low_stock_threshold}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    <ConfirmDialog open={confirmAdjust} onClose={()=>setConfirmAdjust(false)} onConfirm={adjustStock} title="Adjust stock?" description="Please confirm updating stock levels." confirmText="Adjust" />
    </>
  )
}

