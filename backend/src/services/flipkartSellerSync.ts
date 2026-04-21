import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getMaxUnifiedOrderDate, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'

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
 * - Set `FLIPKART_UNIFIED_SALES_SYNC=0` to skip only the **unified sales** Flipkart import (e.g. during API outages)
 *   without removing API keys from the environment.
 */
export function isFlipkartUnifiedSalesSyncDisabled(): boolean {
  return process.env.FLIPKART_UNIFIED_SALES_SYNC === '0'
}

export function getFlipkartApiKey(): string {
  return (process.env.FLIPKART_API_KEY || process.env.FLIPKART_SALES_API_KEY || '').trim()
}

export function getFlipkartApiSecret(): string {
  return (process.env.FLIPKART_API_SECRET || process.env.FLIPKART_SALES_SECRET || '').trim()
}

/**
 * Production: https://api.flipkart.net · Sandbox: https://sandbox-api.flipkart.net
 * Normalizes to **scheme + host only** so values like `.../sellers` or trailing slashes cannot break
 * `${base}/oauth-service/oauth/token` (Flipkart may return 404 "Invalid url provided").
 */
export function getFlipkartApiBaseUrl(): string {
  const fallback = 'https://api.flipkart.net'
  const raw = (process.env.FLIPKART_API_BASE_URL || fallback).trim()
  if (!raw) return fallback
  let s = raw.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`
  }
  try {
    const u = new URL(s)
    return `${u.protocol}//${u.host}`
  } catch {
    return fallback
  }
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
    const debug = process.env.FLIPKART_API_DEBUG === '1' || process.env.FLIPKART_API_DEBUG === 'true'
    if (debug) {
      const preview = trimmed.slice(0, 400).replace(/\s+/g, ' ')
      console.warn(`[flipkart] ${context}: non-JSON HTTP ${res.status}:`, preview)
    }
    const hint = trimmed.startsWith('<')
      ? ' (server returned HTML — check FLIPKART_API_BASE_URL and OAuth credentials)'
      : ''
    throw new Error(`Flipkart ${context}: expected JSON, got HTTP ${res.status}${hint}`)
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
  if (process.env.FLIPKART_API_DEBUG === '1' || process.env.FLIPKART_API_DEBUG === 'true') {
    console.log('[flipkart] OAuth token URL:', url, '| base from env normalized to:', base)
  }
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
    const hint404 =
      res.status === 404 || /invalid url/i.test(String(msg))
        ? ` — Check FLIPKART_API_BASE_URL is exactly https://api.flipkart.net or https://sandbox-api.flipkart.net (host only). Token URL used: ${url}. Use app id/secret from Seller Hub → Developer → My Apps.`
        : ''
    throw new Error(`Flipkart token failed (${res.status}): ${msg}${hint404}`)
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

function flipkartLookbackDays(): number {
  const raw = process.env.FLIPKART_UNIFIED_SALES_LOOKBACK_DAYS || '90'
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return 90
  return Math.min(730, Math.max(1, n))
}

function isoNow(): string {
  return new Date().toISOString()
}

type FlipkartFilterBase = {
  type: 'preDispatch' | 'postDispatch'
  states: string[]
}

type FlipkartFilter = FlipkartFilterBase & {
  orderDate: { from: string; to: string }
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
          orderDate: filter.orderDate!,
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

function invoiceNumberFromFlipkart(
  shipment: Record<string, unknown>,
  item: Record<string, unknown>
): string | null {
  const fromObj = (inv: unknown): string | null => {
    if (!inv || typeof inv !== 'object') return null
    const o = inv as Record<string, unknown>
    const keys = [
      'invoiceNumber',
      'invoiceId',
      'taxInvoiceNumber',
      'invoiceNo',
      'number',
      'gstInvoiceNumber',
      'commercialInvoiceNumber',
    ]
    for (const k of keys) {
      const v = o[k]
      if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 120)
    }
    return null
  }
  const direct =
    fromObj(item.invoice) ||
    fromObj(shipment.invoice) ||
    (typeof shipment.invoiceNumber === 'string' && shipment.invoiceNumber.trim()
      ? shipment.invoiceNumber.trim().slice(0, 120)
      : null) ||
    (typeof shipment.taxInvoiceNumber === 'string' && shipment.taxInvoiceNumber.trim()
      ? shipment.taxInvoiceNumber.trim().slice(0, 120)
      : null)
  return direct
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
 * First run: orderDate window = last FLIPKART_UNIFIED_SALES_LOOKBACK_DAYS (default 90).
 * Later runs: **incremental** — orderDate.from = last stored order_date minus overlap (only new/changed shipments in range).
 * FLIPKART_UNIFIED_SALES_FULL_SYNC=1 forces the full lookback window again.
 */
export async function syncFlipkartUnifiedSales(pool: Pool): Promise<FlipkartSyncResult> {
  if (isFlipkartUnifiedSalesSyncDisabled()) {
    return {
      rows: 0,
      skipped: true,
      logMessage: 'Unified sales Flipkart sync disabled (FLIPKART_UNIFIED_SALES_SYNC=0)',
    }
  }
  if (!isFlipkartApiConfigured()) {
    return { rows: 0, skipped: true }
  }

  const accessToken = await flipkartClientCredentialsToken()

  const lookbackDays = flipkartLookbackDays()
  const forceFull = process.env.FLIPKART_UNIFIED_SALES_FULL_SYNC === '1'
  const maxStored = await getMaxUnifiedOrderDate(pool, 'flipkart')
  const useIncremental =
    !forceFull &&
    maxStored != null &&
    maxStored.getTime() < Date.now() - 60 * 1000

  const orderDateRange = useIncremental
    ? {
        from: new Date(maxStored!.getTime() - UNIFIED_SALES_INCREMENTAL_OVERLAP_MS).toISOString(),
        to: isoNow(),
      }
    : {
        from: isoDaysAgo(lookbackDays),
        to: isoNow(),
      }

  const seenShipmentIds = new Set<string>()
  const filters: FlipkartFilterBase[] = [
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
    const filterWithDates: FlipkartFilter = { ...filter, orderDate: orderDateRange }
    let next: string | null | undefined
    do {
      const page = await postShipmentFilter(accessToken, filterWithDates, next)
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
          const invNo = invoiceNumberFromFlipkart(shipment, it as Record<string, unknown>)

          await upsertUnifiedSaleLine(pool, {
            platform: 'flipkart',
            source_order_id: shipmentId,
            line_key: lineKey,
            product_name: title,
            quantity: qty,
            price,
            tax,
            shipping,
            total,
            city: city || null,
            order_date: orderDate,
            currency: 'INR',
            invoice_number: invNo,
          })
          inserted += 1
        }
      }
    } while (next)
  }

  const logMessage =
    inserted === 0
      ? 'No Flipkart shipment lines returned (filters / account / API access)'
      : undefined

  return { rows: inserted, skipped: false, logMessage }
}
