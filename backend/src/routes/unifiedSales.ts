import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { runUnifiedSalesSync, SyncPlatform } from '../services/runUnifiedSalesSync'

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

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
      params.push(qq, qq)
      const a = idx++
      const b = idx++
      where += ` and (source_order_id ilike $${a} or product_name ilike $${b})`
    }

    const { rows: countRows } = await pool.query(
      `select count(*)::int as c from unified_sales ${where}`,
      [...params]
    )

    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2
    const { rows } = await pool.query(
      `select id, platform, source_order_id as line_order_id, product_name, quantity, price, tax, shipping, total, city, order_date, currency
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
      `select * from unified_sales
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

    const { rows: byPlatform } = await pool.query(
      `select
         platform,
         count(*)::int as line_count,
         coalesce(sum(quantity), 0)::bigint as units,
         coalesce(sum(total), 0)::numeric as revenue,
         coalesce(sum(tax), 0)::numeric as tax_total,
         coalesce(sum(shipping), 0)::numeric as shipping_total
       from unified_sales
       where order_date >= $1 and order_date <= $2
       group by platform
       order by platform`,
      [fromD, toD]
    )

    const { rows: orderCounts } = await pool.query(
      `select platform, count(distinct source_order_id)::int as orders
       from unified_sales
       where order_date >= $1 and order_date <= $2
       group by platform`,
      [fromD, toD]
    )

    const { rows: daily } = await pool.query(
      `select
         (date_trunc('day', order_date))::timestamptz as day,
         platform,
         coalesce(sum(total), 0)::numeric as revenue
       from unified_sales
       where order_date >= $1 and order_date <= $2
       group by 1, platform
       order by 1 asc`,
      [fromD, toD]
    )

    const { rows: topProducts } = await pool.query(
      `select product_name, coalesce(sum(quantity), 0)::bigint as units, coalesce(sum(total), 0)::numeric as revenue
       from unified_sales
       where order_date >= $1 and order_date <= $2
       group by product_name
       order by revenue desc nulls last
       limit 15`,
      [fromD, toD]
    )

    const { rows: totals } = await pool.query(
      `select
        coalesce(sum(total), 0)::numeric as revenue,
        coalesce(sum(tax), 0)::numeric as tax,
        coalesce(sum(shipping), 0)::numeric as shipping,
        (select count(*)::int from (
          select distinct platform, source_order_id from unified_sales
          where order_date >= $3 and order_date <= $4
        ) x) as orders_estimate
      from unified_sales
      where order_date >= $1 and order_date <= $2`,
      [fromD, toD, fromD, toD]
    )

    const profitApprox =
      Number(totals[0]?.revenue ?? 0) -
      Number(totals[0]?.tax ?? 0) -
      Number(totals[0]?.shipping ?? 0)

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
      totals: {
        ...totals[0],
        profit_ex_tax_and_shipping: Math.round(profitApprox * 100) / 100,
      },
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
    const result = await runUnifiedSalesSync(pool, platforms)
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
      `select platform, source_order_id, product_name, quantity, price, tax, shipping, total, city, order_date, currency
       from unified_sales ${where}
       order by order_date desc, id desc
       limit 50000`,
      params
    )

    const headers = [
      'platform',
      'order_id',
      'product_name',
      'quantity',
      'price',
      'tax',
      'shipping',
      'total',
      'city',
      'order_date',
      'currency',
    ]
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v)
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.join(',')]
    for (const r of rows as any[]) {
      lines.push(
        [
          r.platform,
          r.source_order_id,
          r.product_name,
          r.quantity,
          r.price,
          r.tax,
          r.shipping,
          r.total,
          r.city,
          r.order_date ? new Date(r.order_date).toISOString() : '',
          r.currency,
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

export async function getGstReport(pool: Pool, req: Request, res: Response) {
  try {
    const { month } = req.query as any
    if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
      return sendError(res, 400, 'month is required (YYYY-MM)')
    }
    const [y, m] = String(month).split('-').map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))

    const { rows } = await pool.query(
      `select
         platform,
         coalesce(sum(total), 0)::numeric as taxable_turnover,
         coalesce(sum(tax), 0)::numeric as tax_collected
       from unified_sales
       where order_date >= $1 and order_date <= $2
       group by platform
       order by platform`,
      [start, end]
    )

    sendSuccess(res, { month, range: { from: start.toISOString(), to: end.toISOString() }, byPlatform: rows })
  } catch (err) {
    sendError(res, 500, 'Failed to build GST report', err)
  }
}
