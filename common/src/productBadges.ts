/**
 * Badges admins can put on storefront product cards (stored as details.cardBadges on a product).
 * Keep the ids in sync with CARD_BADGES in backend/src/routes/productBulk.ts.
 */
export const PRODUCT_CARD_BADGES = [
  { id: 'new_arrival', label: 'New Arrival' },
  { id: 'bestseller', label: 'Bestseller' },
  { id: 'lowest_price', label: 'Lowest Price' },
  { id: 'sale', label: 'Sale' },
  { id: 'new', label: 'New' },
  { id: 'limited', label: 'Limited Edition' },
  { id: 'trending', label: 'Trending' },
] as const

export type ProductCardBadgeId = (typeof PRODUCT_CARD_BADGES)[number]['id']

/** A product's card badges in display order (unknown ids dropped). */
export function cardBadgesOf(details: unknown): Array<{ id: ProductCardBadgeId; label: string }> {
  const ids = (details as { cardBadges?: unknown } | null)?.cardBadges
  if (!Array.isArray(ids)) return []
  return PRODUCT_CARD_BADGES.filter((b) => ids.includes(b.id))
}

/** Products with this badge are also featured in the homepage New Arrivals section. */
export function isNewArrival(details: unknown): boolean {
  return cardBadgesOf(details).some((b) => b.id === 'new_arrival')
}
