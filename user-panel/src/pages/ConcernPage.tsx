import { useEffect, useMemo, useState } from 'react'
import { getApiBase, resolveMediaUrl } from '../utils/apiBase'
import { setPageMeta } from '../utils/pageMeta'
import { isOutOfStock } from '../utils/stock'
import { mapProductRow } from '../hooks/useProducts'
import { useConcerns, type Concern } from '../hooks/useConcerns'
import { useProductReviewStats } from '../hooks/useProductReviewStats'
import JustLandedProductCard from '../components/JustLandedProductCard'
import ConcernThumb from '../components/ConcernThumb'
import type { Product } from '../types'

type ConcernDetail = {
  id: number
  slug: string
  name: string
  description: string | null
  image_url: string | null
  concern_group: string | null
  headline: string | null
  subheadline: string | null
  banner_url: string | null
  banner_mobile_url: string | null
  about_title: string | null
  about_body: string | null
  products: any[]
}

const GROUP_LABELS: Record<string, string> = { skin: 'Skin concerns', hair: 'Hair concerns', body: 'Body concerns' }
const GROUP_ORDER = ['skin', 'hair', 'body']

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const headingFont = { fontFamily: 'var(--font-heading-family)' }

function Breadcrumbs({ current, light }: { current?: string; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em]" style={{ color: light ? 'rgba(255,255,255,0.85)' : 'var(--nf-text-muted)' }}>
      <a href="#/user/" className="hover:underline">Home</a>
      <span className="mx-2" aria-hidden="true">/</span>
      {current ? <a href="#/user/concerns" className="hover:underline">Shop by Concern</a> : <span aria-current="page">Shop by Concern</span>}
      {current && (
        <>
          <span className="mx-2" aria-hidden="true">/</span>
          <span aria-current="page">{current}</span>
        </>
      )}
    </nav>
  )
}

