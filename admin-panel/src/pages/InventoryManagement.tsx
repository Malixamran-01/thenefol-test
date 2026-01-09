import React, { useState, useEffect, useMemo } from 'react'
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

export default function InventoryManagement() {
  const { notify } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set())
  const [editingStock, setEditingStock] = useState<{ productId: number; variantId: number; quantity: number } | null>(null)
  const [editingThreshold, setEditingThreshold] = useState<{ productId: number; variantId: number; threshold: number } | null>(null)
  const [confirmUpdate, setConfirmUpdate] = useState(false)

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
      // Backend returns a plain array from /api/inventory/all.
      // Support both new (array) and old ({ success, data }) formats.
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

  useEffect(() => {
    fetchProducts()
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
      
      const data = await res.json()
      if (data.success) {
        notify('success', 'Stock updated successfully')
        setEditingStock(null)
        setConfirmUpdate(false)
        fetchProducts()
      } else {
        throw new Error(data.error || 'Failed to update stock')
      }
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
      
      const data = await res.json()
      if (data.success) {
        notify('success', 'Low stock threshold updated')
        setEditingThreshold(null)
        setConfirmUpdate(false)
        fetchProducts()
      } else {
        throw new Error(data.error || 'Failed to update threshold')
      }
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
      
      const data = await res.json()
      if (data.success) {
        notify('success', `Stock ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`)
        fetchProducts()
      } else {
        throw new Error(data.error || 'Failed to adjust stock')
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to adjust stock')
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (lowStockOnly && p.low_stock_variants_count === 0) return false
      return true
    })
  }, [products, lowStockOnly])

  const formatAttributes = (attrs: any) => {
    if (!attrs || typeof attrs !== 'object') return 'N/A'
    return Object.entries(attrs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
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
          View and manage stock levels for all products
        </p>
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
        <button
          onClick={fetchProducts}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Total Products</div>
          <div className="text-2xl font-semibold">{products.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Total Stock</div>
          <div className="text-2xl font-semibold">
            {products.reduce((sum, p) => sum + Number(p.total_stock || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Available Stock</div>
          <div className="text-2xl font-semibold">
            {products.reduce((sum, p) => sum + Number(p.total_available || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-600">Low Stock Items</div>
          <div className="text-2xl font-semibold text-orange-600">
            {products.reduce((sum, p) => sum + Number(p.low_stock_variants_count || 0), 0)}
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
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleProduct(product.product_id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  {product.list_image && (
                    <img 
                      src={product.list_image} 
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.title}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="mr-4">Stock: {product.total_available.toLocaleString()} available</span>
                      <span className="mr-4">Total: {product.total_stock.toLocaleString()}</span>
                      {product.low_stock_variants_count > 0 && (
                        <span className="text-orange-600 font-medium">
                          {product.low_stock_variants_count} variant{product.low_stock_variants_count !== 1 ? 's' : ''} low stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {product.variants?.length || 0} variant{product.variants?.length !== 1 ? 's' : ''}
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
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No variants found for this product
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
    </div>
  )
}
