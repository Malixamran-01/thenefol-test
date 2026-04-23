import { Pool } from 'pg'
import { syncWebsiteSales } from './syncWebsiteSales'
import { syncAmazonInvoicingReports } from './amazonInvoicingReportSync'
import { syncAmazonUnifiedSales } from './amazonSpApiSync'
import { syncFlipkartUnifiedSales } from './flipkartSellerSync'

/** Avoid spamming logs every hour when a marketplace API is down (same message ≤1/hour per platform). */
const MARKETPLACE_WARN_COOLDOWN_MS = 60 * 60 * 1000
const lastMarketplaceWarnAt: Partial<Record<'amazon' | 'flipkart', number>> = {}

function warnMarketplaceFailure(platform: 'amazon' | 'flipkart', msg: string) {
  const now = Date.now()
  const last = lastMarketplaceWarnAt[platform] || 0
  if (now - last < MARKETPLACE_WARN_COOLDOWN_MS) return
  lastMarketplaceWarnAt[platform] = now
  console.warn(`[unified-sales] ${platform} sync failed (other platforms still run):`, msg)
}

/** Strip HTML / huge payloads from sync log messages shown in admin UI */
function sanitizeSyncMessage(msg: string | null | undefined): string | null {
  if (msg == null || msg === '') return null
  let s = String(msg)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > 420) s = `${s.slice(0, 417)}...`
  return s || null
}

async function insertLog(
  pool: Pool,
  platform: string,
  status: string,
  message: string | null,
  rowsSynced: number
) {
  await pool.query(
    `insert into sales_sync_logs (platform, status, message, rows_synced, finished_at)
     values ($1, $2, $3, $4, now())`,
    [platform, status, sanitizeSyncMessage(message), rowsSynced]
  )
}

export type SyncPlatform = 'website' | 'amazon' | 'flipkart'

export async function runUnifiedSalesSync(pool: Pool, platforms: SyncPlatform[]): Promise<{
  website?: { rows: number }
  amazon?: {
    rows: number
    skipped?: boolean
    logMessage?: string
    error?: string
    invoicingReport?: { rowsUpdated: number; skipped?: boolean; logMessage?: string; detail?: string[] }
  }
  flipkart?: { rows: number; skipped?: boolean; logMessage?: string; error?: string }
}> {
  const out: any = {}

  if (platforms.includes('website')) {
    try {
      const r = await syncWebsiteSales(pool)
      out.website = r
      await insertLog(pool, 'website', 'success', null, r.rows)
    } catch (e: any) {
      await insertLog(pool, 'website', 'error', e?.message || String(e), 0)
      throw e
    }
  }

  if (platforms.includes('amazon')) {
    try {
      const r = await syncAmazonUnifiedSales(pool)
      let inv: Awaited<ReturnType<typeof syncAmazonInvoicingReports>> | null = null
      if (!r.skipped) {
        try {
          inv = await syncAmazonInvoicingReports(pool)
        } catch (invErr: any) {
          inv = {
            rowsUpdated: 0,
            skipped: true,
            logMessage: invErr?.message || String(invErr),
          }
        }
      }
      out.amazon = {
        ...r,
        invoicingReport: inv || undefined,
      }
      const invMsg = inv
        ? inv.skipped
          ? inv.logMessage
          : `Invoicing reports: ${inv.rowsUpdated} line(s) updated; ${(inv.detail || []).join(' · ').slice(0, 300)}`
        : null
      const combinedMsg = [r.skipped ? r.logMessage || 'SP-API not configured' : r.logMessage || null, invMsg]
        .filter((x) => x && String(x).trim())
        .join(' | ')
        .slice(0, 500)
        || null
      await insertLog(
        pool,
        'amazon',
        r.skipped && (!inv || inv.skipped) ? 'skipped' : 'success',
        combinedMsg,
        r.rows
      )
    } catch (e: any) {
      const msg = e?.message || String(e)
      await insertLog(pool, 'amazon', 'error', msg, 0)
      out.amazon = { rows: 0, error: msg }
      warnMarketplaceFailure('amazon', msg)
    }
  }

  if (platforms.includes('flipkart')) {
    try {
      const r = await syncFlipkartUnifiedSales(pool)
      out.flipkart = r
      await insertLog(
        pool,
        'flipkart',
        r.skipped ? 'skipped' : 'success',
        r.skipped ? r.logMessage || 'Flipkart API not configured' : r.logMessage || null,
        r.rows
      )
    } catch (e: any) {
      const msg = e?.message || String(e)
      await insertLog(pool, 'flipkart', 'error', msg, 0)
      out.flipkart = { rows: 0, error: msg }
      warnMarketplaceFailure('flipkart', msg)
    }
  }

  return out
}

export async function runHourlyUnifiedSalesSync(pool: Pool) {
  await runUnifiedSalesSync(pool, ['website', 'amazon', 'flipkart'])
}
