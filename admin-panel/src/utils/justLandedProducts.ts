export function isComboCategory(category?: string): boolean {
  const c = (category || '').toLowerCase().trim()
  return c === 'combo' || c === 'combo pack' || c.includes('combo')
}

export type CatalogProductRow = {
  id: number
  slug: string
  title: string
  category?: string
  list_image?: string
}

export function filterCatalogForJustLanded(products: CatalogProductRow[]): CatalogProductRow[] {
  return products.filter((p) => p.slug && p.title && !isComboCategory(p.category))
}

export function buildDefaultSlugOrder(products: CatalogProductRow[]): string[] {
  return filterCatalogForJustLanded(products).map((p) => p.slug)
}
