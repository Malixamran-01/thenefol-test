import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { useToast } from '../../components/ToastProvider'
import ConfirmDialog from '../../components/ConfirmDialog'
import { parseCSV, slugify } from '../../utils/csv'
import { uploadFile } from '../../utils/upload'
import { socketService } from '../../services/socket'


type Product = {
  id: number
  slug: string
  title: string
  category: string
  price: string
  list_image: string
  description: string
  details?: any
}

export default function Products() {
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
            Products
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Manage your product catalog
          </p>
        </div>
        <button className="btn-primary">
          Add Product
        </button>
      </div>
      <ProductsManager />
    </div>
    </>
  )
}

function ProductsManager() {
  const { notify } = useToast()
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortKey, setSortKey] = useState<'title' | 'price' | 'category'>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<Partial<Product> & { id?: number } | null>(null)
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [pdpImages, setPdpImages] = useState<string[]>([])
  const [bannerImages, setBannerImages] = useState<string[]>([])
  const [form, setForm] = useState<Partial<Product>>({
    slug: '', title: '', category: '', price: '', list_image: '', description: '',     details: {
      sku: '', hsn: '', mrp: '', websitePrice: '', discountPercent: '', brand: '', subtitle: '',
      skinHairType: '', netQuantity: '', unitCount: '', packageContent: '',
      innerPackaging: '', outerPackaging: '', netWeight: '', deadWeight: '',
      gstPercent: '', countryOfOrigin: '', manufacturer: '', keyIngredients: '',
      ingredientBenefits: '', howToUse: '', longDescription: '', bulletHighlights: '',
      imageLinks: '', videoLinks: '', platformCategoryMapping: '', hazardous: '', badges: ''
    }
  })
  const [formMainImage, setFormMainImage] = useState<File | null>(null)
  const [formPdpImages, setFormPdpImages] = useState<File[]>([])

  const getApiBase = () => {
    if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
    const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
    const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
    return `http://${host}:${port}`
  }
  const apiBase = getApiBase()
  const toAbs = (u?: string) => {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    const base = apiBase.replace(/\/$/, '')
    const path = u.startsWith('/') ? u : `/${u}`
    return `${base}${path}`
  }

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('🔄 Loading products from API:', `${apiBase}/api/products`)
      
      // Add timestamp to prevent caching
      const res = await fetch(`${apiBase}/api/products?_=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      console.log('📡 API Response Status:', res.status, res.ok)
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      console.log(`✅ Loaded ${data?.length || 0} products from database`)
      console.log('📦 First product:', data?.[0]?.title || 'None')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('❌ Failed to load products:', e)
      setError('Failed to load products: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load()

    // Listen for product updates via socket
    const unsubscribeProductUpdate = socketService.subscribe('product_updated', (data: any) => {
      console.log('🔄 Product updated in Products page:', data)
      load() // Reload products when any product is updated
    })

    const unsubscribeProductsUpdate = socketService.subscribe('products_updated', (data: any) => {
      console.log('🔄 Products updated in Products page:', data)
      load() // Reload products when any product is updated
    })

    return () => {
      if (unsubscribeProductUpdate) unsubscribeProductUpdate()
      if (unsubscribeProductsUpdate) unsubscribeProductsUpdate()
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let listImageUrl = form.list_image || ''
      if (formMainImage) {
        try {
          listImageUrl = await uploadFile(formMainImage, apiBase)
        } catch (_) {
          notify('error','Main image upload failed')
          return
        }
      }
      const res = await fetch(`${apiBase}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          title: form.title,
          category: form.category,
          price: form.price,
          listImage: listImageUrl,
          description: form.description,
          details: form.details
        })
      })
      if (!res.ok) throw new Error('create failed')
      const created = await res.json()
      if (formPdpImages.length) {
        try {
          const uploaded: string[] = []
          for (const f of formPdpImages) {
            const url = await uploadFile(f, apiBase)
            uploaded.push(url)
          }
          await fetch(`${apiBase}/api/products/${created.id}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: uploaded })
          })
        } catch (_) {
          // ignore PDP upload errors for now
        }
      }
      await load()
      setForm({ slug: '', title: '', category: '', price: '', list_image: '', description: '', details: { ...form.details, sku: '', hsn: '', mrp: '', websitePrice: '', discountPercent: '' } })
      setFormMainImage(null)
      setFormPdpImages([])
    } catch (e) {
      notify('error','Create failed')
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  
  const remove = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setSelectedProducts(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await load()
      notify('success','Product deleted')
    } catch (e) {
      notify('error','Delete failed')
    }
  }

  const bulkRemove = async () => {
    if (selectedProducts.size === 0) {
      notify('error', 'No products selected')
      return
    }
    
    try {
      const ids = Array.from(selectedProducts)
      const res = await fetch(`${apiBase}/api/products/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Bulk delete failed')
      }
      
      await load()
      const newSelection = new Set(selectedProducts)
      ids.forEach(id => newSelection.delete(id))
      setSelectedProducts(newSelection)
      setConfirmBulkDelete(false)
      notify('success', `Successfully deleted ${ids.length} product(s)`)
    } catch (e) {
      notify('error', `Bulk delete failed: ${(e as Error).message}`)
    }
  }

  const toggleProductSelection = (id: number) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filtered.map(p => p.id)))
    }
  }

  const startEdit = (product: Product) => {
    setEditing({ 
      ...product, 
      details: product.details || {
        sku: '', hsn: '', mrp: '', websitePrice: '', discountPercent: '', brand: '', subtitle: '',
        skinHairType: '', netQuantity: '', unitCount: '', packageContent: '',
        innerPackaging: '', outerPackaging: '', netWeight: '', deadWeight: '',
        gstPercent: '', countryOfOrigin: '', manufacturer: '', keyIngredients: '',
        ingredientBenefits: '', howToUse: '', longDescription: '', bulletHighlights: '',
        imageLinks: '', videoLinks: '', platformCategoryMapping: '', hazardous: '', badges: ''
      }
    })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !editing.id) return
    if (!editing.title || !editing.slug) {
      notify('error','Slug and Title are required')
      return
    }
    try {
      const res = await fetch(`${apiBase}/api/products/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: editing.slug,
          title: editing.title,
          category: editing.category,
          price: editing.price,
          listImage: editing.list_image,
          description: editing.description,
          details: editing.details
        })
      })
      if (!res.ok) throw new Error('update failed')
      await load()
      setEditing(null)
      notify('success','Product updated')
    } catch (e) {
      notify('error','Update failed')
    }
  }

  const filtered = useMemo(() => {
    let next = items
    if (query) {
      const q = query.toLowerCase()
      next = next.filter(p => (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category||'').toLowerCase().includes(q)
      ))
    }
    if (categoryFilter) {
      next = next.filter(p => (p.category||'') === categoryFilter)
    }
    next = [...next].sort((a,b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const av = sortKey === 'price' ? Number(a.price) || 0 : (a as any)[sortKey] || ''
      const bv = sortKey === 'price' ? Number(b.price) || 0 : (b as any)[sortKey] || ''
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return next
  }, [items, query, categoryFilter, sortKey, sortDir])

  return (
    <>
    <div className="space-y-6">
      <div className="metric-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bulk Import</h2>
        <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-800">
          <strong>✅ Enhanced Bulk Import:</strong> CSV import will automatically map all product fields including pricing, GST, packaging, ingredients, and more. First image from Image Links will be used as list image. Remaining fields can be updated manually after import.
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={async (e)=>{
            const file = e.target.files?.[0]
            if (!file) return
            const buf = await file.arrayBuffer()
            if (file.name.endsWith('.csv')) {
              let text = new TextDecoder().decode(new Uint8Array(buf))
              // strip UTF-8 BOM if present
              if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
              setBulkRows(parseCSV(text))
            } else {
              const wb = XLSX.read(buf, { type: 'array' })
              const ws = wb.Sheets[wb.SheetNames[0]]
              const arr = XLSX.utils.sheet_to_json(ws) as Record<string, any>[]
              setBulkRows(arr)
            }
          }} />
          <button disabled={!bulkRows.length || bulkLoading} onClick={async()=>{
            setBulkLoading(true)
            try {
              const tryGet = (row: Record<string, any>, keys: string[]): string => {
                const entries = Object.entries(row)
                const found = keys.find(k => entries.some(([rk]) => rk.toLowerCase().replace(/\s+|_|\(|\)/g,'') === k.toLowerCase().replace(/\s+|_|\(|\)/g,'')))
                if (!found) return ''
                const matchKey = entries.find(([rk]) => rk.toLowerCase().replace(/\s+|_|\(|\)/g,'') === found.toLowerCase().replace(/\s+|_|\(|\)/g,''))![0]
                const v = row[matchKey]
                if (v == null || v === '') return ''
                return String(v).trim()
              }
              
              // Helper to extract first image from comma-separated list
              const getFirstImage = (imageLinks: string): string => {
                if (!imageLinks) return ''
                const first = imageLinks.split(',')[0].trim()
                return first || ''
              }
              
              // Map CSV category values to standard dropdown categories
              const mapCategoryToStandard = (rawCategory: string): string => {
                if (!rawCategory) return ''
                const normalized = rawCategory.toLowerCase().trim()
                
                // Exact matches first
                if (normalized === 'face care') return 'Face Care'
                if (normalized === 'hair care') return 'Hair Care'
                if (normalized === 'body care') return 'Body Care'
                if (normalized === 'combo') return 'Combo'
                
                // Map various CSV category formats to standard values
                // Check for combo/pack first (most specific)
                if (normalized.includes('combo') || normalized.includes('pack')) {
                  return 'Combo'
                }
                // Check for hair (includes "Hair & Skin Care", "Hair Care", etc.)
                if (normalized.includes('hair')) {
                  return 'Hair Care'
                }
                // Check for face (but not if it's part of "hair & face")
                if (normalized.includes('face') && !normalized.includes('hair')) {
                  return 'Face Care'
                }
                // Check for body
                if (normalized.includes('body')) {
                  return 'Body Care'
                }
                
                // Default: return capitalized version
                return rawCategory.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
              }
              
              let success = 0
              let failed = 0
              const errors: string[] = []
              const createdSlugs = new Set<string>()
              
              for (let i = 0; i < bulkRows.length; i++) {
                const r = bulkRows[i]
                
                // Basic fields
                const title = tryGet(r, ['product name', 'title', 'producttitle', 'name', 'Product Name'])
                const baseSlug = tryGet(r, ['slug', 'Slug']) || slugify(title)
                
                // Ensure unique slug
                let slugVal = baseSlug
                let counter = 1
                while (createdSlugs.has(slugVal)) {
                  slugVal = `${baseSlug}-${counter}`
                  counter++
                }
                createdSlugs.add(slugVal)
                
                // Get category and map it to standard values
                const rawCategory = tryGet(r, ['product category', 'category', 'cat', 'Product Category'])
                const category = mapCategoryToStandard(rawCategory)
                const mrp = tryGet(r, ['mrp', 'MRP', 'MRP '])
                const websitePrice = tryGet(r, ['website price', 'websiteprice', 'websiteprice', 'WEBSITE price', 'websitePrice'])
                const discountPercent = tryGet(r, ['discount', 'discountpercent', 'discount %', 'Discount %', 'discountPercent'])
                const priceRaw = websitePrice || mrp || tryGet(r, ['price', 'amount'])
                const description = tryGet(r, ['product description (long)', 'longdescription', 'description', 'desc', 'Product Description (Long)'])
                const price = priceRaw ? String(priceRaw) : ''
                
                // Extract first image from image links
                const imageLinksStr = tryGet(r, ['image links', 'imagelinks', 'Image Links', 'imageLinks'])
                const listImage = getFirstImage(imageLinksStr)
                
                // Build comprehensive details object from CSV
                const details: any = {
                  // Basic Product Info
                  sku: tryGet(r, ['sku', 'SKU']),
                  hsn: tryGet(r, ['hsn code', 'hsncode', 'HSN Code', 'hsn']),
                  brand: tryGet(r, ['brand name', 'brandname', 'Brand Name', 'brand']) || 'NEFOL',
                  productTitle: tryGet(r, ['product title', 'producttitle', 'Product Title', 'productTitle']),
                  subtitle: tryGet(r, ['subtitle / tagline', 'subtitle', 'Subtitle / Tagline', 'subtitle']),
                  
                  // Category & Type
                  subCategory: tryGet(r, ['product sub-category', 'subcategory', 'Product Sub-Category', 'subCategory']),
                  productType: tryGet(r, ['product type', 'producttype', 'Product Type', 'productType']),
                  skinHairType: tryGet(r, ['skin/hair type', 'skinhairtype', 'Skin/Hair Type', 'skinHairType']),
                  
                  // Pricing
                  mrp: mrp || '',
                  websitePrice: websitePrice || '',
                  discountPercent: discountPercent || (mrp && websitePrice ? 
                    String(Math.round(((parseFloat(mrp) - parseFloat(websitePrice)) / parseFloat(mrp)) * 100)) : ''),
                  discount: discountPercent || '',
                  gst: tryGet(r, ['gst %', 'gstpercent', 'GST %', 'gstPercent', 'gst']),
                  gstPercent: tryGet(r, ['gst %', 'gstpercent', 'GST %', 'gstPercent', 'gst']),
                  
                  // Packaging & Quantity
                  netQuantity: tryGet(r, ['net quantity (content)', 'netquantity', 'Net Quantity (Content)', 'netQuantity']),
                  unitCount: tryGet(r, ['unit count (pack of)', 'unitcount', 'Unit Count (Pack of)', 'unitCount']),
                  netWeight: tryGet(r, ['net weight (product only)', 'netweight', 'Net Weight (Product Only)', 'netWeight']),
                  deadWeight: tryGet(r, ['dead weight (packaging only)', 'deadweight', 'Dead Weight (Packaging Only)', 'deadWeight']),
                  packageContent: tryGet(r, ['package content details', 'packagecontent', 'Package Content Details', 'packageContent']),
                  innerPackaging: tryGet(r, ['inner packaging type', 'innerpackaging', 'Inner Packaging Type', 'innerPackaging']),
                  outerPackaging: tryGet(r, ['outer packaging type', 'outerpackaging', 'Outer Packaging Type', 'outerPackaging']),
                  
                  // Manufacturer & Origin
                  countryOfOrigin: tryGet(r, ['country of origin', 'countryoforigin', 'Country of Origin', 'countryOfOrigin']),
                  manufacturer: tryGet(r, ['manufacturer / packer / importer', 'manufacturer', 'Manufacturer / Packer / Importer', 'manufacturer']),
                  
                  // Product Details
                  keyIngredients: tryGet(r, ['key ingredients', 'keyingredients', 'Key Ingredients', 'keyIngredients']),
                  ingredientBenefits: tryGet(r, ['ingredient benefits', 'ingredientbenefits', 'Ingredient Benefits', 'ingredientBenefits']),
                  howToUse: tryGet(r, ['how to use (steps)', 'howtouse', 'How to Use (Steps)', 'howToUse', 'how to use']),
                  longDescription: description || tryGet(r, ['product description (long)', 'longdescription', 'Product Description (Long)', 'longDescription']),
                  bulletHighlights: tryGet(r, ['bullet highlights', 'bullethighlights', 'Bullet Highlights', 'bulletHighlights']),
                  
                  // Media & Links
                  imageLinks: imageLinksStr || '',
                  videoLinks: tryGet(r, ['video links', 'videolinks', 'Video Links', 'videoLinks']),
                  
                  // Additional Information
                  platformCategoryMapping: tryGet(r, ['platform category mapping', 'platformcategorymapping', 'Platform Category Mapping', 'platformCategoryMapping']),
                  hazardous: tryGet(r, ['hazardous / fragile (y/n)', 'hazardous', 'Hazardous / Fragile (Y/N)', 'hazardous']),
                  badges: tryGet(r, ['special attributes (badges)', 'badges', 'Special Attributes (Badges)', 'badges']),
                }
                
                // Remove empty fields to keep details clean
                Object.keys(details).forEach(key => {
                  if (details[key] === '' || details[key] === null || details[key] === undefined) {
                    delete details[key]
                  }
                })
                
                const payload = { 
                  slug: slugVal, 
                  title, 
                  category, 
                  price, 
                  listImage, 
                  description, 
                  details 
                }
                
                if (!payload.title || !payload.slug) { 
                  failed++; 
                  errors.push(`Row ${i+1}: missing title/slug`); 
                  continue 
                }
                
                try {
                  const res = await fetch(`${apiBase}/api/products`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(payload)
                  })
                  
                  if (res.ok) {
                    const data = await res.json()
                    success++
                    console.log(`Product created: ${data.id} - ${data.title}`)
                  } else {
                    const errorData = await res.json().catch(() => ({}))
                    failed++
                    const errorMsg = errorData.error || errorData.message || `HTTP ${res.status}`
                    errors.push(`Row ${i+1}: ${errorMsg}`)
                    console.error(`Failed to create product:`, errorData)
                  }
                } catch (reqError) {
                  failed++
                  errors.push(`Row ${i+1}: Network error - ${reqError}`)
                  console.error(`Network error for row ${i+1}:`, reqError)
                }
              }
              
              // Wait a bit to ensure database commits are complete
              console.log(`Import finished. Waiting for database commit...`)
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // Reload products from database
              console.log('Reloading products from database...')
              await load()
              setBulkRows([])
              
              const message = `Import complete! Success: ${success}, Failed: ${failed}`
              notify(failed? 'error':'success', message)
            } catch (e) {
              console.error('Import failed:', e)
              notify('error', `Import failed: ${e}` as any)
            } finally {
              setBulkLoading(false)
            }
          }} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{bulkLoading? 'Importing...' : `Import ${bulkRows.length||''}`}</button>
        </div>
        {!!bulkRows.length && (
          <div className="mt-4 max-h-64 overflow-auto rounded border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-white/10 bg-slate-900 text-white/70">
                <tr>
                  <th className="py-2 pr-3">title</th>
                  <th className="py-2 pr-3">slug</th>
                  <th className="py-2 pr-3">category</th>
                  <th className="py-2 pr-3">price</th>
                  <th className="py-2 pr-3">description</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.slice(0,50).map((r,idx)=> (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-1 pr-3">{r.title}</td>
                    <td className="py-1 pr-3">{r.slug || slugify(r.title||'')}</td>
                    <td className="py-1 pr-3">{r.category}</td>
                    <td className="py-1 pr-3">{r.price}</td>
                    <td className="py-1 pr-3">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkRows.length>50 && <div className="p-2 text-center text-xs text-white/60">Showing first 50 of {bulkRows.length}</div>}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold">Add Product</h2>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Slug" value={form.slug||''} onChange={e=>setForm(prev=>({...prev, slug:e.target.value}))} required />
          <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Title" value={form.title||''} onChange={e=>setForm(prev=>({...prev, title:e.target.value}))} required />
          <select 
            className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
            value={form.category||''} 
            onChange={e=>setForm(prev=>({...prev, category:e.target.value}))}
            required
          >
            <option value="">Select Category</option>
            <option value="Face Care">Face Care</option>
            <option value="Hair Care">Hair Care</option>
            <option value="Body Care">Body Care</option>
            <option value="Combo">Combo</option>
          </select>
              <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Price (display)" value={form.price||''} onChange={e=>setForm(prev=>({...prev, price:e.target.value}))} />
              <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="SKU" value={form.details?.sku||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), sku:e.target.value }}))} />
              <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="HSN Code" value={form.details?.hsn||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), hsn:e.target.value }}))} />
              <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="MRP" value={form.details?.mrp||''} onChange={e=>{
                const mrp = e.target.value;
                const discountPercent = form.details?.discountPercent;
                if (mrp && discountPercent) {
                  const discountedPrice = parseFloat(mrp) - (parseFloat(mrp) * parseFloat(discountPercent) / 100);
                  setForm(prev=>({...prev, details: { 
                    ...(prev.details||{}), 
                    mrp: mrp,
                    websitePrice: discountedPrice.toFixed(2)
                  }}));
                } else {
                  setForm(prev=>({...prev, details: { ...(prev.details||{}), mrp: mrp }}));
                }
              }} />
              <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Discount %" type="number" min="0" max="100" value={form.details?.discountPercent||''} onChange={e=>{
                const discountPercent = e.target.value;
                const mrp = form.details?.mrp;
                if (discountPercent && mrp) {
                  const discountedPrice = parseFloat(mrp) - (parseFloat(mrp) * parseFloat(discountPercent) / 100);
                  setForm(prev=>({...prev, details: { 
                    ...(prev.details||{}), 
                    discountPercent: discountPercent,
                    websitePrice: discountedPrice.toFixed(2)
                  }}));
                } else {
                  setForm(prev=>({...prev, details: { ...(prev.details||{}), discountPercent: discountPercent }}));
                }
              }} />
              <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Website Price (Discounted)" value={form.details?.websitePrice||''} onChange={e=>{
                const discountedPrice = e.target.value;
                const mrp = form.details?.mrp;
                if (discountedPrice && mrp) {
                  const discountPercent = ((parseFloat(mrp) - parseFloat(discountedPrice)) / parseFloat(mrp) * 100).toFixed(1);
                  setForm(prev=>({...prev, details: { 
                    ...(prev.details||{}), 
                    websitePrice: discountedPrice,
                    discountPercent: discountPercent
                  }}));
                } else {
                  setForm(prev=>({...prev, details: { ...(prev.details||{}), websitePrice: discountedPrice }}));
                }
              }} />
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-white/70">Main Image (upload or fallback URL)</div>
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={e=>setFormMainImage(e.target.files?.[0]||null)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              <span className="text-xs text-white/50">or</span>
              <input className="flex-1 rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="List Image URL (optional)" value={form.list_image||''} onChange={e=>setForm(prev=>({...prev, list_image:e.target.value}))} />
            </div>
            <div className="mt-2 text-xs text-white/50">Add additional video in PDP Media below.</div>
          </div>
          <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Description" value={form.description||''} onChange={e=>setForm(prev=>({...prev, description:e.target.value}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="How to Use" value={form.details?.howToUse||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), howToUse:e.target.value }}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Key Ingredients" value={form.details?.keyIngredients||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), keyIngredients:e.target.value }}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Ingredient Benefits" value={form.details?.ingredientBenefits||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), ingredientBenefits:e.target.value }}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Bullet Highlights" value={form.details?.bulletHighlights||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), bulletHighlights:e.target.value }}))} />
          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-white/70">PDP Media (images or 1 video)</div>
            <input multiple type="file" accept="image/*,video/*" onChange={e=>setFormPdpImages(Array.from(e.target.files||[]))} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <div className="mt-2 text-xs text-white/50">Tip: Upload up to 7 images and 1 short video (mp4/webm).</div>
          </div>
          <div className="md:col-span-3">
            <button className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Products</h2>
            {selectedProducts.size > 0 && (
              <>
                <span className="text-sm text-white/70">
                  {selectedProducts.size} selected
                </span>
                <button
                  onClick={() => setConfirmBulkDelete(true)}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  disabled={selectedProducts.size === 0}
                >
                  Delete Selected ({selectedProducts.size})
                </button>
              </>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Search..." value={query} onChange={e=>setQuery(e.target.value)} />
            <select className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              <option value="Face Care">Face Care</option>
              <option value="Hair Care">Hair Care</option>
              <option value="Body Care">Body Care</option>
              <option value="Combo">Combo</option>
            </select>
            <div className="flex items-center gap-2">
              <select className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={sortKey} onChange={e=>setSortKey(e.target.value as any)}>
                <option value="title">Title</option>
                <option value="price">Price</option>
                <option value="category">Category</option>
              </select>
              <button className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15" onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>{sortDir==='asc'?'Asc':'Desc'}</button>
            </div>
              <button onClick={load} className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Refresh</button>
              <form onSubmit={async (e)=>{e.preventDefault(); const input=(e.currentTarget.elements.namedItem('csv') as HTMLInputElement); const file=input.files?.[0]; if(!file) return; const fd=new FormData(); fd.append('file', file); const r=await fetch(`${apiBase}/api/products-csv/upload`,{method:'POST', body: fd}); if(r.ok){alert('CSV uploaded');} else {alert('CSV upload failed')}}} className="flex items-center gap-2">
                <input name="csv" type="file" accept=".csv" className="rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <button className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Upload CSV</button>
              </form>
          </div>
        </div>
        {loading ? <p>Loading...</p> : error ? <p className="text-red-400">{error}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-white/70">
                <tr>
                  <th className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Image</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(p.id)}
                        onChange={() => toggleProductSelection(p.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-2 pr-4">{p.id}</td>
                    <td className="py-2 pr-4">{p.slug}</td>
                    <td className="py-2 pr-4">{p.title}</td>
                    <td className="py-2 pr-4">{p.category}</td>
                    <td className="py-2 pr-4">
                      <div className="text-sm">
                        {p.details?.mrp && p.details?.websitePrice ? (
                          <div>
                            <div className="text-gray-500 line-through text-xs">₹{p.details.mrp}</div>
                            <div className="font-semibold text-green-600">₹{p.details.websitePrice}</div>
                            <div className="text-xs text-green-500">
                              {((parseFloat(p.details.mrp) - parseFloat(p.details.websitePrice)) / parseFloat(p.details.mrp) * 100).toFixed(0)}% OFF
                            </div>
                          </div>
                        ) : (
                          <div className="font-semibold">₹{p.price}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      {p.list_image ? <img src={toAbs(p.list_image)} className="h-10 w-10 rounded object-cover" /> : <span className="opacity-50">—</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button onClick={async ()=>{
                          setSelected(p)
                          setPdpImages([])
                          setBannerImages([])
                          // Load existing images
                          try {
                            const imagesRes = await fetch(`${apiBase}/api/products/${p.id}/images`)
                            if (imagesRes.ok) {
                              const images = await imagesRes.json()
                              // Deduplicate images by URL
                              const pdpImgs: string[] = [...new Set(images.filter((img: any) => img.type === 'pdp' || !img.type).map((img: any) => img.url).filter(Boolean))] as string[]
                              const bannerImgs: string[] = [...new Set(images.filter((img: any) => img.type === 'banner').map((img: any) => img.url).filter(Boolean))] as string[]
                              setPdpImages(pdpImgs)
                              setBannerImages(bannerImgs)
                            }
                          } catch (_) {
                            // ignore errors
                          }
                        }} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15">Images</button>
                        <button onClick={()=>startEdit(p)} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15">Edit</button>
                        <button onClick={()=>setConfirmDeleteId(p.id)} className="rounded bg-red-600 px-3 py-1 text-xs hover:bg-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-gray-300 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Manage Images — {selected.title}</h3>
                <button onClick={()=>setSelected(null)} className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300">Close</button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm text-gray-700">Main image</div>
                  <div className="flex items-center gap-3">
                    {selected.list_image ? <img src={toAbs(selected.list_image)} className="h-16 w-16 rounded object-cover" /> : <div className="h-16 w-16 rounded border border-gray-300 bg-gray-50" />}
                    <input type="file" accept="image/*" className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" onChange={async e=>{
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const url = await uploadFile(file, apiBase)
                        const res = await fetch(`${apiBase}/api/products/${selected.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ listImage: url })
                        })
                        if (!res.ok) {
                          const txt = await res.text().catch(()=> '')
                          throw new Error(txt || 'Update failed')
                        }
                        // optimistic: update table state and selected modal
                        setItems(prev => prev.map(p => p.id === selected.id ? { ...p, list_image: url } : p))
                        setSelected(prev => prev ? { ...prev, list_image: url } as Product : prev)
                        // also refresh from server to ensure DB persisted
                        await load()
                        notify('success','Main image updated')
                      } catch (_) {
                        notify('error','Upload failed')
                      }
                    }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm text-gray-700">PDP images</div>
                  <div className="flex flex-wrap gap-2">
                    {pdpImages.map((u,idx)=>{
                      const abs = toAbs(u)
                      const isVid = /\.(mp4|webm|ogg)(\?|$)/i.test(abs)
                      return isVid ? (
                        <video key={idx} src={abs} className="h-16 w-16 rounded object-cover" />
                      ) : (
                        <img key={idx} src={abs} className="h-16 w-16 rounded object-cover" />
                      )
                    })}
                  </div>
                  <div className="mt-2">
                    <input multiple type="file" accept="image/*,video/*" className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" onChange={async e=>{
                      const files = Array.from(e.target.files || [])
                      if (!files.length) return
                      try {
                        const uploaded: string[] = []
                        for (const f of files) {
                          const url = await uploadFile(f, apiBase)
                          uploaded.push(url)
                        }
                        await fetch(`${apiBase}/api/products/${selected.id}/images`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ images: uploaded, type: 'pdp' })
                        })
                        // Reload images from database to avoid duplicates
                        const imagesRes = await fetch(`${apiBase}/api/products/${selected.id}/images`)
                        if (imagesRes.ok) {
                          const images = await imagesRes.json()
                          // Deduplicate images by URL
                          const pdpImgs: string[] = [...new Set(images.filter((img: any) => img.type === 'pdp' || !img.type).map((img: any) => img.url).filter(Boolean))] as string[]
                          setPdpImages(pdpImgs)
                        }
                        await load()
                        notify('success','PDP images uploaded')
                      } catch (_) {
                        notify('error','Upload failed')
                      }
                    }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm text-gray-700">Banner images</div>
                  <div className="flex flex-wrap gap-2">
                    {bannerImages.map((u,idx)=>{
                      const abs = toAbs(u)
                      const isVid = /\.(mp4|webm|ogg)(\?|$)/i.test(abs)
                      return isVid ? (
                        <video key={idx} src={abs} className="h-16 w-16 rounded object-cover" />
                      ) : (
                        <img key={idx} src={abs} className="h-16 w-16 rounded object-cover" />
                      )
                    })}
                  </div>
                  <div className="mt-2">
                    <input multiple type="file" accept="image/*,video/*" className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" onChange={async e=>{
                      const files = Array.from(e.target.files || [])
                      if (!files.length) return
                      try {
                        const uploaded: string[] = []
                        for (const f of files) {
                          const url = await uploadFile(f, apiBase)
                          uploaded.push(url)
                        }
                        await fetch(`${apiBase}/api/products/${selected.id}/images`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ images: uploaded, type: 'banner' })
                        })
                        // Reload images from database to avoid duplicates
                        const imagesRes = await fetch(`${apiBase}/api/products/${selected.id}/images`)
                        if (imagesRes.ok) {
                          const images = await imagesRes.json()
                          // Deduplicate images by URL
                          const bannerImgs: string[] = [...new Set(images.filter((img: any) => img.type === 'banner').map((img: any) => img.url).filter(Boolean))] as string[]
                          setBannerImages(bannerImgs)
                        }
                        await load()
                        notify('success','Banner images uploaded')
                      } catch (_) {
                        notify('error','Upload failed')
                      }
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="w-full max-w-4xl rounded-lg border border-gray-300 bg-white shadow-xl my-8">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10 flex items-center justify-between rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-900">Edit Product - {editing.title}</h3>
                <button onClick={()=>setEditing(null)} className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300">Close</button>
              </div>
              
              {/* Scrollable Form Content */}
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-6">
                <form onSubmit={saveEdit} className="space-y-6">
                
                {/* Basic Information */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Product Name *" value={editing.title||''} onChange={e=>setEditing(prev=>({...(prev as any), title:e.target.value}))} required />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Slug *" value={editing.slug||''} onChange={e=>setEditing(prev=>({...(prev as any), slug:e.target.value}))} required />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Brand Name" value={editing.details?.brand||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), brand:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="SKU" value={editing.details?.sku||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), sku:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="HSN Code" value={editing.details?.hsn||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), hsn:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Product Title" value={editing.details?.productTitle||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), productTitle:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Subtitle / Tagline" value={editing.details?.subtitle||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), subtitle:e.target.value}}))} />
                  </div>
                </div>

                {/* Category & Type */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Category & Type</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <select 
                      className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      value={editing.category||''} 
                      onChange={e=>setEditing(prev=>({...(prev as any), category:e.target.value}))}
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Face Care">Face Care</option>
                      <option value="Hair Care">Hair Care</option>
                      <option value="Body Care">Body Care</option>
                      <option value="Combo">Combo</option>
                    </select>
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Sub-Category" value={editing.details?.subCategory||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), subCategory:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Product Type" value={editing.details?.productType||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), productType:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Skin/Hair Type" value={editing.details?.skinHairType||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), skinHairType:e.target.value}}))} />
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Pricing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">MRP (₹)</label>
                      <input 
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                        placeholder="MRP" 
                        type="number"
                        value={editing.details?.mrp||''} 
                        onChange={e=>{
                          const mrp = e.target.value;
                          const discountPercent = editing.details?.discountPercent;
                          if (mrp && discountPercent) {
                            const discountedPrice = parseFloat(mrp) - (parseFloat(mrp) * parseFloat(discountPercent) / 100);
                            setEditing(prev=>({...(prev as any), details: { 
                              ...(prev?.details||{}), 
                              mrp: mrp,
                              websitePrice: discountedPrice.toFixed(2)
                            }}));
                          } else {
                            setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), mrp: mrp }}));
                          }
                        }} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Discount %</label>
                      <input 
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                        placeholder="Discount %" 
                        type="number"
                        min="0"
                        max="100"
                        value={editing.details?.discount||editing.details?.discountPercent||''} 
                        onChange={e=>{
                          const discountPercent = e.target.value;
                          const mrp = editing.details?.mrp;
                          if (discountPercent && mrp) {
                            const discountedPrice = parseFloat(mrp) - (parseFloat(mrp) * parseFloat(discountPercent) / 100);
                            setEditing(prev=>({...(prev as any), details: { 
                              ...(prev?.details||{}), 
                              discount: discountPercent,
                              discountPercent: discountPercent,
                              websitePrice: discountedPrice.toFixed(2)
                            }}));
                          } else {
                            setEditing(prev=>({...(prev as any), details: { 
                              ...(prev?.details||{}), 
                              discount: discountPercent,
                              discountPercent: discountPercent
                            }}));
                          }
                        }} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Website Price (₹)</label>
                      <input 
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                        placeholder="Website Price" 
                        type="number"
                        value={editing.details?.websitePrice||''} 
                        onChange={e=>{
                          const discountedPrice = e.target.value;
                          const mrp = editing.details?.mrp;
                          if (discountedPrice && mrp) {
                            const discountPercent = ((parseFloat(mrp) - parseFloat(discountedPrice)) / parseFloat(mrp) * 100).toFixed(1);
                            setEditing(prev=>({...(prev as any), details: { 
                              ...(prev?.details||{}), 
                              websitePrice: discountedPrice,
                              discount: discountPercent,
                              discountPercent: discountPercent
                            }}));
                          } else {
                            setEditing(prev=>({...(prev as any), details: { 
                              ...(prev?.details||{}), 
                              websitePrice: discountedPrice
                            }}));
                          }
                        }} 
                      />
                    </div>
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="GST %" value={editing.details?.gst||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), gst:e.target.value}}))} />
                  </div>
                  {editing.details?.mrp && editing.details?.websitePrice && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600">Discount Amount</div>
                          <div className="text-lg font-semibold text-green-600">
                            ₹{(parseFloat(editing.details.mrp) - parseFloat(editing.details.websitePrice)).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Discount %</div>
                          <div className="text-lg font-semibold text-green-600">
                            {((parseFloat(editing.details.mrp) - parseFloat(editing.details.websitePrice)) / parseFloat(editing.details.mrp) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Packaging & Quantity */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Packaging & Quantity</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Net Quantity" value={editing.details?.netQuantity||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), netQuantity:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Unit Count (Pack of)" value={editing.details?.unitCount||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), unitCount:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Net Weight" value={editing.details?.netWeight||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), netWeight:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Dead Weight" value={editing.details?.deadWeight||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), deadWeight:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-2" placeholder="Package Content Details" value={editing.details?.packageContent||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), packageContent:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Inner Packaging Type" value={editing.details?.innerPackaging||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), innerPackaging:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Outer Packaging Type" value={editing.details?.outerPackaging||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), outerPackaging:e.target.value}}))} />
                  </div>
                </div>

                {/* Manufacturer & Origin */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Manufacturer & Origin</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Country of Origin" value={editing.details?.countryOfOrigin||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), countryOfOrigin:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Manufacturer / Packer / Importer" value={editing.details?.manufacturer||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), manufacturer:e.target.value}}))} />
                  </div>
                </div>

                {/* Product Details */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Product Details</h4>
                  <div className="space-y-4">
                    <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Key Ingredients" rows={2} value={editing.details?.keyIngredients||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), keyIngredients:e.target.value}}))} />
                    <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ingredient Benefits" rows={2} value={editing.details?.ingredientBenefits||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), ingredientBenefits:e.target.value}}))} />
                    <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="How to Use" rows={2} value={editing.details?.howToUse||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), howToUse:e.target.value}}))} />
                    <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Product Description (Long)" rows={4} value={editing.details?.longDescription||editing.description||''} onChange={e=>{
                      setEditing(prev=>({...(prev as any), description:e.target.value, details: { ...(prev?.details||{}), longDescription:e.target.value}}))
                    }} />
                    <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Bullet Highlights" rows={2} value={editing.details?.bulletHighlights||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), bulletHighlights:e.target.value}}))} />
                  </div>
                </div>

                {/* Media & Links */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Media & Links</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="List Image URL" value={editing.list_image||''} onChange={e=>setEditing(prev=>({...(prev as any), list_image:e.target.value}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Image Links (comma separated)" value={editing.details?.imageLinks||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), imageLinks:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Video Links (comma separated)" value={editing.details?.videoLinks||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), videoLinks:e.target.value}}))} />
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Platform Category Mapping" value={editing.details?.platformCategoryMapping||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), platformCategoryMapping:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Hazardous / Fragile (Y/N)" value={editing.details?.hazardous||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), hazardous:e.target.value}}))} />
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-2" placeholder="Special Attributes (Badges)" value={editing.details?.badges||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), badges:e.target.value}}))} />
                  </div>
                </div>

                  {/* Submit Button */}
                  <div className="sticky bottom-0 bg-white pt-4 pb-2 -mx-6 px-6 border-t border-gray-200">
                    <button type="submit" className="w-full rounded bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors">
                      💾 Save All Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    <ConfirmDialog 
      open={!!confirmDeleteId} 
      onClose={()=>setConfirmDeleteId(null)} 
      onConfirm={()=>{ if (confirmDeleteId!=null) remove(confirmDeleteId) }} 
      title="Delete this product?" 
      description="This action cannot be undone." 
      confirmText="Delete" 
    />
    <ConfirmDialog 
      open={confirmBulkDelete} 
      onClose={()=>setConfirmBulkDelete(false)} 
      onConfirm={bulkRemove} 
      title={`Delete ${selectedProducts.size} product(s)?`} 
      description={`You are about to delete ${selectedProducts.size} product(s). This action cannot be undone.`} 
      confirmText="Delete All" 
    />
    </>
  )
}
