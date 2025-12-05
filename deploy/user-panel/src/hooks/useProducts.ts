import { useEffect, useState, useCallback } from 'react'
import type { Product } from '../types'
import { getApiBase } from '../utils/apiBase'

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
      const toAbs = (u?: string) => {
        if (!u || typeof u !== 'string') return ''
        if (/^https?:\/\//i.test(u)) return u
        const base = apiBase.replace(/\/$/, '')
        const path = u.startsWith('/') ? u : `/${u}`
        return `${base}${path}`
      }
      const mapped: Product[] = (rows || []).map((r: any) => {
        const listImage = toAbs(r.list_image || '')
        const pdpImages = derivePdpImages(r, toAbs)
        const bannerImages = deriveBannerImages(r, toAbs)
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          category: r.category,
          price: r.price,
          listImage,
          pdpImages,
          bannerImages,
          description: r.description || '',
          details: r.details || {}
        }
      }).filter((p: Product) => p.slug && p.title)
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


