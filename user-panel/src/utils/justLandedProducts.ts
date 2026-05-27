import type { Product } from '../types'

export function isComboCategory(category?: string): boolean {
  const c = (category || '').toLowerCase().trim()
  return c === 'combo' || c === 'combo pack' || c.includes('combo')
}

/** Products for What's Just Landed (excludes combo SKUs). */
export function filterJustLandedEligible<T extends { category?: string }>(products: T[]): T[] {
  return products.filter((p) => !isComboCategory(p.category))
}

/**
 * Order products by admin-defined slug list; any product not listed appears after, in original order.
 */
export function sortProductsBySlugOrder<T extends { slug?: string }>(
  products: T[],
  orderSlugs: string[] | null | undefined
): T[] {
  if (!orderSlugs?.length) return [...products]
  const bySlug = new Map(products.map((p) => [p.slug || '', p]))
  const ordered: T[] = []
  const used = new Set<string>()
  for (const slug of orderSlugs) {
    const p = bySlug.get(slug)
    if (p) {
      ordered.push(p)
      used.add(slug)
    }
  }
  for (const p of products) {
    const slug = p.slug || ''
    if (!used.has(slug)) ordered.push(p)
  }
  return ordered
}

export function sortProductList(products: Product[], orderSlugs: string[] | null | undefined): Product[] {
  return sortProductsBySlugOrder(filterJustLandedEligible(products), orderSlugs)
}
