import { Pool } from 'pg'

/** India marketplace (sellercentral.amazon.in). Override with AMAZON_MARKETPLACE_ID. */
const DEFAULT_MARKETPLACE_IN = 'A21TJRUUN4KGV'

const SKIP_ORDER_STATUS = new Set(['Canceled', 'Cancelled'])

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

async function resolveRefreshToken(pool: Pool): Promise<string | undefined> {
  const env = process.env.AMAZON_SP_API_REFRESH_TOKEN?.trim()
  if (env) return env
  const { rows } = await pool.query<{ credentials: Record<string, unknown> | null }>(
    `select credentials from marketplace_accounts
     where channel = 'amazon' and coalesce(is_active, true) = true
     order by id asc
     limit 1`
  )
  const rt = rows[0]?.credentials?.refresh_token
  return rt != null && String(rt).length > 0 ? String(rt) : undefined
}

function moneyAmount(m: unknown): number {
  if (!m || typeof m !== 'object') return 0
  const n = Number((m as { Amount?: string }).Amount)
  return Number.isFinite(n) ? n : 0
}

export type AmazonSyncResult = { rows: number; skipped: boolean; logMessage?: string }

/**
 * Replaces `unified_sales` rows for platform `amazon` from Orders API (last ~90 days).
 */
export async function syncAmazonUnifiedSales(pool: Pool): Promise<AmazonSyncResult> {
  const refresh_token = await resolveRefreshToken(pool)
  const clientId = getLwaClientId()
  const clientSecret = getLwaClientSecret()

  if (!refresh_token || !clientId || !clientSecret) {
    return { rows: 0, skipped: true, logMessage: 'Missing refresh token or LWA client (set AMAZON_SP_API_REFRESH_TOKEN or complete OAuth to marketplace_accounts)' }
  }

  if (process.env.AMAZON_SP_API_ENABLED === '0') {
    return { rows: 0, skipped: true }
  }

  const region = (process.env.AMAZON_SP_API_REGION || 'eu').trim()
  const marketplaceId = (process.env.AMAZON_MARKETPLACE_ID || DEFAULT_MARKETPLACE_IN).trim()
  const createdAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

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

  await pool.query(`delete from unified_sales where platform = 'amazon'`)

  let inserted = 0
  let ordersNext: string | undefined

  do {
    const ordersRes = await sp.callAPI({
      operation: 'getOrders',
      endpoint: 'orders',
      query: {
        MarketplaceIds: [marketplaceId],
        CreatedAfter: createdAfter,
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

          await pool.query(
            `insert into unified_sales (
              platform, source_order_id, line_key, product_name, quantity, price, tax, shipping, total, city, order_date, currency
            ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'INR')`,
            [
              'amazon',
              orderId,
              lineKey,
              title,
              qty,
              unit,
              itemTax,
              shipPrice,
              total,
              null,
              purchaseDate,
            ]
          )
          inserted += 1
        }
      } while (itemsNext)
    }
  } while (ordersNext)

  const logMessage =
    inserted === 0
      ? 'Connected but no order lines in the last ~90 days (or wrong marketplace ID)'
      : undefined

  return { rows: inserted, skipped: false, logMessage }
}
