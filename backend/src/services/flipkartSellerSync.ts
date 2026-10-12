import { Pool } from 'pg'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { getLastSyncCursor, UNIFIED_SALES_INCREMENTAL_OVERLAP_MS } from './unifiedSalesCursor'
import { fromInclusive, getSellerStateCode, normalizeIndianState, round2, snapGstRate, splitGst } from './gstUtils'

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

function flipkartLookbackDays(): number {
  const raw = process.env.FLIPKART_UNIFIED_SALES_LOOKBACK_DAYS || '90'
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return 90
  return Math.min(730, Math.max(1, n))
}

/**
 * The shipments filter has no "modified since" date, so incremental runs re-read every order placed in the
 * last N days (default 30) to pick up status changes (packed → shipped → delivered).
 */
function flipkartStatusRefreshDays(): number {
  const n = parseInt(String(process.env.FLIPKART_STATUS_REFRESH_DAYS || '30'), 10)
  return Number.isFinite(n) && n >= 1 ? Math.min(180, n) : 30
}

const MS_DAY = 24 * 60 * 60 * 1000

/** Documented v3 filter types / states (seller.flipkart.com/api-docs/order-api-docs/v3/PostShipmentSearch.html) */
type FlipkartFilter =
  | { type: 'preDispatch' | 'postDispatch'; states: string[]; orderDate: { from: string; to: string } }
  | {
      type: 'cancelled'
      states: string[]
      cancellationType: 'marketplaceCancellation' | 'sellerCancellation' | 'buyerCancellation'
      cancellationDate: { from: string; to: string }
    }

