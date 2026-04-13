import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import ConfirmDialog from '../components/ConfirmDialog'
import { getApiBaseUrl } from '../utils/apiUrl'

interface StockBatch {
  id: number
  quantity: number
  /** Manufacturer / product batch number (from packaging or COA) */
  batch_number?: string | null
  /** Which production unit or location this stock came from */
  production_location?: string | null
  expiry_date: string | null
  priority: number
  label: string | null
  is_restock_pool: boolean
}

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
  batch_count?: number
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

function variantBatchKey(productId: number, variantId: number) {
  return `${productId}-${variantId}`
}

function BatchEditRow({
  batch,
  onSave,
  onDelete,
}: {
  batch: StockBatch
  onSave: (patch: Partial<StockBatch>) => void
  onDelete: () => void
}) {
  const [batchNo, setBatchNo] = useState(batch.batch_number || '')
  const [prodLoc, setProdLoc] = useState(batch.production_location || '')
  const [qty, setQty] = useState(batch.quantity)
  const [expiry, setExpiry] = useState(batch.expiry_date ? String(batch.expiry_date).slice(0, 10) : '')
  const [priority, setPriority] = useState(batch.priority)
  const [label, setLabel] = useState(batch.label || '')

  useEffect(() => {
    setBatchNo(batch.batch_number || '')
    setProdLoc(batch.production_location || '')
    setQty(batch.quantity)
    setExpiry(batch.expiry_date ? String(batch.expiry_date).slice(0, 10) : '')
    setPriority(batch.priority)
    setLabel(batch.label || '')
  }, [
    batch.id,
    batch.batch_number,
    batch.production_location,
    batch.quantity,
    batch.expiry_date,
    batch.priority,
    batch.label,
  ])

  return (
    <tr className="border-b border-slate-50">
      <td className="px-2 py-1">
        <input
          type="text"
          className="w-28 max-w-full rounded border border-slate-200 px-1 py-0.5 font-mono text-[11px]"
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          placeholder="e.g. BN-2026-01"
          title="Batch number from product / packaging"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="text"
          className="w-36 max-w-full rounded border border-slate-200 px-1 py-0.5"
          value={prodLoc}
          onChange={(e) => setProdLoc(e.target.value)}
          placeholder="Unit / site"
          title="Production unit or location"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          min={0}
          className="w-16 rounded border border-slate-200 px-1 py-0.5 tabular-nums"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="date"
          className="rounded border border-slate-200 px-1 py-0.5"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          className="w-14 rounded border border-slate-200 px-1 py-0.5 tabular-nums"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="text"
          className="w-32 max-w-full rounded border border-slate-200 px-1 py-0.5"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
        />
      </td>
      <td className="px-2 py-1 text-slate-600">{batch.is_restock_pool ? 'Returns' : '—'}</td>
      <td className="whitespace-nowrap px-2 py-1">
        <button
          type="button"
          onClick={() =>
            onSave({
              batch_number: batchNo.trim() || null,
              production_location: prodLoc.trim() || null,
              quantity: qty,
              priority,
              label: label.trim() || null,
              expiry_date: expiry.trim() ? expiry : null,
            })
          }
          className="mr-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-white hover:bg-slate-900"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-rose-200 px-2 py-0.5 text-[11px] text-rose-800 hover:bg-rose-50"
        >
          Remove
        </button>
      </td>
    </tr>
  )
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
  const [batchPanelKey, setBatchPanelKey] = useState<string | null>(null)
  const [batchCache, setBatchCache] = useState<Record<string, StockBatch[]>>({})
  const [batchLoadingKey, setBatchLoadingKey] = useState<string | null>(null)
  const [newBatchDraft, setNewBatchDraft] = useState<{
    key: string
    batch_number: string
    production_location: string
    quantity: number
    expiry_date: string
    priority: number
    label: string
  } | null>(null)
  const closeModal = useCallback(() => setModal({ type: null, data: null }), [])

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

  /** Catalog list images may be relative paths; resolve for <img src>. */
  const catalogImageUrl = useCallback((u?: string | null) => {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    const base = apiBase.replace(/\/$/, '')
    const path = u.startsWith('/') ? u : `/${u}`
    return `${base}${path}`
  }, [apiBase])

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

  const loadBatches = useCallback(
    async (productId: number, variantId: number) => {
      const key = variantBatchKey(productId, variantId)
      setBatchLoadingKey(key)
      try {
        const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/batches`, {
          headers: authHeaders,
        })
        const raw = await parseJsonOk(res)
        const arr = (raw as any)?.data ?? raw
        setBatchCache((prev) => ({
          ...prev,
          [key]: Array.isArray(arr) ? (arr as StockBatch[]) : [],
        }))
      } catch (e: any) {
        notify('error', e?.message || 'Failed to load batches')
      } finally {
        setBatchLoadingKey(null)
      }
    },
    [apiBase, authHeaders, notify]
  )

  const toggleBatchPanel = useCallback(
    async (productId: number, variantId: number) => {
      const key = variantBatchKey(productId, variantId)
      if (batchPanelKey === key) {
        setBatchPanelKey(null)
        return
      }
      setBatchPanelKey(key)
      setNewBatchDraft({
        key,
        batch_number: '',
        production_location: '',
        quantity: 0,
        expiry_date: '',
        priority: 0,
        label: '',
      })
      await loadBatches(productId, variantId)
    },
    [batchPanelKey, loadBatches]
  )

  const saveBatchPatch = useCallback(
    async (productId: number, variantId: number, batch: StockBatch, patch: Partial<StockBatch>) => {
      try {
        const res = await fetch(`${apiBase}/inventory/batches/${batch.id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            batch_number: patch.batch_number !== undefined ? patch.batch_number : batch.batch_number,
            production_location:
              patch.production_location !== undefined ? patch.production_location : batch.production_location,
            quantity: patch.quantity ?? batch.quantity,
            priority: patch.priority ?? batch.priority,
            label: patch.label !== undefined ? patch.label : batch.label,
            expiry_date:
              patch.expiry_date !== undefined
                ? patch.expiry_date
                : batch.expiry_date,
          }),
        })
        await parseJsonOk(res)
        notify('success', 'Batch updated')
        await loadBatches(productId, variantId)
        await refreshAll()
      } catch (e: any) {
        notify('error', e?.message || 'Failed to update batch')
      }
    },
    [apiBase, authHeaders, loadBatches, notify, refreshAll]
  )

  const addBatch = useCallback(
    async (productId: number, variantId: number) => {
      const key = variantBatchKey(productId, variantId)
      const d = newBatchDraft
      if (!d || d.key !== key) return
      try {
        const res = await fetch(`${apiBase}/inventory/${productId}/${variantId}/batches`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            batch_number: d.batch_number.trim() || null,
            production_location: d.production_location.trim() || null,
            quantity: d.quantity,
            priority: d.priority,
            label: d.label || null,
            expiry_date: d.expiry_date.trim() ? d.expiry_date : null,
          }),
        })
        await parseJsonOk(res)
        notify('success', 'Batch added')
        setNewBatchDraft({
          key,
          batch_number: '',
          production_location: '',
          quantity: 0,
          expiry_date: '',
          priority: 0,
          label: '',
        })
        await loadBatches(productId, variantId)
        await refreshAll()
      } catch (e: any) {
        notify('error', e?.message || 'Failed to add batch')
      }
    },
    [apiBase, authHeaders, loadBatches, newBatchDraft, notify, refreshAll]
  )

  const removeBatch = useCallback(
    async (productId: number, variantId: number, batchId: number) => {
      try {
        const res = await fetch(`${apiBase}/inventory/batches/${batchId}`, {
          method: 'DELETE',
          headers: authHeaders,
        })
        await parseJsonOk(res)
        notify('success', 'Batch removed (stock merged into another line)')
        await loadBatches(productId, variantId)
        await refreshAll()
      } catch (e: any) {
        notify('error', e?.message || 'Failed to delete batch')
      }
    },
    [apiBase, authHeaders, loadBatches, notify, refreshAll]
  )

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
      const msg = err?.message || 'Failed to update stock'
      notify('error', msg)
      if (
        modal.type === 'stock' &&
        /multiple stock batches/i.test(msg)
      ) {
        setBatchPanelKey(variantBatchKey(modal.data.productId, modal.data.variantId))
        setNewBatchDraft({
          key: variantBatchKey(modal.data.productId, modal.data.variantId),
          batch_number: '',
          production_location: '',
          quantity: 0,
          expiry_date: '',
          priority: 0,
          label: '',
        })
        loadBatches(modal.data.productId, modal.data.variantId)
      }
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

      <div className="mb-5 rounded-xl border border-slate-200/90 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
        <p>
          <strong className="text-slate-900">Catalog vs inventory:</strong> SKU and HSN you added in Products or when importing
          are stored on the product. <strong>Stock levels</strong> are tracked per inventory SKU (variant). If you see catalog
          codes but no stock rows yet, use <strong>Sync</strong> on that product to create a matching inventory line from your
          catalog.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Shortcuts</span>
          <Link
            to="/admin/products"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Products
          </Link>
          <Link
            to="/admin/product-variants"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Product variants
          </Link>
        </div>
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">What you can do here</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Adjust stock with + / −, set quantity, low-stock alerts, and replenishment rules per SKU</li>
            <li>Review sales, days of cover, and suggested reorders when you have order history</li>
            <li>Export data, open the restock report, and view the activity log</li>
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

      <p className="mb-4 text-xs text-slate-500">
        Store-wide totals. Velocity uses the last {dashboard?.velocity_window_days ?? 30} days of orders; reorder hints use
        your lead time and about {dashboard?.safety_stock_days ?? 7} days of safety stock.
        {dashboard != null && dashboard.sku_count === 0 && products.length > 0 && (
          <span className="mt-1 block text-amber-800">
            No inventory SKUs yet—use Sync on a product or open Product variants for multi-SKU items.
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

      {/* Products */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading inventory...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">No products found</div>
        </div>
      ) : (
        <div className="min-w-0 space-y-3">
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
              {/* Product row — compact, Amazon-style */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-2 py-2 sm:gap-3 sm:px-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300"
                  checked={selectedProductIds.has(product.product_id)}
                  onChange={() => toggleProductSelect(product.product_id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${product.title}`}
                />
                <button
                  type="button"
                  onClick={() => toggleProduct(product.product_id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left sm:gap-3"
                >
                  {catalogImageUrl(product.list_image) ? (
                    <img
                      src={catalogImageUrl(product.list_image)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-md border border-slate-200/80 object-cover sm:h-12 sm:w-12"
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400 sm:h-12 sm:w-12"
                      aria-hidden
                    >
                      No img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{product.title}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                      <span className="tabular-nums">
                        <span className="font-medium text-slate-800">{product.total_available.toLocaleString()}</span> avail.
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="tabular-nums">On hand {product.total_stock.toLocaleString()}</span>
                      {(product.catalog_sku || product.catalog_hsn) && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-700">
                            {product.catalog_sku ? `SKU ${product.catalog_sku}` : ''}
                            {product.catalog_sku && product.catalog_hsn ? ' · ' : ''}
                            {product.catalog_hsn ? `HSN ${product.catalog_hsn}` : ''}
                          </span>
                        </>
                      )}
                      {product.low_stock_variants_count > 0 && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="font-medium text-amber-700">
                            {product.low_stock_variants_count} low
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-slate-500">
                    <span className="text-xs tabular-nums">
                      {product.variants?.length || 0} SKU{(product.variants?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`h-4 w-4 transition-transform ${expandedProducts.has(product.product_id) ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div
                  className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:ml-auto sm:w-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to="/admin/products"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Catalog
                  </Link>
                  <Link
                    to={`/admin/product-variants?product=${product.product_id}`}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Variants
                  </Link>
                  {!(product.variants && product.variants.length > 0) && (
                    <button
                      type="button"
                      disabled={ensuringProductId === product.product_id}
                      onClick={() => ensureDefaultSku(product.product_id)}
                      className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                      title="Create inventory from catalog SKU/HSN"
                    >
                      {ensuringProductId === product.product_id
                        ? 'Syncing…'
                        : product.catalog_sku
                          ? 'Sync'
                          : 'Create SKU'}
                    </button>
                  )}
                </div>
              </div>

              {/* Variants List */}
              {expandedProducts.has(product.product_id) && (
                <div className="border-t bg-gray-50">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="max-h-[min(60vh,540px)] overflow-auto overflow-x-auto rounded-b-xl">
                      <table className="w-full min-w-[980px] border-collapse text-[13px]">
                        <thead>
                          <tr className="sticky top-0 z-10 border-b border-slate-200 bg-white text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                            <th className="min-w-[180px] px-2 py-1.5 sm:px-2.5">Product</th>
                            <th className="px-2 py-1.5 sm:px-2.5">SKU</th>
                            <th className="px-2 py-1.5 sm:px-2.5">HSN</th>
                            <th className="min-w-[88px] px-2 py-1.5 sm:px-2.5">Variant</th>
                            <th className="min-w-[240px] px-2 py-1.5 sm:px-2.5">Stock</th>
                            <th className="whitespace-nowrap px-2 py-1.5 sm:px-2.5">Batches</th>
                            <th className="px-2 py-1.5 sm:px-2.5">30d</th>
                            <th className="px-2 py-1.5 sm:px-2.5">Cover</th>
                            <th className="px-2 py-1.5 sm:px-2.5">Health</th>
                            <th className="px-2 py-1.5 sm:px-2.5">Reorder</th>
                            <th className="min-w-[180px] px-2 py-1.5 sm:px-2.5">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.variants.map((variant) => (
                            <React.Fragment key={variant.id}>
                            <tr
                              className={`border-b border-slate-100 ${variant.is_low_stock ? 'bg-amber-50/50' : 'bg-white hover:bg-slate-50/90'}`}
                            >
                              <td className="align-middle px-2 py-2 sm:px-3">
                                <div className="flex max-w-[220px] items-center gap-2">
                                  {catalogImageUrl(product.list_image) ? (
                                    <img
                                      src={catalogImageUrl(product.list_image)}
                                      alt=""
                                      className="h-9 w-9 shrink-0 rounded border border-slate-200/80 object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-[9px] text-slate-400">
                                      —
                                    </div>
                                  )}
                                  <span className="line-clamp-2 text-xs font-medium leading-snug text-slate-800">
                                    {product.title}
                                  </span>
                                </div>
                              </td>
                              <td className="align-middle px-2 py-2 sm:px-3">
                                <div className="font-mono text-xs font-medium text-slate-900 sm:text-sm">{variant.sku || '—'}</div>
                                {variant.is_low_stock && (
                                  <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase text-amber-800">
                                    Low stock
                                  </span>
                                )}
                              </td>
                              <td className="align-middle px-2 py-2 font-mono text-xs text-slate-700 sm:px-3 sm:text-sm">
                                {displayHsn(variant, product) ?? '—'}
                              </td>
                              <td className="max-w-[140px] align-middle px-2 py-2 text-xs text-slate-600 sm:px-3">
                                {formatAttributes(variant.attributes)}
                              </td>
                              <td className="align-middle px-2 py-2 sm:px-3">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                  <span className="text-base font-semibold tabular-nums text-slate-900 sm:text-lg">
                                    {variant.available.toLocaleString()}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    Hand {variant.quantity} · Rsv {variant.reserved} · Alert ≤{variant.low_stock_threshold}
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      title="−10"
                                      onClick={() => adjustStock(product.product_id, variant.id, -10)}
                                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                      −10
                                    </button>
                                    <button
                                      type="button"
                                      title="−1"
                                      onClick={() => adjustStock(product.product_id, variant.id, -1)}
                                      className="rounded border border-slate-200 bg-white px-2 py-0.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                    >
                                      −
                                    </button>
                                    <button
                                      type="button"
                                      title="+1"
                                      onClick={() => adjustStock(product.product_id, variant.id, 1)}
                                      className="rounded border border-slate-200 bg-white px-2 py-0.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      title="+10"
                                      onClick={() => adjustStock(product.product_id, variant.id, 10)}
                                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                      +10
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="align-middle px-2 py-2 sm:px-3">
                                <button
                                  type="button"
                                  onClick={() => toggleBatchPanel(product.product_id, variant.id)}
                                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                                >
                                  {(variant.batch_count ?? 0).toLocaleString()} batch
                                  {(variant.batch_count ?? 0) === 1 ? '' : 'es'}
                                </button>
                                {/* <p className="mt-1 max-w-[140px] text-[10px] leading-snug text-slate-500">
                                  FIFO by expiry; lower priority sells first when tied.
                                </p> */}
                              </td>
                              <td className="align-middle px-2 py-2 text-xs tabular-nums text-slate-700 sm:px-3 sm:text-sm">
                                {variant.sold_30d != null ? Number(variant.sold_30d).toLocaleString() : '—'}
                              </td>
                              <td className="align-middle px-2 py-2 text-xs tabular-nums text-slate-700 sm:px-3 sm:text-sm">
                                {variant.days_of_supply != null ? `${variant.days_of_supply} d` : '—'}
                              </td>
                              <td className="align-middle px-2 py-2 sm:px-3">
                                <span
                                  className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] capitalize sm:text-[11px] ${healthStyle(variant.inventory_health)}`}
                                >
                                  {(variant.inventory_health || '—').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="align-middle px-2 py-2 text-xs font-medium tabular-nums text-slate-800 sm:px-3 sm:text-sm">
                                {variant.suggested_reorder_qty != null ? variant.suggested_reorder_qty.toLocaleString() : '—'}
                              </td>
                              <td className="align-middle px-2 py-2 sm:px-3">
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStockEdit(product.product_id, variant.id, variant.quantity)}
                                    className="rounded border border-slate-800 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-slate-900 sm:text-xs"
                                  >
                                    Set qty
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleThresholdEdit(product.product_id, variant.id, variant.low_stock_threshold)
                                    }
                                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50 sm:text-xs"
                                  >
                                    Alert
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
                                    className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-900 hover:bg-indigo-100 sm:text-xs"
                                  >
                                    Rules
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {batchPanelKey === variantBatchKey(product.product_id, variant.id) && (
                              <tr className="border-b border-slate-100 bg-slate-50/90">
                                <td colSpan={11} className="px-3 py-2">
                                  {batchLoadingKey === variantBatchKey(product.product_id, variant.id) ? (
                                    <p className="text-xs text-slate-500">Loading batches…</p>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-medium text-slate-700">
                                        Stock batches (sell order: earliest expiry first; undated / returns pool last)
                                      </p>
                                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                        <table className="w-full min-w-[900px] border-collapse text-xs">
                                          <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                                              <th className="px-2 py-1.5">Batch #</th>
                                              <th className="px-2 py-1.5">Production unit</th>
                                              <th className="px-2 py-1.5">Qty</th>
                                              <th className="px-2 py-1.5">Expiry</th>
                                              <th className="px-2 py-1.5">Priority</th>
                                              <th className="px-2 py-1.5">Label</th>
                                              <th className="px-2 py-1.5">Pool</th>
                                              <th className="px-2 py-1.5"> </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(batchCache[variantBatchKey(product.product_id, variant.id)] || []).map(
                                              (b) => (
                                                <BatchEditRow
                                                  key={b.id}
                                                  batch={b}
                                                  onSave={(patch) =>
                                                    saveBatchPatch(product.product_id, variant.id, b, patch)
                                                  }
                                                  onDelete={() => removeBatch(product.product_id, variant.id, b.id)}
                                                />
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                      {newBatchDraft?.key === variantBatchKey(product.product_id, variant.id) && (
                                        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-200 bg-white p-2">
                                          <label className="text-[11px] text-slate-600">
                                            Batch #
                                            <input
                                              type="text"
                                              className="ml-1 w-28 rounded border border-slate-200 px-1 py-0.5 font-mono"
                                              value={newBatchDraft.batch_number}
                                              placeholder="From product"
                                              onChange={(e) =>
                                                setNewBatchDraft((d) =>
                                                  d ? { ...d, batch_number: e.target.value } : d
                                                )
                                              }
                                            />
                                          </label>
                                          <label className="text-[11px] text-slate-600">
                                            Production unit
                                            <input
                                              type="text"
                                              className="ml-1 w-36 rounded border border-slate-200 px-1 py-0.5"
                                              value={newBatchDraft.production_location}
                                              placeholder="Location / site"
                                              onChange={(e) =>
                                                setNewBatchDraft((d) =>
                                                  d ? { ...d, production_location: e.target.value } : d
                                                )
                                              }
                                            />
                                          </label>
                                          <label className="text-[11px] text-slate-600">
                                            Qty
                                            <input
                                              type="number"
                                              min={0}
                                              className="ml-1 w-16 rounded border border-slate-200 px-1 py-0.5"
                                              value={newBatchDraft.quantity}
                                              onChange={(e) =>
                                                setNewBatchDraft((d) =>
                                                  d
                                                    ? {
                                                        ...d,
                                                        quantity: Number(e.target.value),
                                                      }
                                                    : d
                                                )
                                              }
                                            />
                                          </label>
                                          <label className="text-[11px] text-slate-600">
                                            Expiry
                                            <input
                                              type="date"
                                              className="ml-1 rounded border border-slate-200 px-1 py-0.5"
                                              value={newBatchDraft.expiry_date}
                                              onChange={(e) =>
                                                setNewBatchDraft((d) =>
                                                  d ? { ...d, expiry_date: e.target.value } : d
                                                )
                                              }
                                            />
                                          </label>
                                          <label className="text-[11px] text-slate-600">
                                            Priority
                                            <input
                                              type="number"
                                              className="ml-1 w-14 rounded border border-slate-200 px-1 py-0.5"
                                              value={newBatchDraft.priority}
                                              onChange={(e) =>
                                                setNewBatchDraft((d) =>
                                                  d
                                                    ? { ...d, priority: Number(e.target.value) }
                                                    : d
                                                )
                                              }
                                            />
                                          </label>
                                          <label className="text-[11px] text-slate-600">
                                            Label
                                            <input
                                              type="text"
                                              className="ml-1 w-32 rounded border border-slate-200 px-1 py-0.5"
                                              value={newBatchDraft.label}
                                              onChange={(e) =>
                                                setNewBatchDraft((d) =>
                                                  d ? { ...d, label: e.target.value } : d
                                                )
                                              }
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => addBatch(product.product_id, variant.id)}
                                            className="rounded bg-teal-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-teal-700"
                                          >
                                            Add batch
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-4 border-t border-amber-100 bg-gradient-to-b from-amber-50/80 to-white p-6">
                      <div className="mx-auto max-w-xl space-y-2 text-center">
                        <p className="font-semibold text-slate-900">No inventory line for this product yet</p>
                        <p className="text-sm leading-relaxed text-slate-600">
                          If the product already has SKU and HSN in the catalog, tap <strong>Sync</strong> to create stock and
                          copy those values.
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
