import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import ConfirmDialog from '../components/ConfirmDialog'
import { getApiBaseUrl } from '../utils/apiUrl'

interface Variant {
  id: number
  sku: string
  attributes: any
  price?: number
  mrp?: number
  is_active: boolean
  quantity: number
  reserved: number
  available: number
  low_stock_threshold: number
  is_low_stock: boolean
  lead_time_days?: number
  case_pack_quantity?: number
  min_reorder_quantity?: number
  sold_30d?: number
  daily_velocity?: number | null
  days_of_supply?: number | null
  inventory_health?: string
  suggested_reorder_qty?: number | null
}

interface Product {
  product_id: number
  title: string
  slug: string
  price: number
  list_image?: string
  variants: Variant[]
  total_stock: number
  total_available: number
  low_stock_variants_count: number
}

type InventoryDashboard = {
  sku_count: number
  low_stock_skus: number
  total_available_units: number
  critical_velocity_skus: number
  velocity_window_days: number
  safety_stock_days: number
}

type RestockRow = {
  product_id: number
  title: string
  variant_id: number
  sku: string | null
  available: number
  sold_30d: number
  lead_time_days: number
  case_pack_quantity: number
  min_reorder_quantity: number
  suggested_reorder_qty: number | null
}

type InventoryLogRow = {
  id: number
  product_id: number | null
  variant_id: number | null
  change: number
  reason: string
  created_at: string
  product_title?: string
  sku?: string | null
}

