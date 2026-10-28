import { useEffect, useState, useCallback } from 'react'
import type { Product } from '../types'
import { getApiBase, resolveMediaUrl } from '../utils/apiBase'
import { convertToWebp } from '../utils/imageUtils'

/** API product row (/api/products, /api/concerns/:slug, …) → storefront Product. */
export function mapProductRow(r: any): Product {
  const toAbs = (u?: string) => resolveMediaUrl(u)
  const rawList = toAbs(r.list_image || '')
  const listImage =
    rawList && /\.(jpg|jpeg|png|svg)$/i.test(rawList) ? convertToWebp(rawList) : rawList
  const inv = Number(r.inventory_available ?? 0)
  const inStock = r.in_stock !== undefined ? !!r.in_stock : inv > 0
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    price: r.price,
    listImage,
    pdpImages: derivePdpImages(r, toAbs),
    bannerImages: deriveBannerImages(r, toAbs),
    description: r.description || '',
    details: r.details || {},
    concerns: Array.isArray(r.concerns) ? r.concerns : [],
    inventoryAvailable: Number.isFinite(inv) ? inv : 0,
    inStock,
  }
}

export function useProducts() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const apiBase = getApiBase()
      const res = await fetch(`${apiBase}/api/products`, { 
        credentials: 'include',
        cache: 'default'
      })
      if (!res.ok) throw new Error('Failed to load products')
      const rows = await res.json()
      const mapped: Product[] = (rows || []).map(mapProductRow).filter((p: Product) => p.slug && p.title)
      setItems(mapped)
    } catch (e: any) {
      setError(e?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Listen for product updates and refresh
  useEffect(() => {
    const handleProductUpdate = () => {
      console.log('🔄 Product updated, refreshing products list')
      fetchProducts()
    }

    window.addEventListener('product-updated', handleProductUpdate)
    window.addEventListener('refresh-products', handleProductUpdate)

    return () => {
      window.removeEventListener('product-updated', handleProductUpdate)
      window.removeEventListener('refresh-products', handleProductUpdate)
    }
  }, [fetchProducts])

  return { items, loading, error, refresh: fetchProducts }
}

function derivePdpImages(row: any, toAbs: (u?: string)=>string): string[] {
  if (row.pdp_images && Array.isArray(row.pdp_images) && row.pdp_images.length) return row.pdp_images.map((u: string) => toAbs(u))
  if (row.list_image) return [toAbs(row.list_image)]
  return []
}

function deriveBannerImages(row: any, toAbs: (u?: string)=>string): string[] {
  if (row.banner_images && Array.isArray(row.banner_images) && row.banner_images.length) return row.banner_images.map((u: string) => toAbs(u))
  return []
}


