import { Pool } from 'pg'
import {
  createAmazonSellingPartner,
  DEFAULT_MARKETPLACE_IN,
  getLwaClientId,
  getLwaClientSecret,
  resolveAmazonRefreshToken,
} from './amazonSpCommon'
import { getLastSyncCursor, setLastSyncCursor } from './unifiedSalesCursor'
import { upsertUnifiedSaleLine } from './unifiedSalesUpsert'
import { normalizeIndianState, round2, snapGstRate } from './gstUtils'

/**
 * Amazon's GST Merchant Tax Report (MTR) is the authoritative source for what Amazon actually invoiced:
 * invoice / credit-note numbers and dates, HSN, taxable value, GST rate, IGST vs CGST+SGST, ship-to state,
 * B2B buyer GSTIN and name. Orders API figures are only provisional.
 *
 * India: `GET_GST_MTR_B2B_CUSTOM` + `GET_GST_MTR_B2C_CUSTOM` (Tax Invoicing role; tab-delimited).
 * Optional EU MFN: `GET_FLAT_FILE_ORDER_REPORT_DATA_INVOICING` — set via env (invoice numbers only).
 *
 * Per row `Transaction Type`:
 * - Shipment → overwrite the matching unified_sales line(s) (order id + SKU) with MTR figures, `tax_source='gst_report'`
 * - Refund   → upsert a separate `doc_type='credit_note'` line (BUSY: Sales Return / Credit Note voucher)
 * - Cancel   → mark the matching lines `order_status='Canceled'`
 *
 * @see https://developer-docs.amazon/sp-api/docs/report-type-values-tax
 */

export type AmazonInvoiceReportResult = {
  rowsUpdated: number
  skipped: boolean
  logMessage?: string
  /** One line per report type attempted (for admin sync log) */
  detail?: string[]
}

function reportLookbackDays(): number {
  const raw = process.env.AMAZON_INVOICE_REPORT_LOOKBACK_DAYS || '30'
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return 30
  return Math.min(90, Math.max(1, n))
}

/** MTR generation is slow (minutes) and throttled — don't request it every hourly run. */
function reportEveryHours(): number {
  const n = parseInt(String(process.env.AMAZON_INVOICE_REPORT_EVERY_HOURS || '6'), 10)
  return Number.isFinite(n) && n >= 0 ? n : 6
}

function defaultReportTypesForMarketplace(marketplaceId: string): string[] {
  const o = (process.env.AMAZON_INVOICING_REPORT_TYPES || '').trim()
  if (o) {
    return o
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (marketplaceId === DEFAULT_MARKETPLACE_IN) {
    return ['GET_GST_MTR_B2B_CUSTOM', 'GET_GST_MTR_B2C_CUSTOM']
  }
  if (process.env.AMAZON_INVOICING_REPORT_EU_MFN === '1' || process.env.AMAZON_INVOICING_REPORT_EU_MFN === 'true') {
    return ['GET_FLAT_FILE_ORDER_REPORT_DATA_INVOICING']
  }
  return []
}

function shouldRunInvoicingSync(marketplaceId: string): boolean {
  if (process.env.AMAZON_INVOICING_REPORT_SYNC === '0' || process.env.AMAZON_INVOICING_REPORT_SYNC === 'false') {
    return false
  }
  if (process.env.AMAZON_INVOICING_REPORT_SYNC === '1' || process.env.AMAZON_INVOICING_REPORT_SYNC === 'true') {
    return true
  }
  return defaultReportTypesForMarketplace(marketplaceId).length > 0
}

/** "Order Id" / "order-id" / "order_id" → "order id" */
function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s_-]+/g, ' ')
}

