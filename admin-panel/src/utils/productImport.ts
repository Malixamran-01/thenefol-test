import { slugify } from './csv'

/**
 * Bulk product import: maps spreadsheet columns to product fields, normalizes prices and
 * percentages, and validates each row so problems show in the preview instead of the catalog.
 */

export const STANDARD_CATEGORIES = ['Face Care', 'Hair Care', 'Body Care', 'Combo']

/** Header normalization: case-insensitive, ignores spaces and punctuation such as ( ) / . % ₹ - _ */
export const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Product field -> accepted (normalized) header names, most specific first. */
const FIELD_ALIASES: Record<string, string[]> = {
  title: ['productname', 'name', 'title'],
  slug: ['slug'],
  productTitle: ['producttitle'],
  brand: ['brandname', 'brand'],
  sku: ['sku'],
  hsn: ['hsncode', 'hsn'],
  subtitle: ['subtitletagline', 'subtitle', 'tagline'],
  category: ['productcategory', 'category'],
  concerns: ['concerns', 'concern', 'skinconcerns', 'skinconcern', 'hairconcerns', 'hairconcern', 'shopbyconcern', 'concerntags'],
  subCategory: ['productsubcategory', 'subcategory'],
  productType: ['producttype'],
  skinHairType: ['skinhairtype', 'skintype', 'hairtype'],
  netQuantity: ['netquantitycontent', 'netquantity'],
  unitCount: ['unitcountpackof', 'unitcount', 'packof'],
  packageContent: ['packagecontentdetails', 'packagecontent'],
  innerPackaging: ['innerpackagingtype', 'innerpackaging'],
  outerPackaging: ['outerpackagingtype', 'outerpackaging'],
  netWeight: ['netweightproductonly', 'netweight'],
  grossWeight: ['netweightwithpacking', 'grossweight'],
  deadWeight: ['deadweightpackagingonly', 'deadweight'],
  dimensions: ['productdimentionincm', 'productdimensionincm', 'productdimensions', 'dimensions'],
  shelfLife: ['shelflifeexpiry', 'shelflife'],
  discount: ['discount', 'discountpercent', 'discountpercentage'],
  mrp: ['mrp', 'mrprs', 'mrpinr'],
  websitePrice: ['websiteprice', 'sellingprice', 'basesellingprice', 'saleprice', 'offerprice', 'discountedprice', 'price'],
  gst: ['gst', 'gstpercent', 'gstrate'],
  countryOfOrigin: ['countryoforigin', 'origin'],
  manufacturer: ['manufacturerpackerimporter', 'manufacturer'],
  keyIngredients: ['keyingredients', 'ingredients'],
  ingredientBenefits: ['ingredientbenefits'],
  howToUse: ['howtousesteps', 'howtouse'],
  longDescription: ['productdescriptionlong', 'longdescription', 'productdescription', 'description'],
  bulletHighlights: ['bullethighlightsshortdesc', 'bullethighlights', 'highlights', 'shortdescription'],
  imageLinks: ['imagelinks', 'images', 'imageurls'],
  videoLinks: ['videolinks', 'videos'],
  platformCategoryMapping: ['platformcategorymapping'],
  hazardous: ['hazardousfragileyn', 'hazardous', 'fragile'],
  badges: ['specialattributesbadges', 'badges'],
}

/** Fields copied into `details` as plain text. Pricing, title, slug and category are handled separately. */
const TEXT_DETAIL_FIELDS = [
  'sku', 'hsn', 'brand', 'productTitle', 'subtitle', 'subCategory', 'productType', 'skinHairType',
  'netQuantity', 'unitCount', 'grossWeight', 'netWeight', 'deadWeight', 'dimensions', 'shelfLife',
  'packageContent', 'innerPackaging', 'outerPackaging', 'countryOfOrigin', 'manufacturer',
  'keyIngredients', 'ingredientBenefits', 'howToUse', 'longDescription', 'bulletHighlights',
  'imageLinks', 'videoLinks', 'platformCategoryMapping', 'hazardous', 'badges',
]

export type ColumnMapping = {
  /** field -> column index */
  fields: Record<string, number>
  /** header text -> field it was mapped to */
  mapped: { header: string; field: string }[]
  /** headers that no field uses */
  ignored: string[]
}

export function mapColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader)
  const used = new Set<number>()
  const fields: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.findIndex((h, i) => h === alias && !used.has(i))
      if (idx >= 0) { fields[field] = idx; used.add(idx); break }
    }
  }
  const mapped = Object.entries(fields).map(([field, idx]) => ({ header: headers[idx].trim(), field }))
  const ignored = headers.filter((h, i) => !used.has(i) && h.trim() !== '').map(h => h.trim())
  return { fields, mapped, ignored }
}

