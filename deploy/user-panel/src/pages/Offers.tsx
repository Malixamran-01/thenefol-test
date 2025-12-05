import { useEffect, useState } from 'react'
import { api } from '../services/api'
import PricingDisplay from '../components/PricingDisplay'
import { getApiBase } from '../utils/apiBase'

interface Promotion {
  id: string
  title: string
  subtitle: string
  description: string
  code?: string
  expiry?: string
  terms?: string[]
  highlight?: 'new' | 'ending-soon' | 'best-value'
}

export default function Offers() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPromotions()
  }, [])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load collections from API
      const collectionsData = await api.collections.getCollections('offers', true)
      if (collectionsData.success && collectionsData.data && collectionsData.data.length > 0) {
        // Transform collections to promotions format
        const apiPromotions: Promotion[] = collectionsData.data
          .filter((item: any) => item.is_published)
          .map((item: any) => ({
            id: `promo-${item.id}`,
            title: item.title || item.product_title || 'Special Offer',
            subtitle: item.subtitle || '',
            description: item.description || '',
            code: item.code || undefined,
            expiry: item.expiry_date || undefined,
            terms: item.metadata?.terms || [],
            highlight: item.is_featured ? 'new' : undefined
          }))
        
        setPromotions(apiPromotions)
        
        // Get products from collections with image URLs
        const productIds = collectionsData.data
          .filter((item: any) => item.product_id && item.is_published)
          .map((item: any) => item.product_id)
        
        if (productIds.length > 0) {
          const allProducts = await api.products.getAll()
          const featured = allProducts.filter((p: any) => 
            productIds.includes(p.id)
          ).map((p: any) => {
            // Find collection item for this product to get collection image_url if available
            const collectionItem = collectionsData.data.find((item: any) => item.product_id === p.id)
            return {
              ...p,
              // Use collection image_url if available, otherwise use product image
              listImage: collectionItem?.image_url || p.list_image || p.listImage || '',
              list_image: collectionItem?.image_url || p.list_image || p.listImage || ''
            }
          }).slice(0, 6)
          setFeaturedProducts(featured)
        } else {
          setFeaturedProducts([])
        }
      } else {
        // No collections found - show empty state
        setPromotions([])
        setFeaturedProducts([])
      }
    } catch (err: any) {
      console.error('Failed to load offers:', err)
      setError('Unable to load offers right now. Please try again later.')
      setPromotions([])
      setFeaturedProducts([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">
            Limited Time Offers
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Exclusive Deals & Promotions
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Unlock the best of Nefol with curated offers, bundles, and limited-time rewards inspired by leading beauty brands.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {promotions.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-lg text-slate-600">No offers available at the moment.</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon for exciting deals!</p>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          {promotions.map(promo => (
            <article
              key={promo.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl"
            >
              {promo.highlight && (
                <span
                  className={`absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${
                    promo.highlight === 'new'
                      ? 'bg-emerald-500'
                      : promo.highlight === 'ending-soon'
                      ? 'bg-orange-500'
                      : 'bg-indigo-500'
                  }`}
                >
                  {promo.highlight.replace('-', ' ')}
                </span>
              )}

              <h2 className="text-2xl font-semibold text-slate-900">{promo.title}</h2>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-blue-600">
                {promo.subtitle}
              </p>
              <p className="mt-4 text-slate-600">{promo.description}</p>

              {promo.code && (
                <div className="mt-6 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-center">
                  <p className="text-sm uppercase tracking-wide text-blue-700">Use Code</p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">{promo.code}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {promo.expiry && <span>Valid till {promo.expiry}</span>}
                {promo.terms && promo.terms.length > 0 && (
                  <details className="w-full cursor-pointer rounded-lg bg-slate-100/60 p-3 text-left text-sm text-slate-600">
                    <summary className="font-medium text-slate-700">Terms & Conditions</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {promo.terms.map(rule => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Products Eligible For Offers</h2>
              <p className="text-slate-600">
                Discover the latest launches and routines that pair perfectly with our current promotions.
              </p>
            </div>
            <button
              onClick={() => (window.location.hash = '#/user/shop')}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              View All Products
            </button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl bg-slate-100"
                />
              ))
            ) : featuredProducts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">
                No products available for offers at the moment.
              </div>
            ) : (
              featuredProducts.map(product => (
                  <article
                    key={product.slug}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
                      <img
                        src={(() => {
                          const imgUrl = product.listImage || product.list_image || ''
                          if (!imgUrl) return ''
                          if (/^https?:\/\//i.test(imgUrl)) return imgUrl
                          const apiBase = getApiBase()
                          const base = apiBase.replace(/\/$/, '')
                          const path = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`
                          return `${base}${path}`
                        })()}
                        alt={product.title}
                        className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                        style={{ aspectRatio: '4/3' }}
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{product.category || 'Skincare Essential'}</p>
                      <div className="mt-4 text-sm text-slate-500">
                        <PricingDisplay product={product} csvProduct={product.csvProduct} />
                      </div>
                      <div className="mt-auto flex gap-2 pt-4">
                        <button
                          onClick={() => (window.location.hash = `#/user/product/${product.slug}`)}
                          className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => (window.location.hash = '#/user/cart')}
                          className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                        >
                          Redeem Offer
                        </button>
                      </div>
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold">Join Nefol Circle</h2>
            <p className="mt-3 text-slate-200">
              Inspired by loyalty programs like Lakmé Absolute Rewards and Sugar Circle, Nefol Circle offers members-only perks, birthday specials, and early access to product drops.
            </p>
            <button
              onClick={() => (window.location.hash = '#/user/loyalty-rewards')}
              className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Explore Loyalty Rewards
            </button>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <h3 className="text-lg font-semibold">Refer & Earn</h3>
              <p className="mt-1 text-sm text-slate-200">
                Share Nefol with friends and earn bonus coins when they place their first order—mirroring referral programs from Sugar Cosmetics and Minimalist.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <h3 className="text-lg font-semibold">Birthday Boutique</h3>
              <p className="mt-1 text-sm text-slate-200">
                Enjoy birthday month exclusives and complimentary miniatures inspired by Forest Essentials and Kama Ayurveda gifting suites.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