/** Row accessor tolerant of header spelling (MTR headers are "Order Id", "Hsn/sac", "Cgst Rate", ...). */
function rowGetter(row: Record<string, unknown>) {
  const m = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) m.set(normalizeKey(k), v)
  const str = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = m.get(normalizeKey(k))
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
    return null
  }
  const num = (...keys: string[]): number => {
    const s = str(...keys)
    if (s == null) return 0
    const n = Number(s.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return { str, num }
}

/** MTR timestamps carry no zone and are IST — parse them as IST so late-evening invoices keep their GST date. */
function parseReportDate(s: string | null): Date | null {
  if (!s) return null
  const t = s.trim()
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/)
  if (iso) {
    const d = new Date(`${iso[1]}T${iso[2] || '00:00:00'}+05:30`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // dd-mm-yyyy or dd/mm/yyyy (optionally followed by a time we ignore)
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (m) {
    const d2 = new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00+05:30`)
    return Number.isNaN(d2.getTime()) ? null : d2
  }
  const d = new Date(t) // has an explicit zone (e.g. 2026-09-14T10:22:01Z)
  return Number.isNaN(d.getTime()) ? null : d
}

function rowsFromJsonReport(data: unknown): Record<string, unknown>[] {
  if (data == null) return []
  if (Array.isArray(data)) {
    return data.filter((r) => r && typeof r === 'object' && !Array.isArray(r)) as Record<string, unknown>[]
  }
  const o = data as { records?: unknown; rows?: unknown; payload?: unknown; data?: unknown }
  for (const key of ['records', 'rows', 'payload', 'data'] as const) {
    const v = o[key]
    if (Array.isArray(v)) {
      return v as Record<string, unknown>[]
    }
  }
  return []
}

type MtrLine = {
  type: 'shipment' | 'refund' | 'cancel' | 'other'
  orderId: string
  sku: string | null
  asin: string | null
  title: string | null
  hsn: string | null
  qty: number
  invoiceNumber: string | null
  invoiceDate: Date | null
  creditNoteNo: string | null
  creditNoteDate: Date | null
  shipState: string | null
  shipCity: string | null
  taxable: number
  totalTax: number
  invoiceAmount: number
  shippingBasis: number
  igstAny: boolean
  utgstAny: boolean
  cess: number
  reportedRatePct: number
  buyerGstin: string | null
  buyerName: string | null
  isB2B: boolean
}

function emptyMtr(orderId: string): MtrLine {
  return {
    type: 'other', orderId, sku: null, asin: null, title: null, hsn: null, qty: 0, invoiceNumber: null,
    invoiceDate: null, creditNoteNo: null, creditNoteDate: null, shipState: null, shipCity: null, taxable: 0,
    totalTax: 0, invoiceAmount: 0, shippingBasis: 0, igstAny: false, utgstAny: false, cess: 0, reportedRatePct: 0,
    buyerGstin: null, buyerName: null, isB2B: false,
  }
}

export function parseMtrRow(row: Record<string, unknown>, isB2B: boolean): MtrLine | null {
  const { str, num } = rowGetter(row)
  const orderId = str('Order Id', 'amazon order id', 'order-id')
  if (!orderId) return null
  const tt = (str('Transaction Type') || '').toLowerCase()
  const type: MtrLine['type'] =
    tt.startsWith('ship') ? 'shipment' : tt.startsWith('refund') ? 'refund' : tt.startsWith('cancel') ? 'cancel' : 'other'
  // EU invoicing flat file has no Transaction Type / tax columns — only order id → invoice number
  if (type === 'other' && !tt) {
    const inv = str('Invoice Number', 'invoice no', 'invoice-number')
    if (!inv) return null
    return { ...emptyMtr(orderId), type: 'other', invoiceNumber: inv, sku: str('Sku', 'seller sku') }
  }

  const igst = num('Igst Tax') + num('Shipping Igst Tax') + num('Gift Wrap Igst Tax')
  const utgst = num('Utgst Tax') + num('Shipping Utgst Tax') + num('Gift Wrap Utgst Tax')
  const rateSum = num('Cgst Rate') + num('Sgst Rate') + num('Utgst Rate') + num('Igst Rate')

  return {
    type,
    orderId,
    sku: str('Sku', 'seller sku'),
    asin: str('Asin'),
    title: str('Item Description'),
    hsn: str('Hsn/sac', 'hsn sac', 'hsn'),
    qty: Math.abs(num('Quantity')),
    invoiceNumber: str('Invoice Number', 'invoice no'),
    invoiceDate: parseReportDate(str('Invoice Date')),
    creditNoteNo: str('Credit Note No', 'credit note number'),
    creditNoteDate: parseReportDate(str('Credit Note Date')),
    shipState: str('Ship To State'),
    shipCity: str('Ship To City'),
    taxable: num('Tax Exclusive Gross'),
    totalTax: num('Total Tax Amount'),
    invoiceAmount: num('Invoice Amount'),
    shippingBasis: num('Shipping Amount Basis'),
    igstAny: Math.abs(igst) > 0.0001 || num('Igst Rate') > 0,
    utgstAny: Math.abs(utgst) > 0.0001 || num('Utgst Rate') > 0,
    cess: num('Compensatory Cess Tax') + num('Shipping Cess Tax Amount') + num('Gift Wrap Compensatory Cess Tax'),
    // MTR rates are fractions (0.09) in most exports; accept percentages too
    reportedRatePct: rateSum > 0 && rateSum <= 1 ? rateSum * 100 : rateSum,
    buyerGstin: str('Customer Bill To Gstid', 'Customer Ship To Gstid'),
    buyerName: str('Buyer Name'),
    isB2B,
  }
}

/** Sum several MTR rows (multi-shipment items) for the same order + SKU + document. */
function addInto(acc: MtrLine, r: MtrLine): MtrLine {
  return {
    ...acc,
    qty: acc.qty + r.qty,
    taxable: acc.taxable + r.taxable,
    totalTax: acc.totalTax + r.totalTax,
    invoiceAmount: acc.invoiceAmount + r.invoiceAmount,
    shippingBasis: acc.shippingBasis + r.shippingBasis,
    cess: acc.cess + r.cess,
    igstAny: acc.igstAny || r.igstAny,
    utgstAny: acc.utgstAny || r.utgstAny,
    invoiceNumber: [acc.invoiceNumber, r.invoiceNumber].includes(r.invoiceNumber)
      ? acc.invoiceNumber
      : [acc.invoiceNumber, r.invoiceNumber].filter(Boolean).join(' | '),
  }
}

/** Amounts + GST heads for storage (always positive; doc_type carries the sign). */
export function financials(l: MtrLine) {
  const taxable = round2(Math.abs(l.taxable))
  const tax = round2(Math.abs(l.totalTax))
  const cess = round2(Math.abs(l.cess))
  const gstExCess = round2(tax - cess)
  const half = round2(gstExCess / 2)
  const derivedRate = taxable > 0 ? (gstExCess / taxable) * 100 : null
  return {
    taxable_value: taxable,
    tax,
    total: round2(taxable + tax),
    shipping: round2(Math.abs(l.shippingBasis)),
    price: l.qty > 0 ? round2(taxable / l.qty) : taxable,
    igst: l.igstAny ? gstExCess : 0,
    cgst: l.igstAny ? 0 : half,
    sgst: l.igstAny || l.utgstAny ? 0 : round2(gstExCess - half),
    utgst: !l.igstAny && l.utgstAny ? round2(gstExCess - half) : 0,
    cess,
    tax_rate_pct: snapGstRate(derivedRate ?? l.reportedRatePct),
  }
}

type SpClient = ReturnType<typeof createAmazonSellingPartner>

async function sleepMs(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

/**
 * createReport → poll getReport → getReportDocument → download, like the library's `downloadReport()`, but with a
 * Restricted Data Token on getReportDocument. The GST MTR reports contain buyer PII (name, GSTIN, address) and are
 * restricted report types: Amazon requires an RDT for their document, and `downloadReport()` never sends one —
 * the likely reason invoice numbers never arrived before. Falls back to the plain LWA token if the RDT call fails.
 *
 * Status CANCELLED from Amazon means "no data for this range" (not an error) → `{ status: 'EMPTY' }`.
 */
async function fetchRestrictedReport(
  sp: SpClient,
  cfg: { version: string; interval: number; body: Record<string, unknown> }
): Promise<{ status: 'DONE'; data: unknown; usedRdt: boolean } | { status: 'EMPTY' }> {
  const created = await sp.callAPI({
    operation: 'createReport',
    endpoint: 'reports',
    body: cfg.body,
    options: { version: cfg.version },
  })
  const reportId = String(created?.reportId || '')
  if (!reportId) throw new Error('createReport returned no reportId')

  let report: any = null
  for (let i = 0; i < 40; i++) {
    await sleepMs(cfg.interval)
    report = await sp.callAPI({
      operation: 'getReport',
      endpoint: 'reports',
      path: { reportId },
      options: { version: cfg.version },
    })
    const st = String(report?.processingStatus || '')
    if (st === 'DONE') break
    if (st === 'CANCELLED') return { status: 'EMPTY' }
    if (st === 'FATAL') {
      // A FATAL report often carries an error document explaining why (e.g. missing role, bad range)
      let reason = ''
      if (report?.reportDocumentId) {
        try {
          const doc = await sp.callAPI({
            operation: 'getReportDocument',
            endpoint: 'reports',
            path: { reportDocumentId: report.reportDocumentId },
            options: { version: cfg.version },
          })
          const buf = await sp.download(doc, { unzip: true })
          reason = String(buf).replace(/\s+/g, ' ').slice(0, 200)
        } catch {
          /* ignore */
        }
      }
      throw new Error(`report FATAL${reason ? `: ${reason}` : ''}`)
    }
  }
  if (String(report?.processingStatus) !== 'DONE') throw new Error(`report ${reportId} still ${report?.processingStatus} after polling`)

  const reportDocumentId = String(report.reportDocumentId)
  let rdt: string | undefined
  try {
    const tok = await sp.callAPI({
      operation: 'createRestrictedDataToken',
      endpoint: 'tokens',
      body: {
        restrictedResources: [{ method: 'GET', path: `/reports/2021-06-30/documents/${reportDocumentId}` }],
      },
    })
    rdt = tok?.restrictedDataToken ? String(tok.restrictedDataToken) : undefined
  } catch {
    rdt = undefined // app not approved for the restricted role → try with the LWA token
  }

  const doc = await sp.callAPI({
    operation: 'getReportDocument',
    endpoint: 'reports',
    path: { reportDocumentId },
    ...(rdt ? { restricted_data_token: rdt } : {}),
    options: { version: cfg.version },
  })
  // Don't use download({ json: true }): it only parses when the S3 content-type is text/plain or XML and otherwise
  // returns the raw string — which used to look like "0 rows" with no error.
  const raw = await sp.download(doc, { unzip: true })
  return { status: 'DONE', data: parseDelimitedReport(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)), usedRdt: !!rdt }
}

/**
 * Parse a flat-file report (tab-delimited for the on-demand MTR, comma-separated for the scheduled ones)
 * into header-keyed rows. Handles quoted fields and a UTF-8 BOM.
 */
export function parseDelimitedReport(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.slice(0, src.search(/\r?\n/) === -1 ? src.length : src.search(/\r?\n/))
  const delim = (firstLine.match(/\t/g) || []).length >= (firstLine.match(/,/g) || []).length ? '\t' : ','

  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"' && field === '' && delim === ',') inQuotes = true // TSV reports are unquoted
    else if (ch === delim) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((c) => c !== '')) rows.push(row)

  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

/** Turn SP-API errors into an actionable sync-log message. */
function explainReportError(e: any): string {
  const msg = String((e && (e.message || e.toString())) || 'unknown')
  const code = String(e?.code || '')
  if (/unauthori[sz]ed|access to requested resource is denied|403/i.test(msg + code)) {
    return `access denied — the SP-API app needs the "Tax Invoicing (Restricted)" role (Developer Central → app → edit roles, then re-authorise the seller). ${msg.slice(0, 120)}`
  }
  if (/invalid.*report ?type|reportType/i.test(msg)) return `report type not available for this account: ${msg.slice(0, 160)}`
  return `error ${msg.slice(0, 200)}`
}

/**
 * Fetches on-demand MTR report(s) and applies them to `unified_sales` (see file header).
 * Requires Reports API (and for GST MTR, Tax Invoicing / restricted role as per Amazon).
 */
export async function syncAmazonInvoicingReports(
  pool: Pool,
  opts: { force?: boolean } = {}
): Promise<AmazonInvoiceReportResult> {
  if (process.env.AMAZON_SP_API_ENABLED === '0') {
    return { rowsUpdated: 0, skipped: true, logMessage: 'Amazon SP-API disabled' }
  }

  const region = (process.env.AMAZON_SP_API_REGION || 'eu').trim()
  const marketplaceId = (process.env.AMAZON_MARKETPLACE_ID || DEFAULT_MARKETPLACE_IN).trim()
  if (!shouldRunInvoicingSync(marketplaceId)) {
    return { rowsUpdated: 0, skipped: true, logMessage: 'Invoicing report sync not enabled for this config' }
  }

  const startedAt = new Date()
  if (!opts.force) {
    const last = await getLastSyncCursor(pool, 'amazon_gst_report')
    if (last && startedAt.getTime() - last.getTime() < reportEveryHours() * 60 * 60 * 1000) {
      return {
        rowsUpdated: 0,
        skipped: true,
        logMessage: `GST report last applied ${last.toISOString()} (runs every ${reportEveryHours()}h; "Sync now" forces it)`,
      }
    }
  }

  const refresh_token = await resolveAmazonRefreshToken(pool)
  const clientId = getLwaClientId()
  const clientSecret = getLwaClientSecret()
  if (!refresh_token || !clientId || !clientSecret) {
    return { rowsUpdated: 0, skipped: true, logMessage: 'Missing LWA/refresh token' }
  }

  const reportTypes = defaultReportTypesForMarketplace(marketplaceId)
  if (reportTypes.length === 0) {
    return {
      rowsUpdated: 0,
      skipped: true,
      logMessage:
        'Set AMAZON_INVOICING_REPORT_TYPES (comma-separated) or use India marketplace, or AMAZON_INVOICING_REPORT_EU_MFN=1',
    }
  }

  const sp = createAmazonSellingPartner(region, refresh_token)
  const days = reportLookbackDays()
  const dataEndTime = new Date().toISOString()

  const detail: string[] = []
  const interval = Math.max(3000, parseInt(process.env.AMAZON_INVOICE_REPORT_POLL_MS || '10000', 10) || 10000)
  const version = (process.env.AMAZON_REPORTS_API_VERSION || '2021-06-30').trim() || '2021-06-30'

  /** key = type|orderId|sku|docNo */
  const grouped = new Map<string, MtrLine>()
  let anyReportOk = false
  let invoiceNumbersSeen = 0

  for (const reportType of reportTypes) {
    // Amazon only serves the last 45 days for the on-demand B2C MTR
    const typeDays = /B2C/i.test(reportType) ? Math.min(days, 45) : days
    const dataStartTime = new Date(Date.now() - typeDays * 24 * 60 * 60 * 1000).toISOString()
    try {
      const res = await fetchRestrictedReport(sp, {
        version,
        interval,
        body: { reportType, marketplaceIds: [marketplaceId], dataStartTime, dataEndTime },
      })
      if (res.status === 'EMPTY') {
        anyReportOk = true
        detail.push(`${reportType}: no invoices in range (Amazon cancelled the report = no data)`)
        continue
      }
      const recs = rowsFromJsonReport(res.data)
      anyReportOk = true
      let parsed = 0
      for (const r of recs) {
        const l = parseMtrRow(r, /B2B/i.test(reportType))
        if (!l) continue
        parsed += 1
        if (l.invoiceNumber || l.creditNoteNo) invoiceNumbersSeen += 1
        const doc = l.type === 'refund' ? l.creditNoteNo || '' : l.invoiceNumber || ''
        const key = `${l.type}|${l.orderId}|${l.sku || l.asin || ''}|${doc}`
        const prev = grouped.get(key)
        grouped.set(key, prev ? addInto(prev, l) : l)
      }
      const headers = recs[0] ? Object.keys(recs[0]) : []
      const hasInvoiceCol = headers.some((h) => /invoice\s*number/i.test(h))
      detail.push(
        `${reportType}: ${recs.length} rows (${parsed} usable${res.usedRdt ? ', RDT' : ', no RDT'})` +
          (recs.length && !hasInvoiceCol ? ` — NO "Invoice Number" column; headers: ${headers.slice(0, 8).join(', ')}` : '')
      )
    } catch (e: any) {
      detail.push(`${reportType}: ${explainReportError(e)}`)
    }
  }
  if (anyReportOk && grouped.size > 0 && invoiceNumbersSeen === 0) {
    detail.push('Report rows had no invoice numbers — check Seller Central → Tax settings (Amazon invoicing enabled for your GSTIN)')
  }

  if (!anyReportOk) {
    return { rowsUpdated: 0, skipped: false, logMessage: 'GST report download failed', detail }
  }

  let updated = 0
  let creditNotes = 0
  let cancelled = 0
  let unmatched = 0

  for (const l of grouped.values()) {
    const skuMatch = `and (seller_sku = $2 or $2::text is null)`
    if (l.type === 'other') {
      // Invoice number only (EU flat file); never touch rows already set from a GST report
      const r = await pool.query(
        `update unified_sales set invoice_number = $3, updated_at = now()
         where platform = 'amazon' and doc_type = 'invoice' and source_order_id = $1 ${skuMatch}
           and coalesce(tax_source, '') <> 'gst_report'`,
        [l.orderId, l.sku, l.invoiceNumber]
      )
      updated += r.rowCount ?? 0
      continue
    }
    if (l.type === 'cancel') {
      const r = await pool.query(
        `update unified_sales set order_status = 'Canceled', updated_at = now()
         where platform = 'amazon' and doc_type = 'invoice' and source_order_id = $1 ${skuMatch}`,
        [l.orderId, l.sku]
      )
      cancelled += r.rowCount ?? 0
      continue
    }

    const state = normalizeIndianState(l.shipState)
    const f = financials(l)

    if (l.type === 'refund') {
      const cnDate = l.creditNoteDate || l.invoiceDate
      if (!cnDate) continue
      const { rows: orig } = await pool.query(
        `select product_name, seller_sku, asin, city, business_type, buyer_gstin, invoice_number
         from unified_sales where platform = 'amazon' and doc_type = 'invoice' and source_order_id = $1 ${skuMatch}
         limit 1`,
        [l.orderId, l.sku]
      )
      const o = orig[0] || {}
      await upsertUnifiedSaleLine(pool, {
        platform: 'amazon',
        source_order_id: l.orderId,
        line_key: `amazon:cn:${l.orderId}:${l.sku || l.asin || 'na'}:${l.creditNoteNo || cnDate.toISOString().slice(0, 10)}`,
        product_name: String(o.product_name || l.title || 'Amazon item').slice(0, 500),
        quantity: l.qty,
        city: o.city || l.shipCity,
        order_date: cnDate,
        currency: 'INR',
        order_status: 'Refunded',
        business_type: o.business_type || (l.isB2B ? 'B2B' : 'B2C'),
        shipping_state: state.name,
        ship_state_code: state.code,
        line_note: `Credit note against invoice ${l.invoiceNumber || o.invoice_number || '?'}`,
        buyer_gstin: l.buyerGstin || o.buyer_gstin || null,
        buyer_name: l.buyerName,
        seller_sku: l.sku || o.seller_sku || null,
        asin: l.asin || o.asin || null,
        hsn_code: l.hsn,
        ...f,
        invoice_number: l.creditNoteNo,
        invoice_date: cnDate,
        doc_type: 'credit_note',
        tax_source: 'gst_report',
      })
      creditNotes += 1
      continue
    }

    // Shipment: overwrite matching provisional lines; split across duplicates of the same SKU by quantity
    const { rows: targets } = await pool.query<{ id: number; quantity: number }>(
      `select id, quantity from unified_sales
       where platform = 'amazon' and doc_type = 'invoice' and source_order_id = $1
         and (seller_sku = $2 or $2::text is null or seller_sku is null)
       order by id`,
      [l.orderId, l.sku]
    )
    if (targets.length === 0) {
      unmatched += 1
      continue
    }
    const qtySum = targets.reduce((s, t) => s + (Number(t.quantity) || 0), 0)
    for (const t of targets) {
      const share = targets.length === 1 ? 1 : qtySum > 0 ? (Number(t.quantity) || 0) / qtySum : 1 / targets.length
      const sc = (n: number) => round2(n * share)
      const qty = targets.length === 1 ? (l.qty || Number(t.quantity) || 0) : Number(t.quantity) || 0
      const taxable = sc(f.taxable_value)
      await pool.query(
        `update unified_sales set
           quantity = $2, price = $3, taxable_value = $4, tax = $5, total = $6, shipping = $7,
           igst = $8, cgst = $9, sgst = $10, utgst = $11, cess = $12, tax_rate_pct = $13,
           invoice_number = coalesce($14, invoice_number), invoice_date = coalesce($15, invoice_date),
           hsn_code = coalesce($16, hsn_code),
           shipping_state = coalesce($17, shipping_state), ship_state_code = coalesce($18, ship_state_code),
           buyer_gstin = coalesce($19, buyer_gstin), buyer_name = coalesce($20, buyer_name),
           business_type = coalesce(business_type, $21),
           tax_source = 'gst_report', updated_at = now()
         where id = $1`,
        [
          t.id,
          qty,
          qty > 0 ? round2(taxable / qty) : taxable,
          taxable,
          sc(f.tax),
          sc(f.total),
          sc(f.shipping),
          sc(f.igst),
          sc(f.cgst),
          sc(f.sgst),
          sc(f.utgst),
          sc(f.cess),
          f.tax_rate_pct,
          l.invoiceNumber,
          l.invoiceDate,
          l.hsn,
          state.name,
          state.code,
          l.buyerGstin,
          l.buyerName,
          l.isB2B ? 'B2B' : 'B2C',
        ]
      )
      updated += 1
    }
  }

  await setLastSyncCursor(pool, 'amazon_gst_report', startedAt)

  const summary = `GST report: ${updated} line(s) set from MTR, ${creditNotes} credit note(s), ${cancelled} cancelled` +
    (unmatched ? `, ${unmatched} unmatched (order not synced yet — retried next run)` : '')
  return {
    rowsUpdated: updated + creditNotes + cancelled,
    skipped: false,
    logMessage: summary,
    detail,
  }
}
