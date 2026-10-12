import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { runUnifiedSalesSync, SyncPlatform } from '../services/runUnifiedSalesSync'
import { getSellerStateCode } from '../services/gstUtils'

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

/**
 * Lines that count as sales: not cancelled/void, and credit notes always count (as negatives).
 * Website "refunded" orders have no credit note row, so they're excluded here instead.
 */
const COUNTABLE = `(doc_type = 'credit_note' or coalesce(lower(order_status), '') not in ('canceled', 'cancelled', 'void', 'refunded'))`
/** Credit notes reduce totals */
const SIGN = `(case when doc_type = 'credit_note' then -1 else 1 end)`
/** GST period is decided by the invoice / credit note date, falling back to the order date */
const DOC_DATE = `coalesce(invoice_date, order_date)`

const LINE_COLUMNS = `id, platform, source_order_id, line_key, product_name, quantity, price, tax, shipping, total, city,
  order_date, currency, order_status, business_type, shipping_state, ship_state_code, quantity_shipped, line_note,
  buyer_gstin, buyer_name, seller_sku, asin, hsn_code, igst, cgst, sgst, utgst, cess, tax_rate_pct, taxable_value,
  invoice_number, invoice_date, doc_type, tax_source`

export async function getCombinedSales(pool: Pool, req: Request, res: Response) {
  try {
    const {
      platform,
      from,
      to,
      q,
      limit = '100',
      offset = '0',
    } = req.query as Record<string, string>

    const lim = Math.min(500, Math.max(1, parseInt(limit, 10) || 100))
    const off = Math.max(0, parseInt(offset, 10) || 0)
    const toD = parseDate(to, new Date())
    const fromD = parseDate(from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))

    const params: any[] = [fromD, toD]
    let where = `where order_date >= $1 and order_date <= $2`
    let idx = 3
    if (platform && ['website', 'amazon', 'flipkart'].includes(platform)) {
      params.push(platform)
      where += ` and platform = $${idx++}`
    }
    if (q && String(q).trim()) {
      const qq = `%${String(q).trim()}%`
      params.push(qq)
      const a = idx++
      where += ` and (source_order_id ilike $${a} or product_name ilike $${a} or coalesce(invoice_number,'') ilike $${a}
                 or coalesce(seller_sku,'') ilike $${a})`
    }

    const { rows: countRows } = await pool.query(
      `select count(*)::int as c from unified_sales ${where}`,
      [...params]
    )

    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2
    const { rows } = await pool.query(
      `select ${LINE_COLUMNS}, source_order_id as line_order_id
       from unified_sales
       ${where}
       order by order_date desc, id desc
       limit $${limitIdx} offset $${offsetIdx}`,
      [...params, lim, off]
    )

    sendSuccess(res, { rows, total: countRows[0]?.c ?? 0, limit: lim, offset: off })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch unified sales', err)
  }
}

export async function getSalesByPlatform(pool: Pool, req: Request, res: Response) {
  try {
    const { platform } = req.params as any
    if (!['website', 'amazon', 'flipkart'].includes(platform)) {
      return sendError(res, 400, 'Invalid platform')
    }
    const { from, to } = req.query as any
    const toD = parseDate(to, new Date())
    const fromD = parseDate(from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))

    const { rows } = await pool.query(
      `select ${LINE_COLUMNS} from unified_sales
       where platform = $1 and order_date >= $2 and order_date <= $3
       order by order_date desc, id desc
       limit 500`,
      [platform, fromD, toD]
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch platform sales', err)
  }
}

