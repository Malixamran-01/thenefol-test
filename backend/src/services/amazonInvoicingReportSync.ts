import { Pool } from 'pg'
import {
  createAmazonSellingPartner,
  DEFAULT_MARKETPLACE_IN,
  getLwaClientId,
  getLwaClientSecret,
  resolveAmazonRefreshToken,
} from './amazonSpCommon'

/**
 * SP-API Reports API is the supported source for Amazon-issued invoice numbers (India GST MTR, EU MFV, etc.).
 * Orders API does not expose tax invoice numbers for most seller programs.
 *
 * India: `GET_GST_MTR_B2B_CUSTOM` + `GET_GST_MTR_B2C_CUSTOM` (Tax Invoicing role; tab-delimited).
 * Optional EU MFN: `GET_FLAT_FILE_ORDER_REPORT_DATA_INVOICING` — set via env.
 *
 * @see https://developer-docs.amazon.com/sp-api/docs/report-type-values-tax
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
  if (defaultReportTypesForMarketplace(marketplaceId).length > 0) {
    return true
  }
  return false
}

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s_]+/g, ' ')
}

/** Map GST MTR and EU TSV `json: true` row keys to our fields. */
function pickOrderIdAndDocument(row: Record<string, unknown>): { orderId: string; document: string } | null {
  let orderId: string | null = null
  const docParts: string[] = []
  for (const [k, v] of Object.entries(row)) {
    if (v == null || v === '') continue
    const nk = normalizeKey(k)
    if (nk === 'order id' || nk === 'order-id' || nk === 'amazon order id' || nk === 'orderid' || /order id$/.test(nk)) {
      const s = String(v).trim()
      if (s) orderId = s
      continue
    }
    if (nk === 'invoice number' || nk === 'invoice no' || nk === 'invoice no.') {
      const s = String(v).trim()
      if (s) docParts.push(s)
      continue
    }
    if (nk === 'credit note no' || nk === 'credit note number' || nk === 'credit note no.') {
      const s = String(v).trim()
      if (s) docParts.push(`CN ${s}`)
    }
  }
  if (!orderId) return null
  if (docParts.length === 0) return null
  return { orderId, document: [...new Set(docParts)].join(' | ').slice(0, 500) }
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

/**
 * Fetches on-demand report(s), parses order id → invoice / credit document id, `UPDATE`s `unified_sales` for `platform = 'amazon'`.
 * Requires Reports API (and for GST MTR, Tax Invoicing / restricted role as per Amazon).
 */
export async function syncAmazonInvoicingReports(pool: Pool): Promise<AmazonInvoiceReportResult> {
  if (process.env.AMAZON_SP_API_ENABLED === '0') {
    return { rowsUpdated: 0, skipped: true, logMessage: 'Amazon SP-API disabled' }
  }

  const region = (process.env.AMAZON_SP_API_REGION || 'eu').trim()
  const marketplaceId = (process.env.AMAZON_MARKETPLACE_ID || DEFAULT_MARKETPLACE_IN).trim()
  if (!shouldRunInvoicingSync(marketplaceId)) {
    return { rowsUpdated: 0, skipped: true, logMessage: 'Invoicing report sync not enabled for this config' }
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
  const dataEnd = new Date()
  const dataStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const dataStartTime = dataStart.toISOString()
  const dataEndTime = dataEnd.toISOString()

  const orderToInvoices = new Map<string, Set<string>>()
  const detail: string[] = []
  const interval = Math.max(3000, parseInt(process.env.AMAZON_INVOICE_REPORT_POLL_MS || '10000', 10) || 10000)
  const version = (process.env.AMAZON_REPORTS_API_VERSION || '2021-06-30').trim() || '2021-06-30'

  for (const reportType of reportTypes) {
    try {
      const res = await (sp as { downloadReport: (c: any) => Promise<unknown> }).downloadReport({
        version,
        interval,
        cancel_after: 30,
        body: {
          reportType,
          marketplaceIds: [marketplaceId],
          dataStartTime,
          dataEndTime,
        },
        download: {
          json: true,
          unzip: true,
        },
      })
      const data = (res as { payload?: unknown } | null)?.payload != null ? (res as { payload: unknown }).payload : res
      const recs = rowsFromJsonReport(data)
      const before = orderToInvoices.size
      for (const r of recs) {
        const p = pickOrderIdAndDocument(r)
        if (!p) continue
        if (!orderToInvoices.has(p.orderId)) orderToInvoices.set(p.orderId, new Set())
        orderToInvoices.get(p.orderId)!.add(p.document)
      }
      detail.push(`${reportType}: ${recs.length} rows, +${orderToInvoices.size - before} order keys`)
    } catch (e: any) {
      const err = (e && (e.message || e.toString())) || 'unknown'
      detail.push(`${reportType}: error ${err.slice(0, 200)}`)
    }
  }

  if (orderToInvoices.size === 0) {
    return {
      rowsUpdated: 0,
      skipped: false,
      logMessage: 'No order→invoice rows parsed from report(s) (check roles, report types, and date range)',
      detail,
    }
  }

  const orderIds = [...orderToInvoices.keys()]
  const values = orderIds.map((oid) => {
    const set = orderToInvoices.get(oid)!
    return [...set].filter(Boolean).join(' | ').slice(0, 500)
  })

  const { rowCount } = await pool.query(
    `update unified_sales u
     set invoice_number = d.inv, updated_at = now()
     from unnest($1::text[], $2::text[]) as d(oid, inv)
     where u.platform = 'amazon'
       and u.source_order_id = d.oid
       and d.inv is not null
       and d.inv != ''`,
    [orderIds, values]
  )

  return {
    rowsUpdated: rowCount ?? 0,
    skipped: false,
    detail,
  }
}
