import { Pool } from 'pg'

/**
 * Flipkart Seller / Sales API credentials — read from the **backend** `.env` (same folder as `backend/package.json`).
 * The admin panel `.env` is not used for this (only VITE_* vars are).
 *
 * Supported names (use one pair):
 * - Preferred: `FLIPKART_API_KEY`, `FLIPKART_API_SECRET`
 * - Aliases:  `FLIPKART_SALES_API_KEY`, `FLIPKART_SALES_SECRET` (matches common Flipkart naming)
 *
 * Enable/disable:
 * - If both key and secret are set, sync is considered **on** unless you set `FLIPKART_API_ENABLED=0`
 *   or `FLIPKART_SALES_API_ENABLED=0`.
 */
export function getFlipkartApiKey(): string {
  return (process.env.FLIPKART_API_KEY || process.env.FLIPKART_SALES_API_KEY || '').trim()
}

export function getFlipkartApiSecret(): string {
  return (process.env.FLIPKART_API_SECRET || process.env.FLIPKART_SALES_SECRET || '').trim()
}

export function getFlipkartApiBaseUrl(): string {
  const raw = (process.env.FLIPKART_API_BASE_URL || 'https://api.flipkart.net').trim().replace(/\/$/, '')
  return raw
}

export function isFlipkartApiConfigured(): boolean {
  const key = getFlipkartApiKey()
  const secret = getFlipkartApiSecret()
  if (!key || !secret) return false
  if (process.env.FLIPKART_API_ENABLED === '0' || process.env.FLIPKART_SALES_API_ENABLED === '0') {
    return false
  }
  return true
}

/** Retries on transient 502/503/504 (load balancer / Flipkart outage). */
async function flipkartHttpFetch(url: string, init: RequestInit, context: string): Promise<Response> {
  const maxAttempts = 4
  let lastStatus = 503
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, init)
    lastStatus = res.status
    const transient = [503, 502, 504].includes(res.status)
    if (!transient || attempt === maxAttempts - 1) {
      return res
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
  }
  throw new Error(`Flipkart ${context}: HTTP ${lastStatus} after retries — API still unavailable`)
}

/** Flipkart sometimes returns HTML (404/WAF/login). Never call res.json() blindly. */
async function readFlipkartJsonBody(res: Response, context: string): Promise<Record<string, unknown>> {
  const text = await res.text()
  const trimmed = text.trim()

  if (!res.ok && res.status >= 500 && res.status < 600 && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(
      `Flipkart ${context}: HTTP ${res.status} — Flipkart marketplace API is temporarily unavailable. Try again in a few minutes.`
    )
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    const preview = trimmed.slice(0, 280).replace(/\s+/g, ' ')
    const htmlHint = trimmed.startsWith('<')
      ? ' Response is HTML — check FLIPKART_API_BASE_URL and credentials; OAuth must be POST with form body.'
      : ''
    throw new Error(
      `Flipkart ${context}: expected JSON, got HTTP ${res.status}.${htmlHint} Snippet: ${preview || '(empty)'}`
    )
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Flipkart ${context}: invalid JSON (${res.status}): ${msg}`)
  }
}

/**
 * Client credentials token. Flipkart documents POST + form body; GET often returns an HTML page and breaks JSON.parse.
 */
async function flipkartClientCredentialsToken(): Promise<string> {
  const base = getFlipkartApiBaseUrl()
  const key = getFlipkartApiKey()
  const secret = getFlipkartApiSecret()
  const scope = (process.env.FLIPKART_OAUTH_SCOPE || 'Seller_Api,Default').trim()
  const url = `${base}/oauth-service/oauth/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope,
  })
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await flipkartHttpFetch(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    },
    'oauth/token'
  )
  const json = await readFlipkartJsonBody(res, 'oauth/token')
  if (!res.ok) {
    const msg =
      (json.message as string) ||
      (json.error as string) ||
      (json.error_description as string) ||
      JSON.stringify(json)
    throw new Error(`Flipkart token failed (${res.status}): ${msg}`)
  }
  const token = json.access_token
  if (!token || typeof token !== 'string') {
    throw new Error('Flipkart token response missing access_token')
  }
  return token
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function isoNow(): string {
  return new Date().toISOString()
}

type FlipkartFilter = {
  type: 'preDispatch' | 'postDispatch'
  states: string[]
  orderDate?: { from: string; to: string }
}

function resolveFlipkartUrl(u: string): string {
  const t = u.trim()
  if (/^https?:\/\//i.test(t)) return t
  const base = getFlipkartApiBaseUrl()
  if (t.startsWith('/')) return base + t
  return `${base}/${t}`
}

async function postShipmentFilter(
  accessToken: string,
  filter: FlipkartFilter,
  nextPageUrl?: string | null
): Promise<{ shipments: any[]; nextPageUrl?: string | null }> {
  const base = getFlipkartApiBaseUrl()
  const useNext = nextPageUrl && String(nextPageUrl).trim().length > 0
  const url = useNext ? resolveFlipkartUrl(String(nextPageUrl)) : `${base}/sellers/v3/shipments/filter/`
  const body = useNext
    ? '{}'
    : JSON.stringify({
        filter: {
          ...filter,
          orderDate: filter.orderDate || { from: isoDaysAgo(90), to: isoNow() },
        },
        pagination: { pageSize: 20 },
      })
  const res = await flipkartHttpFetch(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    },
    'shipments/filter'
  )
  const json = await readFlipkartJsonBody(res, 'shipments/filter')
  if (!res.ok) {
    const msg = (json.message as string) || (json.error as string) || JSON.stringify(json)
    throw new Error(`Flipkart shipments filter failed (${res.status}): ${msg}`)
  }
  const shipments = Array.isArray(json.shipments) ? json.shipments : []
  const np = json.nextPageUrl as string | null | undefined
  return { shipments, nextPageUrl: np ?? null }
}

