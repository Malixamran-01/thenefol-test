import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { useToast } from '../../components/ToastProvider'
import ConfirmDialog from '../../components/ConfirmDialog'
import ConcernPicker, { loadConcernOptions } from '../../components/ConcernPicker'
import BulkEditProducts from '../../components/BulkEditProducts'
import { PRODUCT_CARD_BADGES, cardBadgesOf } from '../../../../common/src/productBadges'
import { parseCSVRows } from '../../utils/csv'
import { buildImportPlan, effectiveDiscount, ImportPlan, ImportRow, pricingForExisting } from '../../utils/productImport'
import { uploadFile, uploadMedia, isVideoUrl, MAX_VIDEO_BYTES, VIDEO_ACCEPT } from '../../utils/upload'
import { socketService } from '../../services/socket'
import { getApiBaseUrl } from '../../utils/apiUrl'


type Product = {
  id: number
  slug: string
  title: string
  category: string
  price: string
  list_image: string
  description: string
  details?: any
  /** Shop by Concern tags (from /api/products) */
  concerns?: { slug: string; name: string }[]
}

type ImportResult = { rowNumber: number; title: string; status: 'created' | 'updated' | 'skipped' | 'failed'; message?: string }

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
        <div className="admin-page-header">
        <div>
          <h1 
            className="text-2xl sm:text-3xl font-light mb-2 tracking-[0.15em]" 
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
  const [editConcerns, setEditConcerns] = useState<string[]>([])
  const [formConcerns, setFormConcerns] = useState<string[]>([])
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [updateExisting, setUpdateExisting] = useState(true)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [pdpImages, setPdpImages] = useState<Array<{ id: number; url: string; type?: string; display_order?: number; poster_url?: string | null }>>([])
  const [videoUpload, setVideoUpload] = useState<{ name: string; percent: number } | null>(null)
  const [bannerImages, setBannerImages] = useState<Array<{ id: number; url: string; type?: string; display_order?: number }>>([])
  const [draggedImage, setDraggedImage] = useState<{ id: number; type: 'pdp' | 'banner'; index: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<{ type: 'pdp' | 'banner'; index: number } | null>(null)
  const [form, setForm] = useState<Partial<Product>>({
    slug: '', title: '', category: '', price: '', list_image: '', description: '',     details: {
      sku: '', hsn: '', mrp: '', websitePrice: '', discountPercent: '', brand: '', subtitle: '',
      skinHairType: '', netQuantity: '', unitCount: '', packageContent: '',
      innerPackaging: '', outerPackaging: '', netWeight: '', deadWeight: '',
      gstPercent: '', countryOfOrigin: '', keyIngredients: '',
      ingredientBenefits: '', howToUse: '', longDescription: '', bulletHighlights: '',
      imageLinks: '', videoLinks: '', platformCategoryMapping: '', hazardous: '', badges: ''
    }
  })
  const [formMainImage, setFormMainImage] = useState<File | null>(null)
  const [formPdpImages, setFormPdpImages] = useState<File[]>([])
  const [formPdpVideo, setFormPdpVideo] = useState<File | null>(null)

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()

  const authHeaders = useMemo((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('auth_token')
    if (token) headers.Authorization = `Bearer ${token}`
    const role = localStorage.getItem('role')
    if (role) headers['x-user-role'] = role
    const permissions = localStorage.getItem('permissions')
    if (permissions) headers['x-user-permissions'] = permissions
    return headers
  }, [])

  /** Returns an error message when the file can't be used as a PDP video. */
  const validateVideoFile = (file: File): string | null => {
    if (!file.type.startsWith('video/') && !isVideoUrl(file.name)) return 'Please choose a video file (MP4, WebM or MOV).'
    if (file.size > MAX_VIDEO_BYTES) return `Video is ${(file.size / 1048576).toFixed(0)}MB — keep PDP videos under ${MAX_VIDEO_BYTES / 1048576}MB.`
    return null
  }

  const loadProductMedia = async (productId: number) => {
    const imagesRes = await fetch(`${apiBase}/products/${productId}/images`)
    if (!imagesRes.ok) return
    const response = await imagesRes.json()
    // Handle both direct array response and wrapped response
    const images = Array.isArray(response) ? response : (response.data || response.images || [])
    // Store full image objects with IDs for deletion, sorted by display_order
    const toItem = (img: any) => ({ id: img.id, url: img.url, type: img.type, display_order: img.display_order || img.id, poster_url: img.poster_url || null })
    const byOrder = (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
    setPdpImages(images.filter((img: any) => (img.type === 'pdp' || !img.type) && img.url && img.id).map(toItem).sort(byOrder))
    setBannerImages(images.filter((img: any) => img.type === 'banner' && img.url && img.id).map(toItem).sort(byOrder))
  }

  const uploadPdpVideo = async (productId: number, file: File) => {
    const invalid = validateVideoFile(file)
    if (invalid) {
      notify('error', invalid)
      return false
    }
    setVideoUpload({ name: file.name, percent: 0 })
    try {
      const media = await uploadMedia(file, apiBase, (percent) => setVideoUpload({ name: file.name, percent }))
      const res = await fetch(`${apiBase}/products/${productId}/images`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ images: [{ url: media.url, poster: media.poster }], type: 'pdp' })
      })
      if (!res.ok) throw new Error('save failed')
      return true
    } catch (err) {
      notify('error', `Video upload failed${err instanceof Error && err.message ? `: ${err.message}` : ''}`)
      return false
    } finally {
      setVideoUpload(null)
    }
  }

  const deleteOneProductImage = async (imageId: number) => {
    if (!selected) return false
    const res = await fetch(`${apiBase}/products/${selected.id}/images/${imageId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    return res.ok
  }

  const deleteAllProductImagesOfType = async (type: 'pdp' | 'banner') => {
    if (!selected) return false
    const res = await fetch(`${apiBase}/products/${selected.id}/images?type=${type}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!res.ok) return false
    if (type === 'pdp') setPdpImages([])
    else setBannerImages([])
    await load()
    return true
  }
  
  // Function to save image order to backend
  const saveImageOrder = async (images: Array<{ id: number; url: string; type?: string; display_order?: number }>, type: 'pdp' | 'banner') => {
    if (!selected) return
    try {
      const orderUpdates = images.map((img, index) => ({
        id: img.id,
        display_order: index + 1
      }))
      const res = await fetch(`${apiBase}/products/${selected.id}/images/reorder`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ images: orderUpdates, type })
      })
      if (res.ok) {
        notify('success', 'Image order updated')
      } else {
        notify('error', 'Failed to update image order')
      }
    } catch (err) {
      notify('error', 'Failed to update image order')
    }
  }
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
      console.log('🔄 Loading products from API:', `${apiBase}/products`)
      
      // Add timestamp to prevent caching
      const res = await fetch(`${apiBase}/products?_=${Date.now()}`, {
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
      const res = await fetch(`${apiBase}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          title: form.title,
          category: form.category,
          price: form.details?.websitePrice || form.price || form.details?.mrp,
          listImage: listImageUrl,
          description: form.description,
          details: form.details,
          concerns: formConcerns
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
          await fetch(`${apiBase}/products/${created.id}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: uploaded })
          })
        } catch (_) {
          // ignore PDP upload errors for now
        }
      }
      if (formPdpVideo) {
        // Appended after the images; reorder from the Images dialog
        await uploadPdpVideo(created.id, formPdpVideo)
      }
      await load()
      setForm({ slug: '', title: '', category: '', price: '', list_image: '', description: '', details: { ...form.details, sku: '', hsn: '', mrp: '', websitePrice: '', discountPercent: '' } })
      setFormMainImage(null)
      setFormPdpImages([])
      setFormPdpVideo(null)
      setFormConcerns([])
      loadConcernOptions(true)
    } catch (e) {
      notify('error','Create failed')
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  
  const remove = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/products/${id}`, { method: 'DELETE' })
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
      const res = await fetch(`${apiBase}/products/bulk-delete`, {
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
    setEditConcerns((product.concerns || []).map(c => c.name))
    if (product.details) {
      // Stored discount can be stale or carry a "%" the number input can't show; derive it from the prices
      const discount = effectiveDiscount(product.details)
      setEditing({ ...product, details: { ...product.details, discount, discountPercent: discount } })
      return
    }
    setEditing({
      ...product,
      details: {
        sku: '', hsn: '', mrp: '', websitePrice: '', discountPercent: '', brand: '', subtitle: '',
        skinHairType: '', netQuantity: '', unitCount: '', packageContent: '',
        innerPackaging: '', outerPackaging: '', netWeight: '', deadWeight: '',
        gstPercent: '', countryOfOrigin: '', keyIngredients: '',
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
      const res = await fetch(`${apiBase}/products/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: editing.slug,
          title: editing.title,
          category: editing.category,
          // Keep products.price in step with the selling price shown on the storefront
          price: editing.details?.websitePrice || editing.details?.mrp || editing.price,
          listImage: editing.list_image,
          description: editing.description,
          details: editing.details,
          concerns: editConcerns
        })
      })
      if (!res.ok) throw new Error('update failed')
      loadConcernOptions(true)
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

  const existingBySlug = useMemo(() => new Map(items.map(p => [p.slug, p])), [items])

  const rowStatus = (row: ImportRow): { label: string; className: string } => {
    if (row.errors.length) return { label: 'Error', className: 'bg-red-100 text-red-700' }
    if (existingBySlug.has(row.slug)) {
      return updateExisting
        ? { label: 'Update', className: 'bg-blue-100 text-blue-700' }
        : { label: 'Skip (exists)', className: 'bg-gray-100 text-gray-600' }
    }
    return { label: 'New', className: 'bg-green-100 text-green-700' }
  }

  const readImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    setImportResults([])
    try {
      const buf = await file.arrayBuffer()
      let table: string[][]
      if (/\.csv$/i.test(file.name)) {
        let text = new TextDecoder('utf-8').decode(buf)
        // Excel's plain "CSV (Comma delimited)" is Windows-1252, not UTF-8
        if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf)
        table = parseCSVRows(text)
      } else {
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        // raw: false keeps the text Excel shows ("30%", "₹1,299.00") rather than 0.3 / 1299
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false }) as unknown[][]
        table = aoa.map(r => r.map(c => String(c ?? '')))
      }
      setImportPlan(buildImportPlan(table))
      setImportFileName(file.name)
    } catch (err) {
      console.error('Failed to read import file:', err)
      notify('error', `Could not read ${file.name}`)
      setImportPlan(null)
    } finally {
      input.value = ''
    }
  }

  const runImport = async () => {
    if (!importPlan) return
    setBulkLoading(true)
    const results: ImportResult[] = []
    try {
      // Fresh list so the create/update decision doesn't rely on a stale table
      const listRes = await fetch(`${apiBase}/products?_=${Date.now()}`, { cache: 'no-store' })
      const current: Product[] = listRes.ok ? await listRes.json() : items
      const bySlug = new Map((Array.isArray(current) ? current : items).map(p => [p.slug, p]))

      for (const row of importPlan.rows) {
        const base = { rowNumber: row.rowNumber, title: row.title || '(no name)' }
        if (row.errors.length) {
          results.push({ ...base, status: 'skipped', message: row.errors.join('; ') })
          continue
        }
        const existing = bySlug.get(row.slug)
        if (existing && !updateExisting) {
          results.push({ ...base, status: 'skipped', message: `Product "${row.slug}" already exists` })
          continue
        }
        try {
          let res: Response
          if (existing) {
            const existingDetails = existing.details && typeof existing.details === 'object' ? existing.details : {}
            const pricing = pricingForExisting(existingDetails, row.mrp!)
            // Empty cells keep the current value, and the new MRP keeps the product's discount %
            res = await fetch(`${apiBase}/products/${existing.id}`, {
              method: 'PUT',
              headers: authHeaders,
              body: JSON.stringify({
                slug: row.slug,
                title: row.title,
                price: pricing.price,
                details: { ...existingDetails, ...row.details, ...pricing.details },
                // Empty Concern cell keeps the product's current concerns
                ...(row.concerns.length ? { concerns: row.concerns } : {}),
                ...(row.category ? { category: row.category } : {}),
                ...(row.listImage ? { listImage: row.listImage } : {}),
                ...(row.description ? { description: row.description } : {}),
              })
            })
          } else {
            res = await fetch(`${apiBase}/products`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                slug: row.slug,
                title: row.title,
                category: row.category,
                price: row.price,
                listImage: row.listImage,
                description: row.description,
                details: row.details,
                ...(row.concerns.length ? { concerns: row.concerns } : {}),
              })
            })
          }
          if (res.ok) {
            results.push({ ...base, status: existing ? 'updated' : 'created' })
          } else {
            const errorData = await res.json().catch(() => ({}))
            results.push({ ...base, status: 'failed', message: errorData.error || errorData.message || `HTTP ${res.status}` })
          }
        } catch (reqError) {
          results.push({ ...base, status: 'failed', message: `Network error - ${reqError}` })
        }
      }

      await load()
      setImportPlan(null)
      const count = (s: ImportResult['status']) => results.filter(r => r.status === s).length
      const failed = count('failed')
      notify(failed ? 'error' : 'success', `Import complete: ${count('created')} created, ${count('updated')} updated, ${count('skipped')} skipped, ${failed} failed`)
    } catch (e) {
      console.error('Import failed:', e)
      notify('error', `Import failed: ${e}`)
    } finally {
      setImportResults(results)
      setBulkLoading(false)
    }
  }

  const importSummary = useMemo(() => {
    if (!importPlan) return null
    const rows = importPlan.rows
    const withErrors = rows.filter(r => r.errors.length).length
    const valid = rows.filter(r => !r.errors.length)
    const updates = valid.filter(r => existingBySlug.has(r.slug)).length
    return {
      total: rows.length,
      withErrors,
      withWarnings: rows.filter(r => !r.errors.length && r.warnings.length).length,
      created: valid.length - updates,
      updates,
      toImport: valid.length - (updateExisting ? 0 : updates),
    }
  }, [importPlan, existingBySlug, updateExisting])

  return (
    <>
    <div className="space-y-6">
      <div className="metric-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bulk Import</h2>
        <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-800">
          Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with a header row (e.g. Product Name, Slug, Product Category, MRP, GST %, Image Links…).
          Files only set the MRP, which may include ₹ and commas. Set discounts with Bulk Edit: new products sell at MRP until then, and existing products keep their discount % on the new MRP.
          Rows are matched to existing products by slug. Review the preview before importing; rows with errors are not imported.
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={readImportFile} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)} />
            Update existing products (matched by slug)
          </label>
          <button
            disabled={!importSummary?.toImport || bulkLoading || !!importPlan?.fileErrors.length}
            onClick={runImport}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {bulkLoading ? 'Importing...' : `Import ${importSummary?.toImport || ''}`}
          </button>
          {importPlan && !bulkLoading && (
            <button onClick={() => setImportPlan(null)} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear</button>
          )}
        </div>

        {importPlan && importSummary && (
          <div className="mt-4 space-y-3 text-sm">
            {importPlan.fileErrors.map(msg => (
              <div key={msg} className="rounded bg-red-50 p-3 text-red-700">{msg}</div>
            ))}
            <div className="text-gray-700">
              <strong>{importFileName}</strong>: {importSummary.total} rows · {importSummary.created} new · {importSummary.updates} existing{!updateExisting && ' (will be skipped)'}
              {' · '}<span className={importSummary.withErrors ? 'font-semibold text-red-600' : ''}>{importSummary.withErrors} with errors</span>
              {' · '}<span className={importSummary.withWarnings ? 'font-semibold text-amber-600' : ''}>{importSummary.withWarnings} with warnings</span>
            </div>
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer">Column mapping ({importPlan.mapping.mapped.length} mapped, {importPlan.mapping.ignored.length} not imported)</summary>
              <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-3">
                {importPlan.mapping.mapped.map(m => (
                  <div key={m.header}><span className="text-gray-900">{m.header}</span> → {m.field}</div>
                ))}
              </div>
              {importPlan.mapping.ignored.length > 0 && (
                <div className="mt-2 text-amber-700">Not imported: {importPlan.mapping.ignored.join(', ')}</div>
              )}
            </details>
            <div className="max-h-96 overflow-auto rounded border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-2 py-2">Row</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Product name</th>
                    <th className="px-2 py-2">Slug</th>
                    <th className="px-2 py-2">Category</th>
                    {importPlan.mapping.fields.concerns != null && <th className="px-2 py-2">Concerns</th>}
                    <th className="px-2 py-2 text-right">MRP</th>
                    <th className="px-2 py-2 text-right">Website price</th>
                    <th className="px-2 py-2 text-right">Discount</th>
                    <th className="px-2 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {importPlan.rows.map(row => {
                    const status = rowStatus(row)
                    const existing = existingBySlug.get(row.slug)
                    const pricing = existing && row.mrp ? pricingForExisting(existing.details, row.mrp).details : row.details
                    return (
                      <tr key={row.rowNumber} className="border-b border-gray-100 align-top text-gray-800">
                        <td className="px-2 py-1">{row.rowNumber}</td>
                        <td className="px-2 py-1"><span className={`whitespace-nowrap rounded px-1.5 py-0.5 ${status.className}`}>{status.label}</span></td>
                        <td className="max-w-xs truncate px-2 py-1" title={row.title}>{row.title}</td>
                        <td className="max-w-[12rem] truncate px-2 py-1" title={row.slug}>{row.slug}</td>
                        <td className="px-2 py-1">{row.category}</td>
                        {importPlan.mapping.fields.concerns != null && (
                          <td className="px-2 py-1">
                            <div className="flex max-w-[14rem] flex-wrap gap-1">
                              {row.concerns.length
                                ? row.concerns.map(c => <span key={c} className="whitespace-nowrap rounded bg-teal-50 px-1.5 py-0.5 text-teal-800">{c}</span>)
                                : <span className="text-gray-400">—</span>}
                            </div>
                          </td>
                        )}
                        <td className="px-2 py-1 text-right">{pricing.mrp ? `₹${pricing.mrp}` : '—'}</td>
                        <td className="px-2 py-1 text-right">{pricing.websitePrice ? `₹${pricing.websitePrice}` : '—'}</td>
                        <td className="px-2 py-1 text-right">{pricing.discountPercent ? `${pricing.discountPercent}%` : '—'}</td>
                        <td className="px-2 py-1">
                          {row.errors.map(msg => <div key={msg} className="text-red-600">{msg}</div>)}
                          {row.warnings.map(msg => <div key={msg} className="text-amber-600">{msg}</div>)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importResults.length > 0 && !importPlan && (
          <div className="mt-4 text-sm">
            <div className="mb-2 text-gray-700">
              Last import: {importResults.filter(r => r.status === 'created').length} created,{' '}
              {importResults.filter(r => r.status === 'updated').length} updated,{' '}
              {importResults.filter(r => r.status === 'skipped').length} skipped,{' '}
              {importResults.filter(r => r.status === 'failed').length} failed
              <button onClick={() => setImportResults([])} className="ml-3 text-xs text-blue-600 hover:underline">Dismiss</button>
            </div>
            {importResults.some(r => r.status === 'skipped' || r.status === 'failed') && (
              <ul className="max-h-48 space-y-1 overflow-auto rounded border border-gray-200 p-2 text-xs">
                {importResults.filter(r => r.status === 'skipped' || r.status === 'failed').map(r => (
                  <li key={r.rowNumber} className={r.status === 'failed' ? 'text-red-600' : 'text-gray-600'}>
                    Row {r.rowNumber} ({r.title}): {r.status} - {r.message}
                  </li>
                ))}
              </ul>
            )}
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
          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-white/70">Shop by Concern</div>
            <ConcernPicker value={formConcerns} onChange={setFormConcerns} dark />
          </div>
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
                  setForm(prev=>({...prev, details: { ...(prev.details||{}), mrp: mrp, websitePrice: mrp }}));
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
                  setForm(prev=>({...prev, details: { ...(prev.details||{}), discountPercent: discountPercent, websitePrice: mrp || '' }}));
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
            <div className="mt-2 text-xs text-white/50">Add a product video in PDP Video below.</div>
          </div>
          <input className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Description" value={form.description||''} onChange={e=>setForm(prev=>({...prev, description:e.target.value}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="How to Use" value={form.details?.howToUse||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), howToUse:e.target.value }}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Key Ingredients" value={form.details?.keyIngredients||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), keyIngredients:e.target.value }}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Ingredient Benefits" value={form.details?.ingredientBenefits||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), ingredientBenefits:e.target.value }}))} />
          <textarea className="rounded bg-white/10 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-3" placeholder="Bullet Highlights" value={form.details?.bulletHighlights||''} onChange={e=>setForm(prev=>({...prev, details: { ...(prev.details||{}), bulletHighlights:e.target.value }}))} />
          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-white/70">PDP Images</div>
            <input multiple type="file" accept="image/*" onChange={e=>setFormPdpImages(Array.from(e.target.files||[]))} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <div className="mt-2 text-xs text-white/50">Tip: Upload up to 7 images.</div>
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-white/70">PDP Video (optional)</div>
            <input type="file" accept={VIDEO_ACCEPT} onChange={e=>{
              const file = e.target.files?.[0] || null
              const invalid = file ? validateVideoFile(file) : null
              if (invalid) {
                notify('error', invalid)
                e.target.value = ''
                setFormPdpVideo(null)
                return
              }
              setFormPdpVideo(file)
            }} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <div className="mt-2 text-xs text-white/50">MP4, WebM or MOV, up to {MAX_VIDEO_BYTES / 1048576}MB. A 15–60s clip works best; it's compressed for fast loading after upload.</div>
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <button disabled={!!videoUpload} className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60">Save</button>
            {videoUpload && (
              <span className="text-xs text-white/70">
                {videoUpload.percent < 100 ? `Uploading video… ${videoUpload.percent}%` : 'Optimizing video…'}
              </span>
            )}
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
                  onClick={() => setBulkEditOpen(true)}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Bulk edit ({selectedProducts.size})
                </button>
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
              <form onSubmit={async (e)=>{e.preventDefault(); const input=(e.currentTarget.elements.namedItem('csv') as HTMLInputElement); const file=input.files?.[0]; if(!file) return; const fd=new FormData(); fd.append('file', file); const r=await fetch(`${apiBase}/products-csv/upload`,{method:'POST', body: fd}); if(r.ok){alert('CSV uploaded');} else {alert('CSV upload failed')}}} className="flex items-center gap-2">
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
                    <td className="py-2 pr-4">
                      {p.title}
                      {cardBadgesOf(p.details).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cardBadgesOf(p.details).map((b) => (
                            <span key={b.id} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/80">{b.label}</span>
                          ))}
                        </div>
                      )}
                    </td>
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
                            await loadProductMedia(p.id)
                          } catch (_) {
                            // ignore errors
                          }
                        }} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15">Images</button>
                        <button onClick={()=>startEdit(p)} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15">Edit</button>
                        {p.details?.sku ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://thenefol.com/#/p/${p.details.sku}`)
                              notify('success', 'QR link copied to clipboard')
                            }}
                            className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
                            title={`Copy QR link: https://thenefol.com/#/p/${p.details.sku}`}
                          >
                            Copy QR
                          </button>
                        ) : null}
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
              <div className="mb-4 admin-page-header">
                <h3 className="text-lg font-semibold text-gray-900">Manage Images — {selected.title}</h3>
                <button onClick={()=>setSelected(null)} className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300">Close</button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm text-gray-700">Main image</div>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      {selected.list_image ? (
                        <>
                          <img src={toAbs(selected.list_image)} className="h-16 w-16 rounded object-cover" />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Are you sure you want to remove the main image?')) return
                              try {
                                const res = await fetch(`${apiBase}/products/${selected.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ listImage: '' })
                                })
                                if (!res.ok) {
                                  const txt = await res.text().catch(() => '')
                                  throw new Error(txt || 'Update failed')
                                }
                                // Update local table and modal state
                                setItems(prev => prev.map(p => p.id === selected.id ? { ...p, list_image: '' } : p))
                                setSelected(prev => prev ? { ...(prev as Product), list_image: '' } : prev)
                                await load()
                                notify('success', 'Main image removed')
                              } catch (_) {
                                notify('error', 'Failed to remove main image')
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remove main image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <div className="h-16 w-16 rounded border border-gray-300 bg-gray-50" />
                      )}
                    </div>
                    <input type="file" accept="image/*" className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" onChange={async e=>{
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const url = await uploadFile(file, apiBase)
                        const res = await fetch(`${apiBase}/products/${selected.id}`, {
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
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-gray-700">
                      PDP images &amp; video <span className="text-xs text-gray-500">(drag to reorder · click Remove on each)</span>
                    </span>
                    {pdpImages.length > 0 && (
                      <button
                        type="button"
                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        onClick={async () => {
                          if (!confirm(`Remove all ${pdpImages.length} PDP image(s) for this product? This clears empty frames on the storefront.`)) return
                          const ok = await deleteAllProductImagesOfType('pdp')
                          notify(ok ? 'success' : 'error', ok ? 'All PDP images removed' : 'Failed to remove PDP images')
                        }}
                      >
                        Remove all PDP ({pdpImages.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pdpImages.map((img, idx) => {
                      const abs = toAbs(img.url)
                      const isVid = isVideoUrl(abs)
                      const isDragging = draggedImage?.id === img.id && draggedImage?.type === 'pdp'
                      const isDragOver = dragOverIndex?.type === 'pdp' && dragOverIndex?.index === idx
                      return (
                        <div 
                          key={img.id || idx} 
                          className={`relative group cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-blue-500' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            setDraggedImage({ id: img.id, type: 'pdp', index: idx })
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverIndex({ type: 'pdp', index: idx })
                          }}
                          onDragLeave={() => {
                            setDragOverIndex(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (draggedImage && draggedImage.type === 'pdp' && draggedImage.id !== img.id) {
                              const newImages = [...pdpImages]
                              const draggedItem = newImages[draggedImage.index]
                              newImages.splice(draggedImage.index, 1)
                              newImages.splice(idx, 0, draggedItem)
                              setPdpImages(newImages)
                              // Save new order to backend
                              saveImageOrder(newImages, 'pdp')
                            }
                            setDraggedImage(null)
                            setDragOverIndex(null)
                          }}
                          onDragEnd={() => {
                            setDraggedImage(null)
                            setDragOverIndex(null)
                          }}
                        >
                          <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-1 text-xs z-10">
                            {idx + 1}
                          </div>
                          <div className="relative h-16 w-16 rounded border border-gray-200 bg-gray-50 overflow-hidden">
                            {isVid ? (
                              <>
                                {img.poster_url ? (
                                  <img src={toAbs(img.poster_url)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <video src={`${abs}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                )}
                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                                  <svg className="h-5 w-5 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                </span>
                              </>
                            ) : (
                              <img src={abs} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(isVid ? 'Remove this video from the product? The file is deleted from the server.' : 'Remove this PDP image from the product?')) return
                              try {
                                const ok = await deleteOneProductImage(img.id)
                                if (ok) {
                                  setPdpImages(prev => prev.filter(i => i.id !== img.id))
                                  await load()
                                  notify('success', 'PDP image removed')
                                } else {
                                  notify('error', 'Failed to remove image (check you are logged in as admin)')
                                }
                              } catch {
                                notify('error', 'Failed to remove image')
                              }
                            }}
                            className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow hover:bg-red-700"
                            title="Remove PDP image"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-600">Add images</span>
                      <input multiple type="file" accept="image/*" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" onChange={async e=>{
                        const files = Array.from(e.target.files || [])
                        e.target.value = ''
                        if (!files.length) return
                        try {
                          const uploaded: string[] = []
                          for (const f of files) {
                            const url = await uploadFile(f, apiBase)
                            uploaded.push(url)
                          }
                          await fetch(`${apiBase}/products/${selected.id}/images`, {
                            method: 'POST',
                            headers: authHeaders,
                            body: JSON.stringify({ images: uploaded, type: 'pdp' })
                          })
                          // Reload images from database to get full objects with IDs
                          await loadProductMedia(selected.id)
                          await load()
                          notify('success','PDP images uploaded')
                        } catch (_) {
                          notify('error','Upload failed')
                        }
                      }} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-600">Add video <span className="font-normal text-gray-400">(MP4/WebM/MOV, ≤ {MAX_VIDEO_BYTES / 1048576}MB)</span></span>
                      <input type="file" accept={VIDEO_ACCEPT} disabled={!!videoUpload} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60" onChange={async e=>{
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        const productId = selected.id
                        const ok = await uploadPdpVideo(productId, file)
                        if (!ok) return
                        await loadProductMedia(productId)
                        await load()
                        notify('success','Video added to PDP')
                      }} />
                    </label>
                  </div>
                  {videoUpload && (
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs text-gray-600">
                        <span className="truncate pr-2">{videoUpload.name}</span>
                        <span>{videoUpload.percent < 100 ? `Uploading ${videoUpload.percent}%` : 'Optimizing for fast playback…'}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200">
                        <div className={`h-full bg-blue-600 transition-all ${videoUpload.percent >= 100 ? 'animate-pulse' : ''}`} style={{ width: `${videoUpload.percent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-gray-700">
                      Banner images <span className="text-xs text-gray-500">(drag to reorder)</span>
                    </span>
                    {bannerImages.length > 0 && (
                      <button
                        type="button"
                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        onClick={async () => {
                          if (!confirm(`Remove all ${bannerImages.length} banner image(s) for this product?`)) return
                          const ok = await deleteAllProductImagesOfType('banner')
                          notify(ok ? 'success' : 'error', ok ? 'All banner images removed' : 'Failed to remove banner images')
                        }}
                      >
                        Remove all banners ({bannerImages.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bannerImages.map((img, idx) => {
                      const abs = toAbs(img.url)
                      const isVid = /\.(mp4|webm|ogg)(\?|$)/i.test(abs)
                      const isDragging = draggedImage?.id === img.id && draggedImage?.type === 'banner'
                      const isDragOver = dragOverIndex?.type === 'banner' && dragOverIndex?.index === idx
                      return (
                        <div 
                          key={img.id || idx} 
                          className={`relative group cursor-move ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-blue-500' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            setDraggedImage({ id: img.id, type: 'banner', index: idx })
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverIndex({ type: 'banner', index: idx })
                          }}
                          onDragLeave={() => {
                            setDragOverIndex(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (draggedImage && draggedImage.type === 'banner' && draggedImage.id !== img.id) {
                              const newImages = [...bannerImages]
                              const draggedItem = newImages[draggedImage.index]
                              newImages.splice(draggedImage.index, 1)
                              newImages.splice(idx, 0, draggedItem)
                              setBannerImages(newImages)
                              // Save new order to backend
                              saveImageOrder(newImages, 'banner')
                            }
                            setDraggedImage(null)
                            setDragOverIndex(null)
                          }}
                          onDragEnd={() => {
                            setDraggedImage(null)
                            setDragOverIndex(null)
                          }}
                        >
                          <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-1 text-xs z-10">
                            {idx + 1}
                          </div>
                          <div className="h-16 w-16 rounded border border-gray-200 bg-gray-50 overflow-hidden">
                            {isVid ? (
                              <video src={abs} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <img src={abs} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm('Remove this banner image?')) return
                              try {
                                const ok = await deleteOneProductImage(img.id)
                                if (ok) {
                                  setBannerImages(prev => prev.filter(i => i.id !== img.id))
                                  await load()
                                  notify('success', 'Banner image removed')
                                } else {
                                  notify('error', 'Failed to remove image')
                                }
                              } catch {
                                notify('error', 'Failed to remove image')
                              }
                            }}
                            className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow hover:bg-red-700"
                            title="Remove banner"
                          >
                            Remove
                          </button>
                        </div>
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
                        await fetch(`${apiBase}/products/${selected.id}/images`, {
                          method: 'POST',
                          headers: authHeaders,
                          body: JSON.stringify({ images: uploaded, type: 'banner' })
                        })
                        // Reload images from database to get full objects with IDs
                        const imagesRes = await fetch(`${apiBase}/products/${selected.id}/images`)
                        if (imagesRes.ok) {
                          const response = await imagesRes.json()
                          // Handle both direct array response and wrapped response
                          const images = Array.isArray(response) ? response : (response.data || response.images || [])
                          // Store full image objects with IDs for deletion
                          const bannerImgs: Array<{ id: number; url: string; type?: string }> = images.filter((img: any) => img.type === 'banner' && img.url && img.id).map((img: any) => ({ id: img.id, url: img.url, type: img.type }))
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
              <div className="admin-page-header sticky top-0 z-10 rounded-t-lg border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
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
                    <div className="space-y-1">
                      <input className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="SKU" value={editing.details?.sku||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), sku:e.target.value}}))} />
                      {editing.details?.sku && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">QR link:</span>
                          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">https://thenefol.com/#/p/{editing.details.sku}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://thenefol.com/#/p/${editing.details?.sku}`)
                              notify('success', 'QR link copied')
                            }}
                            className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-300"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
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
                    <div className="md:col-span-3">
                      <div className="mb-1.5 text-sm font-medium text-gray-700">Shop by Concern</div>
                      <ConcernPicker value={editConcerns} onChange={setEditConcerns} />
                    </div>
                    <div className="md:col-span-3">
                      <div className="mb-1.5 text-sm font-medium text-gray-700">Product card badges</div>
                      <div className="flex flex-wrap gap-2">
                        {PRODUCT_CARD_BADGES.map((badge) => {
                          const current: string[] = Array.isArray(editing.details?.cardBadges) ? editing.details.cardBadges : []
                          const on = current.includes(badge.id)
                          return (
                            <button
                              key={badge.id}
                              type="button"
                              onClick={() => setEditing(prev => {
                                const list: string[] = Array.isArray(prev?.details?.cardBadges) ? prev!.details.cardBadges : []
                                const next = on ? list.filter(id => id !== badge.id) : [...list, badge.id]
                                return { ...(prev as any), details: { ...(prev?.details || {}), cardBadges: PRODUCT_CARD_BADGES.map(b => b.id).filter(id => next.includes(id)) } }
                              })}
                              className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                              aria-pressed={on}
                            >
                              {badge.label}
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">New Arrival also features the product in the New Arrivals section on the homepage.</p>
                    </div>
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
                            setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), mrp: mrp, websitePrice: mrp }}));
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
                              discountPercent: discountPercent,
                              websitePrice: mrp || ''
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
                      <div className="admin-inline-row">
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

                {/* Origin */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Origin</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Country of Origin" value={editing.details?.countryOfOrigin||''} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), countryOfOrigin:e.target.value}}))} />
                  </div>
                </div>

                {/* Key Ingredients */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-1">Key Ingredients</h4>
                  <p className="text-xs text-gray-500 mb-4">These ingredients are displayed on the product page with images and benefits. Each ingredient maps to an ingredient image automatically.</p>
                  {/* Chip-based ingredient adder */}
                  {(() => {
                    const ingRaw = editing.details?.keyIngredients || ''
                    const benRaw = editing.details?.ingredientBenefits || ''
                    const chips: string[] = ingRaw ? ingRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []
                    const benefits: string[] = benRaw ? benRaw.split(',').map((s: string) => s.trim()) : []

                    const removeIngredient = (idx: number) => {
                      const newChips = chips.filter((_: string, i: number) => i !== idx)
                      const newBenefits = benefits.filter((_: string, i: number) => i !== idx)
                      setEditing(prev => ({
                        ...(prev as any),
                        details: {
                          ...(prev?.details || {}),
                          keyIngredients: newChips.join(', '),
                          ingredientBenefits: newBenefits.join(', ')
                        }
                      }))
                    }

                    const updateBenefit = (idx: number, val: string) => {
                      const newBenefits = [...benefits]
                      while (newBenefits.length <= idx) newBenefits.push('')
                      newBenefits[idx] = val
                      setEditing(prev => ({
                        ...(prev as any),
                        details: { ...(prev?.details || {}), ingredientBenefits: newBenefits.join(', ') }
                      }))
                    }

                    return (
                      <div className="space-y-4">
                        {/* Add ingredient input */}
                        <div className="flex gap-2">
                          <input
                            id="ing-add-input"
                            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                            placeholder="Type an ingredient name and press Enter or Add…"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const val = (e.currentTarget.value || '').trim()
                                if (!val) return
                                const newChips = [...chips, val]
                                setEditing(prev => ({
                                  ...(prev as any),
                                  details: { ...(prev?.details || {}), keyIngredients: newChips.join(', ') }
                                }))
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shrink-0"
                            onClick={() => {
                              const input = document.getElementById('ing-add-input') as HTMLInputElement
                              const val = (input?.value || '').trim()
                              if (!val) return
                              const newChips = [...chips, val]
                              setEditing(prev => ({
                                ...(prev as any),
                                details: { ...(prev?.details || {}), keyIngredients: newChips.join(', ') }
                              }))
                              if (input) input.value = ''
                            }}
                          >
                            + Add
                          </button>
                        </div>

                        {/* Ingredient chips with benefit inputs */}
                        {chips.length > 0 ? (
                          <div className="space-y-2">
                            {chips.map((chip: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{idx + 1}</span>
                                <span className="min-w-[120px] text-sm font-medium text-gray-800">{chip}</span>
                                <input
                                  className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                                  placeholder={`Benefit for "${chip}" (optional)`}
                                  value={benefits[idx] || ''}
                                  onChange={e => updateBenefit(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeIngredient(idx)}
                                  className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                  title="Remove ingredient"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-center text-sm text-gray-400">
                            No ingredients added yet. Type an ingredient above and press Enter or click Add.
                          </div>
                        )}

                        {/* Raw fallback textareas for power users */}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">Advanced: edit raw comma-separated values</summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">Key Ingredients (comma-separated)</label>
                              <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs" rows={2} value={ingRaw} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), keyIngredients:e.target.value}}))} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">Ingredient Benefits (comma-separated, same order)</label>
                              <textarea className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs" rows={2} value={benRaw} onChange={e=>setEditing(prev=>({...(prev as any), details: { ...(prev?.details||{}), ingredientBenefits:e.target.value}}))} />
                            </div>
                          </div>
                        </details>
                      </div>
                    )
                  })()}
                </div>

                {/* Product Details */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-4">Product Details</h4>
                  <div className="space-y-4">
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
    {bulkEditOpen && (
      <BulkEditProducts
        productIds={Array.from(selectedProducts)}
        apiBase={apiBase}
        categories={[...new Set(['Face Care', 'Hair Care', 'Body Care', 'Combo', ...items.map((p) => p.category).filter(Boolean)])]}
        onClose={() => setBulkEditOpen(false)}
        onApplied={() => { setBulkEditOpen(false); load() }}
      />
    )}
    </>
  )
}
