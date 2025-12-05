import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import PricingDisplay from '../components/PricingDisplay'
import { getApiBase } from '../utils/apiBase'

interface Product {
  id: number
  slug: string
  title: string
  category: string
  price: string
  listImage?: string
  list_image?: string
  csvProduct?: any
  total_orders?: number
  details?: any
}

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load from collections API
      const collectionsData = await api.collections.getCollections('best_sellers', true)
      if (collectionsData.success && collectionsData.data && collectionsData.data.length > 0) {
        // Extract products from collections with proper image URLs
        const apiBase = getApiBase()
        const toAbs = (u?: string) => {
          if (!u) return ''
          if (/^https?:\/\//i.test(u)) return u
          const base = apiBase.replace(/\/$/, '')
          const path = u.startsWith('/') ? u : `/${u}`
          return `${base}${path}`
        }
        
        const collectionProducts = collectionsData.data
          .filter((item: any) => item.is_published && item.product_id)
          .map((item: any) => {
            // Prefer collection image_url, then product_image
            const imageUrl = item.image_url || item.product_image || ''
            return {
              id: item.product_id,
              slug: item.product_slug || '',
              title: item.product_title || item.title || '',
              category: item.product_category || '',
              price: item.product_price || '',
              listImage: toAbs(imageUrl),
              list_image: toAbs(imageUrl),
              total_orders: item.metadata?.total_orders || 0,
              details: {
                totalOrders: item.metadata?.total_orders || 0
              },
              order_index: item.order_index || 0
            }
          })
        
        setProducts(collectionProducts)
      } else {
        // No collections found - show empty state
        setProducts([])
      }
    } catch (err: any) {
      console.error('Failed to load best sellers:', err)
      setError('Unable to load best sellers right now. Please try again later.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const bestSellerProducts = useMemo(() => {
    if (!Array.isArray(products)) return []

    // If products come from collections, they're already sorted by order_index
    // Otherwise, sort by total_orders
    return [...products]
      .sort((a, b) => {
        // First check if they have order_index (from collections)
        const orderA = (a as any).order_index ?? 999
        const orderB = (b as any).order_index ?? 999
        if (orderA !== orderB) return orderA - orderB
        
        // Then sort by total orders
        const ordersA = a.total_orders || a.details?.totalOrders || 0
        const ordersB = b.total_orders || b.details?.totalOrders || 0
        return ordersB - ordersA
      })
      .slice(0, 12)
  }, [products])

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-rose-100 px-4 py-1 text-sm font-semibold text-rose-600">
            Community Favorites
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Best Sellers
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Beauty lovers’ top picks inspired by Plum’s “Most Loved” and WOW Skin Science’s hero edits. Shop the products our community keeps coming back to.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {bestSellerProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-lg text-slate-600">No best sellers available at the moment.</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon for our top picks!</p>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-3xl bg-slate-100" />
              ))
            : bestSellerProducts.length > 0 ? bestSellerProducts.map(product => (
                <article
                  key={product.slug}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={product.listImage || product.list_image || ''}
                      alt={product.title}
                      className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                      style={{ aspectRatio: '4/3' }}
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                      }}
                    />
                    <span className="absolute left-5 top-5 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      Best Seller
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-rose-600">
                      {product.category || 'Bestselling Formula'}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">{product.title}</h2>
                    <div className="mt-3 text-sm text-slate-500">
                      <PricingDisplay product={product} csvProduct={product.csvProduct} />
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <button
                        onClick={() => (window.location.hash = `#/user/product/${product.slug}`)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => (window.location.hash = '#/user/cart')}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Add to Bag
                      </button>
                    </div>
                    {(product.total_orders && product.total_orders > 0) && (
                      <div className="mt-4 rounded-2xl bg-slate-100/60 p-3 text-xs text-slate-500">
                        Loved by over {product.total_orders || product.details?.totalOrders}+ shoppers
                      </div>
                    )}
                  </div>
                </article>
              )) : null}
        </section>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Routine Builders</h2>
          <p className="mt-2 text-slate-600">
            Inspired by Forest Essentials rituals & Minimalist regimens, curate a complete routine with our best sellers.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {bestSellerProducts.slice(0, 3).map(product => (
              <button
                key={product.slug}
                onClick={() => (window.location.hash = `#/user/product/${product.slug}`)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-900 hover:bg-white"
              >
                <img
                  src={product.listImage || product.list_image || ''}
                  alt={product.title}
                  className="h-16 w-16 rounded-xl object-cover"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{product.title}</p>
                  <p className="text-xs text-slate-500">Perfect as step {product.category?.toLowerCase().includes('cleanser') ? '1' : '2'} in your ritual</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}