function num(x: unknown): number {
  if (x === null || x === undefined) return 0
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

function lineTotalFromItem(item: Record<string, unknown>): { price: number; tax: number; shipping: number; total: number } {
  const invoice = item.invoice as Record<string, unknown> | undefined
  const sellingPrice = (item.sellingPrice as Record<string, unknown> | undefined)?.amount
  const price =
    num(invoice?.total) ||
    num(invoice?.invoiceAmount) ||
    num(item.netAmount) ||
    num(sellingPrice) ||
    num(item.price) ||
    0
  const tax = num(invoice?.tax) || num(item.tax) || 0
  const shipping = num(invoice?.shipping) || num(item.shipping) || 0
  const total = price + tax + shipping
  return {
    price: Math.round(price * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

function extractOrderItems(shipment: Record<string, unknown>): Record<string, unknown>[] {
  const direct = shipment.orderItems
  if (Array.isArray(direct)) return direct as Record<string, unknown>[]
  const nested = shipment.shipmentItems
  if (Array.isArray(nested)) return nested as Record<string, unknown>[]
  const ois = shipment.orderItem
  if (Array.isArray(ois)) return ois as Record<string, unknown>[]
  return []
}

function cityFromShipment(shipment: Record<string, unknown>): string {
  const addr =
    (shipment.shippingAddress as Record<string, unknown>) ||
    (shipment.deliveryAddress as Record<string, unknown>) ||
    (shipment.address as Record<string, unknown>)
  if (!addr) return ''
  const parts = [addr.city, addr.state, addr.stateName].filter(Boolean)
  return String(parts.join(', ')).slice(0, 200)
}

export type FlipkartSyncResult = { rows: number; skipped: boolean; logMessage?: string }

/**
 * Pulls shipments via Order Management filter API and maps lines into unified_sales.
 */
export async function syncFlipkartUnifiedSales(pool: Pool): Promise<FlipkartSyncResult> {
  if (!isFlipkartApiConfigured()) {
    return { rows: 0, skipped: true }
  }

  const accessToken = await flipkartClientCredentialsToken()
  await pool.query(`delete from unified_sales where platform = 'flipkart'`)

  const seenShipmentIds = new Set<string>()
  const filters: FlipkartFilter[] = [
    {
      type: 'preDispatch',
      states: ['APPROVED', 'PACKING_IN_PROGRESS', 'PACKED', 'FORM_FAILED', 'READY_TO_DISPATCH'],
    },
    {
      type: 'postDispatch',
      states: ['DELIVERED', 'DISPATCHED', 'SHIPPED', 'COMPLETE'],
    },
  ]

  let inserted = 0
  for (const filter of filters) {
    let next: string | null | undefined
    do {
      const page = await postShipmentFilter(accessToken, filter, next)
      const shipments = page.shipments || []
      next = page.nextPageUrl || null

      for (const raw of shipments) {
        const shipment = raw as Record<string, unknown>
        const shipmentId = String(shipment.shipmentId || shipment.id || '')
        if (!shipmentId || seenShipmentIds.has(shipmentId)) continue
        seenShipmentIds.add(shipmentId)

        const orderDateRaw =
          (shipment.orderDate as string) ||
          (shipment.dispatchByDate as string) ||
          (shipment.createdAt as string) ||
          (shipment.createdDate as string)
        const orderDate = orderDateRaw ? new Date(orderDateRaw) : new Date()
        const city = cityFromShipment(shipment)
        const items = extractOrderItems(shipment)
        if (items.length === 0) continue

        for (let i = 0; i < items.length; i++) {
          const it = items[i]
          const orderItemId = String(it.orderItemId || it.orderItemID || it.id || `${i}`)
          const qty = Math.max(1, Math.floor(num(it.quantity ?? it.quantityOrdered ?? 1)))
          const title = String(
            it.title || it.productTitle || it.listingTitle || it.sellerSku || 'Flipkart item'
          ).slice(0, 500)
          const { price, tax, shipping, total } = lineTotalFromItem(it)
          const lineKey = `flipkart:${shipmentId}:${orderItemId}`

          await pool.query(
            `insert into unified_sales (
              platform, source_order_id, line_key, product_name, quantity, price, tax, shipping, total, city, order_date, currency
            ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'INR')`,
            [
              'flipkart',
              shipmentId,
              lineKey,
              title,
              qty,
              price,
              tax,
              shipping,
              total,
              city || null,
              orderDate,
            ]
          )
          inserted += 1
        }
      }
    } while (next)
  }

  const logMessage =
    inserted === 0
      ? 'Connected but no shipment lines in the last ~90 days (check filters / seller account)'
      : undefined

  return { rows: inserted, skipped: false, logMessage }
}