export default function InventoryManagement() {
  const { notify } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [needsSkuOnly, setNeedsSkuOnly] = useState(false)
  const [ensuringProductId, setEnsuringProductId] = useState<number | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set())
  const [editingStock, setEditingStock] = useState<{ productId: number; variantId: number; quantity: number } | null>(null)
  const [editingThreshold, setEditingThreshold] = useState<{ productId: number; variantId: number; threshold: number } | null>(null)
  const [confirmUpdate, setConfirmUpdate] = useState(false)
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null)
  const [editingReplenishment, setEditingReplenishment] = useState<{
    productId: number
    variantId: number
    lead_time_days: number
    case_pack_quantity: number
    min_reorder_quantity: number
  } | null>(null)
  const [restockOpen, setRestockOpen] = useState(false)
  const [restockRows, setRestockRows] = useState<RestockRow[]>([])
  const [restockLoading, setRestockLoading] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogRow[]>([])

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'products:read,products:update',
      'x-user-role': 'admin'
    } as Record<string, string>
  }, [])

  const parseJsonOk = async (res: Response) => {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error((data as any)?.error || `Request failed (${res.status})`)
    }
    return data
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (lowStockOnly) params.set('lowStockOnly', 'true')
      
      const res = await fetch(`${apiBase}/inventory/all?${params.toString()}`, {
        headers: authHeaders
      })
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`)
      }
      
      const data = await res.json()
      if (Array.isArray(data)) {
        setProducts(data)
      } else if (data && Array.isArray(data.data)) {
        setProducts(data.data)
      } else {
        throw new Error(data?.error || 'Failed to fetch products')
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to load inventory')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${apiBase}/inventory/dashboard`, { headers: authHeaders })
      const raw = await parseJsonOk(res)
      setDashboard(raw as InventoryDashboard)
    } catch (e) {
      console.warn('Dashboard fetch failed', e)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchDashboard()
  }, [search, lowStockOnly])

  const toggleProduct = (productId: number) => {
    const newExpanded = new Set(expandedProducts)
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId)
    } else {
      newExpanded.add(productId)
    }
    setExpandedProducts(newExpanded)
  }

  const handleStockEdit = (productId: number, variantId: number, currentQuantity: number) => {
    setEditingStock({ productId, variantId, quantity: currentQuantity })
  }

  const handleThresholdEdit = (productId: number, variantId: number, currentThreshold: number) => {
    setEditingThreshold({ productId, variantId, threshold: currentThreshold })
  }

  const updateStock = async () => {
    if (!editingStock) return
    
    try {
      const { productId, variantId, quantity } = editingStock
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/quantity`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ quantity, reason: 'manual_update' })
      })
      
      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to update stock')
      notify('success', 'Stock updated successfully')
      setEditingStock(null)
      setConfirmUpdate(false)
      fetchProducts()
      fetchDashboard()
    } catch (err: any) {
      notify('error', err?.message || 'Failed to update stock')
    }
  }

  const updateThreshold = async () => {
    if (!editingThreshold) return
    
    try {
      const { productId, variantId, threshold } = editingThreshold
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/low-threshold`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ threshold })
      })
      
      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to update threshold')
      notify('success', 'Low stock threshold updated')
      setEditingThreshold(null)
      setConfirmUpdate(false)
      fetchProducts()
      fetchDashboard()
    } catch (err: any) {
      notify('error', err?.message || 'Failed to update threshold')
    }
  }

  const adjustStock = async (productId: number, variantId: number, delta: number) => {
    try {
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/adjust`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ delta, reason: 'manual_adjustment' })
      })
      
      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to adjust stock')
      notify('success', `Stock ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`)
      fetchProducts()
      fetchDashboard()
    } catch (err: any) {
      notify('error', err?.message || 'Failed to adjust stock')
    }
  }

  const productsMissingSkuCount = useMemo(
    () => products.filter((p) => !(p.variants && p.variants.length > 0)).length,
    [products]
  )

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (lowStockOnly && p.low_stock_variants_count === 0) return false
      if (needsSkuOnly && (p.variants?.length ?? 0) > 0) return false
      return true
    })
  }, [products, lowStockOnly, needsSkuOnly])

  const expandAllRows = () => {
    setExpandedProducts(new Set(filteredProducts.map((p) => p.product_id)))
  }

  const collapseAllRows = () => setExpandedProducts(new Set())

  const ensureDefaultSku = async (productId: number) => {
    try {
      setEnsuringProductId(productId)
      const res = await fetch(`${apiBase}/inventory/${productId}/ensure-default-variant`, {
        method: 'POST',
        headers: authHeaders,
      })
      const raw = await parseJsonOk(res)
      if (raw.success === false) throw new Error((raw as any).error || 'Failed')
      notify('success', 'Default SKU created. Set stock in the row below.')
      setExpandedProducts((prev) => new Set(prev).add(productId))
      await fetchProducts()
      await fetchDashboard()
    } catch (e: any) {
      notify('error', e?.message || 'Could not create SKU')
    } finally {
      setEnsuringProductId(null)
    }
  }

  const formatAttributes = (attrs: any) => {
    if (!attrs || typeof attrs !== 'object') return 'N/A'
    return Object.entries(attrs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  }

  const healthStyle = (health?: string) => {
    const h = (health || '').toLowerCase()
    if (h === 'critical' || h === 'critical_velocity') return 'text-red-700 bg-red-50 border border-red-200'
    if (h === 'watch') return 'text-amber-800 bg-amber-50 border border-amber-200'
    if (h === 'healthy') return 'text-emerald-800 bg-emerald-50 border border-emerald-200'
    if (h === 'no_recent_sales') return 'text-slate-600 bg-slate-50 border border-slate-200'
    return 'text-gray-600 bg-gray-50 border border-gray-200'
  }

  const exportCsv = async () => {
    try {
      const res = await fetch(`${apiBase}/inventory/export.csv`, { headers: authHeaders })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.error || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      notify('success', 'Inventory CSV downloaded')
    } catch (e: any) {
      notify('error', e?.message || 'Export failed')
    }
  }

  const openRestockReport = async () => {
    setRestockOpen(true)
    setRestockLoading(true)
    try {
      const res = await fetch(`${apiBase}/inventory/restock-report`, { headers: authHeaders })
      const raw = await parseJsonOk(res)
      setRestockRows(Array.isArray(raw) ? raw : [])
    } catch (e: any) {
      notify('error', e?.message || 'Failed to load restock report')
      setRestockRows([])
    } finally {
      setRestockLoading(false)
    }
  }

  const openActivityLog = async () => {
    setLogsOpen(true)
    try {
      const res = await fetch(`${apiBase}/inventory/logs?limit=40`, { headers: authHeaders })
      const raw = await parseJsonOk(res)
      setInventoryLogs(Array.isArray(raw) ? raw : [])
    } catch (e: any) {
      notify('error', e?.message || 'Failed to load logs')
      setInventoryLogs([])
    }
  }

  const saveReplenishmentSettings = async () => {
    if (!editingReplenishment) return
    try {
      const { productId, variantId, lead_time_days, case_pack_quantity, min_reorder_quantity } = editingReplenishment
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/settings`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ lead_time_days, case_pack_quantity, min_reorder_quantity }),
      })
      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to save')
      notify('success', 'Replenishment settings saved')
      setEditingReplenishment(null)
      fetchProducts()
      fetchDashboard()
    } catch (e: any) {
      notify('error', e?.message || 'Failed to save settings')
    }
  }

  return (
    <div className="p-6" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      
      <div className="mb-6">
        <h1 
          className="text-3xl font-light mb-2 tracking-[0.15em]" 
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
            letterSpacing: '0.15em'
          }}
        >
          Inventory Management
        </h1>
        <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Stock is tracked per SKU (variant). The catalog lists products; this screen adjusts quantities and replenishment.
        </p>
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 space-y-3">
        <p>
          <strong className="text-slate-900">Why do I see “0 variants”?</strong> Inventory rows attach to{' '}
          <strong>product variants</strong> (SKUs). If a product was created in the catalog but no variant/SKU was generated,
          there is nothing to hold stock yet—use <strong>Create default SKU</strong> for a single-SKU product, or open{' '}
          <strong>Product Variants</strong> to configure sizes/options and generate SKUs.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-slate-500 text-xs uppercase tracking-wide">Shortcuts</span>
          <Link
            to="/admin/products"
            className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-800 border border-slate-200 hover:bg-slate-100"
          >
            Products (add / edit catalog)
          </Link>
          <Link
            to="/admin/product-variants"
            className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-800 border border-slate-200 hover:bg-slate-100"
          >
            Product Variants (matrix SKUs)
          </Link>
          <Link
            to="/admin/warehouses"
            className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-800 border border-slate-200 hover:bg-slate-100"
          >
            Warehouses
          </Link>
        </div>
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">What you can do on this page</summary>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Set on-hand quantity, low-stock threshold, and ± adjustments per SKU</li>
            <li>Replenishment: lead time, case pack, min reorder (used for suggested reorder)</li>
            <li>30-day velocity, days of cover, health, suggested reorder (needs order history)</li>
            <li>Export CSV, restock report, and stock change activity log</li>
          </ul>
        </details>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Show low stock only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={needsSkuOnly}
            onChange={(e) => setNeedsSkuOnly(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">
            Missing SKU only
            {productsMissingSkuCount > 0 && (
              <span className="ml-1 text-amber-700 font-medium">({productsMissingSkuCount})</span>
            )}
          </span>
        </label>
        <button
          type="button"
          onClick={expandAllRows}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAllRows}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          Collapse all
        </button>
        <button
          onClick={() => {
            fetchProducts()
            fetchDashboard()
          }}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={openRestockReport}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
        >
          Restock report
        </button>
        <button
          type="button"
          onClick={openActivityLog}
          className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
        >
          Activity log
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Metrics below are store-wide. Velocity uses order history (last {dashboard?.velocity_window_days ?? 30} days). Reorder suggestions use lead time + {dashboard?.safety_stock_days ?? 7} days safety stock (Amazon-style cover period).
        {dashboard != null && dashboard.sku_count === 0 && products.length > 0 && (
          <span className="block mt-1 text-amber-800">
            No SKUs yet—create a default SKU per product below, or configure variants under Product Variants.
          </span>
        )}
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">SKU count (variants)</div>
          <div className="text-2xl font-semibold">{dashboard?.sku_count ?? '—'}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Available units</div>
          <div className="text-2xl font-semibold">
            {dashboard != null
              ? Number(dashboard.total_available_units || 0).toLocaleString()
              : products.reduce((sum, p) => sum + Number(p.total_available || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Low stock SKUs</div>
          <div className="text-2xl font-semibold text-orange-600">
            {dashboard?.low_stock_skus ?? products.reduce((sum, p) => sum + Number(p.low_stock_variants_count || 0), 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Critical velocity (≤ lead time cover)</div>
          <div className="text-2xl font-semibold text-red-600">
            {dashboard?.critical_velocity_skus ?? '—'}
          </div>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading inventory...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">No products found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.product_id} className="bg-white rounded-lg shadow border overflow-hidden">
              {/* Product Header */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between hover:bg-gray-50/80">
                <div
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleProduct(product.product_id)}
                >
                  {product.list_image && (
                    <img
                      src={product.list_image}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{product.title}</h3>
                    <div className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Stock: {product.total_available.toLocaleString()} available</span>
                      <span>Total on hand: {product.total_stock.toLocaleString()}</span>
                      {product.low_stock_variants_count > 0 && (
                        <span className="text-orange-600 font-medium">
                          {product.low_stock_variants_count} SKU{product.low_stock_variants_count !== 1 ? 's' : ''} low
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-gray-500">
                    <span className="text-sm">
                      {product.variants?.length || 0} SKU{product.variants?.length !== 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${expandedProducts.has(product.product_id) ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div
                  className="flex flex-wrap items-center gap-2 justify-end sm:pl-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to="/admin/products"
                    className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Catalog
                  </Link>
                  <Link
                    to={`/admin/product-variants?product=${product.product_id}`}
                    className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Variants
                  </Link>
                  {!(product.variants && product.variants.length > 0) && (
                    <button
                      type="button"
                      disabled={ensuringProductId === product.product_id}
                      onClick={() => ensureDefaultSku(product.product_id)}
                      className="text-xs px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {ensuringProductId === product.product_id ? 'Creating…' : 'Create default SKU'}
                    </button>
                  )}
                </div>
              </div>

              {/* Variants List */}
              {expandedProducts.has(product.product_id) && (
                <div className="border-t bg-gray-50">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Attributes</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Available</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reserved</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Threshold</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">30d sold</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Days cover</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Health</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Suggest reorder</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {product.variants.map((variant) => (
                            <tr 
                              key={variant.id} 
                              className={variant.is_low_stock ? 'bg-orange-50' : ''}
                            >
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium">{variant.sku || 'N/A'}</div>
                                {variant.is_low_stock && (
                                  <span className="text-xs text-orange-600 font-medium">Low Stock</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600">{formatAttributes(variant.attributes)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-semibold">{variant.available.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">of {variant.quantity.toLocaleString()}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600">{variant.reserved.toLocaleString()}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600">{variant.low_stock_threshold.toLocaleString()}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {variant.sold_30d != null ? Number(variant.sold_30d).toLocaleString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {variant.days_of_supply != null ? `${variant.days_of_supply} d` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded capitalize ${healthStyle(variant.inventory_health)}`}>
                                  {(variant.inventory_health || '—').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                {variant.suggested_reorder_qty != null ? variant.suggested_reorder_qty.toLocaleString() : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleStockEdit(product.product_id, variant.id, variant.quantity)}
                                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                  >
                                    Set Qty
                                  </button>
                                  <button
                                    onClick={() => adjustStock(product.product_id, variant.id, 10)}
                                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                    title="Add 10"
                                  >
                                    +10
                                  </button>
                                  <button
                                    onClick={() => adjustStock(product.product_id, variant.id, -10)}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                    title="Remove 10"
                                  >
                                    -10
                                  </button>
                                  <button
                                    onClick={() => handleThresholdEdit(product.product_id, variant.id, variant.low_stock_threshold)}
                                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                  >
                                    Threshold
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingReplenishment({
                                        productId: product.product_id,
                                        variantId: variant.id,
                                        lead_time_days: variant.lead_time_days ?? 14,
                                        case_pack_quantity: variant.case_pack_quantity ?? 1,
                                        min_reorder_quantity: variant.min_reorder_quantity ?? 1,
                                      })
                                    }
                                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                  >
                                    Replenish
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-3 bg-amber-50/50 border-t border-amber-100">
                      <p className="text-gray-800 font-medium">No SKUs for this product yet</p>
                      <p className="text-sm text-gray-600 max-w-lg mx-auto">
                        Stock is stored per variant. Create one default SKU for simple products, or define options under Product Variants.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          disabled={ensuringProductId === product.product_id}
                          onClick={() => ensureDefaultSku(product.product_id)}
                          className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 disabled:opacity-50"
                        >
                          {ensuringProductId === product.product_id ? 'Creating…' : 'Create default SKU'}
                        </button>
                        <Link
                          to={`/admin/product-variants?product=${product.product_id}`}
                          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 hover:bg-gray-50"
                        >
                          Open Product Variants
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Stock Dialog */}
      {editingStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Update Stock Quantity</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New Quantity</label>
              <input
                type="number"
                value={editingStock.quantity}
                onChange={(e) => setEditingStock({ ...editingStock, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingStock(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmUpdate(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Threshold Dialog */}
      {editingThreshold && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Low Stock Threshold</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Threshold</label>
              <input
                type="number"
                value={editingThreshold.threshold}
                onChange={(e) => setEditingThreshold({ ...editingThreshold, threshold: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Product will be marked as low stock when available quantity reaches this threshold</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingThreshold(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmUpdate(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmUpdate}
        onClose={() => {
          setConfirmUpdate(false)
          if (editingStock) setEditingStock(null)
          if (editingThreshold) setEditingThreshold(null)
        }}
        onConfirm={() => {
          if (editingStock) {
            updateStock()
          } else if (editingThreshold) {
            updateThreshold()
          }
        }}
        title="Confirm Update"
        description={editingStock 
          ? `Are you sure you want to set stock quantity to ${editingStock.quantity}?`
          : `Are you sure you want to set low stock threshold to ${editingThreshold?.threshold}?`
        }
        confirmText="Update"
      />

      {editingReplenishment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Replenishment settings</h3>
            <p className="text-sm text-gray-600 mb-4">
              Lead time, case pack, and minimum reorder are used to compute suggested reorder quantities (similar to Amazon restock recommendations).
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Lead time (days)</label>
                <input
                  type="number"
                  min={0}
                  value={editingReplenishment.lead_time_days}
                  onChange={(e) =>
                    setEditingReplenishment({
                      ...editingReplenishment,
                      lead_time_days: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Case pack (units per supplier case)</label>
                <input
                  type="number"
                  min={1}
                  value={editingReplenishment.case_pack_quantity}
                  onChange={(e) =>
                    setEditingReplenishment({
                      ...editingReplenishment,
                      case_pack_quantity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Minimum reorder quantity</label>
                <input
                  type="number"
                  min={1}
                  value={editingReplenishment.min_reorder_quantity}
                  onChange={(e) =>
                    setEditingReplenishment({
                      ...editingReplenishment,
                      min_reorder_quantity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setEditingReplenishment(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReplenishmentSettings}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {restockOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Restock report</h3>
                <p className="text-sm text-gray-600">Suggested reorder rounds up to case packs and respects minimum reorder.</p>
              </div>
              <button
                type="button"
                onClick={() => setRestockOpen(false)}
                className="text-gray-500 hover:text-gray-800 px-2"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1">
              {restockLoading ? (
                <div className="text-center py-8 text-gray-500">Loading…</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2">Product</th>
                      <th className="py-2 pr-2">SKU</th>
                      <th className="py-2 pr-2">Available</th>
                      <th className="py-2 pr-2">30d sold</th>
                      <th className="py-2 pr-2">Lead (d)</th>
                      <th className="py-2 pr-2">Case pack</th>
                      <th className="py-2 pr-2">Suggested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restockRows.map((row) => (
                      <tr key={`${row.product_id}-${row.variant_id}`} className="border-b border-gray-100">
                        <td className="py-2 pr-2 max-w-xs truncate" title={row.title}>
                          {row.title}
                        </td>
                        <td className="py-2 pr-2">{row.sku || '—'}</td>
                        <td className="py-2 pr-2">{row.available}</td>
                        <td className="py-2 pr-2">{Number(row.sold_30d || 0).toFixed(0)}</td>
                        <td className="py-2 pr-2">{row.lead_time_days}</td>
                        <td className="py-2 pr-2">{row.case_pack_quantity}</td>
                        <td className="py-2 pr-2 font-medium">
                          {row.suggested_reorder_qty != null ? row.suggested_reorder_qty : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {logsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Inventory activity</h3>
              <button
                type="button"
                onClick={() => setLogsOpen(false)}
                className="text-gray-500 hover:text-gray-800 px-2"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1 text-sm">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">When</th>
                    <th className="py-2 pr-2">Product</th>
                    <th className="py-2 pr-2">SKU</th>
                    <th className="py-2 pr-2">Δ</th>
                    <th className="py-2 pr-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2">{log.product_title || `#${log.product_id ?? ''}`}</td>
                      <td className="py-2 pr-2">{log.sku || '—'}</td>
                      <td className="py-2 pr-2 font-medium">{log.change > 0 ? `+${log.change}` : log.change}</td>
                      <td className="py-2 pr-2">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventoryLogs.length === 0 && (
                <p className="text-center text-gray-500 py-6">No log entries yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
