import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'

/** India marketplace (sellercentral.amazon.in). Override with AMAZON_MARKETPLACE_ID. */
const DEFAULT_MARKETPLACE_IN = 'A21TJRUUN4KGV'

const SKIP_ORDER_STATUS = new Set(['Canceled', 'Cancelled'])

/** SP-API returns no orders older than ~2 years for most marketplaces. */
const MAX_LOOKBACK_DAYS = 730

/** Smaller windows reduce load and avoid undocumented range limits. */
const CHUNK_DAYS = 30

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SellingPartner = require('amazon-sp-api') as new (config: {
  region: string
  refresh_token: string
  credentials: {
    SELLING_PARTNER_APP_CLIENT_ID: string
    SELLING_PARTNER_APP_CLIENT_SECRET: string
  }
  options?: { auto_request_tokens?: boolean; auto_request_throttled?: boolean }
}) => { callAPI: (req: Record<string, unknown>) => Promise<any> }

function getLwaClientId(): string {
  return (
    process.env.AMAZON_LWA_CLIENT_ID ||
    process.env.LWA_CLIENT_ID ||
    process.env.SELLING_PARTNER_APP_CLIENT_ID ||
    ''
  ).trim()
}

function getLwaClientSecret(): string {
  return (
    process.env.AMAZON_LWA_CLIENT_SECRET ||
    process.env.LWA_CLIENT_SECRET ||
    process.env.SELLING_PARTNER_APP_CLIENT_SECRET ||
    ''
  ).trim()
}

function lookbackDays(): number {
  const raw = process.env.AMAZON_UNIFIED_SALES_LOOKBACK_DAYS || process.env.AMAZON_ORDERS_LOOKBACK_DAYS || '365'
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return 365
  return Math.min(MAX_LOOKBACK_DAYS, Math.max(1, n))
}

async function resolveRefreshToken(pool: Pool): Promise<string | undefined> {
  const debug = process.env.AMAZON_SP_API_DEBUG === '1' || process.env.AMAZON_SP_API_DEBUG === 'true'
  const env = process.env.AMAZON_SP_API_REFRESH_TOKEN?.trim()
  if (env) {
    if (debug) {
      console.log('[amazonSpApiSync] refresh_token source: AMAZON_SP_API_REFRESH_TOKEN env (length:', env.length, ')')
    }
    return env
  }
  const { rows } = await pool.query<{ credentials: Record<string, unknown> | null }>(
    `select credentials from marketplace_accounts
     where channel = 'amazon' and coalesce(is_active, true) = true
     order by id asc
     limit 1`
  )
  const rt = rows[0]?.credentials?.refresh_token
  const hasRt = rt != null && String(rt).length > 0
  if (debug) {
    console.log(
      '[amazonSpApiSync] refresh_token source: marketplace_accounts | rows:',
      rows.length,
      '| credentials.refresh_token present:',
      hasRt
    )
  }
  return hasRt ? String(rt) : undefined
}

function moneyAmount(m: unknown): number {
  if (!m || typeof m !== 'object') return 0
  const n = Number((m as { Amount?: string }).Amount)
  return Number.isFinite(n) ? n : 0
}

export type AmazonSyncResult = { rows: number; skipped: boolean; logMessage?: string }

/**
 * Upserts `unified_sales` rows for platform `amazon` from Orders API.
 * Fetches orders in time windows (default lookback: AMAZON_UNIFIED_SALES_LOOKBACK_DAYS, max 730).
 */
