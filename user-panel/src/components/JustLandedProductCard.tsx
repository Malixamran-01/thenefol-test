import React from 'react'
import { Star, Eye } from 'lucide-react'
import PricingDisplay from './PricingDisplay'
import VerifiedBadge from './VerifiedBadge'
import WishlistButton from './WishlistButton'
import { createImageErrorHandler } from '../utils/imageUtils'

type JustLandedProduct = {
  id?: number
  slug?: string
  title?: string
  listImage?: string
  details?: unknown
  [key: string]: unknown
}

type ReviewStatsMap = Record<string, { average_rating?: number; review_count?: number; verified_count?: number }>

const TITLE_MAX_CHARS = 52
const DESC_MAX_CHARS = 68

function truncateWithEllipsis(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max).trimEnd()}…`
}

function getSubtitle(product: JustLandedProduct, csvProducts: any[]): string | null {
  const csvMatch = csvProducts.find((csv: any) => {
    const csvSlug = csv['Slug'] || csv['Product Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''
    return csvSlug === product.slug
  })
  if (csvMatch?.['Subtitle / Tagline']) return csvMatch['Subtitle / Tagline']
  if (product.details && typeof product.details === 'object' && product.details !== null) {
    return (product.details as { subtitle?: string }).subtitle ?? null
  }
  if (product.details && typeof product.details === 'string') {
    try {
      return JSON.parse(product.details)?.subtitle ?? null
    } catch {
      return null
    }
  }
  return null
}

export default function JustLandedProductCard({
  product,
  globalIndex,
  csvProducts,
  reviewStats,
  eagerImage = false,
}: {
  product: JustLandedProduct
  globalIndex: number
  csvProducts: any[]
  reviewStats: ReviewStatsMap
  eagerImage?: boolean
}) {
  const slug = product.slug || ''
  const dbStats = reviewStats[slug]
  const rating = dbStats?.average_rating ?? 0
  const reviewCount = dbStats?.review_count ?? 0
  const hasVerified = (dbStats?.verified_count ?? 0) > 0
  const isBestSeller = globalIndex < 4
  const subtitleRaw = getSubtitle(product, csvProducts)
  const title = truncateWithEllipsis(product.title || '', TITLE_MAX_CHARS)
  const subtitle = subtitleRaw ? truncateWithEllipsis(subtitleRaw, DESC_MAX_CHARS) : null

  return (
    <article className="nefol-product-card group">
      <a href={`#/user/product/${product.slug}`} className="block shrink-0">
        <div className="nefol-product-card__media">
          {product.listImage ? (
            <img
              src={product.listImage}
              alt={product.title || 'Product'}
              loading={eagerImage ? 'eager' : 'lazy'}
              onError={createImageErrorHandler(product.listImage)}
            />
          ) : (
            <span className="nefol-product-card__media-placeholder">No Image</span>
          )}
          {isBestSeller && (
            <div
              className="absolute left-2 top-2 z-10 px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--nf-badge-bg)', color: 'var(--nf-badge-text)' }}
            >
              Best Seller
            </div>
          )}
        </div>
      </a>

      {product.id != null && (
        <WishlistButton
          productId={product.id}
          className="absolute right-4 top-4 z-50 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        />
      )}

      <div className="nefol-product-card__body">
        <a href={`#/user/product/${product.slug}`}>
          <h3 className="nefol-product-card__title" title={product.title}>
            {title}
          </h3>
        </a>

        {subtitle ? (
          <p className="nefol-product-card__desc" title={subtitleRaw || undefined}>
            {subtitle}
          </p>
        ) : null}

        {/* Approved customer reviews only. The row keeps its height when empty so cards line up. */}
        {rating > 0 && reviewCount > 0 ? (
          <div className="nefol-product-card__rating min-h-[22px]" aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`}>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-gray-900 ring-1 ring-amber-200">
              <Star className="h-3.5 w-3.5" style={{ color: 'var(--nf-rating-star)', fill: 'var(--nf-rating-star)' }} aria-hidden="true" />
              {rating.toFixed(1)}
            </span>
            <span className="ml-1.5 shrink-0 text-xs text-gray-500">
              {reviewCount} review{reviewCount === 1 ? '' : 's'}
            </span>
            {hasVerified && <VerifiedBadge size="sm" className="ml-1.5 shrink-0" />}
          </div>
        ) : (
          <div className="nefol-product-card__rating min-h-[22px]" aria-hidden="true" />
        )}

        <div className="nefol-product-card__price">
          <PricingDisplay
            className="!flex-nowrap text-sm sm:text-base"
            product={product as { price?: string; details?: { mrp?: string; websitePrice?: string } }}
          />
        </div>

        <a href={`#/user/product/${product.slug}`} className="nefol-product-card__cta">
          <Eye className="h-4 w-4 shrink-0" />
          <span>View</span>
        </a>
      </div>
    </article>
  )
}
