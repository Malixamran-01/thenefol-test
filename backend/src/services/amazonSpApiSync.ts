import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getMaxUnifiedOrderDate, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'
import {
  createAmazonSellingPartner,
  DEFAULT_MARKETPLACE_IN,
  getLwaClientId,
  getLwaClientSecret,
  resolveAmazonRefreshToken,
} from './amazonSpCommon'
import {
  extractBuyerGstinFromBuyerInfoResponse,
  moneyAmount,
  normalizeGstin,
  parseIndiaGstFromOrderItem,
  sumGstComponents,
} from './amazonOrderItemTax'

/**
 * All standard Order v0 statuses — if `getOrders` is called without this, some regions/accounts
 * effectively return a narrow set (e.g. only Canceled). Explicit OR list widens the feed for tax/ops.
 * @see https://developer-docs.amazon.com/sp-api/docs/orders-v0-api-reference#orderstatus
 */
const SP_GET_ORDERS_STATUSES = [
  'PendingAvailability',
  'Pending',
  'Unshipped',
  'PartiallyShipped',
  'Shipped',
  'InvoiceUnconfirmed',
  'Canceled',
  'Unfulfillable',
] as const

/** SP-API returns no orders older than ~2 years for most marketplaces. */
const MAX_LOOKBACK_DAYS = 730

/** Smaller windows reduce load and avoid undocumented range limits. */
const CHUNK_DAYS = 30

function lookbackDays(): number {
  const raw = process.env.AMAZON_UNIFIED_SALES_LOOKBACK_DAYS || process.env.AMAZON_ORDERS_LOOKBACK_DAYS || '365'
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return 365
  return Math.min(MAX_LOOKBACK_DAYS, Math.max(1, n))
}

function addressFetchEnabled(): boolean {
  return process.env.AMAZON_UNIFIED_SALES_FETCH_ADDRESS !== '0' && process.env.AMAZON_UNIFIED_SALES_FETCH_ADDRESS !== 'false'
}

function buyerInfoFetchEnabled(): boolean {
  return process.env.AMAZON_UNIFIED_SALES_FETCH_BUYER_INFO !== '0' && process.env.AMAZON_UNIFIED_SALES_FETCH_BUYER_INFO !== 'false'
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

function round2(n: number): number {
  return Math.round(n * 100) / 100
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

/**
 * If SP-API surfaces return/refund hints on a line, capture for tax context.
 * Post-shipment FBA returns and settlements may only appear in reports / finance APIs.
 */
function formatReturnOrRefundLineNote(it: Record<string, unknown>): string | null {
  const takeKey = (k: string) =>
    /reimburs|refund|chargeback|reversal|return/i.test(k) && !/returnaddress|return_address|returnpolicy|returns_?policy/i.test(k)

  const scan = (o: unknown, d: number): string | null => {
    if (d > 6 || o == null) return null
    if (typeof o !== 'object') return null
    if (Array.isArray(o)) {
      for (const el of o) {
        const f = scan(el, d + 1)
        if (f) return f
      }
      return null
    }
    const r = o as Record<string, unknown>
    for (const [k, v] of Object.entries(r)) {
      if (takeKey(k)) {
        if (typeof v === 'string' && v.trim()) return `RMA/refund: ${v.trim().slice(0, 180)}`
        if (v === true) return `RMA/refund: ${k}`
        if (v && typeof v === 'object') {
          const inner = JSON.stringify(v).slice(0, 200)
          if (inner !== '{}') return `RMA/refund: ${inner}`
        }
      }
    }
    for (const v of Object.values(r)) {
      if (v && typeof v === 'object') {
        const f = scan(v, d + 1)
        if (f) return f
      }
    }
    return null
  }
  if (it.IsFreeReplacement === true) return 'Free replacement (line)'
  if (it.IsReplacement === true) return 'Replacement (line)'
  return scan(it, 0)
}

/**
 * India GST / e-invoice and generic invoice hints from getOrder + getOrderItems payloads.
 * Field names are not fully documented; we prefer explicit keys then deep-scan invoice-like names.
 */
function extractAmazonInvoiceNumber(
  order: Record<string, unknown>,
  item: Record<string, unknown>
): string | null {
  const take = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    if (!t || t.length > 120 || /^https?:\/\//i.test(t)) return null
    return t
  }

  const explicitItemKeys = [
    'TaxInvoiceNumber',
    'taxInvoiceNumber',
    'InvoiceNumber',
    'invoiceNumber',
    'CommercialInvoiceNumber',
    'EInvoiceNumber',
    'IRN', // India e-invoice IRN (if ever surfaced on item)
  ] as const
  for (const k of explicitItemKeys) {
    const t = take((item as any)[k])
    if (t) return t
  }

  const keyLooksInvoice = (k: string): boolean => {
    if (/(^|_)(irn|einvoice|e_invoice|gstin)/i.test(k)) return true
    if (!/invoice/i.test(k)) return false
    if (/(status|url|method|history|date|time|type)$/i.test(k)) return false
    return true
  }

  const scan = (node: unknown, depth: number): string | null => {
    if (depth > 10 || node == null) return null
    if (typeof node !== 'object') return null
    if (Array.isArray(node)) {
      for (const el of node) {
        const f = scan(el, depth + 1)
        if (f) return f
      }
      return null
    }
    const o = node as Record<string, unknown>
    for (const [k, v] of Object.entries(o)) {
      if (keyLooksInvoice(k) && typeof v === 'string') {
        const t = take(v)
        if (t) return t
      }
    }
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object') {
        const f = scan(v, depth + 1)
        if (f) return f
      }
    }
    return null
  }
  return scan(item, 0) || scan(order, 0)
}