export async function getSalesSummary(pool: Pool, req: Request, res: Response) {
  try {
    const { from, to } = req.query as any
    const toD = parseDate(to, new Date())
    const fromD = parseDate(from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    const inRange = `order_date >= $1 and order_date <= $2 and ${COUNTABLE}`

    const { rows: byPlatform } = await pool.query(
      `select
         platform,
         count(*)::int as line_count,
         coalesce(sum(${SIGN} * quantity), 0)::bigint as units,
         coalesce(sum(${SIGN} * total), 0)::numeric as revenue,
         coalesce(sum(${SIGN} * tax), 0)::numeric as tax_total,
         coalesce(sum(${SIGN} * shipping), 0)::numeric as shipping_total,
         coalesce(sum(${SIGN} * coalesce(taxable_value, total - tax)), 0)::numeric as net_sales
       from unified_sales
       where ${inRange}
       group by platform
       order by platform`,
      [fromD, toD]
    )

    const { rows: orderCounts } = await pool.query(
      `select platform, count(distinct source_order_id)::int as orders
       from unified_sales
       where ${inRange} and doc_type = 'invoice'
       group by platform`,
      [fromD, toD]
    )

    const { rows: daily } = await pool.query(
      `select
         (date_trunc('day', order_date at time zone 'Asia/Kolkata'))::date as day,
         platform,
         coalesce(sum(${SIGN} * total), 0)::numeric as revenue
       from unified_sales
       where ${inRange}
       group by 1, platform
       order by 1 asc`,
      [fromD, toD]
    )

    const { rows: topProducts } = await pool.query(
      `select product_name, coalesce(sum(${SIGN} * quantity), 0)::bigint as units,
              coalesce(sum(${SIGN} * total), 0)::numeric as revenue
       from unified_sales
       where ${inRange}
       group by product_name
       order by revenue desc nulls last
       limit 15`,
      [fromD, toD]
    )

    const { rows: totals } = await pool.query(
      `select
        coalesce(sum(${SIGN} * total), 0)::numeric as revenue,
        coalesce(sum(${SIGN} * tax), 0)::numeric as tax,
        coalesce(sum(${SIGN} * shipping), 0)::numeric as shipping,
        coalesce(sum(${SIGN} * coalesce(taxable_value, total - tax)), 0)::numeric as net_sales_ex_tax,
        (select count(*)::int from (
          select distinct platform, source_order_id from unified_sales
          where ${inRange} and doc_type = 'invoice'
        ) x) as orders_estimate
      from unified_sales
      where ${inRange}`,
      [fromD, toD]
    )

    const platforms = ['website', 'amazon', 'flipkart'] as const
    const byPlatformMap = new Map((byPlatform as { platform: string }[]).map((r) => [r.platform, r]))
    const mergedByPlatform = platforms.map((p) => {
      const r = byPlatformMap.get(p) as Record<string, unknown> | undefined
      if (r) return r
      return {
        platform: p,
        line_count: 0,
        units: '0',
        revenue: '0',
        tax_total: '0',
        shipping_total: '0',
        net_sales: '0',
      }
    })

    const orderCountMap = new Map((orderCounts as { platform: string; orders: number }[]).map((r) => [r.platform, r.orders]))
    const mergedOrderCounts = platforms.map((p) => ({
      platform: p,
      orders: orderCountMap.get(p) ?? 0,
    }))

    const { rows: syncLogRows } = await pool.query<{
      platform: string
      status: string
      message: string | null
      rows_synced: number
      at: Date
    }>(
      `select distinct on (platform)
         platform,
         status,
         message,
         rows_synced,
         coalesce(finished_at, started_at) as at
       from sales_sync_logs
       where platform = any($1::text[])
       order by platform, coalesce(finished_at, started_at) desc nulls last, id desc`,
      [['website', 'amazon', 'flipkart']]
    )
    const syncMap = new Map(syncLogRows.map((r) => [r.platform, r]))
    const syncStatus = platforms.map((platform) => {
      const r = syncMap.get(platform)
      if (!r) {
        return {
          platform,
          status: null as string | null,
          message: null as string | null,
          rows_synced: 0,
          at: null as string | null,
        }
      }
      return {
        platform: r.platform,
        status: r.status,
        message: r.message,
        rows_synced: r.rows_synced,
        at: r.at ? new Date(r.at).toISOString() : null,
      }
    })

    sendSuccess(res, {
      range: { from: fromD.toISOString(), to: toD.toISOString() },
      byPlatform: mergedByPlatform,
      orderCounts: mergedOrderCounts,
      daily,
      topProducts,
      syncStatus,
      totals: totals[0],
    })
  } catch (err) {
    sendError(res, 500, 'Failed to build sales summary', err)
  }
}

export async function getSyncLogs(pool: Pool, req: Request, res: Response) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '40'), 10) || 40))
    const { rows } = await pool.query(
      `select * from sales_sync_logs order by started_at desc nulls last, id desc limit $1`,
      [limit]
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch sync logs', err)
  }
}

