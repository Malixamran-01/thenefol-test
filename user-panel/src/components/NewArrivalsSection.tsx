import type { CSSProperties } from 'react'
import { Star } from 'lucide-react'
import ListingAddToCartButton from './ListingAddToCartButton'
import PricingDisplay from './PricingDisplay'
import ProductCardBadges from './ProductCardBadges'
import VerifiedBadge from './VerifiedBadge'
import WishlistButton from './WishlistButton'
import { getSubtitle, type ReviewStatsMap } from './JustLandedProductCard'
import { createImageErrorHandler } from '../utils/imageUtils'
import type { Product } from '../types'

/** Cards per row, as even as possible: 5 products at up to 4 a row gives [3, 2]. */
function rowSizes(count: number, maxPerRow: number): number[] {
  const rows = Math.ceil(count / maxPerRow)
  return Array.from({ length: rows }, (_, i) => Math.ceil((count - i) / rows))
}

/** Each card's width on the 12-column grid, so every row fills the section edge to edge. */
const columnSpans = (rows: number[]) => rows.flatMap((cards) => Array<number>(cards).fill(12 / cards))

/** Products badged New Arrival in Admin → Products. Hidden when there are none. */
export default function NewArrivalsSection({
  products,
  csvProducts,
  reviewStats,
}: {
  products: Product[]
  csvProducts: any[]
  reviewStats: ReviewStatsMap
}) {
  if (products.length === 0) return null

  // On phones an odd product leads at full width rather than trailing on its own
  const phoneSpans = columnSpans(rowSizes(products.length, 2).reverse())
  const desktopSpans = columnSpans(rowSizes(products.length, 4))

  return (
    <section className="nefol-arrivals" aria-labelledby="new-arrivals-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 text-center sm:mb-12">
          <h2
            id="new-arrivals-heading"
            className="mb-3 text-2xl font-light tracking-[0.15em] sm:text-3xl md:text-4xl"
            style={{ color: 'var(--nf-text)', fontFamily: 'var(--font-heading-family)', letterSpacing: '0.15em' }}
          >
            New Arrivals
          </h2>
          <p className="text-sm font-light tracking-wide sm:text-base" style={{ color: 'var(--nf-text-muted)', letterSpacing: '0.05em' }}>
            Our newest formulas, natural as the morning dew.
          </p>
        </header>

        <div className="nefol-arrivals__grid">
          {products.map((product, index) => {
            const href = `#/user/product/${product.slug}`
            const stats = reviewStats[product.slug || '']
            const rating = stats?.average_rating ?? 0
            const reviewCount = stats?.review_count ?? 0
            const subtitle = getSubtitle(product, csvProducts)
            const spans = { '--arrival-span': phoneSpans[index], '--arrival-span-md': desktopSpans[index] } as CSSProperties

            return (
              <article key={product.slug} className="nefol-arrival group" style={spans}>
                <div className="nefol-arrival__card">
                  <a href={href} className="nefol-arrival__media" aria-label={product.title}>
                    {product.listImage ? (
                      <img
                        src={product.listImage}
                        alt=""
                        className="img-fill"
                        loading="eager"
                        onError={createImageErrorHandler(product.listImage)}
                      />
                    ) : (
                      <span className="nefol-product-card__media-placeholder">No Image</span>
                    )}
                    <ProductCardBadges details={product.details} className="left-3 top-3" />
                  </a>

                  {product.id != null && (
                    <WishlistButton
                      productId={product.id}
                      className="absolute right-3 top-3 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    />
                  )}

                  <div className="nefol-arrival__body">
                    <a href={href}>
                      <h3 className="nefol-arrival__title" title={product.title}>{product.title}</h3>
                    </a>

                    {subtitle && <p className="nefol-arrival__desc" title={subtitle}>{subtitle}</p>}

                    {rating > 0 && reviewCount > 0 && (
                      <div className="nefol-product-card__rating" aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`}>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-gray-900 ring-1 ring-amber-200">
                          <Star className="h-3.5 w-3.5" style={{ color: 'var(--nf-rating-star)', fill: 'var(--nf-rating-star)' }} aria-hidden="true" />
                          {rating.toFixed(1)}
                        </span>
                        <span className="ml-1.5 shrink-0 text-xs text-gray-500">
                          {reviewCount} review{reviewCount === 1 ? '' : 's'}
                        </span>
                        {(stats?.verified_count ?? 0) > 0 && <VerifiedBadge size="sm" className="ml-1.5 shrink-0" />}
                      </div>
                    )}

                    <div className="nefol-arrival__buy">
                      <PricingDisplay
                        className="text-sm sm:text-base"
                        product={product as { price?: string; details?: { mrp?: string; websitePrice?: string } }}
                      />
                      <ListingAddToCartButton product={product} />
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
