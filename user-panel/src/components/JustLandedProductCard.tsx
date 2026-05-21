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
  const subtitle = getSubtitle(product, csvProducts)

  return (
    <div className="group relative bg-white">
      <a href={`#/user/product/${product.slug}`} className="block">
        <div className="relative mb-4 overflow-hidden rounded-xl" style={{ aspectRatio: '1 / 1' }}>
          {product.listImage ? (
            <img
              src={product.listImage}
              alt={product.title}
              className="img-fill h-full w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
              loading={eagerImage ? 'eager' : 'lazy'}
              onError={createImageErrorHandler(product.listImage)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-gray-400">No Image</span>
            </div>
          )}
          {isBestSeller && (
            <div
              className="absolute left-2 top-2 px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--arctic-blue-primary-dark)' }}
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
      <div className="space-y-2">
        <a href={`#/user/product/${product.slug}`}>
          <h3
            className="mb-1 line-clamp-2 overflow-hidden text-lg font-semibold tracking-wide hover:opacity-70 sm:text-xl"
            style={{
              color: '#1a1a1a',
              letterSpacing: '0.05em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              maxHeight: '3.5rem',
            }}
          >
            {product.title}
          </h3>
        </a>
        {subtitle && (
          <p
            className="mb-1 line-clamp-2 text-sm text-gray-600"
            style={{ color: '#666', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {subtitle}
          </p>
        )}
        {rating > 0 && (
          <div className="mb-2 flex items-center gap-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => {
                const filled = i < Math.round(rating)
                return (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                )
              })}
            </div>
            <span className="ml-1 text-sm text-gray-600">
              {rating.toFixed(2)} ({reviewCount})
            </span>
            {hasVerified && <VerifiedBadge size="sm" className="ml-1.5" />}
          </div>
        )}
        <div className="mb-2 flex items-center gap-2">
          <PricingDisplay
            product={product as { price?: string; details?: { mrp?: string; websitePrice?: string } }}
          />
        </div>
        <a
          href={`#/user/product/${product.slug}`}
          className="mt-4 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-light uppercase tracking-[0.15em] transition-all duration-300"
          style={{
            backgroundColor: 'rgb(75,151,201)',
            color: '#FFFFFF',
            letterSpacing: '0.15em',
            minHeight: '44px',
            textDecoration: 'none',
          }}
        >
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span>View</span>
        </a>
      </div>
    </div>
  )
}