function parseOrderFromGetOrderResponse(ordRes: any): Record<string, unknown> | null {
  const ord =
    ordRes?.payload?.Order ??
    ordRes?.Order ??
    (ordRes?.payload && typeof ordRes.payload === 'object' && !ordRes.payload.Order
      ? ordRes.payload
      : null)
  return ord && typeof ord === 'object' ? (ord as Record<string, unknown>) : null
}

export type AmazonSyncResult = { rows: number; skipped: boolean; logMessage?: string }

/**
 * Upserts `unified_sales` rows for platform `amazon` from Orders API.
 * **List feed**: `getOrders` passes explicit `OrderStatuses` (all standard states) so the sync is not skewed to
 * a single status. **Per-order detail**: for India by default, or with `AMAZON_UNIFIED_SALES_GET_ORDER=1`, we merge
 * `getOrder` into the list row for invoice fields, `OrderStatus`, B2B flags, and embedded ship address when present.
 * Set `AMAZON_UNIFIED_SALES_GET_ORDER=0` to skip extra getOrder calls (weaker invoice data).
 * Ship-to **state** can use `getOrderAddress` (needs PII roles).
 * **B2B GSTIN** via `getOrderBuyerInfo` when `business_type` is B2B.
 * **Line taxes** from `getOrderItems` (India GST deep-scan; many orders lack split components).
 * **Post-shipment FBA returns / settlements** may not appear on Orders/Items; use SP-API reports for full return ledgers.
 */