/** Story-style row of concern circles; the current one is ringed. */
function ConcernRail({ concerns, activeSlug }: { concerns: Concern[]; activeSlug?: string }) {
  const list = concerns.filter((c) => c.product_count > 0)
  if (list.length < 2) return null
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="mx-auto flex !flex-nowrap w-max gap-4 py-1 sm:gap-6">
        {list.map((c) => {
          const active = c.slug === activeSlug
          return (
            <li key={c.slug} className="w-[4.5rem] flex-shrink-0 sm:w-20">
              <a href={`#/user/concern/${c.slug}`} aria-current={active ? 'page' : undefined} className="group flex flex-col items-center gap-2 text-center">
                <span
                  className="rounded-full p-[3px] transition-transform duration-300 group-hover:-translate-y-0.5"
                  style={{ boxShadow: active ? '0 0 0 2px var(--nf-primary)' : '0 0 0 1px var(--nf-border)' }}
                >
                  <ConcernThumb concern={c} className="h-14 w-14 sm:h-16 sm:w-16" textClass="text-xl" />
                </span>
                <span
                  className="line-clamp-2 text-[11px] leading-tight sm:text-xs"
                  style={{ color: active ? 'var(--nf-heading)' : 'var(--nf-text-muted)', fontWeight: active ? 600 : 400 }}
                >
                  {c.name}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Large tile used on the All concerns page and in "Explore other concerns". */
function ConcernTile({ concern, compact }: { concern: Concern; compact?: boolean }) {
  const hasImage = !!concern.image_url
  return (
    <a
      href={`#/user/concern/${concern.slug}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-xl"
      style={{ background: hasImage ? 'var(--nf-surface-soft)' : 'linear-gradient(160deg, var(--nf-primary-lighter) 0%, var(--nf-surface-soft) 100%)' }}
    >
      {hasImage ? (
        <>
          <img src={concern.image_url!} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)' }} aria-hidden="true" />
        </>
      ) : (
        <span
          className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] font-light leading-none opacity-25 transition-transform duration-700 group-hover:scale-110 sm:text-[11rem]"
          style={{ color: 'var(--nf-primary)', ...headingFont }}
          aria-hidden="true"
        >
          {concern.name.charAt(0)}
        </span>
      )}
      <span className={`relative ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`} style={{ color: hasImage ? '#FFFFFF' : 'var(--nf-heading)' }}>
        <span className={`block font-medium leading-snug ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`} style={headingFont}>{concern.name}</span>
        {!compact && concern.description && (
          <span className="mt-1 line-clamp-2 block text-xs" style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--nf-text-muted)' }}>{concern.description}</span>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: hasImage ? '#FFFFFF' : 'var(--nf-primary)' }}>
          {plural(concern.product_count, 'product')}
          <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
        </span>
      </span>
    </a>
  )
}

/** /user/concerns — all concerns as image tiles, grouped by skin / hair / body */
export function ConcernsIndexPage() {
  const { concerns, loading } = useConcerns()
  const visible = concerns.filter((c) => c.product_count > 0)

  const groups = useMemo(() => {
    const known = GROUP_ORDER.map((g) => ({ key: g, label: GROUP_LABELS[g], items: visible.filter((c) => c.concern_group === g) }))
    const other = visible.filter((c) => !c.concern_group || !GROUP_LABELS[c.concern_group])
    const out = known.filter((g) => g.items.length > 0)
    if (other.length) out.push({ key: 'other', label: out.length ? 'More concerns' : '', items: other })
    return out
  }, [visible])

  useEffect(() => {
    setPageMeta('Shop by Concern', 'Find NEFOL skincare and haircare for your concern: acne, dullness, dryness, sun protection, hair fall and more.')
  }, [])

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--nf-page-bg)' }}>
      <section className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-6 md:pb-14 md:pt-12" style={{ background: 'linear-gradient(180deg, var(--nf-surface-soft) 0%, var(--nf-page-bg) 100%)' }}>
        <div className="mx-auto max-w-6xl text-center">
          <div className="flex justify-center"><Breadcrumbs /></div>
          <h1 className="mt-4 text-3xl font-light tracking-wide sm:text-4xl md:text-5xl" style={{ color: 'var(--nf-heading)', ...headingFont }}>Shop by Concern</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base" style={{ color: 'var(--nf-text-muted)' }}>
            Tell us what you want to work on and we'll show you the products made for it.
          </p>
          {!loading && visible.length > 1 && (
            <div className="mt-8"><ConcernRail concerns={concerns} /></div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 pb-16 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--nf-surface-soft)' }} />)}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--nf-text-muted)' }}>Concern collections are coming soon.</p>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-labelledby={g.label ? `concern-group-${g.key}` : undefined}>
              {g.label && (
                <div className="mb-5 flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--nf-border)' }}>
                  <h2 id={`concern-group-${g.key}`} className="text-xl font-light tracking-wide sm:text-2xl" style={{ color: 'var(--nf-heading)', ...headingFont }}>{g.label}</h2>
                  <span className="text-xs" style={{ color: 'var(--nf-text-muted)' }}>{plural(g.items.length, 'concern')}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {g.items.map((c) => <ConcernTile key={c.slug} concern={c} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}

type SortKey = 'featured' | 'rating' | 'price-asc' | 'price-desc' | 'newest'
const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
]

/** Selling price used for sorting (website price, else MRP, else price); null when unknown. */
const sellingPrice = (p: Product): number | null => {
  const raw = p.details?.websitePrice || p.details?.mrp || p.price || ''
  const n = parseFloat(String(raw).replace(/[₹,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** dir 1 = low to high, -1 = high to low; products without a price go last either way. */
const byPrice = (a: Product, b: Product, dir: 1 | -1) => {
  const pa = sellingPrice(a)
  const pb = sellingPrice(b)
  if (pa === null || pb === null) return (pa === null ? 1 : 0) - (pb === null ? 1 : 0)
  return (pa - pb) * dir
}

/** Banner across the top: uploaded image (separate mobile crop optional), or a styled block until one is added. */
function ConcernHero({ data }: { data: ConcernDetail }) {
  const banner = data.banner_url ? resolveMediaUrl(data.banner_url) : ''
  const bannerMobile = data.banner_mobile_url ? resolveMediaUrl(data.banner_mobile_url) : ''
  const tile = data.image_url ? resolveMediaUrl(data.image_url) : ''

  if (banner || bannerMobile) {
    const hasOverlay = !!(data.headline || data.subheadline)
    return (
      <>
        <section className="relative overflow-hidden" style={{ backgroundColor: 'var(--nf-surface-soft)' }}>
          <picture>
            {bannerMobile && banner && <source media="(max-width: 767px)" srcSet={bannerMobile} />}
            <img
              src={banner || bannerMobile}
              alt={data.headline || data.name}
              fetchPriority="high"
              decoding="async"
              className={`block w-full object-cover ${bannerMobile ? 'aspect-square md:aspect-[3/1]' : 'aspect-[16/9] md:aspect-[3/1]'}`}
            />
          </picture>
          {hasOverlay && (
            <div className="absolute inset-0 hidden items-center md:flex" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 70%)' }}>
              <div className="mx-auto w-full max-w-6xl px-6">
                <div className="max-w-md text-white">
                  {data.headline && <p className="text-3xl font-light leading-tight lg:text-4xl" style={headingFont}>{data.headline}</p>}
                  {data.subheadline && <p className="mt-3 text-base opacity-90">{data.subheadline}</p>}
                </div>
              </div>
            </div>
          )}
        </section>
        <section className="px-4 pb-2 pt-8 text-center sm:px-6 md:pt-10">
          <div className="flex justify-center"><Breadcrumbs current={data.name} /></div>
          {hasOverlay && (
            <div className="mx-auto mt-4 max-w-md md:hidden">
              {data.headline && <p className="text-xl font-light leading-snug" style={{ color: 'var(--nf-heading)', ...headingFont }}>{data.headline}</p>}
              {data.subheadline && <p className="mt-1 text-sm" style={{ color: 'var(--nf-text-muted)' }}>{data.subheadline}</p>}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-light tracking-wide sm:text-3xl md:text-4xl" style={{ color: 'var(--nf-heading)', ...headingFont }}>{data.name}</h1>
          {data.description && <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base" style={{ color: 'var(--nf-text-muted)' }}>{data.description}</p>}
        </section>
      </>
    )
  }

  return (
    <section className="relative overflow-hidden px-4 sm:px-6" style={{ background: 'linear-gradient(120deg, var(--nf-surface-soft) 0%, var(--nf-primary-lighter) 100%)' }}>
      <div className="mx-auto grid max-w-6xl items-center gap-6 py-8 md:grid-cols-[1.2fr_1fr] md:gap-10 md:py-12">
        <div>
          <Breadcrumbs current={data.name} />
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--nf-primary)' }}>Shop by Concern</p>
          <h1 className="mt-2 text-3xl font-light leading-tight sm:text-4xl md:text-5xl" style={{ color: 'var(--nf-heading)', ...headingFont }}>{data.headline || data.name}</h1>
          {(data.subheadline || data.description) && (
            <p className="mt-3 max-w-md text-sm sm:text-base" style={{ color: 'var(--nf-text)' }}>{data.subheadline || data.description}</p>
          )}
        </div>
        <div className="hidden justify-center md:flex md:justify-end" aria-hidden="true">
          {tile ? (
            <img src={tile} alt="" decoding="async" className="aspect-[4/5] w-64 rounded-t-full object-cover shadow-lg lg:w-72" />
          ) : (
            <span className="flex aspect-[4/5] w-56 items-center justify-center rounded-t-full lg:w-64" style={{ backgroundColor: 'rgba(255,255,255,0.55)', border: '1px solid var(--nf-border)' }}>
              <span className="text-[8rem] font-light leading-none" style={{ color: 'var(--nf-primary)', ...headingFont }}>{data.name.charAt(0)}</span>
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

/** /user/concern/:slug — collection page for one concern */
export default function ConcernPage({ slug }: { slug: string }) {
  const { concerns } = useConcerns()
  const [data, setData] = useState<ConcernDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [sort, setSort] = useState<SortKey>('featured')

  useEffect(() => {
    let alive = true
    setStatus('loading')
    setSort('featured')
    fetch(`${getApiBase()}/api/concerns/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!alive) return
        if (!r.ok) { setStatus('missing'); return }
        setData(await r.json())
        setStatus('ready')
      })
      .catch(() => alive && setStatus('missing'))
    window.scrollTo(0, 0)
    return () => { alive = false }
  }, [slug])

  const products: Product[] = useMemo(
    () => (data?.products || []).map(mapProductRow).filter((p) => p.slug && p.title),
    [data]
  )
  const { stats: reviewStats } = useProductReviewStats(useMemo(() => products.map((p) => p.slug), [products]))

  const sorted = useMemo(() => {
    const list = products.map((p, i) => ({ p, i }))
    const rating = (p: Product) => reviewStats[p.slug]?.average_rating || 0
    const byStock = (a: Product, b: Product) => Number(isOutOfStock(a)) - Number(isOutOfStock(b))
    list.sort((a, b) => {
      switch (sort) {
        case 'rating': return rating(b.p) - rating(a.p) || a.i - b.i
        case 'price-asc': return byPrice(a.p, b.p, 1) || a.i - b.i
        case 'price-desc': return byPrice(a.p, b.p, -1) || a.i - b.i
        case 'newest': return (Date.parse(b.p.created_at || '') || 0) - (Date.parse(a.p.created_at || '') || 0) || a.i - b.i
        default: return byStock(a.p, b.p) || a.i - b.i // in-stock first, then the store's order
      }
    })
    return list.map((x) => x.p)
  }, [products, sort, reviewStats])

  const others = useMemo(() => {
    const visible = concerns.filter((c) => c.product_count > 0 && c.slug !== slug)
    const sameGroup = visible.filter((c) => data?.concern_group && c.concern_group === data.concern_group)
    return [...sameGroup, ...visible.filter((c) => !sameGroup.includes(c))].slice(0, 4)
  }, [concerns, slug, data])

  useEffect(() => {
    if (status === 'ready' && data) setPageMeta(`${data.name} | Shop by Concern`, data.description || `NEFOL products for ${data.name.toLowerCase()}.`)
    if (status === 'missing') setPageMeta('Concern not found')
  }, [status, data])

  const aboutParagraphs = (data?.about_body || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)
  const aboutImage = data?.image_url ? resolveMediaUrl(data.image_url) : ''

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--nf-page-bg)' }}>
      {status === 'loading' ? (
        <section className="px-4 py-10 sm:px-6 md:py-14" style={{ backgroundColor: 'var(--nf-surface-soft)' }}>
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="h-3 w-48 animate-pulse rounded bg-black/5" />
            <div className="h-10 w-72 max-w-full animate-pulse rounded bg-black/5" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-black/5" />
          </div>
        </section>
      ) : status === 'missing' || !data ? (
        <section className="px-4 py-20 text-center sm:px-6">
          <h1 className="text-2xl font-light" style={{ color: 'var(--nf-heading)', ...headingFont }}>Concern not found</h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--nf-text-muted)' }}>
            This concern isn't available. <a href="#/user/concerns" className="font-medium underline" style={{ color: 'var(--nf-primary)' }}>See all concerns</a>
          </p>
        </section>
      ) : (
        <ConcernHero data={data} />
      )}

      {status !== 'missing' && (
        <>
          <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
            <ConcernRail concerns={concerns} activeSlug={slug} />
          </section>

          <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-label="Products">
            {status === 'ready' && products.length > 0 && (
              <div className="mb-5 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--nf-border)' }}>
                <span className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--nf-text-muted)' }}>{plural(products.length, 'product')}</span>
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--nf-text-muted)' }}>
                  <span className="hidden sm:inline">Sort by</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="rounded-full border px-3 py-1.5 text-xs focus:outline-none"
                    style={{ borderColor: 'var(--nf-input-border)', backgroundColor: 'var(--nf-input-bg)', color: 'var(--nf-input-text)' }}
                    aria-label="Sort products"
                  >
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
            )}

            {status === 'loading' ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-square animate-pulse rounded-lg" style={{ backgroundColor: 'var(--nf-surface-soft)' }} />
                    <div className="h-4 w-3/4 animate-pulse rounded" style={{ backgroundColor: 'var(--nf-surface-soft)' }} />
                    <div className="h-4 w-1/2 animate-pulse rounded" style={{ backgroundColor: 'var(--nf-surface-soft)' }} />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: 'var(--nf-text-muted)' }}>
                Products for this concern are coming soon. <a href="#/user/shop" className="font-medium underline" style={{ color: 'var(--nf-primary)' }}>Shop all products</a>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                {sorted.map((p, i) => (
                  // globalIndex past the homepage "Best Seller" range: no best-seller badge on concern pages
                  <JustLandedProductCard key={p.slug} product={p as any} globalIndex={1000 + i} csvProducts={[]} reviewStats={reviewStats} eagerImage={i < 4} />
                ))}
              </div>
            )}
          </section>

          {status === 'ready' && data && aboutParagraphs.length > 0 && (
            <section className="px-4 py-12 sm:px-6 md:py-16" style={{ backgroundColor: 'var(--nf-surface-soft)' }}>
              <div className={`mx-auto grid max-w-6xl items-center gap-8 ${aboutImage ? 'md:grid-cols-[1fr_1.3fr] md:gap-14' : ''}`}>
                {aboutImage && (
                  <img src={aboutImage} alt="" loading="lazy" decoding="async" className="mx-auto aspect-square w-full max-w-sm rounded-2xl object-cover" />
                )}
                <div className={aboutImage ? '' : 'mx-auto max-w-3xl text-center'}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--nf-primary)' }}>Know your concern</p>
                  <h2 className="mt-2 text-2xl font-light sm:text-3xl" style={{ color: 'var(--nf-heading)', ...headingFont }}>{data.about_title || `About ${data.name.toLowerCase()}`}</h2>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--nf-text)' }}>
                    {aboutParagraphs.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}
                  </div>
                </div>
              </div>
            </section>
          )}

          {status === 'ready' && others.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16" aria-labelledby="other-concerns">
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 id="other-concerns" className="text-xl font-light tracking-wide sm:text-2xl" style={{ color: 'var(--nf-heading)', ...headingFont }}>Explore other concerns</h2>
                <a href="#/user/concerns" className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.12em] hover:underline" style={{ color: 'var(--nf-primary)' }}>View all →</a>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
                {others.map((c) => <ConcernTile key={c.slug} concern={c} compact />)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
