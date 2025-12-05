import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import PricingDisplay from '../components/PricingDisplay'
import { getApiBase } from '../utils/apiBase'

type Product = {
  id: number
  slug: string
  title: string
  category: string
  price?: string
  details?: any
  created_at?: string
  listImage?: string
  list_image?: string
  csvProduct?: any
}

export default function NewArrivals() {
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
      const collectionsData = await api.collections.getCollections('new_arrivals', true)
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
              created_at: item.created_at || item.updated_at || new Date().toISOString(),
              details: {},
              order_index: item.order_index || 0
            }
          })
        
        setProducts(collectionProducts)
      } else {
        // No collections found - show empty state
        setProducts([])
      }
    } catch (err: any) {
      console.error('Failed to load new arrivals:', err)
      setError('Unable to load new arrivals. Please try again later.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const recentProducts = useMemo(() => {
    if (!Array.isArray(products)) return []
    
    // Sort by order_index (from collections) or created_at
    return [...products]
      .sort((a, b) => {
        const orderA = (a as any).order_index ?? 999
        const orderB = (b as any).order_index ?? 999
        if (orderA !== orderB) return orderA - orderB
        
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return timeB - timeA
      })
      .slice(0, 12)
  }, [products])

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-600">
            Fresh Launches
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            New Arrivals
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Inspired by launchpads from Lakmé, Sugar, and Minimalist, discover the newest clean formulations and limited collections added to Nefol this month.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {recentProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-lg text-slate-600">No new arrivals at the moment.</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon for exciting new products!</p>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-3xl bg-slate-100" />
              ))
            : recentProducts.length > 0 ? recentProducts.map(product => (
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
                    <span className="absolute left-5 top-5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      Just Dropped
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      {product.category || 'New in Skincare'}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">{product.title}</h2>
                    <div className="mt-3 text-sm text-slate-500">
                      <PricingDisplay product={{ price: product.price, details: product.details }} csvProduct={product.csvProduct} />
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <button
                        onClick={() => (window.location.hash = `#/user/product/${product.slug}`)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => (window.location.hash = '#/user/checkout?buy=' + product.slug)}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </article>
              )) : null}
        </section>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Launch Alerts & Early Access</h2>
              <p className="mt-3 text-slate-600">
                Subscribe for early-bird drops, limited collaborations, and backstage launch events similar to Forest Essentials Ritual Drops and Kama Ayurveda Heritage Edits.
              </p>
              <form className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter email for launch alerts"
                  className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <button className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Notify Me
                </button>
              </form>
            </div>
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="text-lg font-semibold">Pro Tip</h3>
              <p className="mt-3 text-sm text-slate-200">
                Pair new arrivals with our hero staples for 360° rituals. Earn double Nefol Coins when you checkout with any launch bundles during the first 14 days.
              </p>
              <button
                onClick={() => (window.location.hash = '#/user/loyalty-rewards')}
                className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                See Loyalty Perks
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


