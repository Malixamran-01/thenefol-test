export type Product = {
  id?: number
  slug: string
  title: string
  category?: string
  price: string
  listImage: string
  pdpImages: string[]
  bannerImages?: string[]
  description: string
  details?: any
  created_at?: string
  csvProduct?: any
  /** Sellable units (sum across variants: on hand − reserved). From /api/products. */
  inventoryAvailable?: number
  /** True when inventoryAvailable > 0 */
  inStock?: boolean
}


