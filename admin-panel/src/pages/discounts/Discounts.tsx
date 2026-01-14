import React, { useState, useEffect } from 'react'
import { getApiBaseUrl } from '../../utils/apiUrl'

type Discount = {
  id: number
  code: string
  name: string
  type: 'percentage' | 'fixed' | 'free_shipping' | 'fixed_price'
  value: number
  min_purchase?: number
  max_discount?: number
  usage_limit?: number
  usage_limit_per_user?: number
  usage_count: number
  is_active: boolean
  valid_from?: string
  valid_until?: string
  product_id?: number
  is_one_time_use?: boolean
  created_at: string
  updated_at: string
}

type DiscountUsage = {
  id: number
  discount_id: number
  customer_email: string
  order_id: number
  discount_amount: number
  created_at: string
  discount_name?: string
  discount_code?: string
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [usage, setUsage] = useState<DiscountUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'discounts' | 'usage' | 'create'>('discounts')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping' | 'fixed_price',
    value: '',
    min_purchase: '',
    max_discount: '',
    usage_limit: '',
    usage_limit_per_user: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
    product_id: '',
    fixed_price: ''
  })
  
  // Fixed-price coupon state
  const [fixedPriceCoupon, setFixedPriceCoupon] = useState({
    productId: '',
    fixedPrice: '',
    generatedCode: '',
    isGenerating: false
  })
  
  const [products, setProducts] = useState<Array<{id: number, title: string, price: string}>>([])

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

  useEffect(() => {
    loadDiscounts()
    loadUsage()
    loadProducts()
  }, [])
  
  const loadProducts = async () => {
    try {
      const res = await fetch(`${apiBase}/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.map((p: any) => ({ id: p.id, title: p.title, price: p.price })))
      }
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  const loadDiscounts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/discounts`)
      if (res.ok) {
        const data = await res.json()
        setDiscounts(data)
      } else {
        console.error('Failed to load discounts:', await res.text())
        setDiscounts([])
      }
    } catch (error) {
      console.error('Failed to load discounts:', error)
      setDiscounts([])
    } finally {
      setLoading(false)
    }
  }

  const loadUsage = async () => {
    try {
      const res = await fetch(`${apiBase}/discounts/usage`)
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      } else {
        console.error('Failed to load usage:', await res.text())
        setUsage([])
      }
    } catch (error) {
      console.error('Failed to load usage:', error)
      setUsage([])
    }
  }

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const payload = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        type: formData.type,
        value: formData.type === 'fixed_price' ? parseFloat(formData.fixed_price) : parseFloat(formData.value),
        min_purchase: formData.min_purchase ? parseFloat(formData.min_purchase) : null,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        usage_limit_per_user: formData.usage_limit_per_user ? parseInt(formData.usage_limit_per_user) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        is_active: formData.is_active,
        product_id: formData.type === 'fixed_price' && formData.product_id ? parseInt(formData.product_id) : null,
        is_one_time_use: formData.type === 'fixed_price' ? true : false
      }

      const method = editingDiscount ? 'PUT' : 'POST'
      const url = editingDiscount 
        ? `${apiBase}/discounts/${editingDiscount.id}`
        : `${apiBase}/discounts`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        await loadDiscounts()
        setFormData({
          code: '',
          name: '',
          type: 'percentage',
          value: '',
          min_purchase: '',
          max_discount: '',
          usage_limit: '',
          usage_limit_per_user: '',
          valid_from: '',
          valid_until: '',
          is_active: true,
          product_id: '',
          fixed_price: ''
        })
        setEditingDiscount(null)
        setActiveTab('discounts')
        alert(editingDiscount ? 'Discount updated successfully!' : 'Discount created successfully!')
      } else {
        const error = await res.json()
        alert(error.message || 'Failed to save discount')
      }
    } catch (error) {
      console.error('Error saving discount:', error)
      alert('Failed to save discount')
    } finally {
      setLoading(false)
    }
  }

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount)
    setFormData({
      code: discount.code,
      name: discount.name,
      type: discount.type as any,
      value: discount.value.toString(),
      min_purchase: discount.min_purchase?.toString() || '',
      max_discount: discount.max_discount?.toString() || '',
      usage_limit: discount.usage_limit?.toString() || '',
      usage_limit_per_user: (discount as any).usage_limit_per_user?.toString() || '',
      valid_from: discount.valid_from ? discount.valid_from.split('T')[0] : '',
      valid_until: discount.valid_until ? discount.valid_until.split('T')[0] : '',
      is_active: discount.is_active,
      product_id: (discount as any).product_id?.toString() || '',
      fixed_price: discount.type === 'fixed_price' ? discount.value.toString() : ''
    })
    setActiveTab('create')
  }
  
  const generateFixedPriceCode = async () => {
    if (!fixedPriceCoupon.productId || !fixedPriceCoupon.fixedPrice) {
      alert('Please select a product and enter a fixed price')
      return
    }
    
    try {
      setFixedPriceCoupon({ ...fixedPriceCoupon, isGenerating: true })
      
      // Generate a unique random code
      const randomCode = 'FIXED' + Math.random().toString(36).substring(2, 10).toUpperCase()
      const selectedProduct = products.find(p => p.id === parseInt(fixedPriceCoupon.productId))
      
      const payload = {
        code: randomCode,
        name: `Fixed Price - ${selectedProduct?.title || 'Product'}`,
        type: 'fixed_price',
        value: parseFloat(fixedPriceCoupon.fixedPrice),
        product_id: parseInt(fixedPriceCoupon.productId),
        usage_limit: 1, // One-time use
        usage_limit_per_user: 1,
        is_active: true,
        is_one_time_use: true
      }
      
      const res = await fetch(`${apiBase}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        setFixedPriceCoupon({ ...fixedPriceCoupon, generatedCode: randomCode })
        await loadDiscounts()
        alert(`Fixed-price coupon created! Code: ${randomCode}`)
      } else {
        const error = await res.json()
        alert(error.message || 'Failed to create fixed-price coupon')
      }
    } catch (error) {
      console.error('Error generating fixed-price code:', error)
      alert('Failed to generate fixed-price coupon')
    } finally {
      setFixedPriceCoupon({ ...fixedPriceCoupon, isGenerating: false })
    }
  }
  
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        alert('Code copied to clipboard!')
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert(`Code copied: ${text}`)
      }
    } catch (err) {
      alert(`Code: ${text}`)
    }
  }

  const handleDeleteDiscount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discount?')) return
    
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/discounts/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadDiscounts()
        alert('Discount deleted successfully!')
      } else {
        alert('Failed to delete discount')
      }
    } catch (error) {
      console.error('Error deleting discount:', error)
      alert('Failed to delete discount')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (discount: Discount) => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/discounts/${discount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !discount.is_active })
      })

      if (res.ok) {
        await loadDiscounts()
      } else {
        alert('Failed to update discount status')
      }
    } catch (error) {
      console.error('Error updating discount status:', error)
      alert('Failed to update discount status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (isActive: boolean, validUntil?: string) => {
    if (!isActive) return 'bg-gray-100 text-gray-800'
    if (validUntil && new Date(validUntil) < new Date()) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (discount: Discount) => {
    if (!discount.is_active) return 'Inactive'
    if (discount.valid_until && new Date(discount.valid_until) < new Date()) return 'Expired'
    return 'Active'
  }

  const getTypeIcon = (type: Discount['type']) => {
    switch (type) {
      case 'percentage': return '📊'
      case 'fixed': return '💰'
      default: return '💰'
    }
  }

  const formatDiscountValue = (discount: Discount) => {
    switch (discount.type) {
      case 'percentage': return `${discount.value}%`
      case 'fixed': return `₹${discount.value}`
      case 'free_shipping': return 'Free Shipping'
      default: return `${discount.value}`
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
            Discounts
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Create and manage discount codes and promotions
          </p>
        </div>
        <button 
          onClick={() => {
            setActiveTab('create')
            setEditingDiscount(null)
            setFormData({
              code: '',
              name: '',
              type: 'percentage',
              value: '',
              min_purchase: '',
              max_discount: '',
              usage_limit: '',
              usage_limit_per_user: '',
              valid_from: '',
              valid_until: '',
              is_active: true,
              product_id: '',
              fixed_price: ''
            })
          }}
          className="btn-primary"
        >
          Create Discount
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--arctic-blue-light)' }}>
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'discounts', name: 'Discount Codes', count: discounts.length },
            { id: 'usage', name: 'Usage History', count: usage.length },
            { id: 'create', name: 'Create New', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--arctic-blue-primary-dark)]'
                  : 'border-transparent hover:text-[var(--text-primary)]'
              }`}
              style={activeTab === tab.id ? { borderColor: 'var(--arctic-blue-primary)' } : { color: 'var(--text-muted)' }}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Discounts Tab */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          {/* Discount Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Total Discounts', value: discounts.length, icon: '🎫' },
              { title: 'Active', value: discounts.filter(d => d.is_active && (!d.valid_until || new Date(d.valid_until) >= new Date())).length, icon: '✅' },
              { title: 'Total Uses', value: discounts.reduce((sum, d) => sum + (d.usage_count || 0), 0), icon: '📈' },
              { title: 'Total Saved', value: `₹${(Array.isArray(usage) ? usage.reduce((sum, u) => sum + (Number(u.discount_amount) || 0), 0) : 0).toFixed(2)}`, icon: '💰' }
            ].map((stat, index) => (
              <div key={index} className="metric-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="text-2xl">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Discounts Table */}
          <div className="metric-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4">Code</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Value</th>
                    <th className="py-3 pr-4">Min Amount</th>
                    <th className="py-3 pr-4">Usage</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Valid Until</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((discount) => (
                    <tr key={discount.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{discount.code}</code>
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{discount.name}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center space-x-1">
                          <span>{getTypeIcon(discount.type)}</span>
                          <span className="capitalize">{discount.type.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{formatDiscountValue(discount)}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {discount.min_purchase ? `₹${discount.min_purchase}` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <div>
                          <span className="font-medium">{discount.usage_count || 0}</span>
                          {discount.usage_limit && (
                            <span className="text-gray-500"> / {discount.usage_limit}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(discount.is_active, discount.valid_until)}`}>
                          {getStatusText(discount)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {discount.valid_until ? new Date(discount.valid_until).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditDiscount(discount)}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  await navigator.clipboard.writeText(discount.code)
                                  alert('Discount code copied to clipboard!')
                                } else {
                                  // Fallback for browsers without clipboard API
                                  const textArea = document.createElement('textarea')
                                  textArea.value = discount.code
                                  textArea.style.position = 'fixed'
                                  textArea.style.left = '-999999px'
                                  document.body.appendChild(textArea)
                                  textArea.select()
                                  document.execCommand('copy')
                                  document.body.removeChild(textArea)
                                  alert(`Discount code copied: ${discount.code}`)
                                }
                              } catch (err) {
                                // Final fallback - just show the code
                                alert(`Discount code: ${discount.code}`)
                              }
                            }}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Copy
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(discount)}
                            className={`text-xs px-2 py-1 rounded ${
                              discount.is_active 
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {discount.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDeleteDiscount(discount.id)}
                            className="bg-red-600 text-white px-2 py-1 text-xs rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Discount Usage History</h2>
            <button className="btn-secondary">Export</button>
          </div>

          <div className="metric-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 pr-4">Order ID</th>
                    <th className="py-3 pr-4">Discount Code</th>
                    <th className="py-3 pr-4">Amount Saved</th>
                    <th className="py-3 pr-4">Used At</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((use) => (
                    <tr key={use.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-gray-600">{use.customer_email}</td>
                      <td className="py-3 pr-4 font-medium">#{use.order_id}</td>
                      <td className="py-3 pr-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {use.discount_code || 'Unknown'}
                        </code>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-green-600">₹{(use.discount_amount || 0).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {new Date(use.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <div className="metric-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
            </h2>
            <form onSubmit={handleCreateDiscount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="WELCOME10"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    disabled={!!editingDiscount}
                  />
                  <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Name *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="Welcome Discount"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select 
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder={formData.type === 'percentage' ? "10" : "100"}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.type === 'percentage' ? 'Percentage (0-100)' : 'Amount in ₹'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase Amount</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="500"
                    value={formData.min_purchase}
                    onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (for percentage)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="1000"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    disabled={formData.type === 'fixed'}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum discount amount for percentage type</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="100"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit Per User</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    placeholder="1"
                    value={formData.usage_limit_per_user}
                    onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Max times a single user can use this code</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <label className="flex items-center space-x-2 mt-2">
                    <input 
                      type="checkbox" 
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData({
                      code: '',
                      name: '',
                      type: 'percentage',
                      value: '',
                      min_purchase: '',
                      max_discount: '',
                      usage_limit: '',
                      usage_limit_per_user: '',
                      valid_from: '',
                      valid_until: '',
                      is_active: true,
                      product_id: '',
                      fixed_price: ''
                    })
                    setEditingDiscount(null)
                    setActiveTab('discounts')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingDiscount ? 'Update Discount' : 'Create Discount')}
                </button>
              </div>
            </form>
            
            {/* Fixed-Price Coupon Generator */}
            <div className="metric-card mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Generate Fixed-Price Coupon (One-Time Use)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Create a special coupon that sets a fixed price for a specific product. Perfect for loyal customers or influencers.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Product/Combo *</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                      value={fixedPriceCoupon.productId}
                      onChange={(e) => setFixedPriceCoupon({ ...fixedPriceCoupon, productId: e.target.value })}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.title} - ₹{product.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
                      placeholder="80"
                      value={fixedPriceCoupon.fixedPrice}
                      onChange={(e) => setFixedPriceCoupon({ ...fixedPriceCoupon, fixedPrice: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">The item will be charged at this price when code is applied</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={generateFixedPriceCode}
                    disabled={fixedPriceCoupon.isGenerating || !fixedPriceCoupon.productId || !fixedPriceCoupon.fixedPrice}
                    className="btn-primary"
                  >
                    {fixedPriceCoupon.isGenerating ? 'Generating...' : 'Generate Code'}
                  </button>
                  
                  {fixedPriceCoupon.generatedCode && (
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                        {fixedPriceCoupon.generatedCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(fixedPriceCoupon.generatedCode)}
                        className="btn-secondary text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
                
                {fixedPriceCoupon.generatedCode && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">
                      ✅ Fixed-price coupon created! Code: <strong>{fixedPriceCoupon.generatedCode}</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      This code is one-time use only. Copy and share it with your customer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








