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
}

/**
 * Insert or update a unified_sales row by (platform, line_key).
 */
export async function upsertUnifiedSaleLine(pool: Pool, row: UnifiedLineInput): Promise<void> {
  const currency = row.currency || 'INR'
  await pool.query(
    `insert into unified_sales (
        platform, source_order_id, line_key, product_name, quantity, price, tax, shipping, total, city, order_date, currency
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
    ]
  )
}
