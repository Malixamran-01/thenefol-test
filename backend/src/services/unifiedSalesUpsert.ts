import { Pool } from 'pg'

/**
 * One row of `unified_sales`. Amount semantics are shared by all platforms — see `gstUtils.ts`:
 * taxable_value (ex-GST, incl. shipping) + tax = total; price = taxable_value / quantity.
 */
export type UnifiedLineInput = {
  platform: 'website' | 'amazon' | 'flipkart'
  source_order_id: string
  line_key: string
  product_name: string
  quantity: number
  /** Tax-exclusive unit rate */
  price: number
  /** Total GST on the line */
  tax: number
  /** Tax-exclusive shipping portion (already included in taxable_value) */
  shipping: number
  /** Invoice amount incl. GST */
  total: number
  city: string | null
  order_date: Date
  currency?: string
  order_status?: string | null
  business_type?: string | null
  shipping_state?: string | null
  ship_state_code?: string | null
  quantity_shipped?: number | null
  line_note?: string | null
  /** B2B buyer GSTIN (Amazon getOrderBuyerInfo / MTR) */
  buyer_gstin?: string | null
  buyer_name?: string | null
  seller_sku?: string | null
  asin?: string | null
  hsn_code?: string | null
  igst?: number | null
  cgst?: number | null
  sgst?: number | null
  utgst?: number | null
  cess?: number | null
  tax_rate_pct?: number | null
  /** Tax-exclusive line value (goods + shipping − discounts) */
  taxable_value?: number | null
  invoice_number?: string | null
  invoice_date?: Date | null
  doc_type?: 'invoice' | 'credit_note'
  tax_source?: string | null
}

const COLUMNS = [
  'platform', 'source_order_id', 'line_key', 'product_name', 'quantity', 'price', 'tax', 'shipping', 'total', 'city',
  'order_date', 'currency', 'order_status', 'business_type', 'shipping_state', 'ship_state_code', 'quantity_shipped',
  'line_note', 'buyer_gstin', 'buyer_name', 'seller_sku', 'asin', 'hsn_code', 'igst', 'cgst', 'sgst', 'utgst', 'cess',
  'tax_rate_pct', 'taxable_value', 'invoice_number', 'invoice_date', 'doc_type', 'tax_source',
] as const

/**
 * Financial / invoice columns that, once filled from Amazon's GST MTR report (`tax_source = 'gst_report'`),
 * must not be overwritten by the less precise Orders API sync.
 */
const REPORT_LOCKED = new Set<string>([
  'quantity', 'price', 'tax', 'shipping', 'total', 'igst', 'cgst', 'sgst', 'utgst', 'cess', 'tax_rate_pct',
  'taxable_value', 'invoice_number', 'invoice_date', 'hsn_code', 'shipping_state', 'ship_state_code', 'buyer_gstin',
  'buyer_name', 'tax_source',
])

/** Values a later sync should never blank out when the new payload simply lacks them. */
const KEEP_IF_NULL = new Set<string>([
  'invoice_number', 'invoice_date', 'hsn_code', 'buyer_gstin', 'buyer_name', 'shipping_state', 'ship_state_code',
  'city', 'seller_sku', 'asin', 'business_type',
])

function setClause(col: string): string {
  let v = `excluded.${col}`
  if (KEEP_IF_NULL.has(col)) v = `coalesce(excluded.${col}, unified_sales.${col})`
  if (REPORT_LOCKED.has(col)) {
    v = `case when unified_sales.tax_source = 'gst_report' and excluded.tax_source is distinct from 'gst_report'
               then unified_sales.${col} else ${v} end`
  }
  return `${col} = ${v}`
}

const UPSERT_SQL = `insert into unified_sales (${COLUMNS.join(', ')})
  values (${COLUMNS.map((_, i) => `$${i + 1}`).join(', ')})
  on conflict (platform, line_key) do update set
    ${COLUMNS.filter((c) => c !== 'platform' && c !== 'line_key').map(setClause).join(',\n    ')},
    updated_at = now()`

/**
 * Insert or update a unified_sales row by (platform, line_key).
 */
export async function upsertUnifiedSaleLine(pool: Pool, row: UnifiedLineInput): Promise<void> {
  const r: Record<string, unknown> = {
    ...row,
    currency: row.currency || 'INR',
    doc_type: row.doc_type || 'invoice',
  }
  await pool.query(
    UPSERT_SQL,
    COLUMNS.map((c) => (r[c] === undefined ? null : r[c]))
  )
}