export async function syncAmazonUnifiedSales(pool: Pool): Promise<AmazonSyncResult> {
  const refresh_token = await resolveRefreshToken(pool)
  const clientId = getLwaClientId()
  const clientSecret = getLwaClientSecret()

  if (!refresh_token || !clientId || !clientSecret) {
    return {
      rows: 0,
      skipped: true,
      logMessage: 'Missing refresh token or LWA client (set AMAZON_SP_API_REFRESH_TOKEN or complete OAuth to marketplace_accounts)',
    }
  }

  if (process.env.AMAZON_SP_API_ENABLED === '0') {
    return { rows: 0, skipped: true, logMessage: 'Amazon SP-API sync disabled (AMAZON_SP_API_ENABLED=0)' }
  }

  const region = (process.env.AMAZON_SP_API_REGION || 'eu').trim()
  const marketplaceId = (process.env.AMAZON_MARKETPLACE_ID || DEFAULT_MARKETPLACE_IN).trim()
  const days = lookbackDays()

  const sp = new SellingPartner({
    region,
    refresh_token,
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: clientId,
      SELLING_PARTNER_APP_CLIENT_SECRET: clientSecret,
    },
    options: {
      auto_request_tokens: true,
      auto_request_throttled: true,
    },
  })

  const MS_DAY = 24 * 60 * 60 * 1000
  const lookbackMs = Math.min(days * MS_DAY, MAX_LOOKBACK_DAYS * MS_DAY)
  const minTime = Date.now() - lookbackMs
  const chunkMs = CHUNK_DAYS * MS_DAY

  let inserted = 0
  /** Walk backwards from “now” in chunks so we cover the full lookback window. */
  let chunkEnd = Date.now() - 2 * 60 * 1000

  while (chunkEnd > minTime) {
    const chunkStart = Math.max(chunkEnd - chunkMs, minTime)
    const createdAfter = new Date(chunkStart).toISOString()
    const createdBefore = new Date(chunkEnd).toISOString()

    let ordersNext: string | undefined
    do {
      const ordersRes = await sp.callAPI({
        operation: 'getOrders',
        endpoint: 'orders',
        query: {
          MarketplaceIds: [marketplaceId],
          CreatedAfter: createdAfter,
          CreatedBefore: createdBefore,
          ...(ordersNext ? { NextToken: ordersNext } : {}),
        },
      })

      const orders = (ordersRes.Orders || []) as Record<string, unknown>[]
      ordersNext = ordersRes.NextToken as string | undefined

      for (const order of orders) {
        const orderId = String(order.AmazonOrderId || '')
        if (!orderId) continue
        const st = String(order.OrderStatus || '')
        if (SKIP_ORDER_STATUS.has(st)) continue

        const purchaseDate = order.PurchaseDate ? new Date(String(order.PurchaseDate)) : new Date()
        let itemsNext: string | undefined
        do {
          const itemsRes = await sp.callAPI({
            operation: 'getOrderItems',
            endpoint: 'orders',
            path: { orderId },
            query: itemsNext ? { NextToken: itemsNext } : {},
          })
          const orderItems = (itemsRes.OrderItems || []) as Record<string, unknown>[]
          itemsNext = itemsRes.NextToken as string | undefined

          for (let i = 0; i < orderItems.length; i++) {
            const it = orderItems[i]
            const oid = String(it.OrderItemId || `${orderId}:${i}`)
            const qty = Math.max(1, Math.floor(Number(it.QuantityOrdered ?? 1)))
            const title = String(it.Title || 'Amazon item').slice(0, 500)
            const itemPrice = moneyAmount(it.ItemPrice)
            const itemTax = moneyAmount(it.ItemTax)
            const shipPrice = moneyAmount(it.ShippingPrice)
            const unit = qty > 0 ? Math.round((itemPrice / qty) * 100) / 100 : itemPrice
            const total = Math.round((itemPrice + itemTax + shipPrice) * 100) / 100
            const lineKey = `amazon:${orderId}:${oid}`

            await upsertUnifiedSaleLine(pool, {
              platform: 'amazon',
              source_order_id: orderId,
              line_key: lineKey,
              product_name: title,
              quantity: qty,
              price: unit,
              tax: itemTax,
              shipping: shipPrice,
              total,
              city: null,
              order_date: purchaseDate,
              currency: 'INR',
            })
            inserted += 1
          }
        } while (itemsNext)
      }
    } while (ordersNext)

    chunkEnd = chunkStart - 1
    /** Gentle pacing between windows (SP-API orders rate is low). */
    await new Promise((r) => setTimeout(r, 400))
  }

  const logMessage =
    inserted === 0
      ? `No Amazon order lines in the last ${days} day(s) (or empty API response for this marketplace)`
      : undefined

  return { rows: inserted, skipped: false, logMessage }
}
