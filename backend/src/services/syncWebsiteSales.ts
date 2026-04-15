import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getMaxUnifiedOrderDate, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'

function parseItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      return Array.isArray(j) ? j : []
    } catch {
      return []
    }
  }
  return []
}

function cityFromAddress(addr: unknown): string {
  if (!addr || typeof addr !== 'object') return ''
  const a = addr as Record<string, unknown>
  const c = a.city || a.town || a.district
  const s = a.state || a.region
  return [c, s].filter(Boolean).join(', ')
}

const EXCLUDED = new Set(['cancelled', 'refunded', 'void', 'canceled'])

/**
 * Upserts website rows in `unified_sales` from the `orders` table.
 * - First run (no website rows): imports orders from the last **3 years**.
 * - Later runs: **incremental** — only orders with `created_at` after the latest stored line (minus overlap), so each sync does not rebuild the whole history.
 * - `WEBSITE_UNIFIED_SALES_FULL_SYNC=1`: deletes all website unified rows and re-imports the last 3 years (use after bulk edits/cancellations).
 */
export async function syncWebsiteSales(pool: Pool): Promise<{ rows: number }> {
  const full = process.env.WEBSITE_UNIFIED_SALES_FULL_SYNC === '1'
  if (full) {
    await pool.query(`delete from unified_sales where platform = 'website'`)
  }

  const maxStored = await getMaxUnifiedOrderDate(pool, 'website')
  const useIncremental =
    !full && maxStored != null && maxStored.getTime() < Date.now() - 60 * 1000

  const cursorIso = useIncremental
    ? new Date(maxStored!.getTime() - UNIFIED_SALES_INCREMENTAL_OVERLAP_MS).toISOString()
    : null

  const { rows: orders } = await pool.query(
    `
    select id, order_number, items, subtotal, tax, shipping, total, shipping_address, created_at, status
    from orders
    where
      case
        when $1::timestamptz is null then created_at >= now() - interval '3 years'
        else created_at >= $1::timestamptz
      end
    order by id asc
    `,
    [cursorIso]
  )

  let inserted = 0
  for (const o of orders) {
    const st = String(o.status || '').toLowerCase()
    if (EXCLUDED.has(st)) continue

    const items = parseItems(o.items)
    if (items.length === 0) continue

    const orderNumber = String(o.order_number || o.id)
    const subtotal = Number(o.subtotal) || 0
    const taxTotal = Number(o.tax) || 0
    const shipTotal = Number(o.shipping) || 0
    const created = o.created_at ? new Date(o.created_at) : new Date()
    const city = cityFromAddress(o.shipping_address)

    const lineSubs = items.map((it: any) => {
      const qty = Math.max(1, Math.floor(Number(it.qty ?? it.quantity ?? 1)))
      const unit = parseFloat(String(it.price ?? it.unit_price ?? 0)) || 0
      return { it, qty, unit, lineSub: unit * qty }
    })

    const sumLines = lineSubs.reduce((s, x) => s + x.lineSub, 0) || 1

    for (let idx = 0; idx < lineSubs.length; idx++) {
      const { it, qty, unit, lineSub } = lineSubs[idx]
      const share = lineSub / sumLines
      const lineTax = taxTotal * share
      const lineShip = shipTotal * share
      const lineTotal = lineSub + lineTax + lineShip
      const name =
        String(it.title || it.name || it.product_name || it.slug || 'Product').slice(0, 500)
      const lineKey = `website:${orderNumber}:${idx}`

      await upsertUnifiedSaleLine(pool, {
        platform: 'website',
        source_order_id: orderNumber,
        line_key: lineKey,
        product_name: name,
        quantity: qty,
        price: unit,
        tax: Math.round(lineTax * 100) / 100,
        shipping: Math.round(lineShip * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
        city: city || null,
        order_date: created,
        currency: 'INR',
      })
      inserted += 1
    }
  }

  return { rows: inserted }
}
