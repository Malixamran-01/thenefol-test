import React, { useState, useEffect } from 'react'
import { useToast } from '../../components/ToastProvider'
import { socketService } from '../../services/socket'

interface Product {
  id: number
  title: string
  slug: string
  category: string
  price: string
  list_image: string
  details?: {
    gst?: string
    gstPercent?: string
    'GST %'?: string
    hsn?: string
    sku?: string
    mrp?: string
    websitePrice?: string
  }
}

interface ProductWithGST extends Product {
  currentGSTRate: number
  isEditing: boolean
  tempGSTRate: string
}

const Tax = () => {
  const { notify } = useToast()
  const [products, setProducts] = useState<ProductWithGST[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [gstFilter, setGstFilter] = useState('all')
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [bulkGSTRate, setBulkGSTRate] = useState('')
  const [saving, setSaving] = useState<number | null>(null)

  // Indian GST rates as per law
  const indianGSTRates = [0, 5, 12, 18, 28]

  const getApiBase = () => {
    // Always use production URL - no environment variables
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
        return `${window.location.protocol}//${window.location.host}/api`
      }
    }
    return 'https://thenefol.com/api'
  }
  const apiBase = getApiBase()

  // Load products from API
  useEffect(() => {
    loadProducts()

    // Listen for product updates via socket
    const unsubscribeProductUpdate = socketService.subscribe('product_updated', (data: any) => {
      console.log('🔄 Product updated in Tax page:', data)
      loadProducts() // Reload products when any product is updated
    })

    const unsubscribeProductsUpdate = socketService.subscribe('products_updated', (data: any) => {
      console.log('🔄 Products updated in Tax page:', data)
      loadProducts() // Reload products when any product is updated
    })

    return () => {
      if (unsubscribeProductUpdate) unsubscribeProductUpdate()
      if (unsubscribeProductsUpdate) unsubscribeProductsUpdate()
    }
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiBase}/api/products?_=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: Product[] = await response.json()
      
      // Transform products to include GST rate and editing state
      const productsWithGST: ProductWithGST[] = data.map(product => {
        const details = product.details || {}
        // Try multiple possible GST field names
        const gstRateStr = details['GST %'] || details.gstPercent || details.gst || '0'
        const currentGSTRate = parseFloat(gstRateStr) || 0

        return {
          ...product,
          currentGSTRate,
          isEditing: false,
          tempGSTRate: currentGSTRate.toString()
        }
      })

      setProducts(productsWithGST)
    } catch (error) {
      console.error('Failed to load products:', error)
      notify('error', 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.details?.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    
    let matchesGST = true
    if (gstFilter === 'no-gst') {
      matchesGST = product.currentGSTRate === 0
    } else if (gstFilter !== 'all') {
      const filterRate = parseFloat(gstFilter)
      matchesGST = product.currentGSTRate === filterRate
    }
    
    return matchesSearch && matchesCategory && matchesGST
  })

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  // Start editing GST for a product
  const startEditing = (productId: number) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, isEditing: true, tempGSTRate: p.currentGSTRate.toString() }
        : { ...p, isEditing: false }
    ))
  }

  // Cancel editing
  const cancelEditing = (productId: number) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, isEditing: false, tempGSTRate: p.currentGSTRate.toString() }
        : p
    ))
  }

  // Update temporary GST rate while editing
  const updateTempGSTRate = (productId: number, value: string) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, tempGSTRate: value }
        : p
    ))
  }

  // Save GST rate for a single product
  const saveGSTRate = async (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const newRate = parseFloat(product.tempGSTRate)
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      notify('error', 'Invalid GST rate. Please enter a value between 0 and 100')
      return
    }

    try {
      setSaving(productId)
      const response = await fetch(`${apiBase}/api/products/${productId}/gst`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gstRate: newRate })
      })

      if (!response.ok) {
        throw new Error('Failed to update GST rate')
      }

      // Update local state
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, currentGSTRate: newRate, isEditing: false, tempGSTRate: newRate.toString() }
          : p
      ))

      notify('success', `GST rate updated to ${newRate}% for ${product.title}`)
    } catch (error) {
      console.error('Failed to save GST rate:', error)
      notify('error', 'Failed to save GST rate')
    } finally {
      setSaving(null)
    }
  }

  // Toggle product selection for bulk edit
  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  // Select all filtered products
  const selectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  // Bulk update GST rates
  const bulkUpdateGST = async () => {
    if (selectedProducts.size === 0) {
      notify('error', 'Please select at least one product')
      return
    }

    if (!bulkGSTRate || bulkGSTRate === 'custom') {
      notify('error', 'Please select or enter a valid GST rate')
      return
    }

    const newRate = parseFloat(bulkGSTRate)
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      notify('error', 'Invalid GST rate. Please enter a value between 0 and 100')
      return
    }

    try {
      setLoading(true)
      const updates = Array.from(selectedProducts).map(productId => ({
        productId,
        gstRate: newRate
      }))

      const response = await fetch(`${apiBase}/api/products/bulk-update-gst`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk update GST rates')
      }

      const result = await response.json()
      
      // Update local state
      setProducts(products.map(p => 
        selectedProducts.has(p.id)
          ? { ...p, currentGSTRate: newRate, tempGSTRate: newRate.toString() }
          : p
      ))

      setSelectedProducts(new Set())
      setBulkEditMode(false)
      setBulkGSTRate('')
      
      notify('success', `GST rate updated to ${newRate}% for ${result.updated} products`)
    } catch (error) {
      console.error('Failed to bulk update GST rates:', error)
      notify('error', 'Failed to bulk update GST rates')
    } finally {
      setLoading(false)
    }
  }

  // Quick set GST rate using predefined rates
  const quickSetGST = async (productId: number, rate: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    try {
      setSaving(productId)
      const response = await fetch(`${apiBase}/api/products/${productId}/gst`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gstRate: rate })
      })

      if (!response.ok) {
        throw new Error('Failed to update GST rate')
      }

      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, currentGSTRate: rate, isEditing: false, tempGSTRate: rate.toString() }
          : p
      ))

      notify('success', `GST rate set to ${rate}% for ${product.title}`)
    } catch (error) {
      console.error('Failed to update GST rate:', error)
      notify('error', 'Failed to update GST rate')
    } finally {
      setSaving(null)
    }
  }

  // Statistics
  const stats = {
    total: products.length,
    withGST: products.filter(p => p.currentGSTRate > 0).length,
    noGST: products.filter(p => p.currentGSTRate === 0).length,
    byRate: indianGSTRates.reduce((acc, rate) => {
      acc[rate] = products.filter(p => p.currentGSTRate === rate).length
      return acc
    }, {} as Record<number, number>)
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
      {/* Header */}
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
            Tax Management (GST)
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage GST rates for all products according to Indian GST law
          </p>
        </div>
        <div className="flex gap-3">
          {bulkEditMode ? (
            <>
              <button
                onClick={() => {
                  setBulkEditMode(false)
                  setSelectedProducts(new Set())
                  setBulkGSTRate('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel Bulk Edit
              </button>
              <button
                onClick={bulkUpdateGST}
                disabled={selectedProducts.size === 0 || !bulkGSTRate || loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Bulk Update ({selectedProducts.size} products)
              </button>
            </>
          ) : (
            <button
              onClick={() => setBulkEditMode(true)}
              className="btn-primary"
            >
              <span className="text-lg mr-2">📝</span>
              Bulk Edit GST Rates
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-brand-primary">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">0% GST</p>
              <p className="text-2xl font-bold text-green-600">{stats.byRate[0] || 0}</p>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">5% GST</p>
              <p className="text-2xl font-bold text-orange-600">{stats.byRate[5] || 0}</p>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">12% GST</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.byRate[12] || 0}</p>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">18% GST</p>
              <p className="text-2xl font-bold text-purple-600">{stats.byRate[18] || 0}</p>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">28% GST</p>
              <p className="text-2xl font-bold text-red-600">{stats.byRate[28] || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Edit Mode Controls */}
      {bulkEditMode && (
        <div className="metric-card bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk Edit Mode - {selectedProducts.size} product(s) selected
            </h3>
            <button
              onClick={selectAll}
              className="text-sm text-brand-primary hover:underline"
            >
              {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Set GST Rate (%):</label>
            <select
              value={bulkGSTRate}
              onChange={(e) => setBulkGSTRate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              <option value="">Select GST Rate</option>
              {indianGSTRates.map(rate => (
                <option key={rate} value={rate}>{rate}% (Standard Indian GST)</option>
              ))}
              <option value="custom">Custom Rate</option>
            </select>
            {bulkGSTRate === 'custom' || (bulkGSTRate && !indianGSTRates.includes(parseFloat(bulkGSTRate) || 0)) ? (
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Enter custom GST rate"
                value={bulkGSTRate === 'custom' ? '' : bulkGSTRate}
                onChange={(e) => setBulkGSTRate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary w-48"
                autoFocus
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="metric-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products by name, slug, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          >
            <option value="all">All GST Rates</option>
            <option value="no-gst">No GST (0%)</option>
            {indianGSTRates.filter(r => r > 0).map(rate => (
              <option key={rate} value={rate.toString()}>{rate}% GST</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="metric-card">
        {loading && products.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {bulkEditMode && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={selectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">HSN Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Current GST</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {bulkEditMode && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.list_image && (
                          <img
                            src={product.list_image.startsWith('http') ? product.list_image : `${apiBase}${product.list_image}`}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{product.title}</div>
                          <div className="text-sm text-gray-500">{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.details?.sku || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{product.details?.hsn || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{product.category || '-'}</td>
                    <td className="py-3 px-4">
                      {product.isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={product.tempGSTRate}
                            onChange={(e) => updateTempGSTRate(product.id, e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                            autoFocus
                          />
                          <span className="text-gray-600">%</span>
                          <button
                            onClick={() => saveGSTRate(product.id)}
                            disabled={saving === product.id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Save"
                          >
                            {saving === product.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => cancelEditing(product.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium px-2 py-1 rounded text-sm ${
                            product.currentGSTRate === 0 ? 'bg-green-100 text-green-800' :
                            product.currentGSTRate === 5 ? 'bg-orange-100 text-orange-800' :
                            product.currentGSTRate === 12 ? 'bg-yellow-100 text-yellow-800' :
                            product.currentGSTRate === 18 ? 'bg-purple-100 text-purple-800' :
                            product.currentGSTRate === 28 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {product.currentGSTRate}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {product.isEditing ? (
                        <div className="text-sm text-gray-500">Editing...</div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditing(product.id)}
                            className="text-brand-secondary hover:text-brand-primary"
                            title="Edit GST Rate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <div className="flex gap-1">
                            {indianGSTRates.map(rate => (
                              <button
                                key={rate}
                                onClick={() => quickSetGST(product.id, rate)}
                                disabled={saving === product.id || product.currentGSTRate === rate}
                                className={`text-xs px-2 py-1 rounded ${
                                  product.currentGSTRate === rate
                                    ? 'bg-brand-primary text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                } disabled:opacity-50`}
                                title={`Quick set to ${rate}%`}
                              >
                                {rate}%
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="metric-card bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 Indian GST Law Information</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>0% GST:</strong> Essential items, unprocessed food, etc.</p>
          <p><strong>5% GST:</strong> Packaged food items, medicines, etc.</p>
          <p><strong>12% GST:</strong> Processed food, computers, mobile phones, etc.</p>
          <p><strong>18% GST:</strong> Most goods and services, cosmetics, etc.</p>
          <p><strong>28% GST:</strong> Luxury items, automobiles, etc.</p>
          <p className="mt-2 text-xs text-gray-600">Note: You can also set custom GST rates as per your business requirements.</p>
        </div>
      </div>
    </div>
  )
}

export default Tax
