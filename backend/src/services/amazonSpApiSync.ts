import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getLastSyncCursor, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'
import { getSellerStateCode, normalizeIndianState, round2, snapGstRate, splitGst } from './gstUtils'
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

/**
 * Amazon.in (and EU) Orders API prices are tax-INCLUSIVE: ItemPrice already contains ItemTax.
 * Default true for the India marketplace; override with AMAZON_ITEM_PRICE_INCLUDES_TAX=0/1.
 * (Rows later get replaced by the GST MTR report figures anyway — see amazonInvoicingReportSync.)
 */
function itemPriceIncludesTax(marketplaceId: string): boolean {
  const v = process.env.AMAZON_ITEM_PRICE_INCLUDES_TAX
  if (v === '0' || v === 'false') return false
  if (v === '1' || v === 'true') return true
  return marketplaceId === DEFAULT_MARKETPLACE_IN
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
    // NB: never match *gstin* keys — those hold the buyer's GSTIN, not a document number
    if (/(^|_)(irn|einvoice|e_invoice)/i.test(k)) return true
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
 *
 * **Windows**: first run (or `AMAZON_UNIFIED_SALES_FULL_SYNC=1`) walks `CreatedAfter` in 30-day chunks over the
 * lookback. Later runs use `LastUpdatedAfter` = last successful sync − 2h, so status changes on OLD orders
 * (pending → shipped with prices, shipped → cancelled) are refreshed too.
 * **List feed**: `getOrders` passes explicit `OrderStatuses` (all standard states).
 * **Per-order detail**: India by default (or `AMAZON_UNIFIED_SALES_GET_ORDER=1`) merges `getOrder` for B2B flags /
 * ship address. Ship-to state can use `getOrderAddress` (needs PII roles). B2B GSTIN via `getOrderBuyerInfo`.
 * **Amounts**: ItemPrice/ShippingPrice are tax-inclusive on Amazon.in (see `itemPriceIncludesTax`); promotions
 * are netted. These are provisional — the GST MTR report sync overwrites them with Amazon's invoice figures.
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
  const inclusive = itemPriceIncludesTax(marketplaceId)
  const sellerState = await getSellerStateCode(pool)

  const sp = createAmazonSellingPartner(region, refresh_token)

  const MS_DAY = 24 * 60 * 60 * 1000
  const catalogMinTime = Date.now() - MAX_LOOKBACK_DAYS * MS_DAY
  const windowEnd = Date.now() - 2 * 60 * 1000

  const forceFull = process.env.AMAZON_UNIFIED_SALES_FULL_SYNC === '1'
  const cursor = forceFull ? null : await getLastSyncCursor(pool, 'amazon')

  /** Each window is either a CreatedAfter/Before chunk (full) or one LastUpdatedAfter/Before window (incremental). */
  type Win = { kind: 'created' | 'updated'; from: number; to: number }
  const windows: Win[] = []
  if (cursor) {
    windows.push({
      kind: 'updated',
      from: Math.max(catalogMinTime, cursor.getTime() - UNIFIED_SALES_INCREMENTAL_OVERLAP_MS),
      to: windowEnd,
    })
  } else {
    const minTime = Date.now() - Math.min(days, MAX_LOOKBACK_DAYS) * MS_DAY
    let chunkEnd = windowEnd
    while (chunkEnd > minTime) {
      const chunkStart = Math.max(chunkEnd - CHUNK_DAYS * MS_DAY, minTime)
      windows.push({ kind: 'created', from: chunkStart, to: chunkEnd })
      chunkEnd = chunkStart - 1
    }
  }

  let inserted = 0
  let failedOrders = 0
  let skippedNoDate = 0
  const failedSamples: string[] = []

  for (const win of windows) {
    const range =
      win.kind === 'created'
        ? { CreatedAfter: new Date(win.from).toISOString(), CreatedBefore: new Date(win.to).toISOString() }
        : { LastUpdatedAfter: new Date(win.from).toISOString(), LastUpdatedBefore: new Date(win.to).toISOString() }

    let ordersNext: string | undefined
    do {
      const ordersRes = await sp.callAPI({
        operation: 'getOrders',
        endpoint: 'orders',
        query: ordersNext
          ? { MarketplaceIds: [marketplaceId], NextToken: ordersNext }
          : {
              MarketplaceIds: [marketplaceId],
              ...range,
              OrderStatuses: [...SP_GET_ORDERS_STATUSES] as string[],
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
        const businessType = amazonBusinessType(mergedOrder)
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
        const stateNorm = normalizeIndianState(shipState)

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

        const purchaseRaw = mergedOrder.PurchaseDate || order.PurchaseDate
        const purchaseDate = purchaseRaw ? new Date(String(purchaseRaw)) : null
        if (!purchaseDate || Number.isNaN(purchaseDate.getTime())) {
          // Never default to "now": it would put the sale in the wrong GST period
          skippedNoDate += 1
          continue
        }

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

              // Net of promotions (Amazon reports discounts as positive amounts)
              const itemGross = moneyAmount(it.ItemPrice) - moneyAmount(it.PromotionDiscount)
              const itemTax = moneyAmount(it.ItemTax) - moneyAmount(it.PromotionDiscountTax)
              const shipGross = moneyAmount(it.ShippingPrice) - moneyAmount(it.ShippingDiscount)
              const shipTax = moneyAmount(it.ShippingTax) - moneyAmount(it.ShippingDiscountTax)
              const giftGross = moneyAmount(it.GiftWrapPrice)
              const giftTax = moneyAmount(it.GiftWrapTax)

              const tax = round2(itemTax + shipTax + giftTax)
              const shippingExTax = round2(inclusive ? shipGross - shipTax : shipGross)
              const taxableValue = round2(
                inclusive
                  ? itemGross - itemTax + shipGross - shipTax + giftGross - giftTax
                  : itemGross + shipGross + giftGross
              )
              const total = round2(taxableValue + tax)
              const unit = qty > 0 ? round2(taxableValue / qty) : taxableValue

              const lineKey = `amazon:${orderId}:${oid}`
              const lineNote = [formatBuyerCancelNote(it), formatReturnOrRefundLineNote(it)]
                .filter(Boolean)
                .join(' · ') || null
              const cityDisplay = shipCity ? (shipState ? `${shipCity}, ${shipState}` : shipCity) : null

              const gst = parseIndiaGstFromOrderItem(it)
              const gstSum = sumGstComponents(gst)
              const split =
                gstSum > 0.0001
                  ? { igst: round2(gst.igst), cgst: round2(gst.cgst), sgst: round2(gst.sgst) }
                  : splitGst(tax, stateNorm.code, sellerState)
              const taxRatePct = taxableValue > 0 && tax > 0 ? snapGstRate((tax / taxableValue) * 100) : null

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
                tax,
                shipping: shippingExTax,
                total,
                city: cityDisplay,
                order_date: purchaseDate,
                currency: 'INR',
                order_status: orderStatus,
                business_type: businessType,
                shipping_state: stateNorm.name,
                ship_state_code: stateNorm.code,
                quantity_shipped: qtyShipped,
                line_note: lineNote,
                buyer_gstin: buyerGstin,
                seller_sku: sku,
                asin,
                igst: split ? split.igst : null,
                cgst: split ? split.cgst : null,
                sgst: split ? split.sgst : null,
                utgst: gstSum > 0.0001 ? round2(gst.utgst) : null,
                cess: gstSum > 0.0001 ? round2(gst.cess) : null,
                tax_rate_pct: taxRatePct,
                taxable_value: taxableValue,
                invoice_number: invoiceNo,
                doc_type: 'invoice',
                tax_source: 'order_api',
              })
              inserted += 1
            }
          } while (itemsNext)
        } catch (e: any) {
          // Previously swallowed silently — surface it in the sync log instead
          failedOrders += 1
          if (failedSamples.length < 3) failedSamples.push(`${orderId}: ${String(e?.message || e).slice(0, 80)}`)
        }
      }
    } while (ordersNext)

    await sleep(400)
  }

  const modeHint = cursor ? 'incremental (orders updated since last sync)' : `full lookback ${days}d`
  const notes: string[] = []
  if (inserted === 0) notes.push(`No Amazon order lines (${modeHint}; or empty API response for this marketplace)`)
  if (failedOrders > 0) notes.push(`${failedOrders} order(s) failed getOrderItems — e.g. ${failedSamples.join('; ')}`)
  if (skippedNoDate > 0) notes.push(`${skippedNoDate} order(s) skipped: missing PurchaseDate`)

  return { rows: inserted, skipped: false, logMessage: notes.length ? notes.join(' | ') : undefined }
}