type ParsedNumber = { value?: number; error?: string; fromFraction?: boolean }

/** "₹1,299.00", "Rs. 1299", "1,29,900", "1299/-" -> 1299 */
export function parseMoney(raw: string): ParsedNumber {
  const s = (raw || '').trim()
  if (!s) return {}
  const cleaned = s.replace(/₹|rs\.?|inr|\/-|,|\s/gi, '')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { error: `"${s}" is not a valid amount` }
  return { value: Number(cleaned) }
}

/** "30%", "30", " 30 % " -> 30; a bare fraction such as 0.3 (Excel percent cell) -> 30 */
export function parsePercent(raw: string): ParsedNumber {
  const s = (raw || '').trim()
  if (!s) return {}
  const cleaned = s.replace(/%|\s/g, '')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { error: `"${s}" is not a valid percentage` }
  const n = Number(cleaned)
  if (!s.includes('%') && n > 0 && n < 1) return { value: n * 100, fromFraction: true }
  return { value: n }
}

const round2 = (n: number) => Math.round(n * 100) / 100
export const formatMoney = (n: number) => round2(n).toFixed(2)
export const formatPercent = (n: number) => String(Math.round(n * 10) / 10)

/** Discount implied by MRP and website price, e.g. (1299, 815) -> 37.3 */
export function discountFromPrices(mrp: number, websitePrice: number): number {
  return mrp > 0 ? Math.round(((mrp - websitePrice) / mrp) * 1000) / 10 : 0
}

/**
 * The discount % that matches a product's stored MRP and website price. Stored `discount`
 * values can be stale (e.g. "30%" while the prices give 37.3%), so prices win when both exist.
 */
export function effectiveDiscount(details: any): string {
  const mrp = parseMoney(String(details?.mrp ?? '')).value
  const wp = parseMoney(String(details?.websitePrice ?? '')).value
  if (mrp && wp != null && wp <= mrp) return formatPercent(discountFromPrices(mrp, wp))
  const stored = parsePercent(String(details?.discountPercent ?? details?.discount ?? '')).value
  return stored != null ? formatPercent(stored) : ''
}

