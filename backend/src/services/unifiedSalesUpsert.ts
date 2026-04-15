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
  /** Amazon OrderStatus (e.g. Shipped, Canceled) — optional */
  order_status?: string | null
  /** Amazon: B2B vs B2C from IsBusinessOrder — optional */
  business_type?: string | null
  /** Ship-to state/region (Amazon: StateOrRegion when PII roles allow) — optional */
  shipping_state?: string | null
  /** Amazon OrderItem QuantityShipped — optional */
  quantity_shipped?: number | null
  /** Item-level notes (e.g. buyer cancel request) — optional */
  line_note?: string | null
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

  await pool.query(
    `insert into unified_sales (
        platform, source_order_id, line_key, product_name, quantity, price, tax, shipping, total, city, order_date, currency,
        order_status, business_type, shipping_state, quantity_shipped, line_note
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
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
    ]
  )
}
