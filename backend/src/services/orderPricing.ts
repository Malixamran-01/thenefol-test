import { Pool } from 'pg'
import { lineQty, normalizeOrderItems } from './inventoryBatchService'

/**
 * ORDER_PRICE_CHECK controls server-side price validation on customer orders:
 *  - unset / "enforce" (default): reject orders priced below the catalogue
 *  - "log": only log mismatches (emergency switch if a legitimate flow is being rejected)
 *  - "off": skip the check
 */
export function orderPriceCheckMode(): 'enforce' | 'log' | 'off' {
  const v = String(process.env.ORDER_PRICE_CHECK || '').trim().toLowerCase()
  if (v === 'off' || v === '0' || v === 'false') return 'off'
  if (v === 'log') return 'log'
  return 'enforce'
}

function parsePrice(value: unknown): number {
  if (value === null || value === undefined) return NaN
  const n = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/** Lowest legitimate unit price for an order line (same sources as the cart), or null if the product is unknown. */
async function minimumUnitPrice(pool: Pool, line: any): Promise<number | null> {
  const pid = Number(line?.product_id ?? line?.id)
  let product: any = null
  if (Number.isInteger(pid) && pid > 0) {
    const { rows } = await pool.query('SELECT id, price, details FROM products WHERE id = $1', [pid])
    product = rows[0] || null
  }
  if (!product && typeof line?.slug === 'string' && line.slug.trim()) {
    const { rows } = await pool.query('SELECT id, price, details FROM products WHERE slug = $1 LIMIT 1', [line.slug.trim()])
    product = rows[0] || null
  }
  if (!product) return null

  const details = product.details && typeof product.details === 'object' ? product.details : {}
  const candidates: unknown[] = [details.websitePrice, product.price]

  const variantId = Number(line?.variant_id)
  if (Number.isInteger(variantId) && variantId > 0) {
    const { rows } = await pool.query('SELECT price FROM product_variants WHERE id = $1 AND product_id = $2', [variantId, product.id])
    if (rows[0]) candidates.push(rows[0].price)
  }

  const prices = candidates.map(parsePrice).filter((n) => Number.isFinite(n) && n > 0)
  return prices.length ? Math.min(...prices) : 0
}

/** Checks that the client subtotal is not below the catalogue price of the ordered items. */
export async function validateOrderItemPrices(
  pool: Pool,
  rawItems: unknown,
  clientSubtotal: number
): Promise<{ ok: true; minimumSubtotal: number } | { ok: false; message: string }> {
  const lines = normalizeOrderItems(rawItems)
  if (lines.length === 0) return { ok: false, message: 'Order has no items' }

  let minimum = 0
  for (const line of lines) {
    const qty = lineQty(line)
    if (qty <= 0) return { ok: false, message: 'Invalid item quantity' }
    const unit = await minimumUnitPrice(pool, line)
    if (unit === null) {
      return { ok: false, message: `Product not found: ${line?.title || line?.slug || line?.product_id || 'unknown'}` }
    }
    minimum += unit * qty
  }

  const minimumSubtotal = Math.round(minimum)
  if (clientSubtotal + 2 < minimumSubtotal) {
    return { ok: false, message: 'Prices have changed. Please refresh your cart and try again.' }
  }
  return { ok: true, minimumSubtotal }
}
