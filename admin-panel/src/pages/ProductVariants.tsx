import React, { useState, useEffect } from 'react'

interface VariantOption {
  name: string
  values: string[]
}

interface Variant {
  id: number
  sku: string
  attributes: Record<string, string>
  price?: string
  mrp?: string
  image_url?: string
  is_active: boolean
}

export default function ProductVariants() {
  const [options, setOptions] = useState<VariantOption[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [productId, setProductId] = useState<string>('')
  const [newOption, setNewOption] = useState({ name: '', values: '' })
  const [lowThresholds, setLowThresholds] = useState<Record<number, string>>({})

  useEffect(() => {
    const load = async () => {
      if (!productId) return
      try {
        const optsResp = await fetch(`/api/products/${productId}/variant-options`)
        const optsData = await optsResp.json()
        if (optsData?.success && Array.isArray(optsData.data)) {
          setOptions(optsData.data)
        }
      } catch (_) {}
      try {
        const varResp = await fetch(`/api/products/${productId}/variants`)
        const varData = await varResp.json()
        if (varData?.success && Array.isArray(varData.data)) {
          setVariants(varData.data)
        }
      } catch (_) {}
    }
    load()
  }, [productId])

  const handleAddOption = () => {
    if (newOption.name && newOption.values) {
      setOptions([...options, {
        name: newOption.name,
        values: newOption.values.split(',').map(v => v.trim())
      }])
      setNewOption({ name: '', values: '' })
    }
  }

  const saveOptions = async () => {
    const resp = await fetch(`/api/products/${productId}/variant-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options })
    })
    const data = await resp.json()
    console.log('Options saved:', data)
  }

  const generateVariants = async () => {
    const resp = await fetch(`/api/products/${productId}/variants/generate`, { method: 'POST' })
    const data = await resp.json()
    if (data.success) {
      setVariants(data.data)
      alert(`Generated ${data.data.length} variants`)
    }
  }

  const updateVariantField = (id: number, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))
  }

  const saveVariant = async (id: number) => {
    const variant = variants.find(v => v.id === id)
    if (!variant) return
    await fetch(`/api/variants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: variant.sku,
        attributes: variant.attributes,
        price: variant.price ? Number(variant.price) : null,
        mrp: variant.mrp ? Number(variant.mrp) : null,
        image_url: variant.image_url || null,
        barcode: (variant as any).barcode || null,
        is_active: variant.is_active,
      })
    })
  }

  const setLowStock = async (variantId: number) => {
    const threshold = lowThresholds[variantId]
    if (!threshold) return
    await fetch(`/api/inventory/${productId}/${variantId}/low-threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: Number(threshold) })
    })
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Product Variants</h1>
      
      {/* Info banner for single-size products */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Product Variants Page</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Yeh page sirf un products ke liye hai jinke multiple variants hain (jaise: Size S, M, L ya different Colors).
              <br />
              <strong>Agar aapke products mein sirf ek hi size hai, to is page ki zaroorat nahi hai.</strong>
              <br />
              Single-size products ko directly <a href="/admin/products" className="underline font-semibold">Products page</a> se manage karein.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Product ID</label>
        <input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="border p-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Enter product ID"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Variant Options</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Option name (e.g., Size)"
            value={newOption.name}
            onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Values (comma-separated, e.g., S, M, L)"
            value={newOption.values}
            onChange={(e) => setNewOption({ ...newOption, values: e.target.value })}
            className="border p-2 rounded"
          />
          <button onClick={handleAddOption} className="px-4 py-2 bg-blue-500 text-white rounded">
            Add Option
          </button>
        </div>
        <button onClick={saveOptions} className="px-4 py-2 bg-green-500 text-white rounded">
          Save Options
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Generated Variants</h2>
        <button onClick={generateVariants} className="px-4 py-2 bg-purple-500 text-white rounded mb-4">
          Generate Variants
        </button>
        <div className="space-y-3">
          {variants.map(v => (
            <div key={v.id} className="border p-3 rounded space-y-2">
              <div className="text-sm">Attributes: {JSON.stringify(v.attributes)}</div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <input className="border p-2 rounded" placeholder="SKU" value={v.sku || ''} onChange={e => updateVariantField(v.id, 'sku', e.target.value)} />
                <input className="border p-2 rounded" placeholder="Price" type="number" value={v.price || ''} onChange={e => updateVariantField(v.id, 'price', e.target.value)} />
                <input className="border p-2 rounded" placeholder="MRP" type="number" value={v.mrp || ''} onChange={e => updateVariantField(v.id, 'mrp', e.target.value)} />
                <input className="border p-2 rounded" placeholder="Barcode" value={(v as any).barcode || ''} onChange={e => updateVariantField(v.id, 'barcode' as any, e.target.value)} />
                <input className="border p-2 rounded" placeholder="Image URL" value={v.image_url || ''} onChange={e => updateVariantField(v.id, 'image_url', e.target.value)} />
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!v.is_active} onChange={e => updateVariantField(v.id, 'is_active', e.target.checked)} /> Active
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => saveVariant(v.id)} className="px-3 py-2 bg-green-600 text-white rounded">Save</button>
                <input className="border p-2 rounded w-40" placeholder="Low stock threshold" value={lowThresholds[v.id] || ''} onChange={e => setLowThresholds(prev => ({ ...prev, [v.id]: e.target.value }))} />
                <button onClick={() => setLowStock(v.id)} className="px-3 py-2 bg-indigo-600 text-white rounded">Set Threshold</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

