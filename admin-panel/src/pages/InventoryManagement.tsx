import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import ConfirmDialog from '../components/ConfirmDialog'
import { getApiBaseUrl } from '../utils/apiUrl'

interface Variant {
  id: number
  sku: string
  attributes: any
  hsn?: string | null
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
  /** SKU stored on product.details (catalog / CSV import) — not the same as product_variants until synced */
  catalog_sku?: string | null
  catalog_hsn?: string | null
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

type InventoryModal =
  | { type: null; data: null }
  | {
      type: 'stock'
      data: { productId: number; variantId: number; quantity: number; step: 'form' | 'confirm' }
    }
  | {
      type: 'threshold'
      data: { productId: number; variantId: number; threshold: number; step: 'form' | 'confirm' }
    }
  | {
      type: 'replenishment'
      data: {
        productId: number
        variantId: number
        lead_time_days: number
        case_pack_quantity: number
        min_reorder_quantity: number
      }
    }
  | { type: 'restock'; data: null }
  | { type: 'logs'; data: null }

type SelectionKey = `${number}-${number}`

export default function InventoryManagement() {
  const { notify } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [needsSkuOnly, setNeedsSkuOnly] = useState(false)
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'critical' | 'high' | 'no_sales'>('all')
  const [ensuringProductId, setEnsuringProductId] = useState<number | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set())
  const [modal, setModal] = useState<InventoryModal>({ type: null, data: null })
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null)
  const [restockRows, setRestockRows] = useState<RestockRow[]>([])
  const [restockLoading, setRestockLoading] = useState(false)
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogRow[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set())
  const [selectedSku, setSelectedSku] = useState<{
    key: SelectionKey
    product: Product
    variant: Variant
  } | null>(null)
  const closeModal = useCallback(() => setModal({ type: null, data: null }), [])

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

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
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
  }, [apiBase, authHeaders, debouncedSearch, lowStockOnly, notify])

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/inventory/dashboard`, { headers: authHeaders })
      const raw = await parseJsonOk(res)
      setDashboard(raw as InventoryDashboard)
    } catch (e) {
      console.warn('Dashboard fetch failed', e)
    }
  }, [apiBase, authHeaders])

  const refreshAll = useCallback(async () => {
    await fetchProducts()
    await fetchDashboard()
  }, [fetchProducts, fetchDashboard])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 400)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetchProducts()
  }, [debouncedSearch, lowStockOnly, fetchProducts])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

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
    setModal({ type: 'stock', data: { productId, variantId, quantity: currentQuantity, step: 'form' } })
  }

  const handleThresholdEdit = (productId: number, variantId: number, currentThreshold: number) => {
    setModal({ type: 'threshold', data: { productId, variantId, threshold: currentThreshold, step: 'form' } })
  }

  const updateStock = async () => {
    if (modal.type !== 'stock' || modal.data.step !== 'confirm') return

    try {
      const { productId, variantId, quantity } = modal.data
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/quantity`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ quantity, reason: 'manual_update' })
      })

      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to update stock')
      notify('success', 'Stock updated successfully')
      closeModal()
      await refreshAll()
    } catch (err: any) {
      notify('error', err?.message || 'Failed to update stock')
    }
  }

  const updateThreshold = async () => {
    if (modal.type !== 'threshold' || modal.data.step !== 'confirm') return

    try {
      const { productId, variantId, threshold } = modal.data
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/low-threshold`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ threshold })
      })

      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to update threshold')
      notify('success', 'Low stock threshold updated')
      closeModal()
      await refreshAll()
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
      await refreshAll()
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
      if (velocityFilter !== 'all' && (p.variants?.length ?? 0) > 0) {
        const match = p.variants!.some((v) => {
          const h = (v.inventory_health || '').toLowerCase()
          if (velocityFilter === 'critical') return h === 'critical' || h === 'critical_velocity'
          if (velocityFilter === 'high') return (v.daily_velocity ?? 0) > 0 && h !== 'no_recent_sales'
          if (velocityFilter === 'no_sales') return h === 'no_recent_sales' || (v.sold_30d ?? 0) === 0
          return true
        })
        if (!match) return false
      }
      return true
    })
  }, [products, lowStockOnly, needsSkuOnly, velocityFilter])

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
      const p = products.find((x) => x.product_id === productId)
      notify(
        'success',
        p?.catalog_sku
          ? 'Catalog SKU and HSN synced to inventory. Adjust quantities below.'
          : 'Inventory SKU created. Set quantities below.'
      )
      setExpandedProducts((prev) => new Set(prev).add(productId))
      await refreshAll()
    } catch (e: any) {
      notify('error', e?.message || 'Could not create SKU')
    } finally {
      setEnsuringProductId(null)
    }
  }

  const formatAttributes = (attrs: any) => {
    if (!attrs || typeof attrs !== 'object') return '—'
    return Object.entries(attrs)
      .filter(([key]) => String(key).toLowerCase() !== 'hsn')
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ') || '—'
  }

  const displayHsn = (variant: Variant, product: Product) =>
    variant.hsn || product.catalog_hsn || null

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
    setModal({ type: 'restock', data: null })
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
    setModal({ type: 'logs', data: null })
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
    if (modal.type !== 'replenishment') return
    try {
      const { productId, variantId, lead_time_days, case_pack_quantity, min_reorder_quantity } = modal.data
      const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/settings`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ lead_time_days, case_pack_quantity, min_reorder_quantity }),
      })
      const data = await parseJsonOk(res)
      if (data.success === false) throw new Error(data.error || 'Failed to save')
      notify('success', 'Replenishment settings saved')
      closeModal()
      await refreshAll()
    } catch (e: any) {
      notify('error', e?.message || 'Failed to save settings')
    }
  }

  const productListScrollRef = useRef<HTMLDivElement>(null)
  const productVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => productListScrollRef.current,
    estimateSize: () => 200,
    overscan: 8,
  })

  const allVisibleProductIds = useMemo(() => filteredProducts.map((p) => p.product_id), [filteredProducts])

  const toggleSelectAllVisible = () => {
    setSelectedProductIds((prev) => {
      const allSelected =
        allVisibleProductIds.length > 0 && allVisibleProductIds.every((id) => prev.has(id))
      if (allSelected) return new Set()
      return new Set(allVisibleProductIds)
    })
  }

  const exportSelectedProductsCsv = () => {
    if (selectedProductIds.size === 0) {
      notify('info', 'Select at least one product')
      return
    }
    const rows: string[][] = [['product_id', 'title', 'catalog_sku', 'catalog_hsn', 'variant_sku', 'hsn', 'available', 'reserved', 'low_threshold']]
    for (const id of selectedProductIds) {
      const p = products.find((x) => x.product_id === id)
      if (!p) continue
      const base = [
        String(p.product_id),
        p.title,
        p.catalog_sku ?? '',
        p.catalog_hsn ?? '',
      ]
      if (p.variants?.length) {
        for (const v of p.variants) {
          rows.push([
            ...base,
            v.sku ?? '',
            v.hsn || p.catalog_hsn || '',
            String(v.available),
            String(v.reserved),
            String(v.low_stock_threshold),
          ])
        }
      } else {
        rows.push([...base, '', '', '0', '0', '0'])
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-selected-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify('success', 'Exported selected products')
  }

  const bulkSyncCatalogToInventory = async () => {
    const targets = [...selectedProductIds].filter((id) => {
      const p = products.find((x) => x.product_id === id)
      return p && !(p.variants && p.variants.length > 0)
    })
    if (targets.length === 0) {
      notify('info', 'No selected products need a catalog → inventory sync')
      return
    }
    let ok = 0
    for (const productId of targets) {
      try {
        setEnsuringProductId(productId)
        const res = await fetch(`${apiBase}/inventory/${productId}/ensure-default-variant`, {
          method: 'POST',
          headers: authHeaders,
        })
        const raw = await parseJsonOk(res)
        if (raw.success === false) throw new Error((raw as any).error || 'Failed')
        ok += 1
        setExpandedProducts((prev) => new Set(prev).add(productId))
      } catch {
        /* continue */
      } finally {
        setEnsuringProductId(null)
      }
    }
    if (ok > 0) notify('success', `Synced ${ok} of ${targets.length} product(s)`)
    else notify('error', 'Could not sync selected products')
    await refreshAll()
  }

  const selectionKey = (productId: number, variantId: number): SelectionKey => `${productId}-${variantId}`

  const toggleProductSelect = (productId: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
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
          <strong className="text-slate-900">SKU &amp; HSN from your catalog/CSV live on the product record</strong> (stored in{' '}
          <code className="text-xs bg-slate-200/80 px-1 rounded">products.details</code>). <strong>Stock counts</strong> live on{' '}
          <strong>inventory ↔ product variants</strong>. If you imported SKU/HSN but never created a variant row, this page
          shows your catalog codes but <strong>0 inventory SKUs</strong> until you sync—use the teal button to create one
          variant that reuses your catalog SKU and HSN.
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <span className="text-slate-500">Velocity</span>
          <select
            value={velocityFilter}
            onChange={(e) => setVelocityFilter(e.target.value as typeof velocityFilter)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="all">All</option>
            <option value="critical">Critical / velocity risk</option>
            <option value="high">Active demand</option>
            <option value="no_sales">No recent sales</option>
          </select>
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
          type="button"
          onClick={() => refreshAll()}
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
            No inventory SKUs yet—sync from catalog (teal button per product) or use Product Variants for multi-SKU products.
          </span>
        )}
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total SKUs</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{dashboard?.sku_count ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Stock value (units)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {dashboard != null
              ? Number(dashboard.total_available_units || 0).toLocaleString()
              : products.reduce((sum, p) => sum + Number(p.total_available || 0), 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Available units across catalog</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-900/80">Low stock alerts</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">
            {dashboard?.low_stock_skus ?? products.reduce((sum, p) => sum + Number(p.low_stock_variants_count || 0), 0)}
          </div>
        </div>
        <div className="rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-rose-900/80">Out of stock</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-rose-700">
            {products.reduce(
              (sum, p) => sum + (p.variants?.filter((v) => Number(v.available) <= 0).length ?? 0),
              0
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Critical velocity</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-red-600">
            {dashboard?.critical_velocity_skus ?? '—'}
          </div>
        </div>
      </div>

      {/* Products + insights */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading inventory...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">No products found</div>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={
                    allVisibleProductIds.length > 0 &&
                    allVisibleProductIds.every((id) => selectedProductIds.has(id))
                  }
                  onChange={toggleSelectAllVisible}
                />
                <span>
                  Select all on page <span className="tabular-nums">({filteredProducts.length})</span>
                </span>
              </label>
            </div>
            {selectedProductIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 to-white px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-indigo-950">{selectedProductIds.size} selected</span>
                <button
                  type="button"
                  onClick={bulkSyncCatalogToInventory}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  Sync catalog → inventory
                </button>
                <button
                  type="button"
                  onClick={exportSelectedProductsCsv}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  Export selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProductIds(new Set())}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            )}
            <div
              ref={productListScrollRef}
              className="max-h-[calc(100vh-200px)] min-h-[280px] overflow-auto rounded-xl border border-slate-200/80 bg-slate-50/40 p-2"
            >
              <div style={{ height: productVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                {productVirtualizer.getVirtualItems().map((vi) => {
                  const product = filteredProducts[vi.index]
                  return (
                    <div
                      key={product.product_id}
                      data-index={vi.index}
                      ref={productVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vi.start}px)`,
                      }}
                      className="px-0 pb-4"
                    >
                      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              {/* Product Header */}
              <div className="flex flex-col justify-between gap-3 p-4 hover:bg-gray-50/80 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1.5 h-4 w-4 shrink-0 rounded border-slate-300"
                    checked={selectedProductIds.has(product.product_id)}
                    onChange={() => toggleProductSelect(product.product_id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${product.title}`}
                  />
                <div
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-4"
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
                      <span>
                        <span className="font-medium text-slate-800">{product.total_available.toLocaleString()}</span> units
                        available
                      </span>
                      <span>On hand: {product.total_stock.toLocaleString()}</span>
                      {(product.catalog_sku || product.catalog_hsn) && (
                        <span className="text-slate-500">
                          Catalog:{' '}
                          {product.catalog_sku ? (
                            <span className="font-mono text-slate-700">SKU {product.catalog_sku}</span>
                          ) : null}
                          {product.catalog_sku && product.catalog_hsn ? ' · ' : null}
                          {product.catalog_hsn ? (
                            <span className="font-mono text-slate-700">HSN {product.catalog_hsn}</span>
                          ) : null}
                        </span>
                      )}
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
                      className="text-xs px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 font-medium"
                      title="Creates one product_variants row + inventory, using catalog SKU/HSN when present"
                    >
                      {ensuringProductId === product.product_id
                        ? 'Syncing…'
                        : product.catalog_sku
                          ? 'Sync catalog SKU → inventory'
                          : 'Create inventory SKU'}
                    </button>
                  )}
                </div>
              </div>

              {/* Variants List */}
              {expandedProducts.has(product.product_id) && (
                <div className="border-t bg-gray-50">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="max-h-[min(60vh,540px)] overflow-auto overflow-x-auto rounded-b-xl">
                      <table className="w-full min-w-[960px] border-collapse">
                        <thead>
                          <tr className="sticky top-0 z-10 border-b border-slate-200 bg-white text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                            <th className="px-3 py-2.5">SKU</th>
                            <th className="px-3 py-2.5">HSN</th>
                            <th className="px-3 py-2.5">Variant</th>
                            <th className="px-3 py-2.5 w-[220px]">Units</th>
                            <th className="px-3 py-2.5">30d</th>
                            <th className="px-3 py-2.5">Cover</th>
                            <th className="px-3 py-2.5">Health</th>
                            <th className="px-3 py-2.5">Reorder</th>
                            <th className="px-3 py-2.5">More</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.variants.map((variant) => (
                            <tr
                              key={variant.id}
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button, a')) return
                                setSelectedSku({
                                  key: selectionKey(product.product_id, variant.id),
                                  product,
                                  variant,
                                })
                              }}
                              className={`cursor-pointer border-b border-slate-100 transition-colors ${variant.is_low_stock ? 'bg-amber-50/60' : 'bg-white hover:bg-slate-50/80'} ${selectedSku?.key === selectionKey(product.product_id, variant.id) ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-300/50' : ''}`}
                            >
                              <td className="px-3 py-3 align-top">
                                <div className="font-mono text-sm font-medium text-slate-900">{variant.sku || '—'}</div>
                                {variant.is_low_stock && (
                                  <span className="mt-1 inline-block text-[10px] font-semibold uppercase text-amber-800">
                                    Low stock
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top font-mono text-sm text-slate-700">
                                {displayHsn(variant, product) ?? '—'}
                              </td>
                              <td className="px-3 py-3 align-top text-sm text-slate-600 max-w-[200px]">
                                {formatAttributes(variant.attributes)}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Available to sell
                                  </div>
                                  <div className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                                    {variant.available.toLocaleString()}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    On hand <span className="font-mono text-slate-700">{variant.quantity}</span>
                                    {' · '}
                                    Reserved <span className="font-mono text-slate-700">{variant.reserved}</span>
                                    {' · '}
                                    Alert ≤{' '}
                                    <span className="font-mono text-slate-700">{variant.low_stock_threshold}</span>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      title="Add 1 unit"
                                      onClick={() => adjustStock(product.product_id, variant.id, 1)}
                                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-emerald-700 shadow-sm hover:border-emerald-400 hover:bg-emerald-50"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      title="Remove 1 unit"
                                      onClick={() => adjustStock(product.product_id, variant.id, -1)}
                                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-rose-700 shadow-sm hover:border-rose-400 hover:bg-rose-50"
                                    >
                                      −
                                    </button>
                                    <button
                                      type="button"
                                      title="Add 10 units"
                                      onClick={() => adjustStock(product.product_id, variant.id, 10)}
                                      className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-100"
                                    >
                                      +10
                                    </button>
                                    <button
                                      type="button"
                                      title="Remove 10 units"
                                      onClick={() => adjustStock(product.product_id, variant.id, -10)}
                                      className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-100"
                                    >
                                      −10
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top text-sm tabular-nums text-slate-700">
                                {variant.sold_30d != null ? Number(variant.sold_30d).toLocaleString() : '—'}
                              </td>
                              <td className="px-3 py-3 align-top text-sm tabular-nums text-slate-700">
                                {variant.days_of_supply != null ? `${variant.days_of_supply} d` : '—'}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span
                                  className={`inline-block text-[11px] px-2 py-1 rounded-md capitalize ${healthStyle(variant.inventory_health)}`}
                                >
                                  {(variant.inventory_health || '—').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top text-sm font-medium tabular-nums text-slate-800">
                                {variant.suggested_reorder_qty != null ? variant.suggested_reorder_qty.toLocaleString() : '—'}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex flex-col gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStockEdit(product.product_id, variant.id, variant.quantity)}
                                    className="rounded-md bg-slate-800 px-2.5 py-1.5 text-center text-xs font-medium text-white hover:bg-slate-900"
                                  >
                                    Set quantity…
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleThresholdEdit(product.product_id, variant.id, variant.low_stock_threshold)
                                    }
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Low-stock alert
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModal({
                                        type: 'replenishment',
                                        data: {
                                          productId: product.product_id,
                                          variantId: variant.id,
                                          lead_time_days: variant.lead_time_days ?? 14,
                                          case_pack_quantity: variant.case_pack_quantity ?? 1,
                                          min_reorder_quantity: variant.min_reorder_quantity ?? 1,
                                        },
                                      })
                                    }
                                    className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-900 hover:bg-indigo-100"
                                  >
                                    Replenish rules
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 space-y-4 bg-gradient-to-b from-amber-50/80 to-white border-t border-amber-100">
                      <div className="text-center max-w-xl mx-auto space-y-2">
                        <p className="text-slate-900 font-semibold">No inventory SKU row yet</p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Your catalog may already list SKU &amp; HSN (from CSV or the Products form). Those live on the product
                          record. To track <strong>stock</strong>, we need one matching row in inventory—tap below to copy your
                          catalog SKU/HSN into a variant + stock record.
                        </p>
                        {(product.catalog_sku || product.catalog_hsn) && (
                          <p className="text-sm font-mono text-slate-800 bg-white/80 rounded-lg border border-amber-200/80 px-3 py-2 inline-block">
                            {product.catalog_sku && <span>SKU {product.catalog_sku}</span>}
                            {product.catalog_sku && product.catalog_hsn ? ' · ' : null}
                            {product.catalog_hsn && <span>HSN {product.catalog_hsn}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          disabled={ensuringProductId === product.product_id}
                          onClick={() => ensureDefaultSku(product.product_id)}
                          className="px-5 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                        >
                          {ensuringProductId === product.product_id
                            ? 'Syncing…'
                            : product.catalog_sku
                              ? 'Sync catalog SKU → inventory'
                              : 'Create inventory SKU'}
                        </button>
                        <Link
                          to={`/admin/product-variants?product=${product.product_id}`}
                          className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Product Variants (multi-SKU)
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <aside className="w-full shrink-0 space-y-4 xl:sticky xl:top-4 xl:w-[380px]">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Insights</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select a SKU row to see reorder signals, cover, and demand context.
              </p>
              {selectedSku ? (
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <div className="text-xs font-medium text-slate-500">SKU</div>
                    <div className="font-mono text-base font-semibold text-slate-900">{selectedSku.variant.sku || '—'}</div>
                    <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">{selectedSku.product.title}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-700">
                    {(() => {
                      const v = selectedSku.variant
                      const days = v.days_of_supply
                      const vel = v.daily_velocity
                      const sug = v.suggested_reorder_qty
                      const lines: string[] = []
                      if (days != null && days <= 7 && v.available < 50) {
                        lines.push(`You may run low on this SKU in about ${days} day${days === 1 ? '' : 's'} at current velocity.`)
                      } else if (days != null) {
                        lines.push(`Roughly ${days} day${days === 1 ? '' : 's'} of supply at recent pace.`)
                      }
                      if (sug != null && sug > 0) {
                        lines.push(`Suggested reorder: ${sug.toLocaleString()} units to align with lead time and safety stock.`)
                      }
                      if (vel != null && vel > 0 && v.sold_30d != null && v.sold_30d > 0) {
                        lines.push(`30-day movement: ${Number(v.sold_30d).toLocaleString()} units sold.`)
                      }
                      if (lines.length === 0) {
                        lines.push('Not enough velocity data yet—keep selling or set replenishment rules for sharper suggestions.')
                      }
                      return lines.map((line, i) => <p key={i}>{line}</p>)
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openRestockReport()}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700"
                    >
                      Restock report
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCsv()}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => openActivityLog()}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Activity log
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Click a variant row in the table to pin insights here. Bulk actions use the checkboxes on each product.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Edit Stock Dialog */}
      {modal.type === 'stock' && modal.data.step === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Update stock quantity</h3>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">New quantity</label>
              <input
                type="number"
                value={modal.data.quantity}
                onChange={(e) =>
                  setModal({
                    type: 'stock',
                    data: { ...modal.data, quantity: Number(e.target.value) },
                  })
                }
                className="w-full rounded-lg border px-3 py-2"
                min="0"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  setModal({
                    type: 'stock',
                    data: { ...modal.data, step: 'confirm' },
                  })
                }
                className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === 'threshold' && modal.data.step === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Low stock alert threshold</h3>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Threshold</label>
              <input
                type="number"
                value={modal.data.threshold}
                onChange={(e) =>
                  setModal({
                    type: 'threshold',
                    data: { ...modal.data, threshold: Number(e.target.value) },
                  })
                }
                className="w-full rounded-lg border px-3 py-2"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Product flags as low stock when available quantity is at or below this level.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  setModal({
                    type: 'threshold',
                    data: { ...modal.data, step: 'confirm' },
                  })
                }
                className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={modal.type === 'stock' && modal.data.step === 'confirm'}
        onClose={() => {
          if (modal.type === 'stock') {
            setModal({ type: 'stock', data: { ...modal.data, step: 'form' } })
          }
        }}
        onConfirm={updateStock}
        closeOnConfirm={false}
        title="Confirm stock update"
        description={
          modal.type === 'stock' && modal.data.step === 'confirm'
            ? `Set on-hand quantity to ${modal.data.quantity}?`
            : ''
        }
        confirmText="Update"
      />

      <ConfirmDialog
        open={modal.type === 'threshold' && modal.data.step === 'confirm'}
        onClose={() => {
          if (modal.type === 'threshold') {
            setModal({ type: 'threshold', data: { ...modal.data, step: 'form' } })
          }
        }}
        onConfirm={updateThreshold}
        closeOnConfirm={false}
        title="Confirm threshold"
        description={
          modal.type === 'threshold' && modal.data.step === 'confirm'
            ? `Set low-stock alert to ${modal.data.threshold}?`
            : ''
        }
        confirmText="Update"
      />

      {modal.type === 'replenishment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Replenishment settings</h3>
            <p className="mb-4 text-sm text-gray-600">
              Lead time, case pack, and minimum reorder feed suggested reorder quantities (similar to marketplace restock
              recommendations).
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Lead time (days)</label>
                <input
                  type="number"
                  min={0}
                  value={modal.data.lead_time_days}
                  onChange={(e) =>
                    setModal({
                      type: 'replenishment',
                      data: { ...modal.data, lead_time_days: Number(e.target.value) },
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Case pack (units per supplier case)</label>
                <input
                  type="number"
                  min={1}
                  value={modal.data.case_pack_quantity}
                  onChange={(e) =>
                    setModal({
                      type: 'replenishment',
                      data: { ...modal.data, case_pack_quantity: Number(e.target.value) },
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Minimum reorder quantity</label>
                <input
                  type="number"
                  min={1}
                  value={modal.data.min_reorder_quantity}
                  onChange={(e) =>
                    setModal({
                      type: 'replenishment',
                      data: { ...modal.data, min_reorder_quantity: Number(e.target.value) },
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReplenishmentSettings}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === 'restock' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Restock report</h3>
                <p className="text-sm text-gray-600">Suggested reorder rounds up to case packs and respects minimum reorder.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
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

      {modal.type === 'logs' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Inventory activity</h3>
              <button
                type="button"
                onClick={closeModal}
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