export async function syncAmazonUnifiedSales(pool: Pool): Promise<AmazonSyncResult> {
  const refresh_token = await resolveAmazonRefreshToken(pool)
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
  const fetchBuyerInfo = buyerInfoFetchEnabled()

  const sp = createAmazonSellingPartner(region, refresh_token)

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
          OrderStatuses: [...SP_GET_ORDERS_STATUSES] as string[],
          ...(ordersNext ? { NextToken: ordersNext } : {}),
        },
      })

      const orders = (ordersRes.Orders || []) as Record<string, unknown>[]
      ordersNext = ordersRes.NextToken as string | undefined

      for (const order of orders) {
        const orderId = String(order.AmazonOrderId || '')
        if (!orderId) continue

        let mergedOrder: Record<string, unknown> = { ...order }
        const getOrderOff = process.env.AMAZON_UNIFIED_SALES_GET_ORDER === '0'
        const getOrderForMktOrFlag =
          !getOrderOff &&
          (marketplaceId === DEFAULT_MARKETPLACE_IN ||
            process.env.AMAZON_UNIFIED_SALES_GET_ORDER === '1' ||
            process.env.AMAZON_UNIFIED_SALES_GET_ORDER === 'true')
        const needsGetOrder = getOrderForMktOrFlag || amazonBusinessType(mergedOrder) == null
        if (needsGetOrder) {
          try {
            const ordRes = await sp.callAPI({
              operation: 'getOrder',
              endpoint: 'orders',
              path: { orderId },
            })
            const ord = parseOrderFromGetOrderResponse(ordRes)
            if (ord) {
              mergedOrder = { ...mergedOrder, ...ord }
            }
          } catch {
            /* throttled / 404 / roles */
          }
          await sleep(delayMs)
        }

        const orderStatus = String(mergedOrder.OrderStatus || order.OrderStatus || '').trim() || null
        let businessType = amazonBusinessType(mergedOrder)
        let shipCity: string | null = null
        let shipState: string | null = null
        {
          const embedded = pickShippingFromAddressResponse({
            payload: { ShippingAddress: (mergedOrder as { ShippingAddress?: unknown }).ShippingAddress },
          })
          if (embedded.state) shipState = embedded.state
          if (embedded.city) shipCity = embedded.city
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

        let buyerGstin: string | null = null
        if (fetchBuyerInfo && businessType === 'B2B') {
          try {
            const buyerRes = await sp.callAPI({
              operation: 'getOrderBuyerInfo',
              endpoint: 'orders',
              path: { orderId },
            })
            buyerGstin = normalizeGstin(extractBuyerGstinFromBuyerInfoResponse(buyerRes))
          } catch {
            /* Roles / restricted */
          }
          await sleep(delayMs)
        }

        const purchaseDate = mergedOrder.PurchaseDate
          ? new Date(String(mergedOrder.PurchaseDate))
          : order.PurchaseDate
            ? new Date(String(order.PurchaseDate))
            : new Date()
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
              const it = orderItems[i] as Record<string, unknown>
              const oid = String(it.OrderItemId || `${orderId}:${i}`)
              const qty = Math.max(0, Math.floor(Number(it.QuantityOrdered ?? 0)))
              const qtyShipped = Math.max(0, Math.floor(Number(it.QuantityShipped ?? 0)))
              const title = String(it.Title || 'Amazon item').slice(0, 500)
              const itemPrice = moneyAmount(it.ItemPrice)
              const itemTax = moneyAmount(it.ItemTax)
              const shipPrice = moneyAmount(it.ShippingPrice)
              const shippingTax = moneyAmount(it.ShippingTax)
              const unit = qty > 0 ? Math.round((itemPrice / qty) * 100) / 100 : Math.round(itemPrice * 100) / 100
              const total = Math.round((itemPrice + itemTax + shipPrice + shippingTax) * 100) / 100
              const lineKey = `amazon:${orderId}:${oid}`
              const lineNote = [formatBuyerCancelNote(it), formatReturnOrRefundLineNote(it)]
                .filter(Boolean)
                .join(' · ') || null
              const cityDisplay = shipCity ? (shipState ? `${shipCity}, ${shipState}` : shipCity) : null

              const gst = parseIndiaGstFromOrderItem(it)
              const gstSum = sumGstComponents(gst)
              const hasGstSplit = gstSum > 0.0001

              const principal = itemPrice > 0 ? itemPrice : Math.max(0, total - itemTax - shippingTax - shipPrice)
              const taxableValue = principal > 0 ? round2(principal) : null
              const totalLineTax = itemTax + shippingTax
              let taxRatePct: number | null = null
              if (taxableValue != null && taxableValue > 0 && totalLineTax > 0) {
                taxRatePct = Math.round(((totalLineTax / taxableValue) * 100) * 10000) / 10000
              }

              const sku = String(it.SellerSKU || '').trim().slice(0, 120) || null
              const asin = String(it.ASIN || '').trim().slice(0, 20) || null
              const invoiceNo = extractAmazonInvoiceNumber(mergedOrder, it)

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
                buyer_gstin: buyerGstin,
                seller_sku: sku,
                asin,
                igst: hasGstSplit ? round2(gst.igst) : null,
                cgst: hasGstSplit ? round2(gst.cgst) : null,
                sgst: hasGstSplit ? round2(gst.sgst) : null,
                utgst: hasGstSplit ? round2(gst.utgst) : null,
                cess: hasGstSplit ? round2(gst.cess) : null,
                tax_rate_pct: taxRatePct,
                taxable_value: taxableValue,
                invoice_number: invoiceNo,
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
