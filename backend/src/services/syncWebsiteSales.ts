import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getLastSyncCursor, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'
import { getSellerStateCode, normalizeIndianState, round2, snapGstRate, splitGst } from './gstUtils'

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

function addressParts(addr: unknown): { city: string | null; state: string | null } {
  let a: unknown = addr
  if (typeof a === 'string') {
    try {
      a = JSON.parse(a)
    } catch {
      return { city: null, state: null }
    }
  }
  if (!a || typeof a !== 'object') return { city: null, state: null }
  const o = a as Record<string, unknown>
  const city = String(o.city || o.town || o.district || '').trim() || null
  const state = String(o.state || o.region || '').trim() || null
  return { city, state }
}

/** Item GST % as stored by checkout (csvProduct['GST %'] or taxRate), else null */
function itemRatePct(it: any): number | null {
  const raw = it?.csvProduct?.['GST %'] ?? it?.taxRate ?? it?.gst_rate ?? it?.gstRate
  const n = parseFloat(String(raw ?? ''))
  if (!Number.isFinite(n) || n < 0) return null
  return n > 0 && n < 1 ? n * 100 : n
}

/**
 * Upserts website rows in `unified_sales` from the `orders` table.
 *
 * Website prices are GST-INCLUSIVE (see generateInvoiceHTML): grand total = item prices − discount + shipping,
 * and `orders.tax` is the GST already inside that total. So per line: total = share of `orders.total`,
 * tax = share of GST, taxable_value = total − tax.
 *
 * - First run: last 3 years. Later runs: orders whose `updated_at` moved since the last successful sync
 *   (so cancellations / refunds of old orders are picked up and their status updated).
 * - Cancelled/refunded orders are kept with their status; reports and the BUSY export exclude them.
 * - `WEBSITE_UNIFIED_SALES_FULL_SYNC=1`: deletes all website unified rows and re-imports the last 3 years.
 */
export async function syncWebsiteSales(pool: Pool): Promise<{ rows: number }> {
  const full = process.env.WEBSITE_UNIFIED_SALES_FULL_SYNC === '1'
  if (full) {
    await pool.query(`delete from unified_sales where platform = 'website'`)
  }

  const cursor = full ? null : await getLastSyncCursor(pool, 'website')
  const cursorIso = cursor ? new Date(cursor.getTime() - UNIFIED_SALES_INCREMENTAL_OVERLAP_MS).toISOString() : null
  const sellerState = await getSellerStateCode(pool)

  const { rows: orders } = await pool.query(
    `
    select id, order_number, invoice_number, items, subtotal, tax, shipping, total, shipping_address,
           created_at, status
    from orders
    where
      case
        when $1::timestamptz is null then created_at >= now() - interval '3 years'
        else coalesce(updated_at, created_at) >= $1::timestamptz
      end
    order by id asc
    `,
    [cursorIso]
  )

  let inserted = 0
  for (const o of orders) {
    const items = parseItems(o.items)
    if (items.length === 0) continue
    if (!o.created_at) continue

    const orderNumber = String(o.order_number || o.id)
    const invoiceNum =
      o.invoice_number != null && String(o.invoice_number).trim() !== ''
        ? String(o.invoice_number).trim().slice(0, 120)
        : null
    const orderTotal = Number(o.total) || 0
    const orderTax = Number(o.tax) || 0
    const shipTotal = Number(o.shipping) || 0
    const created = new Date(o.created_at)
    const addr = addressParts(o.shipping_address)
    const state = normalizeIndianState(addr.state)

    const lines = items.map((it: any) => {
      const qty = Math.max(1, Math.floor(Number(it.qty ?? it.quantity ?? 1)))
      const unit = parseFloat(String(it.price ?? it.unit_price ?? 0)) || 0
      return { it, qty, lineGross: unit * qty, rate: itemRatePct(it) }
    })
    const sumLines = lines.reduce((s, x) => s + x.lineGross, 0)
    const allRated = lines.every((l) => l.rate != null)

    for (let idx = 0; idx < lines.length; idx++) {
      const { it, qty, lineGross, rate } = lines[idx]
      const share = sumLines > 0 ? lineGross / sumLines : 1 / lines.length
      const total = round2(orderTotal * share)
      // Per-item rate when every item has one (mixed-rate carts), else the order's GST pro-rata
      const tax = allRated && rate != null ? round2(total - total / (1 + rate / 100)) : round2(orderTax * share)
      const taxable = round2(total - tax)
      const shipShare = round2(shipTotal * share)
      const ratePct = rate != null ? snapGstRate(rate) : taxable > 0 && tax > 0 ? snapGstRate((tax / taxable) * 100) : null
      const split = splitGst(tax, state.code, sellerState)
      const name = String(it.title || it.name || it.product_name || it.slug || 'Product').slice(0, 500)
      const hsn = it?.csvProduct?.['HSN Code'] || it?.hsn || it?.hsn_code || null
      const sku = it?.csvProduct?.['SKU'] || it?.sku || it?.code || null

      await upsertUnifiedSaleLine(pool, {
        platform: 'website',
        source_order_id: orderNumber,
        line_key: `website:${orderNumber}:${idx}`,
        product_name: name,
        quantity: qty,
        price: round2(taxable / qty),
        tax,
        shipping: ratePct != null ? round2(shipShare / (1 + ratePct / 100)) : shipShare,
        total,
        city: addr.city ? (state.name ? `${addr.city}, ${state.name}` : addr.city) : null,
        order_date: created,
        currency: 'INR',
        order_status: o.status ? String(o.status) : null,
        business_type: 'B2C',
        shipping_state: state.name,
        ship_state_code: state.code,
        seller_sku: sku ? String(sku).slice(0, 120) : null,
        hsn_code: hsn ? String(hsn).slice(0, 20) : null,
        igst: split ? split.igst : null,
        cgst: split ? split.cgst : null,
        sgst: split ? split.sgst : null,
        tax_rate_pct: ratePct,
        taxable_value: taxable,
        invoice_number: invoiceNum,
        invoice_date: invoiceNum ? created : null,
        doc_type: 'invoice',
        tax_source: 'website',
      })
      inserted += 1
    }
  }

  return { rows: inserted }
}
