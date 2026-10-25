import type { Product } from '../types'

/**
 * Same availability rule as the PDP: the API sends `in_stock` / `inventory_available`
 * (raw rows) or `inStock` / `inventoryAvailable` (mapped by useProducts).
 * Unknown stock (field missing) counts as available so nothing breaks for older data.
 */
export function isOutOfStock(p: any): boolean {
  if (!p) return false
  if (p.inStock === false || p.in_stock === false) return true
  const avail = p.inventoryAvailable ?? p.inventory_available
  if (avail === undefined || avail === null || avail === '') return false
  const n = Number(avail)
  return Number.isFinite(n) && n <= 0
}

/** Map a raw /api/products row (or an already-mapped product) to the cart's Product shape. */
export function toCartProduct(p: any): Product {
  const avail = Number(p?.inventoryAvailable ?? p?.inventory_available)
  return {
    id: p?.id,
    slug: p?.slug || '',
    title: p?.title || '',
    price: p?.price ?? '',
    listImage: p?.listImage || p?.list_image || '',
    pdpImages: Array.isArray(p?.pdpImages) ? p.pdpImages : [],
    category: p?.category,
    description: p?.description || '',
    details: p?.details,
    ...(Number.isFinite(avail) ? { inventoryAvailable: avail } : {}),
    inStock: !isOutOfStock(p),
  }
}
