import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getMaxUnifiedOrderDate, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'

/** India marketplace (sellercentral.amazon.in). Override with AMAZON_MARKETPLACE_ID. */
const DEFAULT_MARKETPLACE_IN = 'A21TJRUUN4KGV'

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

function addressFetchEnabled(): boolean {
  return process.env.AMAZON_UNIFIED_SALES_FETCH_ADDRESS !== '0' && process.env.AMAZON_UNIFIED_SALES_FETCH_ADDRESS !== 'false'
}

function orderApiDelayMs(): number {
  const raw = process.env.AMAZON_ORDER_API_DELAY_MS || '200'
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 0) return 200
  return Math.min(2000, n)
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
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

/** B2B vs B2C from Orders API `IsBusinessOrder`. */
function amazonBusinessType(o: Record<string, unknown> | null | undefined): string | null {
  if (!o) return null
  const v = o.IsBusinessOrder
  if (v === true) return 'B2B'
  if (v === false) return 'B2C'
  return null
}

function pickShippingFromAddressResponse(res: unknown): { city: string | null; state: string | null } {
  const r = res as Record<string, unknown> | undefined
  const raw = (r?.payload as Record<string, unknown> | undefined) ?? r
  const a = (raw?.ShippingAddress as Record<string, unknown> | undefined) ?? (raw?.shippingAddress as Record<string, unknown> | undefined)
  if (!a || typeof a !== 'object') return { city: null, state: null }
  const state = String(a.StateOrRegion || (a as any).stateOrRegion || '').trim() || null
  const city = String(a.City || (a as any).city || '').trim() || null
  return { city, state }
}

/** Buyer-requested cancel on an order item (not the same as post-delivery FBA returns — those often need reports). */
function formatBuyerCancelNote(it: Record<string, unknown>): string | null {
  const brc = it.BuyerRequestedCancel
  if (!brc || typeof brc !== 'object') return null
  const o = brc as Record<string, unknown>
  if (o.IsBuyerRequestedCancel === true) {
    const r = o.BuyerCancelReason != null ? String(o.BuyerCancelReason) : ''
    return r ? `Buyer cancel: ${r}` : 'Buyer requested cancel'
  }
  return null
}

export type AmazonSyncResult = { rows: number; skipped: boolean; logMessage?: string }

/**
 * Upserts `unified_sales` rows for platform `amazon` from Orders API.
 * Includes **cancelled** orders and line items when the API returns them.
 * Ship-to **state** uses `getOrderAddress` (needs Direct-to-Consumer Shipping / PII roles — otherwise columns stay null).
 * B2B/B2C from `IsBusinessOrder` on the order (with optional `getOrder` if missing from list).
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
  const delayMs = orderApiDelayMs()
  const fetchAddr = addressFetchEnabled()

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
  const fullLookbackMinTime = Date.now() - lookbackMs
  const catalogMinTime = Date.now() - MAX_LOOKBACK_DAYS * MS_DAY
  const chunkMs = CHUNK_DAYS * MS_DAY

  const forceFull = process.env.AMAZON_UNIFIED_SALES_FULL_SYNC === '1'
  const maxStored = await getMaxUnifiedOrderDate(pool, 'amazon')
  const useIncremental =
    !forceFull &&
    maxStored != null &&
    maxStored.getTime() < Date.now() - 60 * 1000

  const minTime = useIncremental
    ? Math.max(catalogMinTime, maxStored!.getTime() - UNIFIED_SALES_INCREMENTAL_OVERLAP_MS)
    : fullLookbackMinTime

  let inserted = 0
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

        const orderStatus = String(order.OrderStatus || '').trim() || null
        let businessType = amazonBusinessType(order)
        let shipCity: string | null = null
        let shipState: string | null = null

        if (businessType == null) {
          try {
            const ordRes = await sp.callAPI({
              operation: 'getOrder',
              endpoint: 'orders',
              path: { orderId },
            })
            const ord =
              (ordRes?.payload?.Order as Record<string, unknown> | undefined) ||
              (ordRes?.Order as Record<string, unknown> | undefined) ||
              (ordRes?.payload as Record<string, unknown> | undefined)
            businessType = amazonBusinessType(ord)
            if (ord && typeof ord === 'object') {
              const embedded = pickShippingFromAddressResponse({ payload: { ShippingAddress: (ord as any).ShippingAddress } })
              if (embedded.state) shipState = embedded.state
              if (embedded.city) shipCity = embedded.city
            }
          } catch {
            /* ignore */
          }
          await sleep(delayMs)
        }

        if (fetchAddr && (shipState == null || shipCity == null)) {
          try {
            const addrRes = await sp.callAPI({
              operation: 'getOrderAddress',
              endpoint: 'orders',
              path: { orderId },
            })
            const picked = pickShippingFromAddressResponse(addrRes)
            if (picked.state) shipState = picked.state
            if (picked.city) shipCity = picked.city
          } catch {
            /* PII / role / order type — leave null */
          }
          await sleep(delayMs)
        }

        const purchaseDate = order.PurchaseDate ? new Date(String(order.PurchaseDate)) : new Date()
        let itemsNext: string | undefined
        try {
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
              const qty = Math.max(0, Math.floor(Number(it.QuantityOrdered ?? 0)))
              const qtyShipped = Math.max(0, Math.floor(Number(it.QuantityShipped ?? 0)))
              const title = String(it.Title || 'Amazon item').slice(0, 500)
              const itemPrice = moneyAmount(it.ItemPrice)
              const itemTax = moneyAmount(it.ItemTax)
              const shipPrice = moneyAmount(it.ShippingPrice)
              const unit = qty > 0 ? Math.round((itemPrice / qty) * 100) / 100 : Math.round(itemPrice * 100) / 100
              const total = Math.round((itemPrice + itemTax + shipPrice) * 100) / 100
              const lineKey = `amazon:${orderId}:${oid}`
              const lineNote = formatBuyerCancelNote(it)
              const cityDisplay = shipCity ? (shipState ? `${shipCity}, ${shipState}` : shipCity) : null

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
                city: cityDisplay,
                order_date: purchaseDate,
                currency: 'INR',
                order_status: orderStatus,
                business_type: businessType,
                shipping_state: shipState,
                quantity_shipped: qtyShipped,
                line_note: lineNote,
              })
              inserted += 1
            }
          } while (itemsNext)
        } catch {
          /* No items (e.g. some pending/cancel edge cases) — skip order */
        }
      }
    } while (ordersNext)

    chunkEnd = chunkStart - 1
    await new Promise((r) => setTimeout(r, 400))
  }

  const modeHint = useIncremental ? 'incremental (new since last sync)' : `full lookback ${days}d`
  const logMessage =
    inserted === 0
      ? `No Amazon order lines (${modeHint}; or empty API response for this marketplace)`
      : undefined

  return { rows: inserted, skipped: false, logMessage }
}