export async function postManualSync(pool: Pool, req: Request, res: Response) {
  try {
    const body = req.body || {}
    let platforms: SyncPlatform[] = ['website', 'amazon', 'flipkart']
    if (Array.isArray(body.platforms) && body.platforms.length > 0) {
      platforms = body.platforms.filter((p: string) => ['website', 'amazon', 'flipkart'].includes(p))
    }
    const result = await runUnifiedSalesSync(pool, platforms, { force: true })
    if (result.busy) {
      return sendError(res, 409, 'A sales sync is already running — try again in a few minutes')
    }
    sendSuccess(res, { ok: true, result })
  } catch (err: any) {
    sendError(res, 500, err?.message || 'Sync failed', err)
  }
}

export async function exportUnifiedSalesCsv(pool: Pool, req: Request, res: Response) {
  try {
    const { platform, from, to } = req.query as any
    const toD = parseDate(to, new Date())
    const fromD = parseDate(from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    const params: any[] = [fromD, toD]
    let where = `where order_date >= $1 and order_date <= $2`
    if (platform && ['website', 'amazon', 'flipkart'].includes(platform)) {
      params.push(platform)
      where += ` and platform = $${params.length}`
    }

    const { rows } = await pool.query(
      `select ${LINE_COLUMNS} from unified_sales ${where}
       order by order_date desc, id desc
       limit 50000`,
      params
    )

    const headers = [
      'platform', 'doc_type', 'order_id', 'order_date', 'invoice_number', 'invoice_date', 'product_name', 'seller_sku',
      'asin', 'hsn_code', 'quantity', 'price_ex_gst', 'taxable_value', 'tax_rate_pct', 'igst', 'cgst', 'sgst', 'utgst',
      'cess', 'tax', 'shipping_ex_gst', 'total', 'city', 'shipping_state', 'ship_state_code', 'currency', 'order_status',
      'business_type', 'buyer_gstin', 'buyer_name', 'quantity_shipped', 'tax_source', 'line_note',
    ]
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v)
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.join(',')]
    for (const r of rows as any[]) {
      lines.push(
        [
          r.platform, r.doc_type, r.source_order_id, r.order_date, r.invoice_number, r.invoice_date, r.product_name,
          r.seller_sku, r.asin, r.hsn_code, r.quantity, r.price, r.taxable_value, r.tax_rate_pct, r.igst, r.cgst, r.sgst,
          r.utgst, r.cess, r.tax, r.shipping, r.total, r.city, r.shipping_state, r.ship_state_code, r.currency,
          r.order_status, r.business_type, r.buyer_gstin, r.buyer_name, r.quantity_shipped, r.tax_source, r.line_note,
        ]
          .map(esc)
          .join(',')
      )
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="unified-sales-export.csv"')
    res.send(lines.join('\n'))
  } catch (err) {
    sendError(res, 500, 'Failed to export CSV', err)
  }
}

/** Month bounds in IST (GST periods are Indian calendar months). */
function istMonthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number)
  const IST_MS = 5.5 * 60 * 60 * 1000
  const start = new Date(Date.UTC(y, m - 1, 1) - IST_MS)
  const end = new Date(Date.UTC(y, m, 1) - IST_MS - 1)
  return { start, end }
}