function resolveFlipkartUrl(u: string): string {
  const t = u.trim()
  if (/^https?:\/\//i.test(t)) return t
  const base = getFlipkartApiBaseUrl()
  if (t.startsWith('/sellers/')) return base + t
  if (t.startsWith('/')) return `${base}/sellers${t}`
  return `${base}/sellers/${t}`
}

async function flipkartGetJson(accessToken: string, url: string, context: string): Promise<Record<string, unknown>> {
  const res = await flipkartHttpFetch(
    url,
    { method: 'GET', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    context
  )
  const json = await readFlipkartJsonBody(res, context)
  if (!res.ok) {
    const msg = (json.message as string) || (json.error as string) || JSON.stringify(json)
    throw new Error(`Flipkart ${context} failed (${res.status}): ${msg}`)
  }
  return json
}

async function postShipmentFilter(
  accessToken: string,
  filter: FlipkartFilter,
  nextPageUrl?: string | null
): Promise<{ shipments: any[]; nextPageUrl?: string | null }> {
  let json: Record<string, unknown>
  if (nextPageUrl && String(nextPageUrl).trim()) {
    // nextPageUrl is a GET link carrying the search context
    json = await flipkartGetJson(accessToken, resolveFlipkartUrl(String(nextPageUrl)), 'shipments/filter (next page)')
  } else {
    const res = await flipkartHttpFetch(
      `${getFlipkartApiBaseUrl()}/sellers/v3/shipments/filter/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ filter, pagination: { pageSize: 20 } }),
      },
      'shipments/filter'
    )
    json = await readFlipkartJsonBody(res, 'shipments/filter')
    if (!res.ok) {
      const msg = (json.message as string) || (json.error as string) || JSON.stringify(json)
      throw new Error(`Flipkart shipments filter (${filter.type}) failed (${res.status}): ${msg}`)
    }
  }
  const shipments = Array.isArray(json.shipments) ? json.shipments : []
  const np = json.hasMore === false ? null : ((json.nextPageUrl as string | null | undefined) ?? null)
  return { shipments, nextPageUrl: np }
}

function num(x: unknown): number {
  if (x === null || x === undefined) return 0
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

/** Flipkart rates may come as 18 or 0.18 */
function pct(x: unknown): number {
  const n = num(x)
  return n > 0 && n < 1 ? n * 100 : n
}

type FkInvoiceItem = {
  invoiceNumber: string | null
  invoiceDate: Date | null
  invoiceAmount: number | null
  ratePct: number | null
  igstRate: number
  cgstRate: number
}

type FkAddress = { city: string | null; state: string | null }

/** GET /v3/shipments/{ids}/invoices (JSON) → per orderItemId invoice no, date, amount, GST rates. */
async function fetchInvoices(accessToken: string, shipmentIds: string[]): Promise<Map<string, FkInvoiceItem>> {
  const out = new Map<string, FkInvoiceItem>()
  const json = await flipkartGetJson(
    accessToken,
    `${getFlipkartApiBaseUrl()}/sellers/v3/shipments/${shipmentIds.map(encodeURIComponent).join(',')}/invoices`,
    'shipments/invoices'
  )
  const invoices = Array.isArray(json.invoices) ? (json.invoices as Record<string, unknown>[]) : []
  for (const inv of invoices) {
    const invNo = typeof inv.invoiceNumber === 'string' && inv.invoiceNumber.trim() ? inv.invoiceNumber.trim() : null
    const invDate = inv.invoiceDate ? new Date(String(inv.invoiceDate)) : null
    const items = Array.isArray(inv.orderItems) ? (inv.orderItems as Record<string, unknown>[]) : []
    for (const it of items) {
      const id = String(it.orderItemId || '')
      if (!id) continue
      const td = (it.taxDetails || {}) as Record<string, unknown>
      const igstRate = pct(td.igstRate)
      const cgstRate = pct(td.cgstRate)
      const sgstRate = pct(td.sgstRate)
      const fromDetails = igstRate + cgstRate + sgstRate
      const rate = fromDetails > 0 ? fromDetails : pct(it.taxRate)
      out.set(id, {
        invoiceNumber: invNo,
        invoiceDate: invDate && !Number.isNaN(invDate.getTime()) ? invDate : null,
        invoiceAmount: it.invoiceAmount != null ? num(it.invoiceAmount) : null,
        ratePct: rate > 0 || it.taxRate != null ? rate : null,
        igstRate,
        cgstRate,
      })
    }
  }
  return out
}

/** GET /v3/shipments/{ids} → delivery address per shipment. */
async function fetchAddresses(accessToken: string, shipmentIds: string[]): Promise<Map<string, FkAddress>> {
  const out = new Map<string, FkAddress>()
  const json = await flipkartGetJson(
    accessToken,
    `${getFlipkartApiBaseUrl()}/sellers/v3/shipments/${shipmentIds.map(encodeURIComponent).join(',')}`,
    'shipments/details'
  )
  const list = Array.isArray(json.shipments) ? (json.shipments as Record<string, unknown>[]) : []
  for (const s of list) {
    const id = String(s.shipmentId || '')
    const a = (s.deliveryAddress || s.billingAddress) as Record<string, unknown> | undefined
    if (!id || !a) continue
    out.set(id, {
      city: a.city ? String(a.city).trim() : null,
      state: a.state ? String(a.state).trim() : a.stateCode ? String(a.stateCode).trim() : null,
    })
  }
  return out
}

type PendingLine = {
  shipmentId: string
  orderId: string
  orderItemId: string
  orderDate: Date
  status: string | null
  qty: number
  title: string
  sku: string | null
  hsn: string | null
  sellingPrice: number
  shippingCharge: number
  totalPrice: number
  note: string | null
}

function toPendingLines(shipment: Record<string, unknown>): { lines: PendingLine[]; noDate: number } {
  const shipmentId = String(shipment.shipmentId || shipment.id || '')
  const items = Array.isArray(shipment.orderItems) ? (shipment.orderItems as Record<string, unknown>[]) : []
  const lines: PendingLine[] = []
  let noDate = 0
  for (const it of items) {
    const orderItemId = String(it.orderItemId || it.id || '')
    if (!orderItemId) continue
    const od = it.orderDate ? new Date(String(it.orderDate)) : null
    if (!od || Number.isNaN(od.getTime())) {
      noDate += 1
      continue
    }
    const pc = (it.priceComponents || {}) as Record<string, unknown>
    const sellingPrice = num(pc.sellingPrice)
    const shippingCharge = num(pc.shippingCharge)
    const totalPrice = pc.totalPrice != null ? num(pc.totalPrice) : sellingPrice + shippingCharge
    const cancelNote = it.cancellationReason
      ? `Cancelled: ${String(it.cancellationReason)}${it.cancellationSubReason ? ` / ${String(it.cancellationSubReason)}` : ''}`
      : null
    lines.push({
      shipmentId,
      orderId: String(it.orderId || shipmentId),
      orderItemId,
      orderDate: od,
      status: it.status ? String(it.status) : null,
      qty: Math.max(0, Math.floor(num(it.quantity))),
      title: String(it.title || it.sku || 'Flipkart item').slice(0, 500),
      sku: it.sku ? String(it.sku).trim().slice(0, 120) : null,
      hsn: it.hsn ? String(it.hsn).trim() : null,
      sellingPrice,
      shippingCharge,
      totalPrice,
      note: [cancelNote, it.isReplacement === true ? 'Replacement order' : null].filter(Boolean).join(' · ') || null,
    })
  }
  return { lines, noDate }
}

export type FlipkartSyncResult = { rows: number; skipped: boolean; logMessage?: string }

/**
 * Pulls shipments via the v3 Order Management filter API and maps order items into unified_sales.
 *
 * - Amounts come from `orderItems[].priceComponents` (tax-INCLUSIVE; totalPrice = sellingPrice + shippingCharge,
 *   for the full quantity). GST is backed out using the rate from `/v3/shipments/{ids}/invoices`
 *   (taxDetails igst/cgst/sgst rates) — before an invoice exists, `FLIPKART_DEFAULT_GST_RATE` is used if set,
 *   otherwise the line is flagged "GST rate unknown".
 * - Keys: `flipkart:<orderItemId>`, `source_order_id` = Flipkart orderId (not shipmentId).
 * - First run / `FLIPKART_UNIFIED_SALES_FULL_SYNC=1`: orders from the last FLIPKART_UNIFIED_SALES_LOOKBACK_DAYS (90).
 *   Later runs: orders from the last FLIPKART_STATUS_REFRESH_DAYS (30) + cancellations since the last sync.
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
  const sellerState = await getSellerStateCode(pool)

  const now = Date.now()
  const forceFull = process.env.FLIPKART_UNIFIED_SALES_FULL_SYNC === '1'
  const cursor = forceFull ? null : await getLastSyncCursor(pool, 'flipkart')
  const orderFrom = new Date(now - (cursor ? flipkartStatusRefreshDays() : flipkartLookbackDays()) * MS_DAY).toISOString()
  const cancelFrom = cursor
    ? new Date(cursor.getTime() - UNIFIED_SALES_INCREMENTAL_OVERLAP_MS).toISOString()
    : orderFrom
  const to = new Date(now).toISOString()

  const filters: FlipkartFilter[] = [
    {
      type: 'preDispatch',
      states: ['APPROVED', 'PACKING_IN_PROGRESS', 'PACKED', 'FORM_FAILED', 'READY_TO_DISPATCH'],
      orderDate: { from: orderFrom, to },
    },
    { type: 'postDispatch', states: ['SHIPPED', 'DELIVERED', 'PICKUP_COMPLETE'], orderDate: { from: orderFrom, to } },
    ...(['marketplaceCancellation', 'sellerCancellation', 'buyerCancellation'] as const).map(
      (cancellationType): FlipkartFilter => ({
        type: 'cancelled',
        states: ['CANCELLED'],
        cancellationType,
        cancellationDate: { from: cancelFrom, to },
      })
    ),
  ]

  const byItem = new Map<string, PendingLine>()
  let noDate = 0
  const filterErrors: string[] = []
  for (const filter of filters) {
    let next: string | null | undefined
    try {
      do {
        const page = await postShipmentFilter(accessToken, filter, next)
        next = page.nextPageUrl || null
        for (const raw of page.shipments || []) {
          const r = toPendingLines(raw as Record<string, unknown>)
          noDate += r.noDate
          for (const l of r.lines) byItem.set(l.orderItemId, l) // later filters (cancelled) win
        }
      } while (next)
    } catch (e: any) {
      // pre/post-dispatch failures are fatal (we'd silently miss sales); a cancellation sub-filter is not
      if (filter.type !== 'cancelled') throw e
      filterErrors.push(`${filter.cancellationType}: ${String(e?.message || e).slice(0, 120)}`)
    }
  }

  // Enrich in batches of 25 shipments (Flipkart's recommended limit)
  const shipmentIds = [...new Set([...byItem.values()].map((l) => l.shipmentId).filter(Boolean))]
  const invoices = new Map<string, FkInvoiceItem>()
  const addresses = new Map<string, FkAddress>()
  let enrichErrors = 0
  for (let i = 0; i < shipmentIds.length; i += 25) {
    const batch = shipmentIds.slice(i, i + 25)
    try {
      for (const [k, v] of await fetchInvoices(accessToken, batch)) invoices.set(k, v)
    } catch {
      enrichErrors += 1 // invoices not generated yet for pre-dispatch shipments, or endpoint not enabled
    }
    try {
      for (const [k, v] of await fetchAddresses(accessToken, batch)) addresses.set(k, v)
    } catch {
      enrichErrors += 1
    }
  }

  const defaultRate = process.env.FLIPKART_DEFAULT_GST_RATE ? pct(process.env.FLIPKART_DEFAULT_GST_RATE) : null
  let inserted = 0
  let unknownRate = 0

  for (const l of byItem.values()) {
    const inv = invoices.get(l.orderItemId)
    const addr = addresses.get(l.shipmentId)
    const state = normalizeIndianState(addr?.state)
    const gross = round2(inv?.invoiceAmount != null && inv.invoiceAmount > 0 ? inv.invoiceAmount : l.totalPrice)
    const ratePct = snapGstRate(inv?.ratePct ?? defaultRate)
    const notes = [l.note]
    let taxable = gross
    let tax = 0
    let shippingExTax = round2(l.shippingCharge)
    let split: { igst: number; cgst: number; sgst: number } | null = null
    if (ratePct != null) {
      const b = fromInclusive(gross, ratePct)
      taxable = b.taxable
      tax = b.tax
      shippingExTax = fromInclusive(l.shippingCharge, ratePct).taxable
      if (inv && inv.igstRate > 0) split = { igst: tax, cgst: 0, sgst: 0 }
      else if (inv && inv.cgstRate > 0) {
        const half = round2(tax / 2)
        split = { igst: 0, cgst: half, sgst: round2(tax - half) }
      } else split = splitGst(tax, state.code, sellerState)
      if (!inv) notes.push(`GST rate assumed ${ratePct}% (no Flipkart invoice yet)`)
    } else {
      unknownRate += 1
      notes.push('GST rate unknown — amount shown is tax-inclusive; review before export')
    }

    await upsertUnifiedSaleLine(pool, {
      platform: 'flipkart',
      source_order_id: l.orderId,
      line_key: `flipkart:${l.orderItemId}`,
      product_name: l.title,
      quantity: l.qty,
      price: l.qty > 0 ? round2(taxable / l.qty) : taxable,
      tax,
      shipping: shippingExTax,
      total: round2(taxable + tax),
      city: addr?.city ? (state.name ? `${addr.city}, ${state.name}` : addr.city) : null,
      order_date: l.orderDate,
      currency: 'INR',
      order_status: l.status,
      business_type: 'B2C',
      shipping_state: state.name,
      ship_state_code: state.code,
      line_note: notes.filter(Boolean).join(' · ') || null,
      seller_sku: l.sku,
      hsn_code: l.hsn,
      igst: split ? split.igst : null,
      cgst: split ? split.cgst : null,
      sgst: split ? split.sgst : null,
      tax_rate_pct: ratePct,
      taxable_value: taxable,
      invoice_number: inv?.invoiceNumber ?? null,
      invoice_date: inv?.invoiceDate ?? null,
      doc_type: 'invoice',
      tax_source: inv ? 'flipkart_invoice' : 'flipkart_order',
    })
    inserted += 1
  }

  const msgs: string[] = []
  if (inserted === 0) msgs.push('No Flipkart order items returned (filters / account / API access)')
  if (unknownRate) msgs.push(`${unknownRate} line(s) without GST rate (set FLIPKART_DEFAULT_GST_RATE or wait for invoices)`)
  if (noDate) msgs.push(`${noDate} item(s) skipped: missing orderDate`)
  if (enrichErrors) msgs.push(`${enrichErrors} invoice/address batch call(s) failed`)
  if (filterErrors.length) msgs.push(`cancelled filter errors: ${filterErrors.join('; ')}`)

  return { rows: inserted, skipped: false, logMessage: msgs.length ? msgs.join(' | ') : undefined }
}
