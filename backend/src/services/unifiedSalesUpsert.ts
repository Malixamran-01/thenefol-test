import { Pool } from 'pg'

export type UnifiedLineInput = {
  platform: 'website' | 'amazon' | 'flipkart'
  source_order_id: string
  line_key: string
  product_name: string
  quantity: number
  price: number
  tax: number
  shipping: number
  total: number
  city: string | null
  order_date: Date
  currency?: string
  order_status?: string | null
  business_type?: string | null
  shipping_state?: string | null
  quantity_shipped?: number | null
  line_note?: string | null
  /** B2B buyer GSTIN (Amazon getOrderBuyerInfo) */
  buyer_gstin?: string | null
  seller_sku?: string | null
  asin?: string | null
  igst?: number | null
  cgst?: number | null
  sgst?: number | null
  utgst?: number | null
  cess?: number | null
  tax_rate_pct?: number | null
  /** Pre-tax line value (principal / taxable base) when known */
  taxable_value?: number | null
  /** GST / marketplace invoice reference when provided by source API */
  invoice_number?: string | null
}

/**
 * Insert or update a unified_sales row by (platform, line_key).
 */
export async function upsertUnifiedSaleLine(pool: Pool, row: UnifiedLineInput): Promise<void> {
  const currency = row.currency || 'INR'

  const order_status = row.order_status ?? null
  const business_type = row.business_type ?? null
  const shipping_state = row.shipping_state ?? null
  const quantity_shipped = row.quantity_shipped ?? null
  const line_note = row.line_note ?? null
  const buyer_gstin = row.buyer_gstin ?? null
  const seller_sku = row.seller_sku ?? null
  const asin = row.asin ?? null
  const igst = row.igst ?? null
  const cgst = row.cgst ?? null
  const sgst = row.sgst ?? null
  const utgst = row.utgst ?? null
  const cess = row.cess ?? null
  const tax_rate_pct = row.tax_rate_pct ?? null
  const taxable_value = row.taxable_value ?? null
  const invoice_number = row.invoice_number ?? null

  await pool.query(
    `insert into unified_sales (
        platform, source_order_id, line_key, product_name, quantity, price, tax, shipping, total, city, order_date, currency,
        order_status, business_type, shipping_state, quantity_shipped, line_note,
        buyer_gstin, seller_sku, asin, igst, cgst, sgst, utgst, cess, tax_rate_pct, taxable_value, invoice_number
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
      on conflict (platform, line_key) do update set
        source_order_id = excluded.source_order_id,
        product_name = excluded.product_name,
        quantity = excluded.quantity,
        price = excluded.price,
        tax = excluded.tax,
        shipping = excluded.shipping,
        total = excluded.total,
        city = excluded.city,
        order_date = excluded.order_date,
        currency = excluded.currency,
        order_status = excluded.order_status,
        business_type = excluded.business_type,
        shipping_state = excluded.shipping_state,
        quantity_shipped = excluded.quantity_shipped,
        line_note = excluded.line_note,
        buyer_gstin = excluded.buyer_gstin,
        seller_sku = excluded.seller_sku,
        asin = excluded.asin,
        igst = excluded.igst,
        cgst = excluded.cgst,
        sgst = excluded.sgst,
        utgst = excluded.utgst,
        cess = excluded.cess,
        tax_rate_pct = excluded.tax_rate_pct,
        taxable_value = excluded.taxable_value,
        invoice_number = excluded.invoice_number,
        updated_at = now()`,
    [
      row.platform,
      row.source_order_id,
      row.line_key,
      row.product_name,
      row.quantity,
      row.price,
      row.tax,
      row.shipping,
      row.total,
      row.city,
      row.order_date,
      currency,
      order_status,
      business_type,
      shipping_state,
      quantity_shipped,
      line_note,
      buyer_gstin,
      seller_sku,
      asin,
      igst,
      cgst,
      sgst,
      utgst,
      cess,
      tax_rate_pct,
      taxable_value,
      invoice_number,
    ]
  )
}