export async function getGstReport(pool: Pool, req: Request, res: Response) {
  try {
    const { month } = req.query as any
    if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
      return sendError(res, 400, 'month is required (YYYY-MM)')
    }
    const { start, end } = istMonthRange(String(month))
    const where = `${DOC_DATE} >= $1 and ${DOC_DATE} <= $2 and ${COUNTABLE}`

    const { rows: byPlatform } = await pool.query(
      `select
         platform,
         coalesce(sum(${SIGN} * coalesce(taxable_value, total - tax)), 0)::numeric as taxable_turnover,
         coalesce(sum(${SIGN} * tax), 0)::numeric as tax_collected,
         coalesce(sum(${SIGN} * coalesce(igst, 0)), 0)::numeric as igst,
         coalesce(sum(${SIGN} * coalesce(cgst, 0)), 0)::numeric as cgst,
         coalesce(sum(${SIGN} * (coalesce(sgst, 0) + coalesce(utgst, 0))), 0)::numeric as sgst_utgst,
         coalesce(sum(${SIGN} * coalesce(cess, 0)), 0)::numeric as cess,
         coalesce(sum(case when doc_type = 'credit_note' then total else 0 end), 0)::numeric as credit_notes_value,
         count(*) filter (where igst is null and cgst is null and tax > 0)::int as lines_without_gst_split
       from unified_sales
       where ${where}
       group by platform
       order by platform`,
      [start, end]
    )

    // GSTR-1 style: B2B vs B2C, per rate (Table 4 / 7) and intra vs inter-state
    const { rows: byRate } = await pool.query(
      `select
         platform,
         case when buyer_gstin is not null then 'B2B' else 'B2C' end as supply_type,
         case when coalesce(igst, 0) > 0 then 'Inter-state' when coalesce(cgst, 0) > 0 then 'Intra-state' else 'Unknown' end as region,
         tax_rate_pct,
         coalesce(sum(${SIGN} * coalesce(taxable_value, total - tax)), 0)::numeric as taxable_value,
         coalesce(sum(${SIGN} * coalesce(igst, 0)), 0)::numeric as igst,
         coalesce(sum(${SIGN} * coalesce(cgst, 0)), 0)::numeric as cgst,
         coalesce(sum(${SIGN} * (coalesce(sgst, 0) + coalesce(utgst, 0))), 0)::numeric as sgst_utgst,
         coalesce(sum(${SIGN} * coalesce(cess, 0)), 0)::numeric as cess
       from unified_sales
       where ${where}
       group by 1, 2, 3, 4
       order by 1, 2, 3, 4`,
      [start, end]
    )

    // HSN summary (GSTR-1 Table 12)
    const { rows: byHsn } = await pool.query(
      `select
         coalesce(hsn_code, '(missing)') as hsn_code,
         tax_rate_pct,
         coalesce(sum(${SIGN} * quantity), 0)::bigint as quantity,
         coalesce(sum(${SIGN} * coalesce(taxable_value, total - tax)), 0)::numeric as taxable_value,
         coalesce(sum(${SIGN} * tax), 0)::numeric as tax
       from unified_sales
       where ${where}
       group by 1, 2
       order by 1, 2`,
      [start, end]
    )

    sendSuccess(res, {
      month,
      range: { from: start.toISOString(), to: end.toISOString() },
      byPlatform,
      byRate,
      byHsn,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to build GST report', err)
  }
}

/** Statuses that mean the goods have been invoiced/shipped (safe to book as a sale) */
const INVOICED_STATUSES = [
  'shipped', 'delivered', 'partiallyshipped', 'invoiceunconfirmed', 'pickup_complete', 'complete', 'completed',
  'ready_to_dispatch', 'dispatched', 'fulfilled', 'out_for_delivery', 'in_transit',
]

function envName(key: string, fallback: string): string {
  return (process.env[key] || '').trim() || fallback
}

/**
 * Rows for BUSY "Import Vouchers from Excel" (Sales / Sales Return). One row per item; header fields repeat on
 * every row so BUSY groups consecutive rows with the same Vch/Bill No into one voucher. The admin panel writes
 * these into an .xls workbook (Sales, Sales Return, Needs Review, Read Me).
 *
 * Names that must match BUSY masters are configurable:
 * BUSY_SERIES, BUSY_SALE_TYPE_LOCAL / BUSY_SALE_TYPE_CENTRAL, BUSY_MATERIAL_CENTRE, BUSY_UNIT,
 * BUSY_PARTY_WEBSITE / BUSY_PARTY_AMAZON / BUSY_PARTY_FLIPKART (B2C cash/marketplace party ledgers).
 */
export async function getBusyExport(pool: Pool, req: Request, res: Response) {
  try {
    const { platform, from, to } = req.query as any
    const toD = parseDate(to, new Date())
    const fromD = parseDate(from, new Date(Date.now() - 31 * 24 * 60 * 60 * 1000))
    const params: any[] = [fromD, toD]
    let where = `${DOC_DATE} >= $1 and ${DOC_DATE} <= $2 and ${COUNTABLE}`
    if (platform && ['website', 'amazon', 'flipkart'].includes(platform)) {
      params.push(platform)
      where += ` and platform = $${params.length}`
    }

    const { rows } = await pool.query(
      `select ${LINE_COLUMNS},
         to_char(${DOC_DATE} at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as doc_date_ist
       from unified_sales
       where ${where}
       order by platform, ${DOC_DATE}, coalesce(invoice_number, source_order_id), id
       limit 50000`,
      params
    )

    const sellerState = await getSellerStateCode(pool)
    const cfg = {
      series: envName('BUSY_SERIES', 'Main'),
      saleTypeLocal: envName('BUSY_SALE_TYPE_LOCAL', 'L/GST-ItemWise'),
      saleTypeCentral: envName('BUSY_SALE_TYPE_CENTRAL', 'I/GST-ItemWise'),
      materialCentre: envName('BUSY_MATERIAL_CENTRE', 'Main Store'),
      unit: envName('BUSY_UNIT', 'Pcs'),
      party: {
        website: envName('BUSY_PARTY_WEBSITE', 'Website Sales (B2C)'),
        amazon: envName('BUSY_PARTY_AMAZON', 'Amazon Sales (B2C)'),
        flipkart: envName('BUSY_PARTY_FLIPKART', 'Flipkart Sales (B2C)'),
      } as Record<string, string>,
    }
    const platformLabel: Record<string, string> = { website: 'Website', amazon: 'Amazon', flipkart: 'Flipkart' }

    const sales: Record<string, unknown>[] = []
    const returns: Record<string, unknown>[] = []
    const review: Record<string, unknown>[] = []

    for (const r of rows as any[]) {
      const issues: string[] = []
      const isCn = r.doc_type === 'credit_note'
      const status = String(r.order_status || '').toLowerCase()
      if (!isCn && !r.invoice_number && !INVOICED_STATUSES.includes(status)) {
        issues.push(`not invoiced yet (status ${r.order_status || 'unknown'})`)
      } else if (r.platform === 'amazon' && !r.invoice_number) {
        // Amazon issues the tax invoice; GSTR-1 must carry its number, not the order id
        issues.push('Amazon invoice number missing (GST MTR report not applied yet — see Amazon sync log)')
      }
      if (r.tax_rate_pct == null) issues.push('GST rate unknown')
      if (r.igst == null && r.cgst == null && Number(r.tax) > 0) issues.push('ship-to state unknown (IGST vs CGST/SGST)')
      if (!(Number(r.quantity) > 0)) issues.push('quantity is 0')
      if (!(Number(r.taxable_value ?? r.total) > 0)) issues.push('amount is 0')
      if (!r.hsn_code) issues.push('HSN missing')

      const isInter = Number(r.igst) > 0 || (r.ship_state_code && r.ship_state_code !== sellerState)
      const b2b = !!r.buyer_gstin
      const party = b2b
        ? r.buyer_name || `${platformLabel[r.platform]} B2B ${r.buyer_gstin}`
        : cfg.party[r.platform] || `${platformLabel[r.platform]} Sales`
      const taxable = Number(r.taxable_value ?? Number(r.total) - Number(r.tax))
      const qty = Number(r.quantity) || 0

      const row = {
        Series: cfg.series,
        Date: r.doc_date_ist,
        'Vch/Bill No': r.invoice_number || r.source_order_id,
        'Order No': r.source_order_id,
        'Sale Type': isInter ? cfg.saleTypeCentral : cfg.saleTypeLocal,
        'Party Name': party,
        'Party GSTIN': r.buyer_gstin || '',
        'Place of Supply': r.shipping_state || '',
        'State Code': r.ship_state_code || '',
        'Material Centre': cfg.materialCentre,
        'Item Name': r.product_name,
        'Item Code (SKU)': r.seller_sku || '',
        HSN: r.hsn_code || '',
        Qty: qty,
        Unit: cfg.unit,
        'Price (ex-GST)': qty > 0 ? Math.round((taxable / qty) * 100) / 100 : taxable,
        'Amount (Taxable)': taxable,
        'GST Rate %': r.tax_rate_pct != null ? Number(r.tax_rate_pct) : '',
        IGST: Number(r.igst) || 0,
        CGST: Number(r.cgst) || 0,
        'SGST/UTGST': (Number(r.sgst) || 0) + (Number(r.utgst) || 0),
        Cess: Number(r.cess) || 0,
        'Total Tax': Number(r.tax) || 0,
        'Invoice Value': Number(r.total) || 0,
        Narration: [
          `${platformLabel[r.platform]} ${isCn ? 'credit note' : 'order'} ${r.source_order_id}`,
          b2b ? 'B2B' : 'B2C',
          r.line_note || '',
        ]
          .filter(Boolean)
          .join(' · ')
          .slice(0, 250),
        Platform: platformLabel[r.platform],
      }

      if (issues.length) review.push({ Issue: issues.join('; '), 'Doc Type': isCn ? 'Credit Note' : 'Invoice', ...row })
      else if (isCn) returns.push(row)
      else sales.push(row)
    }

    sendSuccess(res, {
      range: { from: fromD.toISOString(), to: toD.toISOString() },
      sellerStateCode: sellerState,
      config: cfg,
      sales,
      returns,
      review,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to build BUSY export', err)
  }
}