export function mapCategoryToStandard(rawCategory: string): string {
  const normalized = rawCategory.toLowerCase().trim()
  if (!normalized) return ''
  if (normalized === 'face care') return 'Face Care'
  if (normalized === 'hair care') return 'Hair Care'
  if (normalized === 'body care') return 'Body Care'
  if (normalized === 'combo') return 'Combo'
  if (normalized.includes('combo') || normalized.includes('pack')) return 'Combo'
  if (normalized.includes('hair')) return 'Hair Care'
  if (normalized.includes('face') || normalized.includes('skin')) return 'Face Care'
  if (normalized.includes('body')) return 'Body Care'
  return rawCategory.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export type ImportRow = {
  /** Spreadsheet row number (header is row 1) */
  rowNumber: number
  title: string
  slug: string
  category: string
  /** Selling price stored in products.price */
  price: string
  listImage: string
  description: string
  details: Record<string, string>
  /** Shop-by-Concern names from the "Concern" column (empty when the file has no such column) */
  concerns: string[]
  mrp?: number
  websitePrice?: number
  discount?: number
  errors: string[]
  warnings: string[]
}

export type ImportPlan = {
  mapping: ColumnMapping
  rows: ImportRow[]
  /** Problems with the file as a whole (e.g. no product name column) */
  fileErrors: string[]
}

/** Builds validated import rows from a header row and data rows (from CSV or XLSX). */
export function buildImportPlan(table: string[][]): ImportPlan {
  const [header = [], ...body] = table
  const mapping = mapColumns(header)
  const fileErrors: string[] = []
  if (mapping.fields.title == null) fileErrors.push('No product name column found (expected "Product Name" or "Title").')
  if (mapping.fields.mrp == null && mapping.fields.websitePrice == null) {
    fileErrors.push('No price column found (expected "MRP" and/or "Website Price").')
  }

  const seenSlugs = new Map<string, number>()
  const rows = body.map((cells, i) => {
    const row = buildRow(cells, header.length, mapping, i + 2)
    if (row.slug) {
      const first = seenSlugs.get(row.slug)
      if (first != null) row.errors.push(`Duplicate slug "${row.slug}" (also on row ${first})`)
      else seenSlugs.set(row.slug, row.rowNumber)
    }
    return row
  })
  return { mapping, rows, fileErrors }
}

function buildRow(cells: string[], headerCount: number, mapping: ColumnMapping, rowNumber: number): ImportRow {
  const errors: string[] = []
  const warnings: string[] = []
  const get = (field: string) => {
    const idx = mapping.fields[field]
    return idx == null ? '' : String(cells[idx] ?? '').trim()
  }

  // Extra non-empty cells mean the row was split wrongly (usually an unquoted comma such as 1,299)
  const extra = cells.slice(headerCount).filter(c => c.trim() !== '')
  if (extra.length) {
    errors.push(`Row has ${headerCount + extra.length} cells but the header has ${headerCount}; columns are shifted (check for unquoted commas)`)
  }

  const title = get('title').replace(/\s+/g, ' ')
  const slug = slugify(get('slug') || title)
  if (!title) errors.push('Missing product name')
  else if (!slug) errors.push('Could not build a slug from the product name')

  const rawCategory = get('category')
  const category = mapCategoryToStandard(rawCategory)
  if (rawCategory && !STANDARD_CATEGORIES.includes(category)) {
    warnings.push(`Category "${rawCategory}" is not one of ${STANDARD_CATEGORIES.join(', ')}`)
  }

  // ---- Pricing ----
  const mrpP = parseMoney(get('mrp'))
  const wpP = parseMoney(get('websitePrice'))
  const discP = parsePercent(get('discount'))
  if (mrpP.error) errors.push(`MRP: ${mrpP.error}`)
  if (wpP.error) errors.push(`Website price: ${wpP.error}`)
  if (discP.error) errors.push(`Discount: ${discP.error}`)
  if (discP.fromFraction) warnings.push(`Discount ${get('discount')} read as ${formatPercent(discP.value!)}%`)

  let mrp = mrpP.value
  let websitePrice = wpP.value
  let discount = discP.value

  if (mrp === 0) { errors.push('MRP is 0'); mrp = undefined }
  if (websitePrice === 0) { errors.push('Website price is 0'); websitePrice = undefined }
  if (discount != null && (discount < 0 || discount >= 100)) {
    errors.push(`Discount ${formatPercent(discount)}% must be between 0 and 100`)
    discount = undefined
  }

  if (!mrpP.error && !wpP.error) {
    if (mrp != null && websitePrice != null) {
      if (websitePrice > mrp) errors.push(`Website price ₹${formatMoney(websitePrice)} is higher than MRP ₹${formatMoney(mrp)}`)
      const implied = discountFromPrices(mrp, websitePrice)
      if (discount != null && Math.abs(discount - implied) > 0.5) {
        warnings.push(`Discount column says ${formatPercent(discount)}% but MRP/website price give ${formatPercent(implied)}%; using ${formatPercent(implied)}%`)
      }
      discount = implied
    } else if (mrp != null && discount != null) {
      websitePrice = round2(mrp * (1 - discount / 100))
    } else if (mrp != null) {
      discount = undefined
    } else if (websitePrice != null) {
      warnings.push('No MRP; the product will show without a strike-through price')
      discount = undefined
    } else if (!errors.some(e => e.startsWith('MRP') || e.startsWith('Website price'))) {
      errors.push('No price: MRP and website price are both empty')
    }
  }

  const sellingPrice = websitePrice ?? mrp
  const gstP = parsePercent(get('gst'))
  if (gstP.error) warnings.push(`GST: ${gstP.error}`)

  const details: Record<string, string> = {}
  for (const field of TEXT_DETAIL_FIELDS) {
    const v = get(field)
    if (v) details[field] = v
  }
  if (!details.brand) details.brand = 'NEFOL'
  // Pricing keys are always present so an update clears stale values from an earlier import
  details.mrp = mrp != null ? formatMoney(mrp) : ''
  details.websitePrice = websitePrice != null ? formatMoney(websitePrice) : ''
  details.discountPercent = discount != null ? formatPercent(discount) : ''
  details.discount = details.discountPercent
  if (gstP.value != null) {
    details.gst = formatPercent(gstP.value)
    details.gstPercent = details.gst
  }

  // "Acne, Dullness | Hair fall" → ['Acne', 'Dullness', 'Hair fall']; matched or created by the backend
  const concerns = [...new Set(get('concerns').split(/[,;|\n]+/).map(c => c.trim().replace(/\s+/g, ' ')).filter(Boolean))]

  const imageLinks = details.imageLinks || ''
  const listImage = imageLinks.split(/[\s,]+/).find(u => u.trim()) || ''

  return {
    rowNumber,
    title,
    slug,
    category,
    price: sellingPrice != null ? formatMoney(sellingPrice) : '',
    listImage,
    description: details.longDescription || '',
    details,
    concerns,
    mrp,
    websitePrice,
    discount,
    errors,
    warnings,
  }
}
