export type Product = {
  id?: number
  slug: string
  title: string
  category?: string
  price: string
  listImage: string
  pdpImages: string[]
  /** Poster frame per PDP video URL (absolute URLs, same keys as pdpImages). */
  mediaPosters?: Record<string, string>
  bannerImages?: string[]
  /** Shop by Concern tags, e.g. [{ slug: 'acne-breakouts', name: 'Acne & Breakouts' }] */
  concerns?: { slug: string; name: string }[]
  description: string
  details?: any
  created_at?: string
  csvProduct?: any
  /** Sellable units (sum across variants: on hand − reserved). From /api/products. */
  inventoryAvailable?: number
  /** True when inventoryAvailable > 0 */
  inStock?: boolean
}


